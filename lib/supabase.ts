/**
 * Supabase client and Cloud Template API.
 * Operates gracefully even when credentials are not configured (repo-only mode).
 */
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { Template, TemplateRef } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return client;
}

export interface CloudTemplateRow {
  id: string;
  slug: string;
  name: string;
  data: Template;
  published: boolean;
  sort_order: number;
  updated_at: string;
}

/**
 * List published cloud templates for public generator.
 */
export async function listCloudTemplates(): Promise<TemplateRef[]> {
  const sb = getSupabase();
  if (!sb) return [];

  try {
    const { data, error } = await sb
      .from("templates")
      .select("id, slug, name")
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("updated_at", { ascending: false });

    if (error || !data) {
      console.warn("Supabase templates query error:", error);
      return [];
    }

    const storageBase = `${supabaseUrl}/storage/v1/object/public/templates`;

    return data.map((item) => ({
      id: `cloud:${item.slug}`,
      name: item.name,
      source: "cloud",
      baseUrl: `${storageBase}/${item.slug}`,
    }));
  } catch (err) {
    console.warn("Failed to fetch cloud templates:", err);
    return [];
  }
}

/**
 * Fetch a single cloud template by slug.
 */
export async function fetchCloudTemplate(slug: string): Promise<{ template: Template; baseUrl: string } | null> {
  const sb = getSupabase();
  if (!sb) return null;

  try {
    const { data, error } = await sb
      .from("templates")
      .select("data")
      .eq("slug", slug)
      .single();

    if (error || !data) return null;
    const storageBase = `${supabaseUrl}/storage/v1/object/public/templates`;
    return {
      template: data.data as Template,
      baseUrl: `${storageBase}/${slug}`,
    };
  } catch (err) {
    console.warn("Failed to fetch cloud template:", err);
    return null;
  }
}

/**
 * Admin: List all templates (published & draft).
 */
export async function adminListAllTemplates(): Promise<CloudTemplateRow[]> {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("templates")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error || !data) {
    throw new Error(error?.message || "Failed to load templates from cloud");
  }

  return data as CloudTemplateRow[];
}

/**
 * Admin: Upload blank-tag PNG or font file to Supabase Storage bucket 'templates'.
 */
export async function adminUploadTemplateFile(
  slug: string,
  fileName: string,
  blobOrFile: Blob | File,
  contentType: string
): Promise<string> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const filePath = `${slug}/${fileName}`;
  const { error } = await sb.storage
    .from("templates")
    .upload(filePath, blobOrFile, {
      contentType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Upload error for ${filePath}: ${error.message}`);
  }

  const { data: publicUrlData } = sb.storage.from("templates").getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}

/**
 * Admin: Save or update a template row.
 */
export async function adminSaveTemplate(
  slug: string,
  name: string,
  templateData: Template,
  published = true,
  sortOrder = 0
): Promise<CloudTemplateRow> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const payload = {
    slug,
    name,
    data: templateData,
    published,
    sort_order: sortOrder,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await sb
    .from("templates")
    .upsert(payload, { onConflict: "slug" })
    .select()
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Failed to save template to cloud");
  }

  return data as CloudTemplateRow;
}

/**
 * Admin: Delete a cloud template and its bucket files.
 */
export async function adminDeleteTemplate(slug: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const { error } = await sb.from("templates").delete().eq("slug", slug);
  if (error) throw new Error(error.message);

  // Attempt removing files in storage
  try {
    const { data: files } = await sb.storage.from("templates").list(slug);
    if (files && files.length) {
      await sb.storage.from("templates").remove(files.map((f) => `${slug}/${f.name}`));
    }
  } catch (err) {
    console.warn("Storage cleanup warning:", err);
  }
}

/**
 * Admin Auth: Sign in with email and password.
 */
export async function adminSignIn(email: string, pass: string): Promise<User> {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase is not configured");

  const { data, error } = await sb.auth.signInWithPassword({
    email,
    password: pass,
  });

  if (error || !data.user) {
    throw new Error(error?.message || "Sign in failed");
  }

  return data.user;
}

/**
 * Admin Auth: Sign out.
 */
export async function adminSignOut(): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/**
 * Admin Auth: Get current user session.
 */
export async function adminGetCurrentUser(): Promise<User | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getUser();
  return data.user || null;
}

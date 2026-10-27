/**
 * Template loader and validator.
 * Fetches available templates from Supabase and repo fallback, validates schema,
 * and decodes assets into a LoadedTemplate ready for pure rendering.
 */
import { ensureFontsReady, loadTemplateFonts } from "./fonts";
import { fetchCloudTemplate, listCloudTemplates } from "./supabase";
import { loadImage } from "./utils";
import type { LoadedTemplate, Template, TemplateRef } from "./types";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
const cleanBase = basePath ? (basePath.startsWith("/") ? basePath : `/${basePath}`) : "";

/**
 * Validate and sanitize template JSON schema.
 */
export function validateTemplate(data: unknown): Template {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid template: root must be an object");
  }

  const raw = data as Record<string, unknown>;

  if (typeof raw.name !== "string" || !raw.name.trim()) {
    throw new Error("Invalid template: missing 'name'");
  }

  const naturalWidth = Number(raw.naturalWidth) || 5184;
  const naturalHeight = Number(raw.naturalHeight) || 285;

  const placement = (raw.placement && typeof raw.placement === "object"
    ? raw.placement
    : {}) as Record<string, unknown>;

  const validPlacement = {
    widthPercent: Number(placement.widthPercent) || 100,
    bottomMarginPercent: Number(placement.bottomMarginPercent) || 0,
    align: (placement.align === "left" || placement.align === "right" ? placement.align : "center") as "left" | "center" | "right",
  };

  const fields = Array.isArray(raw.fields)
    ? raw.fields.map((f, i) => {
        const item = f as Record<string, unknown>;
        const box = (item.box && typeof item.box === "object" ? item.box : {}) as Record<string, unknown>;
        return {
          id: String(item.id || `field_${i}`),
          label: String(item.label || item.id || `Field ${i + 1}`),
          placeholder: item.placeholder ? String(item.placeholder) : "",
          defaultValue: item.defaultValue ? String(item.defaultValue) : "",
          box: {
            x: Math.max(0, Math.min(1, Number(box.x) || 0)),
            y: Math.max(0, Math.min(1, Number(box.y) || 0)),
            w: Math.max(0.01, Math.min(1, Number(box.w) || 0.2)),
            h: Math.max(0.01, Math.min(1, Number(box.h) || 0.5)),
          },
          font: String(item.font || "Outfit"),
          weight: Number(item.weight) || 400,
          color: String(item.color || "#ffffff"),
          align: (item.align === "left" || item.align === "right" ? item.align : "center") as "left" | "center" | "right",
          valign: (item.valign === "top" || item.valign === "bottom" ? item.valign : "middle") as "top" | "middle" | "bottom",
          uppercase: Boolean(item.uppercase),
          maxFontSize: Number(item.maxFontSize) || 0.5,
          minFontSize: Number(item.minFontSize) || 0.15,
          maxLines: (item.maxLines === 2 ? 2 : 1) as 1 | 2,
          letterSpacing: Number(item.letterSpacing) || 0,
        };
      })
    : [];

  const logoSlots = Array.isArray(raw.logoSlots)
    ? raw.logoSlots.map((s, i) => {
        const item = s as Record<string, unknown>;
        const box = (item.box && typeof item.box === "object" ? item.box : {}) as Record<string, unknown>;
        return {
          id: String(item.id || `logo_${i}`),
          label: String(item.label || `Logo ${i + 1}`),
          box: {
            x: Number(box.x) || 0,
            y: Number(box.y) || 0,
            w: Number(box.w) || 0.1,
            h: Number(box.h) || 0.5,
          },
        };
      })
    : [];

  let qrSlot = null;
  if (raw.qrSlot && typeof raw.qrSlot === "object") {
    const q = raw.qrSlot as Record<string, unknown>;
    const box = (q.box && typeof q.box === "object" ? q.box : {}) as Record<string, unknown>;
    qrSlot = {
      label: String(q.label || "QR Code"),
      box: {
        x: Number(box.x) || 0.94,
        y: Number(box.y) || 0.14,
        w: Number(box.w) || 0.05,
        h: Number(box.h) || 0.72,
      },
    };
  }

  let extraLogosZone = null;
  if (raw.extraLogosZone && typeof raw.extraLogosZone === "object") {
    const z = raw.extraLogosZone as Record<string, unknown>;
    const box = (z.box && typeof z.box === "object" ? z.box : {}) as Record<string, unknown>;
    extraLogosZone = {
      box: {
        x: Number(box.x) || 0.2,
        y: Number(box.y) || 0.15,
        w: Number(box.w) || 0.1,
        h: Number(box.h) || 0.7,
      },
      gapPercent: Number(z.gapPercent) || 0.01,
      align: (z.align === "left" || z.align === "right" ? z.align : "center") as "left" | "center" | "right",
      showDividers: Boolean(z.showDividers),
      dividerWidth: Number(z.dividerWidth) || 1.5,
      dividerColor: String(z.dividerColor || "rgba(255,255,255,0.25)"),
      dividerHeightPercent: Math.max(0.1, Math.min(1.0, Number(z.dividerHeightPercent) || 0.75)),
    };
  }

  return {
    name: String(raw.name),
    blankTag: String(raw.blankTag || "blank-tag.png"),
    naturalWidth,
    naturalHeight,
    placement: validPlacement,
    fields,
    logoSlots,
    qrSlot,
    extraLogosZone,
    fonts: Array.isArray(raw.fonts) ? (raw.fonts as Template["fonts"]) : undefined,
    googleFonts: Array.isArray(raw.googleFonts) ? (raw.googleFonts as string[]) : undefined,
  };
}

/**
 * List all available templates (custom local + cloud + repo fallback).
 */
export async function listAllTemplates(): Promise<TemplateRef[]> {
  const list: TemplateRef[] = [];

  // 1. Try local custom template saved from Admin Builder
  if (typeof window !== "undefined") {
    try {
      const customRaw = localStorage.getItem("watermark_admin_custom_template_v1");
      if (customRaw) {
        const parsed = JSON.parse(customRaw);
        if (parsed && parsed.template && parsed.template.name) {
          list.push({
            id: "custom:admin",
            name: `${parsed.template.name} (Custom Studio)`,
            source: "custom",
            baseUrl: "",
          });
        }
      }
    } catch (err) {
      console.warn("Could not read local custom template:", err);
    }
  }

  // 2. Try Supabase cloud templates
  try {
    const cloud = await listCloudTemplates();
    list.push(...cloud);
  } catch (err) {
    console.warn("Could not fetch cloud templates:", err);
  }

  // 3. Fetch repo templates from /templates/index.json
  try {
    const res = await fetch(`${cleanBase}/templates/index.json`);
    if (res.ok) {
      const repoTemplates = (await res.json()) as Array<{ id: string; name: string; path?: string }>;
      for (const item of repoTemplates) {
        list.push({
          id: `repo:${item.id}`,
          name: item.name,
          source: "repo",
          baseUrl: `${cleanBase}/${item.path || `templates/${item.id}`}`,
        });
      }
    }
  } catch (err) {
    console.warn("Could not fetch repo templates:", err);
  }

  // Fallback if list is empty
  if (!list.length) {
    list.push({
      id: "repo:default",
      name: "SSC PGC Standard Banner",
      source: "repo",
      baseUrl: `${cleanBase}/templates/default`,
    });
  }

  return list;
}

/**
 * Load a template and its assets ready for drawing.
 */
export async function loadTemplate(ref: TemplateRef): Promise<LoadedTemplate> {
  let template: Template;
  let baseUrl = ref.baseUrl;
  let customBlankTagDataUrl: string | null = null;

  if (ref.source === "custom" || ref.id === "custom:admin") {
    if (typeof window === "undefined") {
      throw new Error("Custom template can only be loaded in browser");
    }
    const customRaw = localStorage.getItem("watermark_admin_custom_template_v1");
    if (!customRaw) throw new Error("No custom template saved locally");
    const parsed = JSON.parse(customRaw);
    template = validateTemplate(parsed.template);
    customBlankTagDataUrl = parsed.blankTagDataUrl || null;
    baseUrl = "";
  } else if (ref.source === "cloud") {
    const slug = ref.id.replace(/^cloud:/, "");
    const cloudResult = await fetchCloudTemplate(slug);
    if (!cloudResult) {
      throw new Error(`Cloud template "${slug}" not found`);
    }
    template = validateTemplate(cloudResult.template);
    baseUrl = cloudResult.baseUrl;
  } else {
    const res = await fetch(`${ref.baseUrl}/template.json`);
    if (!res.ok) {
      throw new Error(`Failed to load template configuration from ${ref.baseUrl}/template.json`);
    }
    const json = await res.json();
    template = validateTemplate(json);
  }

  // Blank tag URL
  let blankTagUrl: string;
  if (customBlankTagDataUrl) {
    blankTagUrl = customBlankTagDataUrl;
  } else if (
    template.blankTag.startsWith("http://") ||
    template.blankTag.startsWith("https://") ||
    template.blankTag.startsWith("data:")
  ) {
    blankTagUrl = template.blankTag;
  } else {
    blankTagUrl = baseUrl
      ? `${baseUrl.replace(/\/$/, "")}/${template.blankTag.replace(/^\//, "")}`
      : `${cleanBase}/templates/default/blank-tag.png`;
  }

  // Preload fonts
  if (template.fonts && template.fonts.length) {
    await loadTemplateFonts(template.fonts, baseUrl);
  }

  const fontFamilies = Array.from(
    new Set([
      "Outfit",
      "Inter",
      ...(template.googleFonts || []),
      ...template.fields.map((f) => f.font),
    ])
  );
  await ensureFontsReady(fontFamilies);

  // Load blank-tag image
  const blankTagImg = await loadImage(blankTagUrl);

  return {
    ref,
    template,
    blankTag: blankTagImg,
  };
}

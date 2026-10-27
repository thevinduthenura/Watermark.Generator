/**
 * Font loader: dynamically registers custom font files (.woff2, .ttf, .otf),
 * injects Google Fonts links, and ensures document.fonts.load(...) is resolved
 * before rendering so text never renders with an incorrect fallback.
 */
import { SINHALA_FALLBACK } from "./textFit";
import type { TemplateFont } from "./types";

export interface FontChoice {
  family: string;
  category: "Display" | "Clean" | "Serif" | "Modern";
}

export const POPULAR_FONTS: FontChoice[] = [
  { family: "Outfit", category: "Modern" },
  { family: "Inter", category: "Clean" },
  { family: "Bebas Neue", category: "Display" },
  { family: "Montserrat", category: "Modern" },
  { family: "Oswald", category: "Display" },
  { family: "Cinzel", category: "Serif" },
  { family: "Anton", category: "Display" },
  { family: "Poppins", category: "Clean" },
  { family: "Playfair Display", category: "Serif" },
  { family: "Raleway", category: "Clean" },
  { family: "League Spartan", category: "Display" },
  { family: "Cinzel Decorative", category: "Serif" },
];

const loadedFontKeys = new Set<string>();

/**
 * Register a custom font uploaded by the user from their disk (.ttf, .otf, .woff, .woff2).
 */
export async function registerCustomFontFromFile(file: File): Promise<string> {
  const family = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_\-\s]/g, "").trim() || "CustomFont";
  const buffer = await file.arrayBuffer();
  const fontFace = new FontFace(family, buffer);
  const loaded = await fontFace.load();
  document.fonts.add(loaded);
  loadedFontKeys.add(`custom:${family}:normal`);
  return family;
}

/**
 * Load a Google Font family dynamically if not already present in the DOM.
 */
export function ensureGoogleFont(family: string): void {
  if (typeof document === "undefined") return;
  const key = `gf:${family}`;
  if (loadedFontKeys.has(key)) return;
  loadedFontKeys.add(key);

  const clean = family.replace(/\s+/g, "+");
  const linkId = `google-font-${family.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${clean}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
}

/**
 * Always ensure Noto Sans Sinhala is loaded in the browser.
 */
export function ensureSinhalaFont(): void {
  ensureGoogleFont(SINHALA_FALLBACK);
}

/**
 * Load custom font files (.woff2, .ttf, .otf) defined in a template.
 */
export async function loadTemplateFonts(fonts: TemplateFont[] | undefined, baseUrl: string): Promise<void> {
  if (typeof window === "undefined" || !fonts || !fonts.length) return;

  for (const font of fonts) {
    const key = `custom:${font.family}:${font.weight || "normal"}:${font.file}`;
    if (loadedFontKeys.has(key)) continue;

    try {
      const url = font.file.startsWith("http://") || font.file.startsWith("https://") || font.file.startsWith("data:")
        ? font.file
        : `${baseUrl.replace(/\/$/, "")}/${font.file.replace(/^\//, "")}`;

      const fontFace = new FontFace(font.family, `url("${url}")`, {
        weight: font.weight ? String(font.weight) : "normal",
        style: font.style || "normal",
      });

      const loaded = await fontFace.load();
      document.fonts.add(loaded);
      loadedFontKeys.add(key);
    } catch (err) {
      console.warn(`Failed to load custom font "${font.family}" from ${font.file}:`, err);
    }
  }
}

/**
 * Ensure all fonts needed for a template and string are loaded and ready.
 */
export async function ensureFontsReady(
  families: string[],
  weights: (number | string)[] = [400, 700],
  sampleText = "Colours Night Annual 2026 සිංහල"
): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;

  ensureSinhalaFont();
  families.forEach(ensureGoogleFont);

  // Wait for document.fonts to finish pending loads
  try {
    await document.fonts.ready;
    const loadPromises = families.flatMap((family) =>
      weights.map((w) => document.fonts.load(`${w} 24px "${family}", "${SINHALA_FALLBACK}"`, sampleText))
    );
    await Promise.allSettled(loadPromises);
  } catch (err) {
    console.warn("document.fonts.load warning:", err);
  }
}

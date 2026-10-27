/**
 * Auto-fit text inside a box.
 *
 * Strategy (per field):
 *  1. Binary search the largest font size (between min and max) at which the
 *     text fits the box on <= maxLines lines (trying 1 line first, then a
 *     balanced 2-line wrap).
 *  2. If it doesn't fit even at the minimum size: wrap at min size and
 *     truncate the last line with an ellipsis.
 */
import type { AnyCtx } from "./imageDraw";
import type { TextField } from "./types";

/** Always fall back to Noto Sans Sinhala so Sinhala glyphs render correctly. */
export const SINHALA_FALLBACK = "Noto Sans Sinhala";

const GENERIC = new Set(["serif", "sans-serif", "monospace", "system-ui"]);

export function fontStack(family: string): string {
  const fams = [family, SINHALA_FALLBACK]
    .filter(Boolean)
    .map((f) => (GENERIC.has(f) ? f : `"${f.replace(/"/g, "")}"`));
  return `${fams.join(", ")}, sans-serif`;
}

export function fontString(field: Pick<TextField, "font" | "weight">, sizePx: number): string {
  return `${field.weight || 400} ${sizePx.toFixed(2)}px ${fontStack(field.font)}`;
}

const LINE_HEIGHT = 1.15;

export interface FittedText {
  fontSize: number;
  lines: string[];
  lineHeight: number;
}

/** Split into user-perceived characters (keeps Sinhala clusters intact). */
function graphemes(s: string): string[] {
  const Seg = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (Seg) {
    return Array.from(new Seg(undefined, { granularity: "grapheme" }).segment(s), (x) => x.segment);
  }
  return Array.from(s);
}

function applyFont(ctx: AnyCtx, field: TextField, size: number) {
  ctx.font = fontString(field, size);
  // letterSpacing is supported in Chromium/Firefox/Safari 17+; ignore otherwise.
  const c = ctx as AnyCtx & { letterSpacing?: string };
  if ("letterSpacing" in c) {
    c.letterSpacing = `${((field.letterSpacing || 0) * size).toFixed(2)}px`;
  }
}

/** Best split of `words` into two lines (minimise the wider line). */
function balancedTwoLines(ctx: AnyCtx, words: string[]): string[] {
  if (words.length < 2) return [words.join(" ")];
  let best: string[] = [words.join(" ")];
  let bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (w < bestW) {
      bestW = w;
      best = [a, b];
    }
  }
  return best;
}

/** Try to lay out text at `size`; returns lines if it fits, otherwise null. */
function tryLayout(
  ctx: AnyCtx,
  text: string,
  field: TextField,
  size: number,
  boxW: number,
  boxH: number,
): string[] | null {
  applyFont(ctx, field, size);
  const lh = size * LINE_HEIGHT;
  // Single line
  if (ctx.measureText(text).width <= boxW && size <= boxH) {
    return [text];
  }
  if (field.maxLines >= 2 && lh * 2 <= boxH * 1.02) {
    const words = text.split(/\s+/).filter(Boolean);
    if (words.length >= 2) {
      const lines = balancedTwoLines(ctx, words);
      if (lines.every((l) => ctx.measureText(l).width <= boxW)) return lines;
    }
  }
  return null;
}

/** Truncate `s` with an ellipsis so it fits `maxW` (font must already be set). */
function ellipsize(ctx: AnyCtx, s: string, maxW: number): string {
  if (ctx.measureText(s).width <= maxW) return s;
  const g = graphemes(s);
  let lo = 0;
  let hi = g.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const candidate = g.slice(0, mid).join("").trimEnd() + "…";
    if (ctx.measureText(candidate).width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return g.slice(0, lo).join("").trimEnd() + "…";
}

/** Greedy wrap into at most `maxLines`; the last line gets an ellipsis if needed. */
function wrapAndTruncate(ctx: AnyCtx, text: string, maxLines: number, boxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  let i = 0;
  for (; i < words.length; i++) {
    const next = current ? `${current} ${words[i]}` : words[i];
    if (ctx.measureText(next).width <= boxW || !current) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
      if (lines.length === maxLines - 1) {
        // Everything left goes onto the last line.
        current = words.slice(i).join(" ");
        i = words.length;
        break;
      }
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines).map((l) => ellipsize(ctx, l, boxW));
}

/**
 * Compute the font size and lines for a field.
 * `bannerH` converts the relative min/max sizes to pixels.
 */
export function fitText(
  ctx: AnyCtx,
  rawText: string,
  field: TextField,
  boxW: number,
  boxH: number,
  bannerH: number,
): FittedText | null {
  let text = rawText.replace(/\s+/g, " ").trim();
  if (!text) return null;
  if (field.uppercase) text = text.toLocaleUpperCase();

  const maxPx = Math.max(1, Math.min(field.maxFontSize * bannerH, boxH));
  const minPx = Math.max(1, Math.min(field.minFontSize * bannerH, maxPx));

  // Fast path: fits at max size.
  const atMax = tryLayout(ctx, text, field, maxPx, boxW, boxH);
  if (atMax) return { fontSize: maxPx, lines: atMax, lineHeight: maxPx * LINE_HEIGHT };

  const atMin = tryLayout(ctx, text, field, minPx, boxW, boxH);
  if (!atMin) {
    // Last resort: min size, wrap and truncate.
    applyFont(ctx, field, minPx);
    const linesAllowed = Math.max(1, Math.min(field.maxLines, Math.floor(boxH / (minPx * LINE_HEIGHT)) || 1));
    return { fontSize: minPx, lines: wrapAndTruncate(ctx, text, linesAllowed, boxW), lineHeight: minPx * LINE_HEIGHT };
  }

  // Binary search between min (fits) and max (doesn't fit).
  let lo = minPx;
  let hi = maxPx;
  let bestLines = atMin;
  for (let iter = 0; iter < 18 && hi - lo > 0.25; iter++) {
    const mid = (lo + hi) / 2;
    const lines = tryLayout(ctx, text, field, mid, boxW, boxH);
    if (lines) {
      lo = mid;
      bestLines = lines;
    } else {
      hi = mid;
    }
  }
  return { fontSize: lo, lines: bestLines, lineHeight: lo * LINE_HEIGHT };
}

/** Draw a fitted text block into its box (pixel coordinates). */
export function drawFittedText(
  ctx: AnyCtx,
  fitted: FittedText,
  field: TextField,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): void {
  applyFont(ctx, field, fitted.fontSize);
  ctx.fillStyle = field.color || "#ffffff";
  ctx.textBaseline = "middle";
  ctx.textAlign = field.align;

  const blockH = fitted.lines.length * fitted.lineHeight;
  let top = by;
  if (field.valign === "middle") top = by + (bh - blockH) / 2;
  else if (field.valign === "bottom") top = by + bh - blockH;

  const x = field.align === "left" ? bx : field.align === "right" ? bx + bw : bx + bw / 2;
  fitted.lines.forEach((line, i) => {
    ctx.fillText(line, x, top + fitted.lineHeight * (i + 0.5));
  });
}

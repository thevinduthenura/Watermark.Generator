/**
 * Pure rendering. Shared by the live preview, the final export and the admin
 * builder so that all three produce identical results.
 *
 * Nothing here touches React or the DOM, apart from creating canvases.
 */
import { containSize, createCanvas, drawImageHQ, get2d, sizeOf, type AnyCanvas, type AnyCtx, type Drawable } from "./imageDraw";
import { drawFittedText, fitText } from "./textFit";
import type { Box, HAlign, LoadedTemplate, RenderInputs, Size, Template, UserImage } from "./types";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Convert a fractional box to pixels inside a banner rectangle. */
export function boxToRect(box: Box, banner: Rect): Rect {
  return {
    x: banner.x + box.x * banner.w,
    y: banner.y + box.y * banner.h,
    w: box.w * banner.w,
    h: box.h * banner.h,
  };
}

/** Banner height for a given banner width, using the blank tag's aspect ratio. */
export function bannerHeightFor(template: Template, bannerW: number): number {
  return (bannerW * template.naturalHeight) / template.naturalWidth;
}

/**
 * Where the banner sits on a canvas of size (cw x ch).
 * In banner-only mode the canvas IS the banner.
 */
export function bannerRect(template: Template, cw: number, ch: number, bannerOnly = false): Rect {
  if (bannerOnly) return { x: 0, y: 0, w: cw, h: ch };
  const p = template.placement;
  const w = (cw * Math.min(100, Math.max(1, p.widthPercent))) / 100;
  const h = bannerHeightFor(template, w);
  const margin = (ch * Math.max(0, p.bottomMarginPercent)) / 100;
  const x = p.align === "left" ? 0 : p.align === "right" ? cw - w : (cw - w) / 2;
  return { x, y: ch - margin - h, w, h };
}

/** Output canvas size. Banner-only mode exports just the strip at the canvas width. */
export function outputSize(template: Template, size: Size, bannerOnly: boolean): Size {
  if (!bannerOnly) return size;
  const w = Math.round((size.width * template.placement.widthPercent) / 100);
  return { width: w, height: Math.max(1, Math.round(bannerHeightFor(template, w))) };
}

/**
 * Lay out extra logos in a zone: same height (fit to zone height), even gaps,
 * aligned left/center/right. If the row is wider than the zone, everything is
 * scaled down uniformly (logo sizes AND gaps) so the row fits.
 */
export function layoutExtraLogos(
  sizes: { w: number; h: number }[],
  zone: Rect,
  gapPx: number,
  align: HAlign,
): Rect[] {
  if (!sizes.length || zone.w <= 0 || zone.h <= 0) return [];
  const widths = sizes.map((s) => (s.h > 0 ? (s.w / s.h) * zone.h : 0));
  const total = widths.reduce((a, b) => a + b, 0) + gapPx * (sizes.length - 1);
  const scale = total > zone.w ? zone.w / total : 1;
  const h = zone.h * scale;
  const gap = gapPx * scale;
  const rowW = total * scale;

  let x = zone.x;
  if (align === "center") x = zone.x + (zone.w - rowW) / 2;
  else if (align === "right") x = zone.x + zone.w - rowW;
  const y = zone.y + (zone.h - h) / 2;

  return widths.map((w0) => {
    const w = w0 * scale;
    const r = { x, y, w, h };
    x += w + gap;
    return r;
  });
}

/** Draw an image centred in a rect with "contain" fit. */
function drawContain(ctx: AnyCtx, img: Drawable, r: Rect) {
  const { w: iw, h: ih } = sizeOf(img);
  const { w, h } = containSize(iw, ih, r.w, r.h);
  drawImageHQ(ctx, img, r.x + (r.w - w) / 2, r.y + (r.h - h) / 2, w, h);
}

function userDrawable(u: UserImage): Drawable {
  return u.image as unknown as Drawable;
}

/**
 * Draw the banner into `banner` (pixel rect) on `ctx`.
 * Text and logos are rendered directly at final size (never upscaled).
 */
export function renderBanner(ctx: AnyCtx, loaded: LoadedTemplate, inputs: RenderInputs, banner: Rect): void {
  const t = loaded.template;
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  // 1. Blank tag
  drawImageHQ(ctx, loaded.blankTag, banner.x, banner.y, banner.w, banner.h);

  // 2. Fixed logo slots
  for (const slot of t.logoSlots) {
    const img = inputs.logoSlotImages[slot.id];
    if (img) drawContain(ctx, userDrawable(img), boxToRect(slot.box, banner));
  }

  // 3. QR code
  if (t.qrSlot && inputs.qrImage) {
    drawContain(ctx, userDrawable(inputs.qrImage), boxToRect(t.qrSlot.box, banner));
  }

  // 4. Extra logos row
  if (t.extraLogosZone && inputs.extraLogos.length) {
    const zone = boxToRect(t.extraLogosZone.box, banner);
    const rects = layoutExtraLogos(
      inputs.extraLogos.map((l) => ({ w: l.width, h: l.height })),
      zone,
      t.extraLogosZone.gapPercent * banner.w,
      t.extraLogosZone.align,
    );
    rects.forEach((r, i) => drawImageHQ(ctx, userDrawable(inputs.extraLogos[i]), r.x, r.y, r.w, r.h));
  }

  // 5. Text fields
  for (const field of t.fields) {
    const raw = inputs.values[field.id] ?? field.defaultValue ?? "";
    const r = boxToRect(field.box, banner);
    const fitted = fitText(ctx, raw, field, r.w, r.h, banner.h);
    if (fitted) drawFittedText(ctx, fitted, field, r.x, r.y, r.w, r.h);
  }

  ctx.restore();
}

/**
 * Render a full output canvas: fully transparent W x H with the banner at the
 * bottom (or just the banner strip in banner-only mode).
 * The caller owns the returned canvas and should release it after use.
 */
export function renderOutput(loaded: LoadedTemplate, inputs: RenderInputs, size: Size, bannerOnly: boolean): AnyCanvas {
  const out = outputSize(loaded.template, size, bannerOnly);
  const canvas = createCanvas(out.width, out.height);
  const ctx = get2d(canvas);
  ctx.clearRect(0, 0, out.width, out.height);
  renderBanner(ctx, loaded, inputs, bannerRect(loaded.template, out.width, out.height, bannerOnly));
  return canvas;
}

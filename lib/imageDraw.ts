/**
 * Canvas helpers: canvas creation/release and high-quality image drawing.
 */

export type AnyCanvas = HTMLCanvasElement | OffscreenCanvas;
export type AnyCtx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
export type Drawable = CanvasImageSource & { width: number; height: number };

/** Create an OffscreenCanvas when available, otherwise a DOM canvas. */
export function createCanvas(width: number, height: number): AnyCanvas {
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(w, h);
  }
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

export function get2d(canvas: AnyCanvas): AnyCtx {
  const ctx = canvas.getContext("2d", { alpha: true }) as AnyCtx | null;
  if (!ctx) {
    throw new Error("Could not create a 2D canvas context (the device may be low on memory).");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  return ctx;
}

/** Free canvas backing memory. Important on phones when exporting big files. */
export function releaseCanvas(canvas: AnyCanvas | null | undefined): void {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

/** Natural pixel size of any drawable. */
export function sizeOf(src: Drawable): { w: number; h: number } {
  const anySrc = src as unknown as { naturalWidth?: number; naturalHeight?: number };
  const w = anySrc.naturalWidth || src.width;
  const h = anySrc.naturalHeight || src.height;
  return { w, h };
}

/**
 * Draw `src` into the rectangle (dx, dy, dw, dh) with high quality.
 *
 * When shrinking by more than 2x, the browser's single-pass resampling can
 * alias (thin lines and small text shimmer). So we halve the image step by step
 * on temporary canvases until we're within 2x of the target, then do the
 * final draw.
 */
export function drawImageHQ(
  ctx: AnyCtx,
  src: Drawable,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
): void {
  const { w: sw, h: sh } = sizeOf(src);
  if (sw <= 0 || sh <= 0 || dw <= 0 || dh <= 0) return;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  let current: Drawable = src;
  let cw = sw;
  let ch = sh;
  const temps: AnyCanvas[] = [];

  try {
    while (cw / 2 >= dw * 1.0001 && ch / 2 >= dh * 1.0001 && cw / dw > 2) {
      const nw = Math.max(1, Math.round(cw / 2));
      const nh = Math.max(1, Math.round(ch / 2));
      const tmp = createCanvas(nw, nh);
      const tctx = get2d(tmp);
      tctx.drawImage(current, 0, 0, cw, ch, 0, 0, nw, nh);
      temps.push(tmp);
      current = tmp as unknown as Drawable;
      cw = nw;
      ch = nh;
    }
    ctx.drawImage(current, 0, 0, cw, ch, dx, dy, dw, dh);
  } finally {
    temps.forEach(releaseCanvas);
  }
}

/** Fit (cw x ch) inside (bw x bh) preserving aspect ratio ("contain"). */
export function containSize(cw: number, ch: number, bw: number, bh: number): { w: number; h: number } {
  if (cw <= 0 || ch <= 0) return { w: 0, h: 0 };
  const s = Math.min(bw / cw, bh / ch);
  return { w: cw * s, h: ch * s };
}

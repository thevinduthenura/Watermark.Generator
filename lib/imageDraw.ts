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

export interface DetectedBounds {
  isFullCanvas: boolean;
  minX: number;
  minY: number;
  width: number;
  height: number;
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * Scan image pixels to find the bounding box of non-transparent content.
 * Especially useful when a user uploads a 5184x3456 full Photoshop canvas
 * where the banner is only at the bottom!
 */
export function detectBannerBounds(img: HTMLImageElement): DetectedBounds {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  // Create a downscaled analysis canvas for fast scanning
  const scale = Math.min(1, 1000 / Math.max(w, h));
  const sw = Math.max(1, Math.round(w * scale));
  const sh = Math.max(1, Math.round(h * scale));

  const canvas = createCanvas(sw, sh) as HTMLCanvasElement;
  const ctx = get2d(canvas);
  ctx.drawImage(img, 0, 0, sw, sh);
  const imgData = (ctx as CanvasRenderingContext2D).getImageData(0, 0, sw, sh);
  const data = imgData.data;

  let minY = sh;
  let maxY = -1;
  let minX = sw;
  let maxX = -1;

  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const alpha = data[(y * sw + x) * 4 + 3];
      if (alpha > 8) {
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }
  }

  releaseCanvas(canvas);

  if (maxY < 0) {
    return { isFullCanvas: false, minX: 0, minY: 0, width: w, height: h, canvasWidth: w, canvasHeight: h };
  }

  const actualMinY = Math.floor(minY / scale);
  const actualMaxY = Math.ceil(maxY / scale);
  const actualMinX = Math.floor(minX / scale);
  const actualMaxX = Math.ceil(maxX / scale);

  const detectedHeight = actualMaxY - actualMinY;
  // If top 40% or more is empty/transparent and the banner is at the bottom:
  const isFullCanvas = actualMinY > h * 0.35;

  return {
    isFullCanvas,
    minX: actualMinX,
    minY: actualMinY,
    width: w,
    height: Math.max(1, detectedHeight),
    canvasWidth: w,
    canvasHeight: h,
  };
}

/**
 * Crop an image region into a new HTMLImageElement + Blob.
 */
export async function cropImageRegion(
  img: HTMLImageElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number
): Promise<{ image: HTMLImageElement; blob: Blob }> {
  const canvas = document.createElement("canvas");
  canvas.width = sw;
  canvas.height = sh;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  const croppedImg = new Image();
  croppedImg.src = URL.createObjectURL(blob);
  await new Promise((resolve) => {
    croppedImg.onload = resolve;
  });
  return { image: croppedImg, blob };
}

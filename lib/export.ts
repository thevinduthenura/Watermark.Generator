/**
 * Export engine: handles high-resolution rendering, sequential processing,
 * memory safety, single PNG vs multi-file ZIP generation, and progress tracking.
 */
import JSZip from "jszip";
import { releaseCanvas, type AnyCanvas } from "./imageDraw";
import { orientSize } from "./resolutions";
import { renderOutput } from "./renderer";
import { downloadBlob, sanitizeFilename } from "./utils";
import type { LoadedTemplate, Orientation, RenderInputs, Size } from "./types";

export interface ExportProgress {
  current: number;
  total: number;
  status: string;
}

export interface ExportOptions {
  loaded: LoadedTemplate;
  inputs: RenderInputs;
  sizes: Size[];
  orientation: Orientation;
  bannerOnly: boolean;
  onProgress?: (p: ExportProgress) => void;
}

/** Convert any canvas (DOM or OffscreenCanvas) to PNG Blob. */
export async function canvasToBlob(canvas: AnyCanvas): Promise<Blob> {
  if ("convertToBlob" in canvas && typeof canvas.convertToBlob === "function") {
    return canvas.convertToBlob({ type: "image/png" });
  }
  const domCanvas = canvas as HTMLCanvasElement;
  return new Promise((resolve, reject) => {
    domCanvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Failed to export canvas to PNG blob"));
    }, "image/png");
  });
}

/** Build base filename from event and photographer inputs. */
export function buildBaseFilename(inputs: RenderInputs): string {
  const ev = inputs.values.event || "event";
  const ph = inputs.values.photographer || "photographer";
  return `${sanitizeFilename(ev)}_${sanitizeFilename(ph)}`;
}

/** Check if any output resolution will cause upscaling. */
export function checkUpscaling(templateWidth: number, sizes: Size[], orientation: Orientation): boolean {
  return sizes.some((s) => {
    const oriented = orientSize(s.width, s.height, orientation);
    return oriented.width > templateWidth;
  });
}

/**
 * Execute sequential export for 1 or more resolutions.
 */
export async function runExport(options: ExportOptions): Promise<{ count: number; filename: string }> {
  const { loaded, inputs, sizes, orientation, bannerOnly, onProgress } = options;
  if (!sizes.length) throw new Error("Please select at least one resolution to download.");

  const baseName = buildBaseFilename(inputs);
  const total = sizes.length;

  if (total === 1) {
    // Single PNG download
    onProgress?.({ current: 0, total: 1, status: "Rendering watermark canvas..." });

    const targetSize = orientSize(sizes[0].width, sizes[0].height, orientation);
    let canvas: AnyCanvas | null = null;
    try {
      canvas = renderOutput(loaded, inputs, targetSize, bannerOnly);
      const blob = await canvasToBlob(canvas);
      const filename = `${baseName}_${targetSize.width}x${targetSize.height}${bannerOnly ? "_banner" : ""}.png`;
      downloadBlob(blob, filename);
      onProgress?.({ current: 1, total: 1, status: "Complete!" });
      return { count: 1, filename };
    } catch (err) {
      console.error("Export error:", err);
      throw new Error(
        `Failed to render ${targetSize.width}x${targetSize.height} PNG. ` +
        `Your device may have run low on memory. Try a smaller resolution.`
      );
    } finally {
      releaseCanvas(canvas);
    }
  }

  // Multiple files: ZIP bundle
  const zip = new JSZip();

  for (let i = 0; i < total; i++) {
    const targetSize = orientSize(sizes[i].width, sizes[i].height, orientation);
    onProgress?.({
      current: i,
      total,
      status: `Rendering ${i + 1}/${total} (${targetSize.width} × ${targetSize.height})...`,
    });

    let canvas: AnyCanvas | null = null;
    try {
      canvas = renderOutput(loaded, inputs, targetSize, bannerOnly);
      const blob = await canvasToBlob(canvas);
      const filename = `${baseName}_${targetSize.width}x${targetSize.height}${bannerOnly ? "_banner" : ""}.png`;
      zip.file(filename, blob);
    } catch (err) {
      console.error(`Error rendering resolution ${i}:`, err);
      throw new Error(
        `Export stopped at ${targetSize.width}x${targetSize.height} due to a memory limit. ` +
        `Try selecting fewer or smaller resolutions.`
      );
    } finally {
      releaseCanvas(canvas);
    }
  }

  onProgress?.({ current: total, total, status: "Packaging ZIP archive..." });
  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "STORE", // PNGs are already deflated; STORE is fastest
  });

  const zipFilename = `${baseName}_watermarks_${total}_resolutions.zip`;
  downloadBlob(zipBlob, zipFilename);
  onProgress?.({ current: total, total, status: "Complete!" });

  return { count: total, filename: zipFilename };
}

import { formatMegapixels } from "./utils";
import type { Orientation, Size } from "./types";

export interface ResolutionPreset {
  id: string;
  width: number;
  height: number;
  label: string;
  defaultSelected?: boolean;
}

export const RESOLUTION_PRESETS: ResolutionPreset[] = [
  { id: "6000x4000", width: 6000, height: 4000, label: "6000 × 4000" },
  { id: "5472x3648", width: 5472, height: 3648, label: "5472 × 3648" },
  { id: "5184x3456", width: 5184, height: 3456, label: "5184 × 3456", defaultSelected: true },
  { id: "4608x3072", width: 4608, height: 3072, label: "4608 × 3072" },
  { id: "4000x2667", width: 4000, height: 2667, label: "4000 × 2667" },
  { id: "3840x2560", width: 3840, height: 2560, label: "3840 × 2560" },
  { id: "3000x2000", width: 3000, height: 2000, label: "3000 × 2000" },
  { id: "2400x1600", width: 2400, height: 1600, label: "2400 × 1600" },
  { id: "1920x1280", width: 1920, height: 1280, label: "1920 × 1280" },
  { id: "1080x720", width: 1080, height: 720, label: "1080 × 720" },
];

/**
 * Adjust size according to orientation (portrait swaps width and height).
 */
export function orientSize(width: number, height: number, orientation: Orientation): Size {
  if (orientation === "portrait") {
    const min = Math.min(width, height);
    const max = Math.max(width, height);
    return { width: min, height: max };
  }
  const min = Math.min(width, height);
  const max = Math.max(width, height);
  return { width: max, height: min };
}

export function formatPresetLabel(preset: ResolutionPreset, orientation: Orientation): string {
  const oriented = orientSize(preset.width, preset.height, orientation);
  const mp = formatMegapixels(oriented.width, oriented.height);
  return `${oriented.width} × ${oriented.height} (${mp})`;
}

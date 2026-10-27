/**
 * LocalStorage persistence for user inputs, resolution choices, and extra logos.
 */
import type { Orientation, UserImage } from "./types";

const STORAGE_KEY = "watermark_generator_saved_state_v1";

export interface StoredState {
  templateId?: string;
  values: Record<string, string>;
  selectedResolutions: string[];
  orientation: Orientation;
  customWidth?: number;
  customHeight?: number;
  customEnabled?: boolean;
  bannerOnly?: boolean;
  extraLogos: { id: string; name: string; src: string; width: number; height: number }[];
  qrImage?: { id: string; name: string; src: string; width: number; height: number };
}

export function loadSavedState(): Partial<StoredState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.warn("Failed to read localStorage state:", err);
    return null;
  }
}

export function saveState(state: Partial<StoredState>): void {
  if (typeof window === "undefined") return;
  try {
    // If extraLogos src data URLs are too large (e.g. > 3MB), omit the src to prevent QuotaExceededError
    const safeLogos = (state.extraLogos || []).map((l) => {
      if (l.src && l.src.length > 500_000) {
        // Strip large data url from persistent storage, keep metadata
        return { ...l, src: "" };
      }
      return l;
    });

    const safeState = {
      ...state,
      extraLogos: safeLogos,
      qrImage: state.qrImage && state.qrImage.src.length > 500_000 ? { ...state.qrImage, src: "" } : state.qrImage,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
  } catch (err) {
    console.warn("Failed to save state to localStorage:", err);
  }
}

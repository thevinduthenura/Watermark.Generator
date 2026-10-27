/**
 * Storage helpers for Photographer User Portal (Profile, Presets, Simulator presets)
 */
import { loadSavedState, saveState, type StoredState } from "./storage";

export interface PhotographerProfile {
  studioName: string;
  photographerName: string;
  eventTitle: string;
  instagram: string;
  monogram: string;
  copyrightNotice: string;
}

export interface StudioPreset {
  id: string;
  name: string;
  category: "sports" | "nightlife" | "corporate" | "portrait";
  description: string;
  values: {
    eventTitle?: string;
    photographer?: string;
    subtitle?: string;
    tag?: string;
    location?: string;
  };
  orientation: "landscape" | "portrait";
  bannerOnly: boolean;
}

export const DEFAULT_PRESETS: StudioPreset[] = [
  {
    id: "preset-sports-volt",
    name: "Milaq High-Speed Sports",
    category: "sports",
    description: "High-contrast dynamic tag for marathons, motorsports, and athletic tournaments.",
    values: {
      eventTitle: "GRAND PRIX 2026",
      photographer: "MILAQ CREATIVE TEAM",
      subtitle: "OFFICIAL TRACKSIDE COVERAGE",
      tag: "#SPEED2026",
      location: "CIRCUIT ARENA",
    },
    orientation: "landscape",
    bannerOnly: false,
  },
  {
    id: "preset-nightlife-growtica",
    name: "Growtica Neon Club & Gala",
    category: "nightlife",
    description: "Dark ambient aesthetic for concerts, electronic music festivals, and evening galas.",
    values: {
      eventTitle: "MIDNIGHT SESSIONS",
      photographer: "GROWTICA VISUALS",
      subtitle: "LIVE AT ARENA VIP",
      tag: "#GROWTICA_LIVE",
      location: "COLOMBO ARENA",
    },
    orientation: "landscape",
    bannerOnly: false,
  },
  {
    id: "preset-restio-portrait",
    name: "Restio Modern Studio",
    category: "portrait",
    description: "Architectural, editorial, and fashion portrait watermark with minimal typographic impact.",
    values: {
      eventTitle: "RESTIO COLLECTION",
      photographer: "ALEX RIVERA",
      subtitle: "EDITORIAL CAPTURES",
      tag: "@RESTIO_STUDIO",
      location: "STUDIO 01",
    },
    orientation: "portrait",
    bannerOnly: false,
  },
  {
    id: "preset-corporate-convocation",
    name: "Apex Convocation & Summit",
    category: "corporate",
    description: "Formal, clean typography suitable for university graduations and corporate summits.",
    values: {
      eventTitle: "ANNUAL CONVOCATION",
      photographer: "PRESS MEDIA GUILD",
      subtitle: "FACULTY OF COMPUTING",
      tag: "CLASS OF 2026",
      location: "MAIN AUDITORIUM",
    },
    orientation: "landscape",
    bannerOnly: false,
  },
];

const PROFILE_KEY = "watermark_photographer_profile_v1";
const CUSTOM_PRESETS_KEY = "watermark_custom_presets_v1";

export function loadPhotographerProfile(): PhotographerProfile {
  if (typeof window === "undefined") {
    return {
      studioName: "MILAQ VISUALS",
      photographerName: "ALEX RIVERA",
      eventTitle: "CHAMPIONSHIP FINALS",
      instagram: "@milaq_creatives",
      monogram: "MQ",
      copyrightNotice: "© 2026 ALL RIGHTS RESERVED",
    };
  }
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) {
      return {
        studioName: "MILAQ VISUALS",
        photographerName: "ALEX RIVERA",
        eventTitle: "CHAMPIONSHIP FINALS",
        instagram: "@milaq_creatives",
        monogram: "MQ",
        copyrightNotice: "© 2026 ALL RIGHTS RESERVED",
      };
    }
    return JSON.parse(raw);
  } catch {
    return {
      studioName: "MILAQ VISUALS",
      photographerName: "ALEX RIVERA",
      eventTitle: "CHAMPIONSHIP FINALS",
      instagram: "@milaq_creatives",
      monogram: "MQ",
      copyrightNotice: "© 2026 ALL RIGHTS RESERVED",
    };
  }
}

export function savePhotographerProfile(profile: PhotographerProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("Failed to save profile:", err);
  }
}

export function applyProfileToGenerator(profile: PhotographerProfile): void {
  const current = loadSavedState() || { values: {}, selectedResolutions: ["5184x3456"], orientation: "landscape" };
  const updatedValues = { ...(current.values || {}) };

  // Explicitly map all known standard template field IDs
  updatedValues["event"] = profile.eventTitle;
  updatedValues["eventTitle"] = profile.eventTitle;
  updatedValues["title"] = profile.eventTitle;
  updatedValues["photographer"] = profile.photographerName;
  updatedValues["photo"] = profile.photographerName;
  updatedValues["credit"] = profile.photographerName;
  updatedValues["author"] = profile.photographerName;
  updatedValues["copyright"] = profile.copyrightNotice;
  updatedValues["rights"] = profile.copyrightNotice;
  updatedValues["club_name"] = profile.studioName;
  updatedValues["studio"] = profile.studioName;
  updatedValues["subtitle"] = profile.studioName;
  updatedValues["sub"] = profile.studioName;
  updatedValues["instagram"] = profile.instagram;
  updatedValues["tag"] = profile.instagram;

  // Dynamically update any other existing keys based on substring matching
  for (const key of Object.keys(updatedValues)) {
    const lower = key.toLowerCase();
    if (lower.includes("photo") || lower.includes("credit") || lower.includes("author") || lower.includes("by")) {
      updatedValues[key] = profile.photographerName;
    } else if (lower.includes("event") || lower.includes("title") || lower.includes("main")) {
      updatedValues[key] = profile.eventTitle;
    } else if (lower.includes("club") || lower.includes("studio") || lower.includes("sub")) {
      updatedValues[key] = profile.studioName;
    } else if (lower.includes("tag") || lower.includes("handle") || lower.includes("insta")) {
      updatedValues[key] = profile.instagram;
    } else if (lower.includes("copy") || lower.includes("rights")) {
      updatedValues[key] = profile.copyrightNotice;
    }
  }

  saveState({
    ...current,
    values: updatedValues,
  });
}

export function applyPresetToGenerator(preset: StudioPreset): void {
  const current = loadSavedState() || { values: {}, selectedResolutions: ["5184x3456"], orientation: "landscape" };
  const updatedValues = { ...(current.values || {}) };

  // Overlay preset values
  if (preset.values.eventTitle) {
    updatedValues["event"] = preset.values.eventTitle;
    updatedValues["eventTitle"] = preset.values.eventTitle;
    updatedValues["title"] = preset.values.eventTitle;
  }
  if (preset.values.photographer) {
    updatedValues["photographer"] = preset.values.photographer;
    updatedValues["photo"] = preset.values.photographer;
    updatedValues["credit"] = preset.values.photographer;
  }
  if (preset.values.subtitle) {
    updatedValues["club_name"] = preset.values.subtitle;
    updatedValues["studio"] = preset.values.subtitle;
    updatedValues["subtitle"] = preset.values.subtitle;
    updatedValues["sub"] = preset.values.subtitle;
  }
  if (preset.values.tag) {
    updatedValues["instagram"] = preset.values.tag;
    updatedValues["tag"] = preset.values.tag;
  }

  // Scan and match remaining keys
  for (const k of Object.keys(updatedValues)) {
    const lower = k.toLowerCase();
    if (preset.values.eventTitle && (lower.includes("event") || lower.includes("title"))) {
      updatedValues[k] = preset.values.eventTitle;
    } else if (preset.values.photographer && (lower.includes("photo") || lower.includes("by") || lower.includes("credit"))) {
      updatedValues[k] = preset.values.photographer;
    } else if (preset.values.subtitle && (lower.includes("sub") || lower.includes("club") || lower.includes("studio"))) {
      updatedValues[k] = preset.values.subtitle;
    } else if (preset.values.tag && (lower.includes("tag") || lower.includes("insta"))) {
      updatedValues[k] = preset.values.tag;
    }
  }

  saveState({
    ...current,
    values: updatedValues,
    orientation: preset.orientation,
    bannerOnly: preset.bannerOnly,
  });
}

export function loadCustomPresets(): StudioPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomPreset(preset: StudioPreset): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadCustomPresets();
    const updated = [preset, ...existing.filter((p) => p.id !== preset.id)];
    localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn("Failed to save custom preset:", err);
  }
}

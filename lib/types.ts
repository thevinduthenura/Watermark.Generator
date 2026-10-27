/**
 * Shared type definitions for templates and rendering.
 *
 * All box coordinates are FRACTIONS (0..1) of the banner's width/height so a
 * template scales to any output resolution. Font sizes are fractions of the
 * banner HEIGHT.
 */

export type HAlign = "left" | "center" | "right";
export type VAlign = "top" | "middle" | "bottom";

/** A rectangle expressed as fractions of the banner size. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TextField {
  id: string;
  label: string;
  placeholder?: string;
  defaultValue?: string;
  box: Box;
  font: string;
  weight: number;
  color: string;
  align: HAlign;
  valign: VAlign;
  uppercase: boolean;
  /** Max font size, as a fraction of banner height. */
  maxFontSize: number;
  /** Min font size, as a fraction of banner height. */
  minFontSize: number;
  maxLines: 1 | 2;
  /** Extra letter spacing in em (optional). */
  letterSpacing?: number;
}

export interface LogoSlot {
  id: string;
  label: string;
  box: Box;
}

export interface QrSlot {
  label: string;
  box: Box;
}

export interface ExtraLogosZone {
  box: Box;
  /** Gap between logos, as a fraction of banner WIDTH. */
  gapPercent: number;
  align: HAlign;
  /** Show vertical divider lines between logos. */
  showDividers?: boolean;
  /** Thickness of the divider line in pixels (default: 1.5). */
  dividerWidth?: number;
  /** Color of the divider line (default: rgba(255,255,255,0.25)). */
  dividerColor?: string;
  /** Height of the divider line as fraction of zone height (0.2 to 1.0, default: 0.75). */
  dividerHeightPercent?: number;
}

/** A custom font shipped with the template (uploaded by the admin). */
export interface TemplateFont {
  family: string;
  /** File name relative to the template folder, e.g. "fonts/MyFont.woff2". */
  file: string;
  weight?: number | string;
  style?: string;
}

export interface Placement {
  /** Banner width as % of the canvas width (1-100). */
  widthPercent: number;
  /** Gap below the banner as % of canvas height. */
  bottomMarginPercent: number;
  align: HAlign;
}

/** The on-disk / in-database template.json format. */
export interface Template {
  name: string;
  blankTag: string;
  naturalWidth: number;
  naturalHeight: number;
  placement: Placement;
  fields: TextField[];
  logoSlots: LogoSlot[];
  qrSlot?: QrSlot | null;
  extraLogosZone?: ExtraLogosZone | null;
  fonts?: TemplateFont[];
  /** Google Font families to load, e.g. ["Noto Sans", "Oswald"]. */
  googleFonts?: string[];
}

/** Where a template came from, for listing in the UI. */
export type TemplateSource = "repo" | "cloud" | "custom";

export interface TemplateRef {
  id: string;
  name: string;
  source: TemplateSource;
  /** Base URL that relative files (blankTag, fonts) resolve against. */
  baseUrl: string;
}

/** A template plus its decoded assets, ready to render. */
export interface LoadedTemplate {
  ref: TemplateRef;
  template: Template;
  blankTag: CanvasImageSource & { width: number; height: number };
}

/** A user-supplied image (decoded) with metadata. */
export interface UserImage {
  id: string;
  name: string;
  /** data: URL, used for persistence and thumbnails. */
  src: string;
  image: HTMLImageElement | ImageBitmap;
  width: number;
  height: number;
}

export interface FieldAdjustment {
  /** Offset X in percentage of banner width (-20 to +20). */
  offsetX?: number;
  /** Offset Y in percentage of banner height (-20 to +20). */
  offsetY?: number;
  /** Font size multiplier (0.5 to 2.0). */
  scale?: number;
  /** Custom font override selected by the user. */
  font?: string;
}

export interface ExtraLogosDividerOptions {
  showDividers?: boolean;
  dividerWidth?: number;
  dividerColor?: string;
  dividerHeightPercent?: number;
}

/** Everything the renderer needs besides the template. */
export interface RenderInputs {
  values: Record<string, string>;
  logoSlotImages: Record<string, UserImage | undefined>;
  qrImage?: UserImage;
  extraLogos: UserImage[];
  /** Optional interactive offsets, font choice, and scale applied by the photographer. */
  fieldAdjustments?: Record<string, FieldAdjustment>;
  /** Optional runtime divider customization for extra logos. */
  extraLogosDivider?: ExtraLogosDividerOptions;
}

export type Orientation = "landscape" | "portrait";

export interface Size {
  width: number;
  height: number;
}

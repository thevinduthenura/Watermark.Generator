"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import JSZip from "jszip";
import Header from "@/components/generator/Header";
import Footer from "@/components/generator/Footer";
import gsap from "gsap";
import {
  Stamp,
  Layers,
  Wand2,
  Image as ImageIcon,
  Type,
  Grid3X3,
  Download,
  Sliders,
  RefreshCw,
  Palette,
  ShieldCheck,
  RotateCw,
  Maximize2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Sparkles,
  Camera,
  FolderArchive,
  ArrowRight,
  Sun,
  Contrast,
  SlidersHorizontal,
} from "lucide-react";
import styles from "./page.module.css";

// Photoshop-grade blend mode options
const BLEND_MODES = [
  { group: "Standard", modes: [{ id: "source-over", label: "Normal" }] },
  {
    group: "Darken",
    modes: [
      { id: "darken", label: "Darken" },
      { id: "multiply", label: "Multiply" },
      { id: "color-burn", label: "Color Burn" },
    ],
  },
  {
    group: "Lighten",
    modes: [
      { id: "lighten", label: "Lighten" },
      { id: "screen", label: "Screen" },
      { id: "color-dodge", label: "Color Dodge" },
    ],
  },
  {
    group: "Contrast",
    modes: [
      { id: "overlay", label: "Overlay" },
      { id: "soft-light", label: "Soft Light" },
      { id: "hard-light", label: "Hard Light" },
    ],
  },
  {
    group: "Inversion",
    modes: [
      { id: "difference", label: "Difference" },
      { id: "exclusion", label: "Exclusion" },
    ],
  },
  {
    group: "Component",
    modes: [
      { id: "luminosity", label: "Luminosity" },
      { id: "color", label: "Color" },
    ],
  },
];

const FONTS = [
  "Outfit",
  "Inter",
  "Mona Sans",
  "Montserrat",
  "Playfair Display",
  "Raleway",
  "JetBrains Mono",
  "Impact",
  "Georgia",
  "Courier New",
  "Times New Roman",
  "Arial",
];

interface PhotoItem {
  id: string;
  name: string;
  img: HTMLImageElement;
  url: string;
}

export default function StamperPage() {
  // Mode: "text" | "logo"
  const [mode, setMode] = useState<"text" | "logo">("text");

  // Photos queue
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(-1);

  // Text Watermark Settings
  const [text, setText] = useState<string>("© MR.THEVIYA");
  const [font, setFont] = useState<string>("Outfit");
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [isBold, setIsBold] = useState<boolean>(true);
  const [hasShadow, setHasShadow] = useState<boolean>(true);
  const [shadowColor, setShadowColor] = useState<string>("#000000");
  const [shadowBlur, setShadowBlur] = useState<number>(15);

  // Logo Watermark Settings
  const [rawLogoImg, setRawLogoImg] = useState<HTMLImageElement | null>(null);
  const [processedLogoCanvas, setProcessedLogoCanvas] = useState<HTMLCanvasElement | null>(null);

  // Background Removal Tool Settings
  const [removeBgEnabled, setRemoveBgEnabled] = useState<boolean>(false);
  const [removeBgMode, setRemoveBgMode] = useState<"white" | "black" | "custom">("white");
  const [customKeyColor, setCustomKeyColor] = useState<string>("#ffffff");
  const [bgTolerance, setBgTolerance] = useState<number>(35);
  const [bgFeather, setBgFeather] = useState<number>(2);

  // Dimensions & Transformation
  const [sizePercent, setSizePercent] = useState<number>(mode === "text" ? 8 : 22);
  const [opacity, setOpacity] = useState<number>(75);
  const [rotation, setRotation] = useState<number>(0);
  const [blendMode, setBlendMode] = useState<string>("source-over");

  // Placement Settings
  const [placement, setPlacement] = useState<"single" | "tile">("single");
  const [gridPos, setGridPos] = useState<number>(8); // 0..8, default 8 (Bottom Right)
  const [marginPercent, setMarginPercent] = useState<number>(4);
  const [tileSpacing, setTileSpacing] = useState<number>(70);

  // Export Settings
  const [exportFormat, setExportFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/png");
  const [exportQuality, setExportQuality] = useState<number>(92);
  const [isBatchExporting, setIsBatchExporting] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [mobileTab, setMobileTab] = useState<"controls" | "preview">("controls");

  const mainCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Initial GSAP animation
  useEffect(() => {
    if (!pageContainerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `.${styles.controlCard}, .${styles.canvasCard}`,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: "power3.out" }
      );
    }, pageContainerRef);
    return () => ctx.revert();
  }, []);

  // Process Logo image whenever background removal parameters change
  useEffect(() => {
    if (!rawLogoImg) {
      setProcessedLogoCanvas(null);
      return;
    }

    if (!removeBgEnabled) {
      // Just wrap raw image in a canvas
      const c = document.createElement("canvas");
      c.width = rawLogoImg.naturalWidth;
      c.height = rawLogoImg.naturalHeight;
      const ctx = c.getContext("2d");
      if (ctx) ctx.drawImage(rawLogoImg, 0, 0);
      setProcessedLogoCanvas(c);
      return;
    }

    // Chroma key / background removal algorithm
    const c = document.createElement("canvas");
    const w = rawLogoImg.naturalWidth;
    const h = rawLogoImg.naturalHeight;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(rawLogoImg, 0, 0);
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;

    let targetR = 255;
    let targetG = 255;
    let targetB = 255;

    if (removeBgMode === "black") {
      targetR = 0;
      targetG = 0;
      targetB = 0;
    } else if (removeBgMode === "custom") {
      const hex = customKeyColor.replace("#", "");
      targetR = parseInt(hex.substring(0, 2), 16) || 255;
      targetG = parseInt(hex.substring(2, 4), 16) || 255;
      targetB = parseInt(hex.substring(4, 6), 16) || 255;
    }

    const tol = (bgTolerance / 100) * 441.67; // Max Euclidean RGB distance is ~441.67
    const feather = (bgFeather / 100) * 100;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (a === 0) continue;

      // Euclidean distance in RGB color space
      const dist = Math.sqrt(
        (r - targetR) * (r - targetR) +
        (g - targetG) * (g - targetG) +
        (b - targetB) * (b - targetB)
      );

      if (dist < tol) {
        // Pixel is within tolerance: feather smoothly
        if (feather > 0 && dist > tol * 0.7) {
          const factor = (dist - tol * 0.7) / (tol * 0.3);
          data[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)));
        } else {
          data[i + 3] = 0;
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
    setProcessedLogoCanvas(c);
  }, [rawLogoImg, removeBgEnabled, removeBgMode, customKeyColor, bgTolerance, bgFeather]);

  // Construct watermark stamp canvas based on settings
  const generateWatermarkStamp = useCallback(
    (targetWidth: number): HTMLCanvasElement | null => {
      const scaleBase = (targetWidth * sizePercent) / 100;

      if (mode === "logo") {
        const logoSrc = processedLogoCanvas || rawLogoImg;
        if (!logoSrc) return null;

        const stamp = document.createElement("canvas");
        const ctx = stamp.getContext("2d");
        if (!ctx) return null;

        const aspect = logoSrc.width / logoSrc.height;
        stamp.width = Math.max(1, Math.round(scaleBase));
        stamp.height = Math.max(1, Math.round(scaleBase / aspect));

        ctx.drawImage(logoSrc, 0, 0, stamp.width, stamp.height);
        return stamp;
      }

      // Text Watermark
      if (!text.trim()) return null;

      const stamp = document.createElement("canvas");
      const ctx = stamp.getContext("2d");
      if (!ctx) return null;

      const fontSize = Math.max(12, Math.round(scaleBase));
      const fontStr = `${isBold ? "bold " : ""}${fontSize}px "${font}", sans-serif`;

      ctx.font = fontStr;
      const metrics = ctx.measureText(text);
      const textWidth = Math.ceil(metrics.width);
      const pad = Math.round(fontSize * 0.3);

      stamp.width = textWidth + pad * 2;
      stamp.height = Math.round(fontSize * 1.5) + pad;

      ctx.font = fontStr;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";

      if (hasShadow) {
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = (shadowBlur / 100) * fontSize;
        ctx.shadowOffsetX = fontSize * 0.04;
        ctx.shadowOffsetY = fontSize * 0.04;
      }

      ctx.fillStyle = textColor;
      ctx.fillText(text, stamp.width / 2, stamp.height / 2);

      return stamp;
    },
    [
      mode,
      processedLogoCanvas,
      rawLogoImg,
      sizePercent,
      text,
      font,
      isBold,
      textColor,
      hasShadow,
      shadowColor,
      shadowBlur,
    ]
  );

  // Render composite onto any canvas
  const renderComposite = useCallback(
    (canvas: HTMLCanvasElement, baseImg: HTMLImageElement) => {
      const W = baseImg.naturalWidth || baseImg.width;
      const H = baseImg.naturalHeight || baseImg.height;
      canvas.width = W;
      canvas.height = H;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Draw base photo
      ctx.drawImage(baseImg, 0, 0, W, H);

      // 2. Generate watermark stamp
      const stamp = generateWatermarkStamp(W);
      if (!stamp) return;

      ctx.save();
      ctx.globalAlpha = opacity / 100;
      ctx.globalCompositeOperation = blendMode as GlobalCompositeOperation;

      const rad = (rotation * Math.PI) / 180;

      if (placement === "tile") {
        // Tiled diagonal pattern
        const gapX = stamp.width * (1 + tileSpacing / 100);
        const gapY = stamp.height * (1 + tileSpacing / 100);
        const diag = Math.hypot(W, H);
        let row = 0;

        ctx.translate(W / 2, H / 2);
        ctx.rotate(rad);

        for (let y = -diag / 2; y < diag / 2; y += gapY, row++) {
          const shift = row % 2 ? gapX / 2 : 0;
          for (let x = -diag / 2 - shift; x < diag / 2; x += gapX) {
            ctx.drawImage(stamp, x - stamp.width / 2, y - stamp.height / 2);
          }
        }
      } else {
        // 9-point Anchor Grid
        const margin = (W * marginPercent) / 100;
        const col = gridPos % 3; // 0: left, 1: center, 2: right
        const row = Math.floor(gridPos / 3); // 0: top, 1: center, 2: bottom

        let x = 0;
        let y = 0;

        if (col === 0) x = margin + stamp.width / 2;
        else if (col === 1) x = W / 2;
        else x = W - margin - stamp.width / 2;

        if (row === 0) y = margin + stamp.height / 2;
        else if (row === 1) y = H / 2;
        else y = H - margin - stamp.height / 2;

        ctx.translate(x, y);
        ctx.rotate(rad);
        ctx.drawImage(stamp, -stamp.width / 2, -stamp.height / 2);
      }

      ctx.restore();
    },
    [generateWatermarkStamp, opacity, blendMode, rotation, placement, tileSpacing, marginPercent, gridPos]
  );

  // Redraw preview whenever settings or active photo change
  useEffect(() => {
    if (activePhotoIdx >= 0 && photos[activePhotoIdx] && mainCanvasRef.current) {
      renderComposite(mainCanvasRef.current, photos[activePhotoIdx].img);
    }
  }, [activePhotoIdx, photos, renderComposite]);

  // Handle uploading photos
  const handleAddPhotos = (fileList: FileList | null) => {
    if (!fileList || !fileList.length) return;
    const imageFiles = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;

    const loadedPromises = imageFiles.map((file) => {
      return new Promise<PhotoItem>((resolve) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          resolve({
            id: `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            name: file.name,
            img,
            url,
          });
        };
        img.src = url;
      });
    });

    Promise.all(loadedPromises).then((newItems) => {
      setPhotos((prev) => {
        const next = [...prev, ...newItems];
        if (activePhotoIdx < 0 && next.length) {
          setActivePhotoIdx(0);
        }
        return next;
      });
      if (typeof window !== "undefined" && window.innerWidth <= 1024) {
        setMobileTab("preview");
      }
      setStatusMsg({
        type: "success",
        text: `Loaded ${newItems.length} photo${newItems.length > 1 ? "s" : ""} to workspace queue.`,
      });
      setTimeout(() => setStatusMsg(null), 3000);
    });
  };

  // Handle uploading logo
  const handleLogoUpload = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      setRawLogoImg(img);
      setStatusMsg({
        type: "success",
        text: `Logo "${file.name}" loaded (${img.naturalWidth} × ${img.naturalHeight}px).`,
      });
      setTimeout(() => setStatusMsg(null), 3000);
    };
    img.src = url;
  };

  // Download single active photo
  const handleDownloadActive = () => {
    if (activePhotoIdx < 0 || !photos[activePhotoIdx]) return;
    const active = photos[activePhotoIdx];
    const offCanvas = document.createElement("canvas");
    renderComposite(offCanvas, active.img);

    const ext = exportFormat.split("/")[1].replace("jpeg", "jpg");
    offCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = active.name.replace(/\.[^/.]+$/, "") + `-watermarked.${ext}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      },
      exportFormat,
      exportQuality / 100
    );
  };

  // Batch Download All Photos as ZIP
  const handleDownloadAllZip = async () => {
    if (!photos.length) return;
    setIsBatchExporting(true);
    setBatchProgress(0);

    try {
      const zip = new JSZip();
      const ext = exportFormat.split("/")[1].replace("jpeg", "jpg");

      for (let i = 0; i < photos.length; i++) {
        const item = photos[i];
        const offCanvas = document.createElement("canvas");
        renderComposite(offCanvas, item.img);

        const blob = await new Promise<Blob | null>((resolve) => {
          offCanvas.toBlob((b) => resolve(b), exportFormat, exportQuality / 100);
        });

        if (blob) {
          const fileName = item.name.replace(/\.[^/.]+$/, "") + `-watermarked.${ext}`;
          zip.file(fileName, blob);
        }

        setBatchProgress(Math.round(((i + 1) / photos.length) * 100));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `watermarked_photos_${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatusMsg({
        type: "success",
        text: `Exported ${photos.length} watermarked photos as ZIP!`,
      });
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (err) {
      console.error("Batch export error:", err);
      setStatusMsg({ type: "error", text: "Failed to create batch ZIP archive." });
    } finally {
      setIsBatchExporting(false);
      setBatchProgress(0);
    }
  };

  return (
    <div ref={pageContainerRef} className={styles.stamperContainer}>
      <Header activeTab="stamper" />

      {/* Atmospheric corner highlights */}
      <div className={styles.ambientTopGlow} />

      <main className={styles.stamperMain}>
        {/* Top Title Banner */}
        <div className={styles.headerBanner}>
          <div className={styles.badgeRow}>
            <span className={styles.studioPill}>
              <Sparkles size={12} color="var(--accent-green)" />
              <span>DIRECT PHOTO STAMPER & CHROMA KEY</span>
            </span>
            <span className={styles.modeTag}>100% CLIENT-SIDE · GPU BLEND MODES</span>
          </div>
          <h1 className={styles.pageTitle}>Direct Batch Photo Watermarker</h1>
          <p className={styles.pageDesc}>
            Stamp text, logos, or seals directly onto photos with Photoshop blend modes, auto background removal, and instant ZIP download.
          </p>
        </div>

        {statusMsg && (
          <div className={`${styles.statusBanner} ${statusMsg.type === "error" ? styles.statusError : styles.statusSuccess}`}>
            {statusMsg.type === "error" ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Mobile View Switcher (Visible on <= 1024px) */}
        <div className={styles.mobileViewSwitcher}>
          <button
            type="button"
            className={`${styles.mobileViewBtn} ${mobileTab === "controls" ? styles.mobileViewBtnActive : ""}`}
            onClick={() => setMobileTab("controls")}
          >
            <Sliders size={14} />
            <span>WATERMARK SETUP</span>
          </button>
          <button
            type="button"
            className={`${styles.mobileViewBtn} ${mobileTab === "preview" ? styles.mobileViewBtnActive : ""}`}
            onClick={() => setMobileTab("preview")}
          >
            <Camera size={14} />
            <span>PREVIEW & EXPORT</span>
            {photos.length > 0 && (
              <span className={styles.mobileViewBadge}>{photos.length}</span>
            )}
          </button>
        </div>

        <div className={styles.workspaceGrid}>
          {/* ================= LEFT CONTROLS ================= */}
          <div className={`${styles.controlColumn} ${mobileTab !== "controls" ? styles.mobileHiddenOnMobile : ""}`}>
            {/* 1. Mode Segment */}
            <div className={styles.controlCard}>
              <div className={styles.cardHeader}>
                <span className={styles.stepNum}>01</span>
                <span className={styles.cardHeading}>WATERMARK TYPE</span>
              </div>

              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${mode === "text" ? styles.modeActive : ""}`}
                  onClick={() => {
                    setMode("text");
                    setSizePercent(8);
                  }}
                >
                  <Type size={14} />
                  <span>TEXT WATERMARK</span>
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${mode === "logo" ? styles.modeActive : ""}`}
                  onClick={() => {
                    setMode("logo");
                    setSizePercent(22);
                  }}
                >
                  <ImageIcon size={14} />
                  <span>LOGO / SEAL</span>
                </button>
              </div>

              {/* Text Controls */}
              {mode === "text" ? (
                <div className={styles.subForm}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>WATERMARK TEXT</label>
                    <input
                      type="text"
                      className={styles.textInput}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="e.g. © MR.THEVIYA PHOTOGRAPHY"
                    />
                  </div>

                  <div className={styles.formRow}>
                    <div className={styles.fieldGroup} style={{ flex: 2 }}>
                      <label className={styles.label}>FONT FAMILY</label>
                      <select className={styles.selectInput} value={font} onChange={(e) => setFont(e.target.value)}>
                        {FONTS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className={styles.fieldGroup} style={{ flex: 1 }}>
                      <label className={styles.label}>COLOR</label>
                      <div className={styles.colorWrapper}>
                        <input
                          type="color"
                          className={styles.colorPicker}
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                        />
                        <span className={styles.colorHex}>{textColor.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.toggleRow}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={isBold}
                        onChange={(e) => setIsBold(e.target.checked)}
                      />
                      <span>Bold Weight</span>
                    </label>

                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={hasShadow}
                        onChange={(e) => setHasShadow(e.target.checked)}
                      />
                      <span>Drop Shadow</span>
                    </label>
                  </div>
                </div>
              ) : (
                /* Logo Upload & Background Removal Controls */
                <div className={styles.subForm}>
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>LOGO / GRAPHIC IMAGE</label>
                    <div
                      className={styles.uploadDropzone}
                      onClick={() => logoInputRef.current?.click()}
                    >
                      <Upload size={18} color="var(--accent-green)" />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "12px", color: "#fff" }}>
                          {rawLogoImg ? "Click to Replace Logo" : "Choose Logo (PNG / JPG / WebP)"}
                        </div>
                        <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>
                          Auto Background Removal works with any JPG or PNG
                        </div>
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        onChange={(e) => handleLogoUpload(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>

                  {/* AUTO BACKGROUND REMOVAL PANEL */}
                  <div className={styles.bgRemoverBox}>
                    <div className={styles.bgRemoverHeader}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Wand2 size={15} color="var(--accent-green)" />
                        <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.08em", color: "#fff" }}>
                          AUTO BACKGROUND REMOVAL
                        </span>
                      </div>
                      <label className={styles.switch}>
                        <input
                          type="checkbox"
                          checked={removeBgEnabled}
                          onChange={(e) => setRemoveBgEnabled(e.target.checked)}
                        />
                        <span className={styles.slider} />
                      </label>
                    </div>

                    {removeBgEnabled && (
                      <div className={styles.bgRemoverBody}>
                        <div className={styles.presetButtonsRow}>
                          <button
                            type="button"
                            className={`${styles.bgPresetBtn} ${removeBgMode === "white" ? styles.bgPresetActive : ""}`}
                            onClick={() => setRemoveBgMode("white")}
                          >
                            <Sun size={12} />
                            <span>Remove White</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.bgPresetBtn} ${removeBgMode === "black" ? styles.bgPresetActive : ""}`}
                            onClick={() => setRemoveBgMode("black")}
                          >
                            <Contrast size={12} />
                            <span>Remove Black</span>
                          </button>
                          <button
                            type="button"
                            className={`${styles.bgPresetBtn} ${removeBgMode === "custom" ? styles.bgPresetActive : ""}`}
                            onClick={() => setRemoveBgMode("custom")}
                          >
                            <Palette size={12} />
                            <span>Color Key</span>
                          </button>
                        </div>

                        {removeBgMode === "custom" && (
                          <div className={styles.fieldGroup} style={{ marginTop: "10px" }}>
                            <label className={styles.label}>KEY COLOR TO REMOVE</label>
                            <input
                              type="color"
                              className={styles.colorPicker}
                              value={customKeyColor}
                              onChange={(e) => setCustomKeyColor(e.target.value)}
                            />
                          </div>
                        )}

                        <div className={styles.sliderRow} style={{ marginTop: "10px" }}>
                          <div className={styles.sliderLabelGroup}>
                            <span>COLOR TOLERANCE</span>
                            <span className={styles.sliderVal}>{bgTolerance}%</span>
                          </div>
                          <input
                            type="range"
                            min="5"
                            max="90"
                            value={bgTolerance}
                            onChange={(e) => setBgTolerance(Number(e.target.value))}
                            className={styles.rangeSlider}
                          />
                        </div>

                        <div className={styles.sliderRow} style={{ marginTop: "8px" }}>
                          <div className={styles.sliderLabelGroup}>
                            <span>EDGE FEATHER / SMOOTH</span>
                            <span className={styles.sliderVal}>{bgFeather}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="8"
                            value={bgFeather}
                            onChange={(e) => setBgFeather(Number(e.target.value))}
                            className={styles.rangeSlider}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Photoshop Blend Modes & Appearance */}
            <div className={styles.controlCard}>
              <div className={styles.cardHeader}>
                <span className={styles.stepNum}>02</span>
                <span className={styles.cardHeading}>PHOTOSHOP BLEND MODE & TRANSFORM</span>
              </div>

              {/* Photoshop Blend Mode Selector */}
              <div className={styles.fieldGroup}>
                <label className={styles.label}>
                  <span>LAYER BLEND MODE</span>
                  <span className={styles.blendBadge}>{blendMode.toUpperCase()}</span>
                </label>
                <select
                  className={styles.selectInput}
                  value={blendMode}
                  onChange={(e) => setBlendMode(e.target.value)}
                >
                  {BLEND_MODES.map((group) => (
                    <optgroup key={group.group} label={`── ${group.group} ──`}>
                      {group.modes.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.label} ({m.id})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className={styles.helpText}>
                  Tip: <strong>Screen</strong> dissolves black backgrounds into lighting. <strong>Multiply</strong> blends white logos seamlessly.
                </p>
              </div>

              {/* Size Slider */}
              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>SIZE RELATIVE TO PHOTO</span>
                  <span className={styles.sliderVal}>{sizePercent}%</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="65"
                  value={sizePercent}
                  onChange={(e) => setSizePercent(Number(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>

              {/* Opacity Slider */}
              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>OPACITY</span>
                  <span className={styles.sliderVal}>{opacity}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>

              {/* Rotation Slider */}
              <div className={styles.sliderRow}>
                <div className={styles.sliderLabelGroup}>
                  <span>ROTATION ANGLE</span>
                  <span className={styles.sliderVal}>{rotation}°</span>
                </div>
                <input
                  type="range"
                  min="-90"
                  max="90"
                  value={rotation}
                  onChange={(e) => setRotation(Number(e.target.value))}
                  className={styles.rangeSlider}
                />
              </div>
            </div>

            {/* 3. Placement & Anchors */}
            <div className={styles.controlCard}>
              <div className={styles.cardHeader}>
                <span className={styles.stepNum}>03</span>
                <span className={styles.cardHeading}>PLACEMENT & TILED PATTERN</span>
              </div>

              <div className={styles.modeSwitch}>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${placement === "single" ? styles.modeActive : ""}`}
                  onClick={() => setPlacement("single")}
                >
                  <Grid3X3 size={14} />
                  <span>SINGLE ANCHOR</span>
                </button>
                <button
                  type="button"
                  className={`${styles.modeBtn} ${placement === "tile" ? styles.modeActive : ""}`}
                  onClick={() => setPlacement("tile")}
                >
                  <Layers size={14} />
                  <span>DIAGONAL TILED</span>
                </button>
              </div>

              {placement === "single" ? (
                <div>
                  <label className={styles.label}>9-POINT ANCHOR POSITION</label>
                  <div className={styles.anchorGrid}>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`${styles.anchorBtn} ${gridPos === idx ? styles.anchorActive : ""}`}
                        onClick={() => setGridPos(idx)}
                        aria-label={`Position ${idx}`}
                      >
                        <span className={styles.anchorDot} />
                      </button>
                    ))}
                  </div>

                  <div className={styles.sliderRow} style={{ marginTop: "14px" }}>
                    <div className={styles.sliderLabelGroup}>
                      <span>EDGE MARGIN</span>
                      <span className={styles.sliderVal}>{marginPercent}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="20"
                      value={marginPercent}
                      onChange={(e) => setMarginPercent(Number(e.target.value))}
                      className={styles.rangeSlider}
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.sliderRow}>
                  <div className={styles.sliderLabelGroup}>
                    <span>TILE SPACING & GAP</span>
                    <span className={styles.sliderVal}>{tileSpacing}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="250"
                    value={tileSpacing}
                    onChange={(e) => setTileSpacing(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                </div>
              )}
            </div>

            {/* 4. Format & Quality */}
            <div className={styles.controlCard}>
              <div className={styles.cardHeader}>
                <span className={styles.stepNum}>04</span>
                <span className={styles.cardHeading}>EXPORT OUTPUT SPECIFICATIONS</span>
              </div>

              <div className={styles.formRow}>
                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>FORMAT</label>
                  <select
                    className={styles.selectInput}
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as "image/png" | "image/jpeg" | "image/webp")}
                  >
                    <option value="image/png">PNG (Lossless)</option>
                    <option value="image/jpeg">JPEG (Standard)</option>
                    <option value="image/webp">WebP (Optimized)</option>
                  </select>
                </div>

                <div className={styles.fieldGroup} style={{ flex: 1 }}>
                  <label className={styles.label}>QUALITY ({exportQuality}%)</label>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={exportQuality}
                    onChange={(e) => setExportQuality(Number(e.target.value))}
                    className={styles.rangeSlider}
                  />
                </div>
              </div>
            </div>

            {/* Mobile Quick Switcher Helper */}
            <div className={styles.mobileHelperWrap}>
              <button
                type="button"
                className={styles.mobileHelperBtn}
                onClick={() => setMobileTab("preview")}
              >
                <Camera size={15} color="var(--accent-green)" />
                <span>VIEW LIVE PREVIEW & EXPORT</span>
                <span className={styles.mobileHelperBadge}>
                  {photos.length} {photos.length === 1 ? "photo" : "photos"}
                </span>
                <ArrowRight size={14} style={{ marginLeft: "auto" }} />
              </button>
            </div>
          </div>

          {/* ================= RIGHT PREVIEW & BATCH QUEUE ================= */}
          <div className={`${styles.previewColumn} ${mobileTab !== "preview" ? styles.mobileHiddenOnMobile : ""}`}>
            {/* Photos Dropzone Card */}
            <div className={styles.dropCard}>
              <div
                className={styles.dropZone}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleAddPhotos(e.dataTransfer.files);
                }}
              >
                <Camera size={26} color="var(--accent-green)" />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#fff" }}>
                    Drop Batch Event Photos Here or Click to Upload
                  </div>
                  <div style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                    Select single or multiple photos · 100% private in browser · Zero uploads
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => handleAddPhotos(e.target.files)}
                />
              </div>

              {/* Thumbnails Strip */}
              {photos.length > 0 && (
                <div className={styles.queueContainer}>
                  <div className={styles.queueHeader}>
                    <span style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", color: "var(--accent-green)" }}>
                      BATCH PHOTO QUEUE ({photos.length} PHOTOS)
                    </span>
                    <button
                      type="button"
                      className={styles.clearBtn}
                      onClick={() => {
                        setPhotos([]);
                        setActivePhotoIdx(-1);
                      }}
                    >
                      <Trash2 size={12} />
                      <span>Clear Queue</span>
                    </button>
                  </div>

                  <div className={styles.thumbnailStrip}>
                    {photos.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`${styles.thumbWrap} ${activePhotoIdx === idx ? styles.thumbActive : ""}`}
                        onClick={() => setActivePhotoIdx(idx)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.url} alt={item.name} className={styles.thumbImg} />
                        <span className={styles.thumbIndex}>{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Interactive Stage Canvas Card */}
            <div className={styles.canvasCard}>
              <div className={styles.canvasHeader}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span className={styles.recDot} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", fontWeight: 700, color: "#fff" }}>
                    {activePhotoIdx >= 0 && photos[activePhotoIdx]
                      ? `PREVIEW: ${photos[activePhotoIdx].name.toUpperCase()} (${photos[activePhotoIdx].img.naturalWidth} × ${photos[activePhotoIdx].img.naturalHeight}PX)`
                      : "STAGE VIEWPORT (NO PHOTO LOADED)"}
                  </span>
                </div>

                <div className={styles.canvasMeta}>
                  <span>BLEND: {blendMode.toUpperCase()}</span>
                  <span>OPACITY: {opacity}%</span>
                </div>
              </div>

              <div className={styles.stageViewport}>
                {photos.length === 0 ? (
                  <div className={styles.emptyStage}>
                    <ImageIcon size={48} strokeWidth={1.2} color="#333" />
                    <div style={{ marginTop: "12px", color: "#666", fontSize: "13px" }}>
                      Please drop one or more photos above to begin watermarking.
                    </div>
                  </div>
                ) : (
                  <canvas ref={mainCanvasRef} className={styles.mainCanvas} />
                )}
              </div>

              {/* Action Buttons & Batch Export */}
              <div className={styles.canvasActions}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={activePhotoIdx < 0 || isBatchExporting}
                  onClick={handleDownloadActive}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <Download size={15} />
                  <span>DOWNLOAD THIS PHOTO</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary"
                  disabled={photos.length === 0 || isBatchExporting}
                  onClick={handleDownloadAllZip}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <FolderArchive size={15} color="var(--accent-green)" />
                  <span>
                    {isBatchExporting
                      ? `PROCESSING (${batchProgress}%)...`
                      : `BATCH DOWNLOAD ALL AS ZIP (${photos.length})`}
                  </span>
                </button>
              </div>

              {isBatchExporting && (
                <div className={styles.progressBarWrapper}>
                  <div className={styles.progressBarFill} style={{ width: `${batchProgress}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky Mobile Floating Action Bar */}
        {photos.length > 0 && (
          <aside className={styles.stickyMobileBar}>
            <div className={styles.stickyMobileInner}>
              <div className={styles.stickyMetaBox}>
                <span className={styles.stickyPhotoBadge}>
                  {activePhotoIdx + 1} / {photos.length}
                </span>
                <span className={styles.stickyFormatBadge}>
                  {exportFormat.split("/")[1].toUpperCase()}
                </span>
              </div>

              <div className={styles.stickyBtnRow}>
                <button
                  type="button"
                  className={styles.stickySwitchBtn}
                  onClick={() => setMobileTab(mobileTab === "controls" ? "preview" : "controls")}
                  aria-label="Toggle view"
                >
                  {mobileTab === "controls" ? (
                    <>
                      <Camera size={13} />
                      <span>PREVIEW</span>
                    </>
                  ) : (
                    <>
                      <Sliders size={13} />
                      <span>EDIT</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  className={styles.stickySaveBtn}
                  disabled={activePhotoIdx < 0 || isBatchExporting}
                  onClick={handleDownloadActive}
                >
                  <Download size={14} />
                  <span>SAVE PHOTO</span>
                </button>

                {photos.length > 1 && (
                  <button
                    type="button"
                    className={styles.stickyZipBtn}
                    disabled={isBatchExporting}
                    onClick={handleDownloadAllZip}
                  >
                    <FolderArchive size={14} />
                    <span>ZIP ({photos.length})</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}
      </main>

      <Footer />
    </div>
  );
}

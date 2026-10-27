"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import Header from "@/components/generator/Header";
import Footer from "@/components/generator/Footer";
import BuilderCanvas, { type SelectedItemRef, type SelectableItemType } from "@/components/admin/BuilderCanvas";
import PropertyPanel from "@/components/admin/PropertyPanel";
import AuthModal from "@/components/admin/AuthModal";
import { validateTemplate } from "@/lib/template";
import {
  adminSaveTemplate,
  adminUploadTemplateFile,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { downloadBlob, loadImage, readFileAsArrayBuffer, readFileAsDataUrl, sanitizeFilename } from "@/lib/utils";
import { detectBannerBounds, cropImageRegion, type DetectedBounds } from "@/lib/imageDraw";
import type { Box, Template, TemplateFont } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import styles from "./page.module.css";

const DEFAULT_BLANK_TAG_PATH = "/templates/default/blank-tag.png";

export default function AdminPage() {
  const [template, setTemplate] = useState<Template>({
    name: "New Watermark Template",
    blankTag: "blank-tag.png",
    naturalWidth: 5184,
    naturalHeight: 285,
    placement: { widthPercent: 100, bottomMarginPercent: 0, align: "center" },
    fields: [
      {
        id: "event",
        label: "Event Name",
        placeholder: "ANNUAL COLOURS NIGHT",
        defaultValue: "ANNUAL COLOURS NIGHT",
        box: { x: 0.3, y: 0.1, w: 0.4, h: 0.8 },
        font: "Outfit",
        weight: 700,
        color: "#ffffff",
        align: "center",
        valign: "middle",
        uppercase: false,
        maxFontSize: 0.58,
        minFontSize: 0.2,
        maxLines: 2,
      },
      {
        id: "photographer",
        label: "Photographer",
        placeholder: "THEVINDU THENURA",
        defaultValue: "PHOTOGRAPHED BY THEVINDU",
        box: { x: 0.73, y: 0.14, w: 0.2, h: 0.45 },
        font: "Inter",
        weight: 600,
        color: "#ffffff",
        align: "right",
        valign: "middle",
        uppercase: true,
        maxFontSize: 0.32,
        minFontSize: 0.14,
        maxLines: 1,
      },
    ],
    logoSlots: [],
    qrSlot: {
      label: "QR Code",
      box: { x: 0.945, y: 0.14, w: 0.042, h: 0.72 },
    },
    extraLogosZone: {
      box: { x: 0.2, y: 0.18, w: 0.085, h: 0.64 },
      gapPercent: 0.008,
      align: "center",
    },
    googleFonts: ["Outfit", "Inter"],
  });

  const [blankTagImg, setBlankTagImg] = useState<HTMLImageElement | null>(null);
  const [blankTagBlob, setBlankTagBlob] = useState<Blob | null>(null);
  const [customFontFiles, setCustomFontFiles] = useState<{ file: File; name: string }[]>([]);
  const [selectedItem, setSelectedItem] = useState<SelectedItemRef | null>(null);
  const [activeTool, setActiveTool] = useState<"select" | "add_field" | "add_logo" | "add_qr" | "add_extra">("select");

  const [adminUser, setAdminUser] = useState<User | null>(null);
  const [cloudSlug, setCloudSlug] = useState<string>("custom-banner");
  const [publishing, setPublishing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fullCanvasState, setFullCanvasState] = useState<{
    rawImg: HTMLImageElement;
    rawBlob: Blob;
    croppedImg: HTMLImageElement;
    croppedBlob: Blob;
    bounds: DetectedBounds;
    isUsingCropped: boolean;
  } | null>(null);

  const blankTagInputRef = useRef<HTMLInputElement>(null);
  const importZipInputRef = useRef<HTMLInputElement>(null);

  // Load initial default blank tag image
  useEffect(() => {
    async function loadInitial() {
      try {
        const img = await loadImage(DEFAULT_BLANK_TAG_PATH);
        setBlankTagImg(img);
        // Also fetch blob for export
        const res = await fetch(DEFAULT_BLANK_TAG_PATH);
        if (res.ok) {
          const blob = await res.blob();
          setBlankTagBlob(blob);
        }
      } catch (err) {
        console.warn("Could not load default blank tag:", err);
      }
    }
    loadInitial();
  }, []);

  // Handle uploading a new Blank Tag PNG
  const handleUploadBlankTag = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(dataUrl);

      // Detect if user uploaded a full-size Photoshop canvas (e.g. 5184x3456) with banner at bottom
      const bounds = detectBannerBounds(img);
      if (bounds.isFullCanvas) {
        const cropped = await cropImageRegion(img, 0, bounds.minY, bounds.width, bounds.height);
        setFullCanvasState({
          rawImg: img,
          rawBlob: file,
          croppedImg: cropped.image,
          croppedBlob: cropped.blob,
          bounds,
          isUsingCropped: true,
        });

        setBlankTagImg(cropped.image);
        setBlankTagBlob(cropped.blob);

        const bottomMargin = Math.max(
          0,
          Math.round(((bounds.canvasHeight - (bounds.minY + bounds.height)) / bounds.canvasHeight) * 100)
        );

        setTemplate((prev) => ({
          ...prev,
          blankTag: file.name,
          naturalWidth: bounds.width,
          naturalHeight: bounds.height,
          placement: {
            ...prev.placement,
            widthPercent: 100,
            bottomMarginPercent: bottomMargin,
          },
        }));

        setStatusMessage({
          type: "success",
          text: `🎯 Auto-detected Photoshop full canvas (${bounds.canvasWidth} × ${bounds.canvasHeight}px)! Auto-cropped bottom watermark strip (${bounds.width} × ${bounds.height}px, ratio ${(bounds.width / bounds.height).toFixed(1)}:1).`,
        });
      } else {
        setFullCanvasState(null);
        setBlankTagImg(img);
        setBlankTagBlob(file);
        setTemplate((prev) => ({
          ...prev,
          blankTag: file.name,
          naturalWidth: img.naturalWidth || img.width,
          naturalHeight: img.naturalHeight || img.height,
        }));
        setStatusMessage({
          type: "success",
          text: `Loaded blank tag strip (${img.naturalWidth} × ${img.naturalHeight}px)`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: "Failed to read blank tag image file",
      });
    }
  };

  const handleToggleFullCanvas = () => {
    if (!fullCanvasState) return;
    const nextUsingCropped = !fullCanvasState.isUsingCropped;
    setFullCanvasState({ ...fullCanvasState, isUsingCropped: nextUsingCropped });

    if (nextUsingCropped) {
      setBlankTagImg(fullCanvasState.croppedImg);
      setBlankTagBlob(fullCanvasState.croppedBlob);
      setTemplate((prev) => ({
        ...prev,
        naturalWidth: fullCanvasState.bounds.width,
        naturalHeight: fullCanvasState.bounds.height,
      }));
    } else {
      setBlankTagImg(fullCanvasState.rawImg);
      setBlankTagBlob(fullCanvasState.rawBlob);
      setTemplate((prev) => ({
        ...prev,
        naturalWidth: fullCanvasState.bounds.canvasWidth,
        naturalHeight: fullCanvasState.bounds.canvasHeight,
      }));
    }
  };

  // Add custom font file (.woff2/.ttf)
  const handleAddCustomFont = (file: File) => {
    const family = file.name.replace(/\.[^/.]+$/, "");
    const relativePath = `fonts/${file.name}`;
    const fontObj: TemplateFont = {
      family,
      file: relativePath,
      weight: 400,
    };

    setCustomFontFiles((prev) => [...prev, { file, name: relativePath }]);
    setTemplate((prev) => ({
      ...prev,
      fonts: [...(prev.fonts || []), fontObj],
    }));
    setStatusMessage({
      type: "success",
      text: `Added custom font "${family}" (${file.name})`,
    });
  };

  // Update box coordinates
  const handleUpdateBox = (type: SelectableItemType, id: string | undefined, newBox: Box) => {
    if (type === "field" && id) {
      setTemplate((prev) => ({
        ...prev,
        fields: prev.fields.map((f) => (f.id === id ? { ...f, box: newBox } : f)),
      }));
    } else if (type === "logoSlot" && id) {
      setTemplate((prev) => ({
        ...prev,
        logoSlots: prev.logoSlots.map((s) => (s.id === id ? { ...s, box: newBox } : s)),
      }));
    } else if (type === "qrSlot" && template.qrSlot) {
      setTemplate((prev) => ({
        ...prev,
        qrSlot: { ...template.qrSlot!, box: newBox },
      }));
    } else if (type === "extraLogosZone" && template.extraLogosZone) {
      setTemplate((prev) => ({
        ...prev,
        extraLogosZone: { ...template.extraLogosZone!, box: newBox },
      }));
    }
  };

  // Handle box created by dragging on canvas
  const handleCreatedBox = (type: SelectableItemType, box: Box) => {
    if (type === "field") {
      const newId = `field_${Date.now()}`;
      setTemplate((prev) => ({
        ...prev,
        fields: [
          ...prev.fields,
          {
            id: newId,
            label: "Custom Field",
            placeholder: "Enter details",
            defaultValue: "Sample Text",
            box,
            font: "Outfit",
            weight: 600,
            color: "#ffffff",
            align: "center",
            valign: "middle",
            uppercase: false,
            maxFontSize: 0.5,
            minFontSize: 0.15,
            maxLines: 1,
          },
        ],
      }));
      setSelectedItem({ type: "field", id: newId });
    } else if (type === "logoSlot") {
      const newId = `logo_${Date.now()}`;
      setTemplate((prev) => ({
        ...prev,
        logoSlots: [...prev.logoSlots, { id: newId, label: "Logo Slot", box }],
      }));
      setSelectedItem({ type: "logoSlot", id: newId });
    } else if (type === "qrSlot") {
      setTemplate((prev) => ({
        ...prev,
        qrSlot: { label: "QR Code", box },
      }));
      setSelectedItem({ type: "qrSlot" });
    } else if (type === "extraLogosZone") {
      setTemplate((prev) => ({
        ...prev,
        extraLogosZone: { box, gapPercent: 0.01, align: "center" },
      }));
      setSelectedItem({ type: "extraLogosZone" });
    }
    setActiveTool("select");
  };

  // Delete an item
  const handleDeleteItem = (item: SelectedItemRef) => {
    if (item.type === "field" && item.id) {
      setTemplate((prev) => ({
        ...prev,
        fields: prev.fields.filter((f) => f.id !== item.id),
      }));
    } else if (item.type === "logoSlot" && item.id) {
      setTemplate((prev) => ({
        ...prev,
        logoSlots: prev.logoSlots.filter((s) => s.id !== item.id),
      }));
    } else if (item.type === "qrSlot") {
      setTemplate((prev) => ({ ...prev, qrSlot: null }));
    } else if (item.type === "extraLogosZone") {
      setTemplate((prev) => ({ ...prev, extraLogosZone: null }));
    }
    setSelectedItem(null);
  };

  // Export Template ZIP Package
  const handleExportZip = async () => {
    try {
      const zip = new JSZip();
      const folderName = sanitizeFilename(template.name).toLowerCase();

      // 1. template.json
      const jsonContent = JSON.stringify(template, null, 2);
      zip.file("template.json", jsonContent);

      // 2. blank-tag.png
      if (blankTagBlob) {
        zip.file(template.blankTag, blankTagBlob);
      } else {
        const res = await fetch(DEFAULT_BLANK_TAG_PATH);
        if (res.ok) {
          const b = await res.blob();
          zip.file("blank-tag.png", b);
        }
      }

      // 3. custom fonts
      for (const font of customFontFiles) {
        zip.file(font.name, font.file);
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      downloadBlob(zipBlob, `${folderName}_template.zip`);

      setStatusMessage({
        type: "success",
        text: `Exported ${folderName}_template.zip. To make it built-in: extract to public/templates/${folderName}/ and add to public/templates/index.json`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to export ZIP",
      });
    }
  };

  // Import Template ZIP or JSON
  const handleImportZip = async (file: File | null) => {
    if (!file) return;
    try {
      if (file.name.endsWith(".json")) {
        const text = await file.text();
        const parsed = validateTemplate(JSON.parse(text));
        setTemplate(parsed);
        setStatusMessage({ type: "success", text: `Imported template "${parsed.name}"` });
        return;
      }

      const zip = await JSZip.loadAsync(file);
      const jsonFile = zip.file("template.json");
      if (!jsonFile) throw new Error("No template.json found inside the ZIP file");

      const jsonText = await jsonFile.async("text");
      const parsed = validateTemplate(JSON.parse(jsonText));

      // Check if blank-tag is inside zip
      const blankFile = zip.file(parsed.blankTag) || zip.file("blank-tag.png");
      if (blankFile) {
        const blob = await blankFile.async("blob");
        const dataUrl = await readFileAsDataUrl(blob);
        const img = await loadImage(dataUrl);
        setBlankTagImg(img);
        setBlankTagBlob(blob);
      }

      setTemplate(parsed);
      setStatusMessage({
        type: "success",
        text: `Successfully imported "${parsed.name}" from ZIP archive`,
      });
    } catch (err: unknown) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to read template package",
      });
    } finally {
      if (importZipInputRef.current) importZipInputRef.current.value = "";
    }
  };

  // Publish Template to Supabase Cloud
  const handlePublishCloud = async () => {
    if (!adminUser) {
      setStatusMessage({ type: "error", text: "Please sign in as Admin to publish to cloud" });
      return;
    }
    const slug = sanitizeFilename(cloudSlug).toLowerCase();
    if (!slug) {
      setStatusMessage({ type: "error", text: "Please provide a valid slug (e.g. ssc-standard)" });
      return;
    }

    try {
      setPublishing(true);
      setStatusMessage(null);

      // 1. Upload blank tag PNG
      let blankTagUrl = template.blankTag;
      if (blankTagBlob) {
        blankTagUrl = await adminUploadTemplateFile(
          slug,
          "blank-tag.png",
          blankTagBlob,
          "image/png"
        );
      }

      // 2. Upload any custom fonts
      const uploadedFonts: TemplateFont[] = [];
      for (const font of customFontFiles) {
        const fontUrl = await adminUploadTemplateFile(
          slug,
          font.name,
          font.file,
          "font/woff2"
        );
        const family = font.name.replace(/^fonts\//, "").replace(/\.[^/.]+$/, "");
        uploadedFonts.push({
          family,
          file: fontUrl,
        });
      }

      // 3. Save template row
      const payload: Template = {
        ...template,
        blankTag: blankTagUrl,
        fonts: uploadedFonts.length ? uploadedFonts : template.fonts,
      };

      await adminSaveTemplate(slug, template.name, payload, true);

      setStatusMessage({
        type: "success",
        text: `Template "${template.name}" published to cloud! It is now live on the public generator.`,
      });
    } catch (err: unknown) {
      console.error("Cloud publish error:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to publish template to Supabase",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <main>
      <Header activeTab="admin" />

      <div className={styles.adminContainer}>
        {/* Top Bar: Title & Auth */}
        <div className={styles.adminHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.badge}>STUDIO ADMIN</span>
            <h1 className={styles.title}>Template Builder</h1>
            <p className={styles.subtitle}>
              Design customizable watermark tags visually: draw text zones, logo slots, and QR slots.
            </p>
          </div>

          <AuthModal onSessionChange={setAdminUser} />
        </div>

        {statusMessage && (
          <div
            className={
              statusMessage.type === "success" ? styles.alertSuccess : styles.alertError
            }
          >
            {statusMessage.type === "success" ? "✓" : "⚠️"} {statusMessage.text}
          </div>
        )}

        {/* Toolbar: Upload tag & Add elements */}
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => blankTagInputRef.current?.click()}
            >
              Upload Blank Tag PNG
            </button>
            <input
              ref={blankTagInputRef}
              type="file"
              accept="image/png"
              style={{ display: "none" }}
              onChange={(e) => handleUploadBlankTag(e.target.files?.[0] || null)}
            />

            <span className={styles.tagDim}>
              {template.naturalWidth} × {template.naturalHeight} px
            </span>

            {fullCanvasState && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleToggleFullCanvas}
                style={{ fontSize: "0.75rem", padding: "4px 10px", borderColor: "var(--accent)" }}
                title="Toggle between cropped watermark strip and full Photoshop canvas"
              >
                {fullCanvasState.isUsingCropped
                  ? "✂️ Using Cropped Banner (Click for Full Canvas)"
                  : "🖼️ Using Full Canvas (Click for Cropped Banner)"}
              </button>
            )}
          </div>

          <div className={styles.toolGroup}>
            <span className={styles.toolLabel}>Tool:</span>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "select" ? styles.activeTool : ""}`}
              onClick={() => setActiveTool("select")}
            >
              Select / Move
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_field" ? styles.activeTool : ""}`}
              onClick={() => setActiveTool("add_field")}
            >
              + Text Field
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_logo" ? styles.activeTool : ""}`}
              onClick={() => setActiveTool("add_logo")}
            >
              + Logo Slot
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_qr" ? styles.activeTool : ""}`}
              onClick={() => setActiveTool("add_qr")}
            >
              + QR Slot
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_extra" ? styles.activeTool : ""}`}
              onClick={() => setActiveTool("add_extra")}
            >
              + Extra Logos Zone
            </button>
          </div>
        </div>

        {/* Canvas & Property Panel Grid */}
        <div className={styles.builderGrid}>
          {/* Visual Canvas Area */}
          <div className={styles.canvasArea}>
            <div className={styles.canvasCardHeader}>
              <span className={styles.canvasCardTitle}>
                {activeTool === "select"
                  ? "Click any box to select & resize"
                  : `Drag a box on the banner to place ${activeTool.replace("add_", "")}`}
              </span>
              <span className={styles.canvasRatio}>
                Aspect Ratio: {(template.naturalWidth / template.naturalHeight).toFixed(2)}:1
              </span>
            </div>

            <BuilderCanvas
              blankTagImage={blankTagImg}
              template={template}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onUpdateBox={handleUpdateBox}
              activeTool={activeTool}
              onCreatedBox={handleCreatedBox}
            />

            <p className={styles.canvasHint}>
              💡 <strong>Scaling:</strong> All boxes are stored as percentages of the banner
              dimensions, ensuring identical proportions across 1080p, 4K, and 6000x4000 exports.
            </p>
          </div>

          {/* Right Property Panel */}
          <div className={styles.propertyArea}>
            <PropertyPanel
              template={template}
              selectedItem={selectedItem}
              onUpdateTemplate={setTemplate}
              onDeleteItem={handleDeleteItem}
              onAddCustomFont={handleAddCustomFont}
            />
          </div>
        </div>

        {/* Action Footer: Export ZIP & Publish Cloud */}
        <div className={styles.actionCard}>
          <div className={styles.actionCol}>
            <h3 className={styles.actionTitle}>Offline & Repository Package</h3>
            <p className={styles.actionDesc}>
              Export a ZIP bundle containing template.json, blank-tag.png, and fonts. Drop this
              folder into <code>public/templates/&lt;name&gt;/</code> and add it to{" "}
              <code>public/templates/index.json</code>.
            </p>
            <div className={styles.btnRow}>
              <button type="button" className="btn-secondary" onClick={handleExportZip}>
                Export Template ZIP
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => importZipInputRef.current?.click()}
              >
                Import Template ZIP / JSON
              </button>
              <input
                ref={importZipInputRef}
                type="file"
                accept=".zip,.json"
                style={{ display: "none" }}
                onChange={(e) => handleImportZip(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          {isSupabaseConfigured() && adminUser && (
            <div className={styles.actionCol}>
              <h3 className={styles.actionTitle}>Publish to Supabase Cloud</h3>
              <p className={styles.actionDesc}>
                Instantly publish this template to the cloud. Photographers will see it immediately
                on the generator page without any git commit.
              </p>
              <div className={styles.publishRow}>
                <input
                  type="text"
                  placeholder="slug (e.g. ssc-standard)"
                  value={cloudSlug}
                  onChange={(e) => setCloudSlug(e.target.value)}
                  className="text-input"
                  style={{ maxWidth: "220px" }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={handlePublishCloud}
                  disabled={publishing}
                >
                  {publishing ? "PUBLISHING..." : "SAVE & PUBLISH TO CLOUD"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  );
}

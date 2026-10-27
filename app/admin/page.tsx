"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import Header from "@/components/generator/Header";
import Footer from "@/components/generator/Footer";
import BuilderCanvas, { type SelectedItemRef, type SelectableItemType } from "@/components/admin/BuilderCanvas";
import PropertyPanel from "@/components/admin/PropertyPanel";
import AuthModal from "@/components/admin/AuthModal";
import { validateTemplate } from "@/lib/template";
import { loadSavedState, saveState } from "@/lib/storage";
import {
  adminSaveTemplate,
  adminUploadTemplateFile,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { downloadBlob, loadImage, readFileAsArrayBuffer, readFileAsDataUrl, sanitizeFilename } from "@/lib/utils";
import { detectBannerBounds, cropImageRegion, type DetectedBounds } from "@/lib/imageDraw";
import type { Box, Template, TemplateFont } from "@/lib/types";
import type { User } from "@supabase/supabase-js";
import gsap from "gsap";
import {
  CheckCircle2,
  AlertTriangle,
  Crop,
  Maximize2,
  Info,
  Upload,
  MousePointer,
  Type,
  Image as ImageIcon,
  QrCode,
  Layers,
  Download,
  FolderOpen,
  Send,
  Eye,
  EyeOff,
  Undo2,
  Redo2,
  Zap,
  Music,
  GraduationCap,
  Camera,
  Sparkles,
} from "lucide-react";
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

  const [livePreview, setLivePreview] = useState<boolean>(false);
  const [history, setHistory] = useState<Template[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const adminPageRef = useRef<HTMLDivElement>(null);

  const blankTagInputRef = useRef<HTMLInputElement>(null);
  const importZipInputRef = useRef<HTMLInputElement>(null);

  // GSAP Entrance
  useEffect(() => {
    if (!adminPageRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `.${styles.adminHeader}, .${styles.toolbar}, .${styles.builderGrid}`,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.65, stagger: 0.1, ease: "power3.out" }
      );
    }, adminPageRef);
    return () => ctx.revert();
  }, []);

  const pushHistory = (newTemplate: Template) => {
    setTemplate(newTemplate);
    setHistory((prev) => [...prev.slice(0, historyIndex + 1), newTemplate].slice(-30));
    setHistoryIndex((prev) => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex((idx) => idx - 1);
      setTemplate(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex((idx) => idx + 1);
      setTemplate(next);
    }
  };

  const applyLayoutPreset = (presetKey: "sports" | "concert" | "grad" | "minimal") => {
    let updated = { ...template };
    if (presetKey === "sports") {
      updated = {
        ...updated,
        name: "Sports High-Speed Tag",
        fields: [
          {
            id: "event",
            label: "Event Name",
            placeholder: "COLOMBO MARATHON 2026",
            defaultValue: "COLOMBO MARATHON 2026",
            box: { x: 0.28, y: 0.1, w: 0.42, h: 0.8 },
            font: "Outfit",
            weight: 700,
            color: "#ffffff",
            align: "center",
            valign: "middle",
            uppercase: true,
            maxFontSize: 0.58,
            minFontSize: 0.2,
            maxLines: 2,
          },
          {
            id: "photographer",
            label: "Photographer",
            placeholder: "PHOTO BY MILAQ VISUALS",
            defaultValue: "PHOTO BY MILAQ VISUALS",
            box: { x: 0.73, y: 0.14, w: 0.2, h: 0.45 },
            font: "Inter",
            weight: 600,
            color: "#D4FF00",
            align: "right",
            valign: "middle",
            uppercase: true,
            maxFontSize: 0.32,
            minFontSize: 0.14,
            maxLines: 1,
          },
        ],
        qrSlot: { label: "Scan for High-Res", box: { x: 0.945, y: 0.14, w: 0.042, h: 0.72 } },
        extraLogosZone: { box: { x: 0.04, y: 0.15, w: 0.2, h: 0.7 }, gapPercent: 0.01, align: "center" },
      };
    } else if (presetKey === "concert") {
      updated = {
        ...updated,
        name: "Concert Nightlife Tag",
        fields: [
          {
            id: "artist",
            label: "Festival / Artist",
            placeholder: "GROWTICA SESSIONS · ARENA LIVE",
            defaultValue: "GROWTICA SESSIONS · ARENA LIVE",
            box: { x: 0.2, y: 0.1, w: 0.6, h: 0.5 },
            font: "Outfit",
            weight: 800,
            color: "#D4FF00",
            align: "center",
            valign: "middle",
            uppercase: true,
            maxFontSize: 0.45,
            minFontSize: 0.18,
            maxLines: 1,
          },
          {
            id: "meta",
            label: "Date & Location",
            placeholder: "OCTOBER 2026 // VIP PASS #GROWTICA",
            defaultValue: "OCTOBER 2026 // VIP PASS #GROWTICA",
            box: { x: 0.25, y: 0.58, w: 0.5, h: 0.35 },
            font: "Inter",
            weight: 500,
            color: "#E6E6E6",
            align: "center",
            valign: "middle",
            uppercase: true,
            maxFontSize: 0.28,
            minFontSize: 0.12,
            maxLines: 1,
          },
        ],
        qrSlot: { label: "VIP Ticket QR", box: { x: 0.93, y: 0.12, w: 0.05, h: 0.76 } },
        extraLogosZone: { box: { x: 0.03, y: 0.15, w: 0.14, h: 0.7 }, gapPercent: 0.01, align: "center" },
      };
    } else if (presetKey === "grad") {
      updated = {
        ...updated,
        name: "Convocation Formal Tag",
        fields: [
          {
            id: "title",
            label: "Institution / Title",
            placeholder: "ANNUAL GENERAL CONVOCATION",
            defaultValue: "ANNUAL GENERAL CONVOCATION",
            box: { x: 0.25, y: 0.12, w: 0.5, h: 0.45 },
            font: "Outfit",
            weight: 700,
            color: "#ffffff",
            align: "center",
            valign: "middle",
            uppercase: true,
            maxFontSize: 0.4,
            minFontSize: 0.16,
            maxLines: 1,
          },
          {
            id: "sub",
            label: "Faculty / Degree",
            placeholder: "FACULTY OF COMPUTING & ENGINEERING",
            defaultValue: "FACULTY OF COMPUTING & ENGINEERING",
            box: { x: 0.25, y: 0.55, w: 0.5, h: 0.35 },
            font: "Inter",
            weight: 500,
            color: "#E6E6E6",
            align: "center",
            valign: "middle",
            uppercase: false,
            maxFontSize: 0.25,
            minFontSize: 0.12,
            maxLines: 1,
          },
        ],
        qrSlot: undefined,
        extraLogosZone: { box: { x: 0.05, y: 0.15, w: 0.15, h: 0.7 }, gapPercent: 0.01, align: "center" },
      };
    } else if (presetKey === "minimal") {
      updated = {
        ...updated,
        name: "Minimal Studio Signature",
        fields: [
          {
            id: "studio",
            label: "Studio Signature",
            placeholder: "MILAQ CREATIVE STUDIO © 2026",
            defaultValue: "MILAQ CREATIVE STUDIO © 2026",
            box: { x: 0.6, y: 0.25, w: 0.35, h: 0.5 },
            font: "Inter",
            weight: 600,
            color: "#ffffff",
            align: "right",
            valign: "middle",
            uppercase: true,
            maxFontSize: 0.35,
            minFontSize: 0.15,
            maxLines: 1,
          },
        ],
        qrSlot: undefined,
        extraLogosZone: undefined,
      };
    }
    pushHistory(updated);
    setStatusMessage({ type: "success", text: `Loaded layout preset "${presetKey.toUpperCase()}"` });
  };

  // Load initial template (from saved local draft or default blank tag)
  useEffect(() => {
    async function loadInitial() {
      try {
        // 1. Check if user already has a saved draft template in localStorage
        if (typeof window !== "undefined") {
          const draftRaw = localStorage.getItem("watermark_admin_custom_template_v1");
          if (draftRaw) {
            try {
              const parsed = JSON.parse(draftRaw);
              if (parsed && parsed.template) {
                setTemplate(parsed.template);
                if (parsed.blankTagDataUrl) {
                  const draftImg = await loadImage(parsed.blankTagDataUrl);
                  setBlankTagImg(draftImg);
                  // create blob from dataUrl
                  const resBlob = await fetch(parsed.blankTagDataUrl);
                  const b = await resBlob.blob();
                  setBlankTagBlob(b);
                  return;
                }
              }
            } catch (err) {
              console.warn("Could not parse draft template:", err);
            }
          }
        }

        // 2. Default blank tag fallback
        const img = await loadImage(DEFAULT_BLANK_TAG_PATH);
        setBlankTagImg(img);
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

  // Save template locally and activate in Generator
  const handleSaveAndActivateInGenerator = async () => {
    try {
      setStatusMessage({ type: "success", text: "Saving template to local studio session..." });

      let dataUrl = "";
      if (blankTagBlob) {
        dataUrl = await readFileAsDataUrl(blankTagBlob);
      } else if (blankTagImg) {
        const canvas = document.createElement("canvas");
        canvas.width = blankTagImg.naturalWidth || blankTagImg.width;
        canvas.height = blankTagImg.naturalHeight || blankTagImg.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(blankTagImg, 0, 0);
          dataUrl = canvas.toDataURL("image/png");
        }
      }

      const payload = {
        template,
        blankTagDataUrl: dataUrl,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("watermark_admin_custom_template_v1", JSON.stringify(payload));

        const saved = loadSavedState() || { values: {}, selectedResolutions: ["5184x3456"], orientation: "landscape" };
        saveState({
          ...saved,
          templateId: "custom:admin",
        });
      }

      setStatusMessage({
        type: "success",
        text: `Template "${template.name}" activated! Redirecting to Generator...`,
      });

      setTimeout(() => {
        window.location.href = "/";
      }, 700);
    } catch (err) {
      console.error("Failed to activate template in generator:", err);
      setStatusMessage({
        type: "error",
        text: "Could not save template locally. Check image size.",
      });
    }
  };


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
          text: `Auto-detected Photoshop full canvas (${bounds.canvasWidth} × ${bounds.canvasHeight}px)! Auto-cropped bottom watermark strip (${bounds.width} × ${bounds.height}px, ratio ${(bounds.width / bounds.height).toFixed(1)}:1).`,
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

      <div ref={adminPageRef} className={styles.adminContainer}>
        {/* Top Bar: Title & Auth */}
        <div className={styles.adminHeader}>
          <div className={styles.titleGroup}>
            <span className={styles.badge}>STUDIO ADMIN</span>
            <h1 className={styles.title}>Template Builder</h1>
            <p className={styles.subtitle}>
              Design customizable watermark tags visually: draw text zones, logo slots, and QR slots.
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={handleSaveAndActivateInGenerator}
              style={{
                padding: "9px 18px",
                fontSize: "12px",
                letterSpacing: "0.1em",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Sparkles size={14} />
              <span>ACTIVATE IN GENERATOR</span>
            </button>
            <AuthModal onSessionChange={setAdminUser} />
          </div>
        </div>

        {/* Quick Layout Presets Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "10px",
            background: "rgba(212, 255, 0, 0.04)",
            border: "1px solid rgba(212, 255, 0, 0.18)",
            borderRadius: "6px",
            padding: "10px 16px",
            marginBottom: "16px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles size={14} color="var(--accent-green)" />
            <span
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--accent-green)",
                textTransform: "uppercase",
              }}
            >
              QUICK LAYOUT STARTERS:
            </span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => applyLayoutPreset("sports")}
            >
              <Zap size={12} color="var(--accent-green)" />
              <span>Sports Marathon</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => applyLayoutPreset("concert")}
            >
              <Music size={12} color="var(--accent-green)" />
              <span>Concert Gala</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => applyLayoutPreset("grad")}
            >
              <GraduationCap size={12} color="var(--accent-green)" />
              <span>Convocation</span>
            </button>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "11px", padding: "4px 10px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => applyLayoutPreset("minimal")}
            >
              <Camera size={12} color="var(--accent-green)" />
              <span>Minimal Signature</span>
            </button>
          </div>
        </div>

        {statusMessage && (
          <div
            className={
              statusMessage.type === "success" ? styles.alertSuccess : styles.alertError
            }
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            ) : (
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}

        {/* Toolbar: Upload tag & Add elements */}
        <div className={styles.toolbar}>
          <div className={styles.toolGroup}>
            <button
              type="button"
              className="btn-secondary"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              onClick={() => blankTagInputRef.current?.click()}
            >
              <Upload size={13} />
              <span>Upload Blank Tag PNG</span>
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
                style={{ fontSize: "0.75rem", padding: "4px 10px", borderColor: "var(--accent)", display: "inline-flex", alignItems: "center", gap: "6px" }}
                title="Toggle between cropped watermark strip and full Photoshop canvas"
              >
                {fullCanvasState.isUsingCropped ? (
                  <>
                    <Crop size={13} />
                    <span>Using Cropped Banner (Click for Full Canvas)</span>
                  </>
                ) : (
                  <>
                    <Maximize2 size={13} />
                    <span>Using Full Canvas (Click for Cropped Banner)</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className={styles.toolGroup}>
            <span className={styles.toolLabel}>TOOL:</span>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "select" ? styles.activeTool : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              onClick={() => setActiveTool("select")}
            >
              <MousePointer size={12} />
              <span>Select / Move</span>
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_field" ? styles.activeTool : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              onClick={() => setActiveTool("add_field")}
            >
              <Type size={12} />
              <span>Text Field</span>
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_logo" ? styles.activeTool : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              onClick={() => setActiveTool("add_logo")}
            >
              <ImageIcon size={12} />
              <span>Logo Slot</span>
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_qr" ? styles.activeTool : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              onClick={() => setActiveTool("add_qr")}
            >
              <QrCode size={12} />
              <span>QR Slot</span>
            </button>
            <button
              type="button"
              className={`${styles.toolBtn} ${activeTool === "add_extra" ? styles.activeTool : ""}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              onClick={() => setActiveTool("add_extra")}
            >
              <Layers size={12} />
              <span>Extra Logos Zone</span>
            </button>
          </div>
        </div>

        {/* Canvas & Property Panel Grid */}
        <div className={styles.builderGrid}>
          {/* Visual Canvas Area */}
          <div className={styles.canvasArea}>
            <div className={styles.canvasCardHeader} style={{ flexWrap: "wrap", gap: "8px" }}>
              <span className={styles.canvasCardTitle}>
                {activeTool === "select"
                  ? "Click any box to select & resize"
                  : `Drag a box on the banner to place ${activeTool.replace("add_", "")}`}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {/* Live Preview Toggle */}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{
                    fontSize: "11px",
                    padding: "4px 10px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    borderColor: livePreview ? "var(--accent-green)" : undefined,
                    color: livePreview ? "var(--accent-green)" : undefined,
                  }}
                  onClick={() => setLivePreview(!livePreview)}
                >
                  {livePreview ? <Eye size={12} /> : <EyeOff size={12} />}
                  <span>{livePreview ? "LIVE SIMULATED" : "WIREFRAME"}</span>
                </button>

                {/* Undo / Redo */}
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  disabled={historyIndex <= 0}
                  onClick={handleUndo}
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={12} />
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: "11px" }}
                  disabled={historyIndex >= history.length - 1}
                  onClick={handleRedo}
                  title="Redo (Ctrl+Y)"
                >
                  <Redo2 size={12} />
                </button>

                <span className={styles.canvasRatio}>
                  Aspect Ratio: {(template.naturalWidth / template.naturalHeight).toFixed(2)}:1
                </span>
              </div>
            </div>

            <BuilderCanvas
              blankTagImage={blankTagImg}
              template={template}
              selectedItem={selectedItem}
              onSelectItem={setSelectedItem}
              onUpdateBox={handleUpdateBox}
              activeTool={activeTool}
              onCreatedBox={handleCreatedBox}
              livePreview={livePreview}
              onDeleteSelected={() => selectedItem && handleDeleteItem(selectedItem)}
            />

            <p className={styles.canvasHint} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <Info size={14} style={{ color: "var(--accent)", flexShrink: 0, marginTop: "2px" }} />
              <span>
                <strong>Controls:</strong> Click to select · Drag to move · Drag corners to resize · Arrow keys to nudge (Shift for fast) · Delete key to remove.
              </span>
            </p>
          </div>

          {/* Right Property Panel */}
          <div className={styles.propertyArea}>
            <PropertyPanel
              template={template}
              selectedItem={selectedItem}
              onUpdateTemplate={pushHistory}
              onDeleteItem={handleDeleteItem}
              onAddCustomFont={handleAddCustomFont}
            />
          </div>
        </div>

        {/* Action Footer: Export ZIP & Publish Cloud */}

        <div className={styles.actionCard}>
          <div className={styles.actionCol} style={{ background: "rgba(212, 255, 0, 0.04)", border: "1px solid rgba(212, 255, 0, 0.25)", borderRadius: "8px", padding: "18px" }}>
            <h3 className={styles.actionTitle} style={{ color: "var(--accent-green)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Sparkles size={16} />
              <span>Instant Generator Sync</span>
            </h3>
            <p className={styles.actionDesc}>
              Save your watermark template into your local browser studio session right now and launch the Watermark Generator immediately with this design.
            </p>
            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", justifyContent: "center", display: "inline-flex", alignItems: "center", gap: "8px", marginTop: "10px" }}
              onClick={handleSaveAndActivateInGenerator}
            >
              <Sparkles size={15} />
              <span>SAVE & USE IN GENERATOR NOW</span>
            </button>
          </div>

          <div className={styles.actionCol}>
            <h3 className={styles.actionTitle}>Offline & Repository Package</h3>
            <p className={styles.actionDesc}>
              Export a ZIP bundle containing template.json, blank-tag.png, and fonts. Drop this
              folder into <code>public/templates/&lt;name&gt;/</code> and add it to{" "}
              <code>public/templates/index.json</code>.
            </p>
            <div className={styles.btnRow}>
              <button
                type="button"
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={handleExportZip}
              >
                <Download size={13} />
                <span>Export Template ZIP</span>
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                onClick={() => importZipInputRef.current?.click()}
              >
                <FolderOpen size={13} />
                <span>Import Template ZIP / JSON</span>
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
                  style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  onClick={handlePublishCloud}
                  disabled={publishing}
                >
                  <Send size={13} />
                  <span>{publishing ? "PUBLISHING..." : "SAVE & PUBLISH TO CLOUD"}</span>
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

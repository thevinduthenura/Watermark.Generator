"use client";

import { useEffect, useMemo, useState } from "react";
import DynamicFields from "./DynamicFields";
import LogoManager from "./LogoManager";
import ResolutionPicker from "./ResolutionPicker";
import PreviewCanvas from "./PreviewCanvas";
import { listAllTemplates, loadTemplate } from "@/lib/template";
import { runExport, type ExportProgress } from "@/lib/export";
import { RESOLUTION_PRESETS, orientSize } from "@/lib/resolutions";
import { loadSavedState, saveState } from "@/lib/storage";
import type { LoadedTemplate, Orientation, RenderInputs, Size, TemplateRef, UserImage } from "@/lib/types";
import styles from "./Generator.module.css";

export default function Generator() {
  const [templateRefs, setTemplateRefs] = useState<TemplateRef[]>([]);
  const [currentRef, setCurrentRef] = useState<TemplateRef | null>(null);
  const [loaded, setLoaded] = useState<LoadedTemplate | null>(null);
  const [loadingTemplate, setLoadingTemplate] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form values
  const [values, setValues] = useState<Record<string, string>>({});
  const [logoSlotImages, setLogoSlotImages] = useState<Record<string, UserImage | undefined>>({});
  const [qrImage, setQrImage] = useState<UserImage | undefined>(undefined);
  const [extraLogos, setExtraLogos] = useState<UserImage[]>([]);

  // Resolution & Export Options
  const [selectedPresetIds, setSelectedPresetIds] = useState<string[]>(["5184x3456"]);
  const [orientation, setOrientation] = useState<Orientation>("landscape");
  const [customEnabled, setCustomEnabled] = useState<boolean>(false);
  const [customWidth, setCustomWidth] = useState<number>(3840);
  const [customHeight, setCustomHeight] = useState<number>(2160);
  const [bannerOnly, setBannerOnly] = useState<boolean>(false);

  // Export progress & errors
  const [exporting, setExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // 1. Initial template discovery and state restore
  useEffect(() => {
    let active = true;
    async function init() {
      try {
        setLoadingTemplate(true);
        setLoadError(null);
        const refs = await listAllTemplates();
        if (!active) return;
        setTemplateRefs(refs);

        const saved = loadSavedState();
        let targetRef = refs[0];
        if (saved?.templateId) {
          const match = refs.find((r) => r.id === saved.templateId);
          if (match) targetRef = match;
        }

        if (saved?.selectedResolutions && saved.selectedResolutions.length) {
          setSelectedPresetIds(saved.selectedResolutions);
        }
        if (saved?.orientation) {
          setOrientation(saved.orientation);
        }
        if (saved?.customEnabled !== undefined) {
          setCustomEnabled(saved.customEnabled);
        }
        if (saved?.customWidth) setCustomWidth(saved.customWidth);
        if (saved?.customHeight) setCustomHeight(saved.customHeight);
        if (saved?.bannerOnly !== undefined) setBannerOnly(saved.bannerOnly);

        setCurrentRef(targetRef);
        const loadedData = await loadTemplate(targetRef);
        if (!active) return;
        setLoaded(loadedData);

        // Populate initial field values from saved or defaults
        const initialVals: Record<string, string> = {};
        for (const f of loadedData.template.fields) {
          initialVals[f.id] = saved?.values?.[f.id] ?? f.defaultValue ?? "";
        }
        setValues(initialVals);
      } catch (err: unknown) {
        console.error("Initialization error:", err);
        if (active) setLoadError(err instanceof Error ? err.message : "Failed to load template");
      } finally {
        if (active) setLoadingTemplate(false);
      }
    }

    init();
    return () => {
      active = false;
    };
  }, []);

  // 2. Switching template
  const handleSelectTemplate = async (ref: TemplateRef) => {
    try {
      setLoadingTemplate(true);
      setLoadError(null);
      setCurrentRef(ref);
      const loadedData = await loadTemplate(ref);
      setLoaded(loadedData);

      // Preserve existing field values where IDs match, fallback to new defaults
      setValues((prev) => {
        const next: Record<string, string> = {};
        for (const f of loadedData.template.fields) {
          next[f.id] = prev[f.id] ?? f.defaultValue ?? "";
        }
        return next;
      });
    } catch (err: unknown) {
      console.error("Template switch error:", err);
      setLoadError(err instanceof Error ? err.message : "Failed to load template");
    } finally {
      setLoadingTemplate(false);
    }
  };

  // 3. Save state on changes
  useEffect(() => {
    if (!currentRef) return;
    saveState({
      templateId: currentRef.id,
      values,
      selectedResolutions: selectedPresetIds,
      orientation,
      customEnabled,
      customWidth,
      customHeight,
      bannerOnly,
      extraLogos: extraLogos.map((l) => ({
        id: l.id,
        name: l.name,
        src: l.src,
        width: l.width,
        height: l.height,
      })),
      qrImage: qrImage
        ? {
            id: qrImage.id,
            name: qrImage.name,
            src: qrImage.src,
            width: qrImage.width,
            height: qrImage.height,
          }
        : undefined,
    });
  }, [
    currentRef,
    values,
    selectedPresetIds,
    orientation,
    customEnabled,
    customWidth,
    customHeight,
    bannerOnly,
    extraLogos,
    qrImage,
  ]);

  const handleChangeValue = (fieldId: string, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  // Memoize render inputs
  const renderInputs: RenderInputs = useMemo(
    () => ({
      values,
      logoSlotImages,
      qrImage,
      extraLogos,
    }),
    [values, logoSlotImages, qrImage, extraLogos]
  );

  // Compute selected sizes
  const targetSizes: Size[] = useMemo(() => {
    const list: Size[] = [];
    for (const p of RESOLUTION_PRESETS) {
      if (selectedPresetIds.includes(p.id)) {
        list.push(orientSize(p.width, p.height, orientation));
      }
    }
    if (customEnabled && customWidth > 0 && customHeight > 0) {
      list.push(orientSize(customWidth, customHeight, orientation));
    }
    return list;
  }, [selectedPresetIds, customEnabled, customWidth, customHeight, orientation]);

  const primarySize = targetSizes[0] || orientSize(5184, 3456, orientation);

  // 4. Download Execution
  const handleDownload = async () => {
    if (!loaded) return;
    if (!targetSizes.length) {
      setExportError("Please choose at least one resolution in Section 03.");
      return;
    }

    try {
      setExporting(true);
      setExportError(null);
      setExportSuccess(null);
      setProgress({ current: 0, total: targetSizes.length, status: "Preparing canvases..." });

      const res = await runExport({
        loaded,
        inputs: renderInputs,
        sizes: targetSizes,
        orientation,
        bannerOnly,
        onProgress: (p) => setProgress(p),
      });

      setExportSuccess(
        `Successfully generated ${res.count} ${res.count === 1 ? "file" : "files"} (${res.filename})`
      );
    } catch (err: unknown) {
      console.error("Export failure:", err);
      setExportError(
        err instanceof Error ? err.message : "Failed to generate watermark files."
      );
    } finally {
      setExporting(false);
      setProgress(null);
    }
  };

  return (
    <div className={styles.mainContainer}>
      {loadError && (
        <div className={styles.alertError}>
          <span>⚠️ {loadError}</span>
        </div>
      )}

      {loadingTemplate && !loaded ? (
        <div className={styles.loadingBox}>
          <div className={styles.spinner} />
          <span>Loading template assets...</span>
        </div>
      ) : loaded ? (
        <div className={styles.workspaceGrid}>
          {/* LEFT COLUMN: Numbered Controls */}
          <div className={styles.formColumn}>
            {/* SECTION 01: DETAILS */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className="section-num">01</span>
                <h2 className="section-title">Event & Photographer Details</h2>
              </div>
              <DynamicFields
                template={loaded.template}
                templateRefs={templateRefs}
                currentRef={currentRef}
                onSelectTemplate={handleSelectTemplate}
                values={values}
                onChangeValue={handleChangeValue}
              />
            </section>

            {/* SECTION 02: BRANDING & LOGOS */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className="section-num">02</span>
                <h2 className="section-title">Sponsors, Partner Logos & QR</h2>
              </div>
              <LogoManager
                loaded={loaded}
                extraLogos={extraLogos}
                onChangeExtraLogos={setExtraLogos}
                qrImage={qrImage}
                onChangeQrImage={setQrImage}
                logoSlotImages={logoSlotImages}
                onChangeLogoSlot={(slotId, img) =>
                  setLogoSlotImages((prev) => ({ ...prev, [slotId]: img }))
                }
              />
            </section>

            {/* SECTION 03: RESOLUTION & CANVAS */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className="section-num">03</span>
                <h2 className="section-title">Canvas Resolutions</h2>
              </div>
              <ResolutionPicker
                selectedPresetIds={selectedPresetIds}
                onChangeSelectedPresets={setSelectedPresetIds}
                orientation={orientation}
                onChangeOrientation={setOrientation}
                customEnabled={customEnabled}
                onChangeCustomEnabled={setCustomEnabled}
                customWidth={customWidth}
                onChangeCustomWidth={setCustomWidth}
                customHeight={customHeight}
                onChangeCustomHeight={setCustomHeight}
                bannerOnly={bannerOnly}
                onChangeBannerOnly={setBannerOnly}
                templateNaturalWidth={loaded.template.naturalWidth}
              />
            </section>

            {/* SECTION 04: DOWNLOAD ACTION */}
            <section className={styles.sectionCard}>
              <div className={styles.sectionHeader}>
                <span className="section-num">04</span>
                <h2 className="section-title">Export & Download</h2>
              </div>

              <div className={styles.exportActionBlock}>
                <button
                  type="button"
                  id="download-btn"
                  className="btn-primary"
                  onClick={handleDownload}
                  disabled={exporting || targetSizes.length === 0}
                >
                  {exporting ? (
                    <>
                      <div className={styles.spinnerSmall} />
                      <span>GENERATING...</span>
                    </>
                  ) : (
                    <span>
                      DOWNLOAD {targetSizes.length > 1 ? `ZIP (${targetSizes.length} FILES)` : "PNG"}
                    </span>
                  )}
                </button>

                {exporting && progress && (
                  <div className={styles.progressBox}>
                    <div className={styles.progressBarBg}>
                      <div
                        className={styles.progressBarFill}
                        style={{
                          width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className={styles.progressStatus}>{progress.status}</span>
                  </div>
                )}

                {exportSuccess && (
                  <div className={styles.alertSuccess}>
                    <span>✓ {exportSuccess}</span>
                  </div>
                )}

                {exportError && (
                  <div className={styles.alertError}>
                    <span>⚠️ {exportError}</span>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* RIGHT COLUMN: Sticky Live Preview */}
          <div className={styles.previewColumn}>
            <div className={styles.stickyWrapper}>
              <PreviewCanvas
                loaded={loaded}
                inputs={renderInputs}
                primarySize={primarySize}
                orientation={orientation}
                bannerOnly={bannerOnly}
                selectedCount={targetSizes.length}
              />

              <div className={styles.guideNote}>
                <h3 className={styles.guideTitle}>HOW EVENT OVERLAYS WORK</h3>
                <p className={styles.guideBody}>
                  The generated PNG is completely transparent except for the bottom banner.
                  Import your batch of event photos into Adobe Lightroom, Photoshop, or Snapseed,
                  and select this PNG as your batch watermark overlay.
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

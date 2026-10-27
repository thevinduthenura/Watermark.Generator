"use client";

import {
  RESOLUTION_PRESETS,
  formatPresetLabel,
  orientSize,
} from "@/lib/resolutions";
import { formatMegapixels } from "@/lib/utils";
import type { Orientation, Size } from "@/lib/types";
import { AlertTriangle } from "lucide-react";
import styles from "./ResolutionPicker.module.css";

interface ResolutionPickerProps {
  selectedPresetIds: string[];
  onChangeSelectedPresets: (ids: string[]) => void;
  orientation: Orientation;
  onChangeOrientation: (o: Orientation) => void;
  customEnabled: boolean;
  onChangeCustomEnabled: (enabled: boolean) => void;
  customWidth: number;
  onChangeCustomWidth: (w: number) => void;
  customHeight: number;
  onChangeCustomHeight: (h: number) => void;
  bannerOnly: boolean;
  onChangeBannerOnly: (bo: boolean) => void;
  templateNaturalWidth: number;
}

export default function ResolutionPicker({
  selectedPresetIds,
  onChangeSelectedPresets,
  orientation,
  onChangeOrientation,
  customEnabled,
  onChangeCustomEnabled,
  customWidth,
  onChangeCustomWidth,
  customHeight,
  onChangeCustomHeight,
  bannerOnly,
  onChangeBannerOnly,
  templateNaturalWidth,
}: ResolutionPickerProps) {
  const togglePreset = (id: string) => {
    if (selectedPresetIds.includes(id)) {
      onChangeSelectedPresets(selectedPresetIds.filter((p) => p !== id));
    } else {
      onChangeSelectedPresets([...selectedPresetIds, id]);
    }
  };

  const selectAll = () => {
    onChangeSelectedPresets(RESOLUTION_PRESETS.map((p) => p.id));
  };

  const selectNone = () => {
    onChangeSelectedPresets([]);
  };

  // Determine if any selected size exceeds template natural width
  const selectedSizes: Size[] = [
    ...RESOLUTION_PRESETS.filter((p) => selectedPresetIds.includes(p.id)).map((p) =>
      orientSize(p.width, p.height, orientation)
    ),
    ...(customEnabled ? [orientSize(customWidth, customHeight, orientation)] : []),
  ];

  const hasUpscaling = selectedSizes.some((s) => s.width > templateNaturalWidth);

  return (
    <div className={styles.container}>
      {/* 1. Orientation & Banner Mode Controls */}
      <div className={styles.topControls}>
        <div className={styles.controlGroup}>
          <span className="input-label">Canvas Orientation</span>
          <div className={styles.segmentedToggle}>
            <button
              type="button"
              className={`${styles.toggleBtn} ${orientation === "landscape" ? styles.active : ""}`}
              onClick={() => onChangeOrientation("landscape")}
            >
              LANDSCAPE
            </button>
            <button
              type="button"
              className={`${styles.toggleBtn} ${orientation === "portrait" ? styles.active : ""}`}
              onClick={() => onChangeOrientation("portrait")}
            >
              PORTRAIT
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <span className="input-label">Output Mode</span>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={bannerOnly}
              onChange={(e) => onChangeBannerOnly(e.target.checked)}
              className={styles.checkbox}
            />
            <span className={styles.checkboxText}>
              Banner only (cropped strip, no transparent photo area)
            </span>
          </label>
        </div>
      </div>

      {/* 2. Preset Selection Actions */}
      <div className={styles.presetsHeader}>
        <span className="input-label">
          Export Resolutions ({selectedPresetIds.length + (customEnabled ? 1 : 0)} selected)
        </span>
        <div className={styles.quickLinks}>
          <button type="button" onClick={selectAll} className={styles.linkBtn}>
            Select All
          </button>
          <span className={styles.dot}>·</span>
          <button type="button" onClick={selectNone} className={styles.linkBtn}>
            Clear
          </button>
        </div>
      </div>

      {/* 3. Preset Checkboxes Grid */}
      <div className={styles.presetsGrid}>
        {RESOLUTION_PRESETS.map((preset) => {
          const isChecked = selectedPresetIds.includes(preset.id);
          const oriented = orientSize(preset.width, preset.height, orientation);
          const mp = formatMegapixels(oriented.width, oriented.height);

          return (
            <label
              key={preset.id}
              className={`${styles.presetCard} ${isChecked ? styles.cardChecked : ""}`}
            >
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => togglePreset(preset.id)}
                className={styles.checkbox}
              />
              <div className={styles.presetInfo}>
                <span className={styles.presetDim}>
                  {oriented.width} × {oriented.height}
                </span>
                <span className={styles.presetMp}>{mp}</span>
              </div>
            </label>
          );
        })}
      </div>

      {/* 4. Custom Resolution */}
      <div className={styles.customSection}>
        <label className={styles.checkboxLabel}>
          <input
            type="checkbox"
            checked={customEnabled}
            onChange={(e) => onChangeCustomEnabled(e.target.checked)}
            className={styles.checkbox}
          />
          <span className={styles.checkboxText}>Include custom resolution</span>
        </label>

        {customEnabled && (
          <div className={styles.customInputsRow}>
            <div className={styles.inputWrap}>
              <span className={styles.subLabel}>Width (px)</span>
              <input
                type="number"
                min="300"
                max="12000"
                value={customWidth}
                onChange={(e) => onChangeCustomWidth(Math.max(1, Number(e.target.value) || 0))}
                className="text-input"
              />
            </div>
            <span className={styles.timesSign}>×</span>
            <div className={styles.inputWrap}>
              <span className={styles.subLabel}>Height (px)</span>
              <input
                type="number"
                min="100"
                max="12000"
                value={customHeight}
                onChange={(e) => onChangeCustomHeight(Math.max(1, Number(e.target.value) || 0))}
                className="text-input"
              />
            </div>
            <span className={styles.customMp}>
              ({formatMegapixels(customWidth, customHeight)})
            </span>
          </div>
        )}
      </div>

      {/* 5. Upscale Warning if applicable */}
      {hasUpscaling && (
        <div className={styles.warningBox}>
          <AlertTriangle size={18} className={styles.warningIcon} style={{ flexShrink: 0 }} />
          <p className={styles.warningText}>
            <strong>Upscaling Notice:</strong> One or more selected output resolutions exceed
            the blank tag&apos;s natural width ({templateNaturalWidth}px). For maximum crispness,
            consider updating your blank tag template with an ultra-high resolution asset.
          </p>
        </div>
      )}
    </div>
  );
}

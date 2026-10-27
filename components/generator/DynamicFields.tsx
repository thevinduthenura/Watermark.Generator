"use client";

import { useRef, useState } from "react";
import type { FieldAdjustment, Template, TemplateRef } from "@/lib/types";
import { POPULAR_FONTS, ensureGoogleFont, registerCustomFontFromFile } from "@/lib/fonts";
import styles from "./DynamicFields.module.css";

interface DynamicFieldsProps {
  template: Template;
  templateRefs: TemplateRef[];
  currentRef: TemplateRef | null;
  onSelectTemplate: (ref: TemplateRef) => void;
  values: Record<string, string>;
  onChangeValue: (fieldId: string, value: string) => void;
  fieldAdjustments: Record<string, FieldAdjustment>;
  onChangeAdjustment: (fieldId: string, adj: FieldAdjustment) => void;
  onUploadCustomTag?: (file: File) => void;
}

export default function DynamicFields({
  template,
  templateRefs,
  currentRef,
  onSelectTemplate,
  values,
  onChangeValue,
  fieldAdjustments,
  onChangeAdjustment,
  onUploadCustomTag,
}: DynamicFieldsProps) {
  const [expandedFieldId, setExpandedFieldId] = useState<string | null>("event");
  const customTagInputRef = useRef<HTMLInputElement>(null);

  const getAdj = (fieldId: string): FieldAdjustment => {
    return fieldAdjustments[fieldId] || { offsetX: 0, offsetY: 0, scale: 1.0 };
  };

  const updateAdj = (fieldId: string, partial: Partial<FieldAdjustment>) => {
    const current = getAdj(fieldId);
    onChangeAdjustment(fieldId, { ...current, ...partial });
  };

  const resetAdj = (fieldId: string) => {
    onChangeAdjustment(fieldId, { offsetX: 0, offsetY: 0, scale: 1.0, font: undefined });
  };

  return (
    <div className={styles.container}>
      {/* Template Selector / Custom Tag Upload */}
      <div className={styles.templateRow}>
        {templateRefs.length > 1 && (
          <div className={styles.templateSelectWrap}>
            <label htmlFor="template-select" className="input-label">
              Active Template
            </label>
            <select
              id="template-select"
              className="select-input"
              value={currentRef?.id || ""}
              onChange={(e) => {
                const selected = templateRefs.find((r) => r.id === e.target.value);
                if (selected) onSelectTemplate(selected);
              }}
            >
              {templateRefs.map((ref) => (
                <option key={ref.id} value={ref.id}>
                  {ref.name} ({ref.source === "cloud" ? "Cloud" : "Built-in"})
                </option>
              ))}
            </select>
          </div>
        )}

        {onUploadCustomTag && (
          <div className={styles.customTagUpload}>
            <button
              type="button"
              className="btn-secondary"
              style={{ fontSize: "0.78rem", padding: "8px 12px", width: "100%" }}
              onClick={() => customTagInputRef.current?.click()}
              title="Upload your own Photoshop canvas or blank watermark PNG"
            >
              🖼️ Upload Custom Tag / PS Canvas
            </button>
            <input
              ref={customTagInputRef}
              type="file"
              accept="image/png"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUploadCustomTag(file);
              }}
            />
          </div>
        )}
      </div>

      {/* Fields List */}
      <div className={styles.fieldsGrid}>
        {template.fields.map((field) => {
          const val = values[field.id] ?? field.defaultValue ?? "";
          const adj = getAdj(field.id);
          const isExpanded = expandedFieldId === field.id;
          const currentFont = adj.font || field.font;

          return (
            <div key={field.id} className={styles.fieldItem}>
              <div className={styles.labelRow}>
                <label htmlFor={`field-${field.id}`} className="input-label">
                  {field.label}
                </label>
                <div className={styles.badgeRow}>
                  {field.uppercase && <span className={styles.badgeUpper}>UPPERCASE</span>}
                  <button
                    type="button"
                    className={`${styles.btnToggleTune} ${isExpanded ? styles.activeToggle : ""}`}
                    onClick={() => setExpandedFieldId(isExpanded ? null : field.id)}
                    title="Fine-tune position, size, and font for this text"
                  >
                    🎛️ Adjust Box & Font
                  </button>
                </div>
              </div>

              <input
                id={`field-${field.id}`}
                type="text"
                className="text-input"
                placeholder={field.placeholder || `Enter ${field.label}`}
                value={val}
                onChange={(e) => onChangeValue(field.id, e.target.value)}
                autoComplete="off"
              />

              {/* Collapsible Tuning Controls */}
              {isExpanded && (
                <div className={styles.tuneCard}>
                  {/* 1. Font Selection & Custom Font Upload */}
                  <div className={styles.tuneRow}>
                    <div className={styles.tuneHeader}>
                      <span className={styles.tuneLabel}>Font Family</span>
                      <label className={styles.btnUploadFont}>
                        <span>+ Custom Font (.ttf/.otf)</span>
                        <input
                          type="file"
                          accept=".woff2,.ttf,.otf"
                          style={{ display: "none" }}
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              try {
                                const family = await registerCustomFontFromFile(file);
                                updateAdj(field.id, { font: family });
                              } catch (err) {
                                console.error("Failed to register font:", err);
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    <select
                      className="select-input"
                      value={currentFont}
                      onChange={(e) => {
                        const nextFont = e.target.value;
                        ensureGoogleFont(nextFont);
                        updateAdj(field.id, { font: nextFont });
                      }}
                    >
                      <optgroup label="Popular Photography Fonts">
                        {POPULAR_FONTS.map((f) => (
                          <option key={f.family} value={f.family}>
                            {f.family} ({f.category})
                          </option>
                        ))}
                      </optgroup>
                      {template.fonts && template.fonts.length > 0 && (
                        <optgroup label="Template Fonts">
                          {template.fonts.map((f) => (
                            <option key={f.family} value={f.family}>
                              {f.family} (Template)
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {adj.font && !POPULAR_FONTS.some((f) => f.family === adj.font) && (
                        <option value={adj.font}>{adj.font} (Custom Upload)</option>
                      )}
                    </select>
                  </div>

                  {/* 2. Scale Multiplier Slider */}
                  <div className={styles.tuneRow}>
                    <div className={styles.tuneHeader}>
                      <span className={styles.tuneLabel}>Box & Text Scale</span>
                      <span className={styles.tuneVal}>{Math.round((adj.scale ?? 1.0) * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.6"
                      step="0.05"
                      value={adj.scale ?? 1.0}
                      onChange={(e) => updateAdj(field.id, { scale: Number(e.target.value) })}
                      className={styles.rangeInput}
                    />
                  </div>

                  {/* 3. Horizontal Offset Slider (X) */}
                  <div className={styles.tuneRow}>
                    <div className={styles.tuneHeader}>
                      <span className={styles.tuneLabel}>Move Left / Right</span>
                      <span className={styles.tuneVal}>
                        {(adj.offsetX ?? 0) > 0 ? `+${adj.offsetX}%` : `${adj.offsetX ?? 0}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      step="1"
                      value={adj.offsetX ?? 0}
                      onChange={(e) => updateAdj(field.id, { offsetX: Number(e.target.value) })}
                      className={styles.rangeInput}
                    />
                  </div>

                  {/* 4. Vertical Offset Slider (Y) */}
                  <div className={styles.tuneRow}>
                    <div className={styles.tuneHeader}>
                      <span className={styles.tuneLabel}>Move Up / Down</span>
                      <span className={styles.tuneVal}>
                        {(adj.offsetY ?? 0) > 0 ? `+${adj.offsetY}%` : `${adj.offsetY ?? 0}%`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-25"
                      max="25"
                      step="1"
                      value={adj.offsetY ?? 0}
                      onChange={(e) => updateAdj(field.id, { offsetY: Number(e.target.value) })}
                      className={styles.rangeInput}
                    />
                  </div>

                  {/* Reset button */}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ fontSize: "0.72rem", padding: "3px 8px" }}
                      onClick={() => resetAdj(field.id)}
                    >
                      Reset Adjustments
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

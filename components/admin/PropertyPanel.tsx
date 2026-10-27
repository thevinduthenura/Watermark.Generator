"use client";

import type { SelectedItemRef } from "./BuilderCanvas";
import type { Box, ExtraLogosZone, LogoSlot, QrSlot, Template, TextField } from "@/lib/types";
import { POPULAR_FONTS, ensureGoogleFont, registerCustomFontFromFile } from "@/lib/fonts";
import { Trash2, Upload, AlignCenter, AlignVerticalJustifyCenter, Copy, Maximize2 } from "lucide-react";
import styles from "./PropertyPanel.module.css";

interface PropertyPanelProps {
  template: Template;
  selectedItem: SelectedItemRef | null;
  onUpdateTemplate: (updated: Template) => void;
  onDeleteItem: (item: SelectedItemRef) => void;
  onAddCustomFont: (file: File) => void;
}

export default function PropertyPanel({
  template,
  selectedItem,
  onUpdateTemplate,
  onDeleteItem,
  onAddCustomFont,
}: PropertyPanelProps) {
  // 1. Text Field Editor
  if (selectedItem?.type === "field") {
    const field = template.fields.find((f) => f.id === selectedItem.id);
    if (!field) return <div className={styles.empty}>Field not found.</div>;

    const updateField = (partial: Partial<TextField>) => {
      const updatedFields = template.fields.map((f) =>
        f.id === field.id ? { ...f, ...partial } : f
      );
      onUpdateTemplate({ ...template, fields: updatedFields });
    };

    const handleDuplicateField = () => {
      const newField: TextField = {
        ...field,
        id: `${field.id}_copy_${Date.now().toString().slice(-4)}`,
        label: `${field.label} (Copy)`,
        box: {
          ...field.box,
          x: Math.min(0.9 - field.box.w, field.box.x + 0.03),
          y: Math.min(0.9 - field.box.h, field.box.y + 0.05),
        },
      };
      onUpdateTemplate({ ...template, fields: [...template.fields, newField] });
    };

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader} style={{ flexWrap: "wrap", gap: "8px" }}>
          <span className={styles.typeBadge}>TEXT FIELD</span>

          <div style={{ display: "inline-flex", gap: "4px" }}>
            <button
              type="button"
              className="btn-secondary"
              title="Center Horizontally"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => updateField({ box: { ...field.box, x: Math.max(0, (1 - field.box.w) / 2) } })}
            >
              <AlignCenter size={13} />
            </button>
            <button
              type="button"
              className="btn-secondary"
              title="Center Vertically"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={() => updateField({ box: { ...field.box, y: Math.max(0, (1 - field.box.h) / 2) } })}
            >
              <AlignVerticalJustifyCenter size={13} />
            </button>
            <button
              type="button"
              className="btn-secondary"
              title="Duplicate Field"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              onClick={handleDuplicateField}
            >
              <Copy size={13} />
            </button>
            <button
              type="button"
              className="btn-danger"
              style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 8px", fontSize: "11px" }}
              onClick={() => onDeleteItem(selectedItem)}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>


        <div className={styles.formGrid}>
          <div className={styles.fieldItem}>
            <span className="input-label">Field ID</span>
            <input
              type="text"
              className="text-input"
              value={field.id}
              onChange={(e) => updateField({ id: e.target.value.trim() })}
            />
          </div>

          <div className={styles.fieldItem}>
            <span className="input-label">Label (Shown to Users)</span>
            <input
              type="text"
              className="text-input"
              value={field.label}
              onChange={(e) => updateField({ label: e.target.value })}
            />
          </div>

          <div className={styles.fieldItem}>
            <span className="input-label">Default Value</span>
            <input
              type="text"
              className="text-input"
              value={field.defaultValue || ""}
              onChange={(e) => updateField({ defaultValue: e.target.value })}
            />
          </div>

          <div className={styles.fieldItem}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span className="input-label" style={{ marginBottom: 0 }}>Font Family</span>
              <label className="btn-secondary" style={{ fontSize: "0.72rem", padding: "3px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <Upload size={11} />
                <span>Upload Font</span>
                <input
                  type="file"
                  accept=".woff2,.ttf,.otf"
                  style={{ display: "none" }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      try {
                        const family = await registerCustomFontFromFile(file);
                        onAddCustomFont(file);
                        updateField({ font: family });
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
              value={field.font}
              onChange={(e) => {
                const val = e.target.value;
                ensureGoogleFont(val);
                updateField({ font: val });
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
                <optgroup label="Custom Template Fonts">
                  {template.fonts.map((f) => (
                    <option key={f.family} value={f.family}>
                      {f.family} (Uploaded)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            <input
              type="text"
              className="text-input"
              style={{ marginTop: "6px" }}
              placeholder="Or type custom font family..."
              value={field.font}
              onChange={(e) => {
                const val = e.target.value;
                ensureGoogleFont(val);
                updateField({ font: val });
              }}
            />
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldItem}>
              <span className="input-label">Weight</span>
              <select
                className="select-input"
                value={field.weight}
                onChange={(e) => updateField({ weight: Number(e.target.value) })}
              >
                <option value="300">300 (Light)</option>
                <option value="400">400 (Regular)</option>
                <option value="500">500 (Medium)</option>
                <option value="600">600 (Semi-Bold)</option>
                <option value="700">700 (Bold)</option>
                <option value="800">800 (Extra Bold)</option>
              </select>
            </div>

            <div className={styles.fieldItem}>
              <span className="input-label">Text Color</span>
              <div className={styles.colorRow}>
                <input
                  type="color"
                  value={field.color}
                  onChange={(e) => updateField({ color: e.target.value })}
                  className={styles.colorPicker}
                />
                <input
                  type="text"
                  className="text-input"
                  value={field.color}
                  onChange={(e) => updateField({ color: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldItem}>
              <span className="input-label">Align</span>
              <select
                className="select-input"
                value={field.align}
                onChange={(e) => updateField({ align: e.target.value as "left" | "center" | "right" })}
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>

            <div className={styles.fieldItem}>
              <span className="input-label">Vertical Align</span>
              <select
                className="select-input"
                value={field.valign}
                onChange={(e) => updateField({ valign: e.target.value as "top" | "middle" | "bottom" })}
              >
                <option value="middle">Middle</option>
                <option value="top">Top</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldItem}>
              <span className="input-label">Max Lines</span>
              <select
                className="select-input"
                value={field.maxLines}
                onChange={(e) => updateField({ maxLines: Number(e.target.value) as 1 | 2 })}
              >
                <option value="1">1 Line</option>
                <option value="2">2 Lines</option>
              </select>
            </div>

            <div className={styles.fieldItem}>
              <span className="input-label">Force Uppercase</span>
              <label className={styles.switchLabel}>
                <input
                  type="checkbox"
                  checked={field.uppercase}
                  onChange={(e) => updateField({ uppercase: e.target.checked })}
                />
                <span>Uppercase only</span>
              </label>
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldItem}>
              <span className="input-label">Max Font %</span>
              <input
                type="number"
                step="0.05"
                min="0.1"
                max="1"
                className="text-input"
                value={field.maxFontSize}
                onChange={(e) => updateField({ maxFontSize: Number(e.target.value) })}
              />
            </div>
            <div className={styles.fieldItem}>
              <span className="input-label">Min Font %</span>
              <input
                type="number"
                step="0.02"
                min="0.05"
                max="0.5"
                className="text-input"
                value={field.minFontSize}
                onChange={(e) => updateField({ minFontSize: Number(e.target.value) })}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. Logo Slot Editor
  if (selectedItem?.type === "logoSlot") {
    const slot = template.logoSlots.find((s) => s.id === selectedItem.id);
    if (!slot) return <div className={styles.empty}>Logo slot not found.</div>;

    const updateSlot = (partial: Partial<LogoSlot>) => {
      const updatedSlots = template.logoSlots.map((s) =>
        s.id === slot.id ? { ...s, ...partial } : s
      );
      onUpdateTemplate({ ...template, logoSlots: updatedSlots });
    };

    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.typeBadge}>LOGO SLOT</span>
          <button
            type="button"
            className="btn-danger"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            onClick={() => onDeleteItem(selectedItem)}
          >
            <Trash2 size={13} />
            <span>Delete Slot</span>
          </button>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldItem}>
            <span className="input-label">Slot ID</span>
            <input
              type="text"
              className="text-input"
              value={slot.id}
              onChange={(e) => updateSlot({ id: e.target.value })}
            />
          </div>
          <div className={styles.fieldItem}>
            <span className="input-label">Label</span>
            <input
              type="text"
              className="text-input"
              value={slot.label}
              onChange={(e) => updateSlot({ label: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  }

  // 3. QR Slot Editor
  if (selectedItem?.type === "qrSlot" && template.qrSlot) {
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.typeBadge}>QR CODE SLOT</span>
          <button
            type="button"
            className="btn-danger"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            onClick={() => onDeleteItem(selectedItem)}
          >
            <Trash2 size={13} />
            <span>Delete QR Slot</span>
          </button>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldItem}>
            <span className="input-label">Label</span>
            <input
              type="text"
              className="text-input"
              value={template.qrSlot.label}
              onChange={(e) =>
                onUpdateTemplate({
                  ...template,
                  qrSlot: { ...template.qrSlot!, label: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>
    );
  }

  // 4. Extra Logos Zone Editor
  if (selectedItem?.type === "extraLogosZone" && template.extraLogosZone) {
    const zone = template.extraLogosZone;
    return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.typeBadge}>EXTRA LOGOS ZONE</span>
          <button
            type="button"
            className="btn-danger"
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            onClick={() => onDeleteItem(selectedItem)}
          >
            <Trash2 size={13} />
            <span>Delete Zone</span>
          </button>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.fieldItem}>
            <span className="input-label">Alignment</span>
            <select
              className="select-input"
              value={zone.align}
              onChange={(e) =>
                onUpdateTemplate({
                  ...template,
                  extraLogosZone: {
                    ...zone,
                    align: e.target.value as "left" | "center" | "right",
                  },
                })
              }
            >
              <option value="left">Left</option>
              <option value="center">Center</option>
              <option value="right">Right</option>
            </select>
          </div>

          <div className={styles.fieldItem}>
            <span className="input-label">Logo Gap (% Banner Width)</span>
            <input
              type="number"
              step="0.002"
              min="0"
              max="0.05"
              className="text-input"
              value={zone.gapPercent}
              onChange={(e) =>
                onUpdateTemplate({
                  ...template,
                  extraLogosZone: {
                    ...zone,
                    gapPercent: Number(e.target.value),
                  },
                })
              }
            />
          </div>

          <div className={styles.fieldItem}>
            <span className="input-label">Vertical Divider Lines</span>
            <label className={styles.switchLabel}>
              <input
                type="checkbox"
                checked={Boolean(zone.showDividers)}
                onChange={(e) =>
                  onUpdateTemplate({
                    ...template,
                    extraLogosZone: {
                      ...zone,
                      showDividers: e.target.checked,
                    },
                  })
                }
              />
              <span>Show divider lines between logos</span>
            </label>
          </div>

          {zone.showDividers && (
            <>
              <div className={styles.twoCol}>
                <div className={styles.fieldItem}>
                  <span className="input-label">Line Thickness (px)</span>
                  <input
                    type="number"
                    min="0.5"
                    max="8"
                    step="0.5"
                    className="text-input"
                    value={zone.dividerWidth || 1.5}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        extraLogosZone: {
                          ...zone,
                          dividerWidth: Number(e.target.value),
                        },
                      })
                    }
                  />
                </div>

                <div className={styles.fieldItem}>
                  <span className="input-label">Line Height (% Zone)</span>
                  <input
                    type="number"
                    min="20"
                    max="100"
                    step="5"
                    className="text-input"
                    value={Math.round((zone.dividerHeightPercent || 0.75) * 100)}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        extraLogosZone: {
                          ...zone,
                          dividerHeightPercent: Number(e.target.value) / 100,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div className={styles.fieldItem}>
                <span className="input-label">Divider Line Color</span>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    className={styles.colorPicker}
                    value={zone.dividerColor?.startsWith("#") ? zone.dividerColor : "#ffffff"}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        extraLogosZone: {
                          ...zone,
                          dividerColor: e.target.value,
                        },
                      })
                    }
                  />
                  <input
                    type="text"
                    className="text-input"
                    value={zone.dividerColor || "rgba(255, 255, 255, 0.25)"}
                    onChange={(e) =>
                      onUpdateTemplate({
                        ...template,
                        extraLogosZone: {
                          ...zone,
                          dividerColor: e.target.value,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // 5. General Template Settings (Nothing selected)
  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.typeBadge}>TEMPLATE SETTINGS</span>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.fieldItem}>
          <span className="input-label">Template Name</span>
          <input
            type="text"
            className="text-input"
            value={template.name}
            onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
          />
        </div>

        <div className={styles.fieldItem}>
          <span className="input-label">Banner Width % of Canvas</span>
          <input
            type="number"
            min="50"
            max="100"
            className="text-input"
            value={template.placement.widthPercent}
            onChange={(e) =>
              onUpdateTemplate({
                ...template,
                placement: {
                  ...template.placement,
                  widthPercent: Number(e.target.value),
                },
              })
            }
          />
        </div>

        <div className={styles.fieldItem}>
          <span className="input-label">Bottom Margin % of Canvas</span>
          <input
            type="number"
            min="0"
            max="25"
            className="text-input"
            value={template.placement.bottomMarginPercent}
            onChange={(e) =>
              onUpdateTemplate({
                ...template,
                placement: {
                  ...template.placement,
                  bottomMarginPercent: Number(e.target.value),
                },
              })
            }
          />
        </div>

        <div className={styles.fieldItem}>
          <span className="input-label">Upload Template Font (.woff2, .ttf, .otf)</span>
          <label className="btn-secondary" style={{ width: "fit-content", display: "inline-flex", alignItems: "center", gap: "6px" }}>
            <Upload size={13} />
            <span>Add Font File</span>
            <input
              type="file"
              accept=".woff2,.ttf,.otf"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAddCustomFont(f);
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

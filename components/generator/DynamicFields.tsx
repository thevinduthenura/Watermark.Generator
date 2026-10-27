"use client";

import type { Template, TemplateRef } from "@/lib/types";
import styles from "./DynamicFields.module.css";

interface DynamicFieldsProps {
  template: Template;
  templateRefs: TemplateRef[];
  currentRef: TemplateRef | null;
  onSelectTemplate: (ref: TemplateRef) => void;
  values: Record<string, string>;
  onChangeValue: (fieldId: string, value: string) => void;
}

export default function DynamicFields({
  template,
  templateRefs,
  currentRef,
  onSelectTemplate,
  values,
  onChangeValue,
}: DynamicFieldsProps) {
  return (
    <div className={styles.container}>
      {templateRefs.length > 1 && (
        <div className={styles.fieldItem}>
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

      <div className={styles.fieldsGrid}>
        {template.fields.map((field) => {
          const val = values[field.id] ?? field.defaultValue ?? "";
          return (
            <div key={field.id} className={styles.fieldItem}>
              <div className={styles.labelRow}>
                <label htmlFor={`field-${field.id}`} className="input-label">
                  {field.label}
                </label>
                {field.uppercase && (
                  <span className={styles.badgeUpper}>UPPERCASE</span>
                )}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

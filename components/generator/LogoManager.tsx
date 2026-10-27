"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { loadImage, readFileAsDataUrl } from "@/lib/utils";
import type { LoadedTemplate, UserImage } from "@/lib/types";
import styles from "./LogoManager.module.css";

interface LogoManagerProps {
  loaded: LoadedTemplate;
  extraLogos: UserImage[];
  onChangeExtraLogos: (logos: UserImage[]) => void;
  qrImage?: UserImage;
  onChangeQrImage: (qr?: UserImage) => void;
  logoSlotImages: Record<string, UserImage | undefined>;
  onChangeLogoSlot: (slotId: string, img?: UserImage) => void;
}

export default function LogoManager({
  loaded,
  extraLogos,
  onChangeExtraLogos,
  qrImage,
  onChangeQrImage,
  logoSlotImages,
  onChangeLogoSlot,
}: LogoManagerProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const t = loaded.template;
  const hasExtraLogos = Boolean(t.extraLogosZone);
  const hasQrSlot = Boolean(t.qrSlot);
  const hasLogoSlots = t.logoSlots && t.logoSlots.length > 0;

  if (!hasExtraLogos && !hasQrSlot && !hasLogoSlots) {
    return null;
  }

  // Handle uploading extra logos (supports multiple files)
  const handleUploadExtra = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const added: UserImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const img = await loadImage(dataUrl);
        added.push({
          id: `logo_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          src: dataUrl,
          image: img,
          width: img.naturalWidth || img.width,
          height: img.naturalHeight || img.height,
        });
      } catch (err) {
        console.error("Failed to load logo image:", err);
      }
    }

    if (added.length) {
      onChangeExtraLogos([...extraLogos, ...added]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Handle uploading QR Code
  const handleUploadQr = async (file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(dataUrl);
      onChangeQrImage({
        id: `qr_${Date.now()}`,
        name: file.name,
        src: dataUrl,
        image: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    } catch (err) {
      console.error("Failed to load QR code:", err);
    }
    if (qrInputRef.current) qrInputRef.current.value = "";
  };

  // Handle uploading fixed slot image
  const handleUploadSlot = async (slotId: string, file: File | null) => {
    if (!file) return;
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const img = await loadImage(dataUrl);
      onChangeLogoSlot(slotId, {
        id: `slot_${slotId}_${Date.now()}`,
        name: file.name,
        src: dataUrl,
        image: img,
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
      });
    } catch (err) {
      console.error(`Failed to load slot image for ${slotId}:`, err);
    }
  };

  // Drag-and-drop reordering for extra logos
  const handleDragStart = (idx: number) => {
    setDraggedIndex(idx);
  };

  const handleDragOver = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIdx) return;
    const reordered = [...extraLogos];
    const [moved] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIdx, 0, moved);
    setDraggedIndex(targetIdx);
    onChangeExtraLogos(reordered);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeExtraLogo = (idx: number) => {
    const updated = extraLogos.filter((_, i) => i !== idx);
    onChangeExtraLogos(updated);
  };

  return (
    <div className={styles.container}>
      {/* 1. Extra Logos Zone */}
      {hasExtraLogos && (
        <div className={styles.sectionBlock}>
          <div className={styles.headerRow}>
            <div>
              <span className="input-label">Event Partner / Sponsor Logos</span>
              <p className={styles.helperText}>
                Added logos are auto-scaled and arranged horizontally inside the banner zone.
              </p>
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              + ADD LOGOS
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              multiple
              style={{ display: "none" }}
              onChange={(e) => handleUploadExtra(e.target.files)}
            />
          </div>

          {extraLogos.length > 0 ? (
            <div className={styles.logoList}>
              {extraLogos.map((logo, idx) => (
                <div
                  key={logo.id}
                  className={`${styles.logoCard} ${draggedIndex === idx ? styles.isDragging : ""}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <div className={styles.thumbWrap}>
                    <img src={logo.src} alt={logo.name} className={styles.thumbImg} />
                  </div>
                  <div className={styles.cardInfo}>
                    <span className={styles.cardName}>{logo.name}</span>
                    <span className={styles.cardDim}>
                      {logo.width} × {logo.height}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={styles.btnRemove}
                    title="Remove Logo"
                    onClick={() => removeExtraLogo(idx)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div
              className={styles.dropZone}
              onClick={() => fileInputRef.current?.click()}
            >
              <span>Click or drop partner/sponsor logos here (PNG, SVG, JPG, WebP)</span>
            </div>
          )}
        </div>
      )}

      {/* 2. QR Code Slot */}
      {hasQrSlot && (
        <div className={styles.sectionBlock}>
          <div className={styles.headerRow}>
            <div>
              <span className="input-label">{t.qrSlot?.label || "QR Code"}</span>
              <p className={styles.helperText}>
                Upload a square QR code image to place in the banner.
              </p>
            </div>
          </div>

          {qrImage ? (
            <div className={styles.qrRow}>
              <div className={styles.qrThumb}>
                <img src={qrImage.src} alt="QR code" className={styles.thumbImg} />
              </div>
              <div className={styles.cardInfo}>
                <span className={styles.cardName}>{qrImage.name}</span>
                <span className={styles.cardDim}>
                  {qrImage.width} × {qrImage.height} px
                </span>
              </div>
              <button
                type="button"
                className="btn-danger"
                onClick={() => onChangeQrImage(undefined)}
              >
                Remove
              </button>
            </div>
          ) : (
            <div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => qrInputRef.current?.click()}
              >
                + UPLOAD QR CODE
              </button>
              <input
                ref={qrInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                style={{ display: "none" }}
                onChange={(e) => handleUploadQr(e.target.files?.[0] || null)}
              />
            </div>
          )}
        </div>
      )}

      {/* 3. Fixed Logo Slots (if template has defined slots) */}
      {hasLogoSlots && (
        <div className={styles.sectionBlock}>
          <span className="input-label">Fixed Logo Slots</span>
          <div className={styles.slotsGrid}>
            {t.logoSlots.map((slot) => {
              const current = logoSlotImages[slot.id];
              return (
                <div key={slot.id} className={styles.slotItem}>
                  <span className={styles.slotLabel}>{slot.label}</span>
                  {current ? (
                    <div className={styles.slotPreview}>
                      <img src={current.src} alt={slot.label} className={styles.thumbImg} />
                      <button
                        type="button"
                        className={styles.btnRemove}
                        onClick={() => onChangeLogoSlot(slot.id, undefined)}
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className={styles.slotUploadBtn}>
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        style={{ display: "none" }}
                        onChange={(e) =>
                          handleUploadSlot(slot.id, e.target.files?.[0] || null)
                        }
                      />
                    </label>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

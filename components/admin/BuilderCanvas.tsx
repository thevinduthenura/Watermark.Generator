"use client";

import { useEffect, useRef, useState } from "react";
import type { Box, ExtraLogosZone, LogoSlot, QrSlot, Template, TextField } from "@/lib/types";
import styles from "./BuilderCanvas.module.css";

export type SelectableItemType = "field" | "logoSlot" | "qrSlot" | "extraLogosZone";

export interface SelectedItemRef {
  type: SelectableItemType;
  id?: string;
}

interface BuilderCanvasProps {
  blankTagImage: HTMLImageElement | null;
  template: Template;
  selectedItem: SelectedItemRef | null;
  onSelectItem: (item: SelectedItemRef | null) => void;
  onUpdateBox: (type: SelectableItemType, id: string | undefined, box: Box) => void;
  activeTool: "select" | "add_field" | "add_logo" | "add_qr" | "add_extra";
  onCreatedBox: (type: SelectableItemType, box: Box) => void;
  livePreview?: boolean;
  onDeleteSelected?: () => void;
}

export default function BuilderCanvas({
  blankTagImage,
  template,
  selectedItem,
  onSelectItem,
  onUpdateBox,
  activeTool,
  onCreatedBox,
  livePreview = false,
  onDeleteSelected,
}: BuilderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [dragging, setDragging] = useState<{
    type: "create" | "move" | "resize";
    handle?: string;
    startX: number;
    startY: number;
    initialBox: Box;
    item?: SelectedItemRef;
  } | null>(null);

  // Keyboard navigation & Delete support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedItem) return;
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "SELECT"
      ) {
        return;
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        onDeleteSelected?.();
        return;
      }

      if (e.key === "Escape") {
        onSelectItem(null);
        return;
      }

      const step = e.shiftKey ? 0.02 : 0.005;
      let currentBox: Box | null = null;

      if (selectedItem.type === "field") {
        currentBox = template.fields.find((f) => f.id === selectedItem.id)?.box || null;
      } else if (selectedItem.type === "logoSlot") {
        currentBox = template.logoSlots.find((s) => s.id === selectedItem.id)?.box || null;
      } else if (selectedItem.type === "qrSlot" && template.qrSlot) {
        currentBox = template.qrSlot.box;
      } else if (selectedItem.type === "extraLogosZone" && template.extraLogosZone) {
        currentBox = template.extraLogosZone.box;
      }

      if (!currentBox) return;

      let dx = 0;
      let dy = 0;
      if (e.key === "ArrowLeft") dx = -step;
      else if (e.key === "ArrowRight") dx = step;
      else if (e.key === "ArrowUp") dy = -step;
      else if (e.key === "ArrowDown") dy = step;

      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        const newBox: Box = {
          ...currentBox,
          x: Math.max(0, Math.min(1 - currentBox.w, currentBox.x + dx)),
          y: Math.max(0, Math.min(1 - currentBox.h, currentBox.y + dy)),
        };
        onUpdateBox(selectedItem.type, selectedItem.id, newBox);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem, template, onUpdateBox, onDeleteSelected, onSelectItem]);

  // Resize observer to scale interactive canvas overlay
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);


  const naturalWidth = template.naturalWidth || 5184;
  const naturalHeight = template.naturalHeight || 285;
  const aspect = naturalHeight / naturalWidth;
  const displayHeight = containerWidth * aspect;

  // Convert mouse event coordinates to fractional (0..1)
  const getFractionalCoords = (e: React.MouseEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  // Mouse down on container (create box if tool active, or clear selection)
  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (activeTool !== "select") {
      const { x, y } = getFractionalCoords(e);
      setDragging({
        type: "create",
        startX: x,
        startY: y,
        initialBox: { x, y, w: 0.01, h: 0.01 },
      });
      e.preventDefault();
    } else {
      onSelectItem(null);
    }
  };

  // Mouse down on a box
  const handleBoxMouseDown = (
    e: React.MouseEvent,
    type: SelectableItemType,
    id: string | undefined,
    currentBox: Box
  ) => {
    e.stopPropagation();
    onSelectItem({ type, id });

    if (activeTool === "select") {
      const { x, y } = getFractionalCoords(e);
      setDragging({
        type: "move",
        startX: x,
        startY: y,
        initialBox: { ...currentBox },
        item: { type, id },
      });
    }
  };

  // Mouse down on resize handle
  const handleResizeMouseDown = (
    e: React.MouseEvent,
    handle: string,
    type: SelectableItemType,
    id: string | undefined,
    currentBox: Box
  ) => {
    e.stopPropagation();
    const { x, y } = getFractionalCoords(e);
    setDragging({
      type: "resize",
      handle,
      startX: x,
      startY: y,
      initialBox: { ...currentBox },
      item: { type, id },
    });
  };

  // Mouse move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return;
    const { x, y } = getFractionalCoords(e);
    const dx = x - dragging.startX;
    const dy = y - dragging.startY;

    if (dragging.type === "move" && dragging.item) {
      const b = dragging.initialBox;
      const newX = Math.max(0, Math.min(1 - b.w, b.x + dx));
      const newY = Math.max(0, Math.min(1 - b.h, b.y + dy));
      onUpdateBox(dragging.item.type, dragging.item.id, {
        ...b,
        x: Number(newX.toFixed(4)),
        y: Number(newY.toFixed(4)),
      });
    } else if (dragging.type === "resize" && dragging.item) {
      const b = dragging.initialBox;
      let newBox = { ...b };
      if (dragging.handle?.includes("e")) newBox.w = Math.max(0.01, Math.min(1 - b.x, b.w + dx));
      if (dragging.handle?.includes("s")) newBox.h = Math.max(0.01, Math.min(1 - b.y, b.h + dy));
      if (dragging.handle?.includes("w")) {
        const potentialW = b.w - dx;
        if (potentialW > 0.01 && b.x + dx >= 0) {
          newBox.x = b.x + dx;
          newBox.w = potentialW;
        }
      }
      if (dragging.handle?.includes("n")) {
        const potentialH = b.h - dy;
        if (potentialH > 0.01 && b.y + dy >= 0) {
          newBox.y = b.y + dy;
          newBox.h = potentialH;
        }
      }
      onUpdateBox(dragging.item.type, dragging.item.id, {
        x: Number(newBox.x.toFixed(4)),
        y: Number(newBox.y.toFixed(4)),
        w: Number(newBox.w.toFixed(4)),
        h: Number(newBox.h.toFixed(4)),
      });
    } else if (dragging.type === "create") {
      const startX = Math.min(dragging.startX, x);
      const startY = Math.min(dragging.startY, y);
      const w = Math.max(0.01, Math.abs(x - dragging.startX));
      const h = Math.max(0.01, Math.abs(y - dragging.startY));
      dragging.initialBox = { x: startX, y: startY, w, h };
    }
  };

  // Mouse up
  const handleMouseUp = () => {
    if (dragging?.type === "create") {
      const b = dragging.initialBox;
      if (b.w >= 0.02 && b.h >= 0.05) {
        if (activeTool === "add_field") onCreatedBox("field", b);
        else if (activeTool === "add_logo") onCreatedBox("logoSlot", b);
        else if (activeTool === "add_qr") onCreatedBox("qrSlot", b);
        else if (activeTool === "add_extra") onCreatedBox("extraLogosZone", b);
      }
    }
    setDragging(null);
  };

  const isSelected = (type: SelectableItemType, id?: string) => {
    if (!selectedItem) return false;
    if (selectedItem.type !== type) return false;
    return id ? selectedItem.id === id : true;
  };

  return (
    <div
      ref={containerRef}
      className={`${styles.canvasContainer} checkerboard`}
      style={{ height: `${Math.max(120, displayHeight)}px` }}
      onMouseDown={handleContainerMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {blankTagImage && (
        <img
          src={blankTagImage.src}
          alt="Blank Tag Banner"
          className={styles.blankTagImg}
        />
      )}

      {/* RENDER BOXES */}
      {/* 1. Text Fields */}
      {template.fields.map((f) => {
        const active = isSelected("field", f.id);
        const approxFontSize = Math.max(9, Math.min(26, displayHeight * f.box.h * (f.maxFontSize || 0.45)));
        return (
          <div
            key={f.id}
            className={`${styles.boxOverlay} ${styles.fieldBox} ${active ? styles.activeBox : ""}`}
            style={{
              left: `${f.box.x * 100}%`,
              top: `${f.box.y * 100}%`,
              width: `${f.box.w * 100}%`,
              height: `${f.box.h * 100}%`,
            }}
            onMouseDown={(e) => handleBoxMouseDown(e, "field", f.id, f.box)}
          >
            {livePreview ? (
              <div
                className={styles.simulatedText}
                style={{
                  fontFamily: f.font || "sans-serif",
                  fontWeight: f.weight || 600,
                  color: f.color || "#ffffff",
                  justifyContent:
                    f.align === "left" ? "flex-start" : f.align === "right" ? "flex-end" : "center",
                  alignItems:
                    f.valign === "top" ? "flex-start" : f.valign === "bottom" ? "flex-end" : "center",
                  textTransform: f.uppercase ? "uppercase" : "none",
                  fontSize: `${approxFontSize}px`,
                }}
              >
                {f.defaultValue || f.placeholder || f.label}
              </div>
            ) : (
              <div className={styles.boxTag}>
                <span>{f.label}</span>
              </div>
            )}
            {active && (
              <>
                <div
                  className={`${styles.handle} ${styles.handleSe}`}
                  onMouseDown={(e) => handleResizeMouseDown(e, "se", "field", f.id, f.box)}
                />
                <div
                  className={`${styles.handle} ${styles.handleNw}`}
                  onMouseDown={(e) => handleResizeMouseDown(e, "nw", "field", f.id, f.box)}
                />
              </>
            )}
          </div>
        );
      })}

      {/* 2. Logo Slots */}
      {template.logoSlots.map((s) => {
        const active = isSelected("logoSlot", s.id);
        return (
          <div
            key={s.id}
            className={`${styles.boxOverlay} ${styles.logoBox} ${active ? styles.activeBox : ""}`}
            style={{
              left: `${s.box.x * 100}%`,
              top: `${s.box.y * 100}%`,
              width: `${s.box.w * 100}%`,
              height: `${s.box.h * 100}%`,
            }}
            onMouseDown={(e) => handleBoxMouseDown(e, "logoSlot", s.id, s.box)}
          >
            {livePreview ? (
              <div className={styles.simulatedPlaceholder}>LOGO: {s.label}</div>
            ) : (
              <div className={styles.boxTag}>
                <span>Logo: {s.label}</span>
              </div>
            )}
            {active && (
              <div
                className={`${styles.handle} ${styles.handleSe}`}
                onMouseDown={(e) => handleResizeMouseDown(e, "se", "logoSlot", s.id, s.box)}
              />
            )}
          </div>
        );
      })}

      {/* 3. QR Slot */}
      {template.qrSlot && (
        <div
          className={`${styles.boxOverlay} ${styles.qrBox} ${isSelected("qrSlot") ? styles.activeBox : ""}`}
          style={{
            left: `${template.qrSlot.box.x * 100}%`,
            top: `${template.qrSlot.box.y * 100}%`,
            width: `${template.qrSlot.box.w * 100}%`,
            height: `${template.qrSlot.box.h * 100}%`,
          }}
          onMouseDown={(e) =>
            handleBoxMouseDown(e, "qrSlot", undefined, template.qrSlot!.box)
          }
        >
          {livePreview ? (
            <div className={styles.simulatedPlaceholder}>[QR]</div>
          ) : (
            <div className={styles.boxTag}>
              <span>QR: {template.qrSlot.label}</span>
            </div>
          )}
          {isSelected("qrSlot") && (
            <div
              className={`${styles.handle} ${styles.handleSe}`}
              onMouseDown={(e) =>
                handleResizeMouseDown(e, "se", "qrSlot", undefined, template.qrSlot!.box)
              }
            />
          )}
        </div>
      )}

      {/* 4. Extra Logos Zone */}
      {template.extraLogosZone && (
        <div
          className={`${styles.boxOverlay} ${styles.extraBox} ${isSelected("extraLogosZone") ? styles.activeBox : ""}`}
          style={{
            left: `${template.extraLogosZone.box.x * 100}%`,
            top: `${template.extraLogosZone.box.y * 100}%`,
            width: `${template.extraLogosZone.box.w * 100}%`,
            height: `${template.extraLogosZone.box.h * 100}%`,
          }}
          onMouseDown={(e) =>
            handleBoxMouseDown(
              e,
              "extraLogosZone",
              undefined,
              template.extraLogosZone!.box
            )
          }
        >
          {livePreview ? (
            <div className={styles.simulatedPlaceholder}>EXTRA LOGOS</div>
          ) : (
            <div className={styles.boxTag}>
              <span>Extra Logos Zone</span>
            </div>
          )}
          {isSelected("extraLogosZone") && (
            <div
              className={`${styles.handle} ${styles.handleSe}`}
              onMouseDown={(e) =>
                handleResizeMouseDown(
                  e,
                  "se",
                  "extraLogosZone",
                  undefined,
                  template.extraLogosZone!.box
                )
              }
            />
          )}
        </div>
      )}


      {/* Temporary drawing box when dragging to create */}
      {dragging?.type === "create" && (
        <div
          className={styles.drawingGhost}
          style={{
            left: `${dragging.initialBox.x * 100}%`,
            top: `${dragging.initialBox.y * 100}%`,
            width: `${dragging.initialBox.w * 100}%`,
            height: `${dragging.initialBox.h * 100}%`,
          }}
        />
      )}
    </div>
  );
}

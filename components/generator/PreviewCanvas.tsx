"use client";

import { useEffect, useRef, useState } from "react";
import { bannerRect, renderBanner } from "@/lib/renderer";
import { get2d } from "@/lib/imageDraw";
import { buildBaseFilename } from "@/lib/export";
import type { LoadedTemplate, Orientation, RenderInputs, Size } from "@/lib/types";
import { Eye } from "lucide-react";
import styles from "./PreviewCanvas.module.css";

interface PreviewCanvasProps {
  loaded: LoadedTemplate;
  inputs: RenderInputs;
  primarySize: Size;
  orientation: Orientation;
  bannerOnly: boolean;
  selectedCount: number;
}

export default function PreviewCanvas({
  loaded,
  inputs,
  primarySize,
  orientation,
  bannerOnly,
  selectedCount,
}: PreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderTime, setRenderTime] = useState<number>(0);

  // Debounced live render effect
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled || !canvasRef.current || !loaded) return;

      const canvas = canvasRef.current;
      const t0 = performance.now();

      // For preview, we render the banner strip at a crisp display resolution (e.g. 1920 or 2560 px wide)
      // so text and logos look sharp on retina displays without consuming GBs of VRAM.
      const previewWidth = 2000;
      const previewHeight = Math.max(1, Math.round((previewWidth * loaded.template.naturalHeight) / loaded.template.naturalWidth));

      canvas.width = previewWidth;
      canvas.height = previewHeight;

      const ctx = get2d(canvas);
      ctx.clearRect(0, 0, previewWidth, previewHeight);

      // Call the exact same renderBanner function!
      renderBanner(
        ctx,
        loaded,
        inputs,
        { x: 0, y: 0, w: previewWidth, h: previewHeight }
      );

      setRenderTime(Math.round(performance.now() - t0));
    }, 80); // 80ms snappy debounce

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [loaded, inputs]);

  const baseFilename = buildBaseFilename(inputs);
  const sampleFilename =
    selectedCount > 1
      ? `${baseFilename}_watermarks_${selectedCount}_resolutions.zip`
      : `${baseFilename}_${primarySize.width}x${primarySize.height}${bannerOnly ? "_banner" : ""}.png`;

  return (
    <div className={styles.container}>
      <div className={styles.cardHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.liveDot} />
          <Eye size={13} style={{ color: "var(--accent)" }} />
          <span className={styles.headerTitle}>LIVE BANNER PREVIEW</span>
        </div>
        <span className={styles.renderBadge}>
          {renderTime ? `${renderTime}ms` : "rendering"}
        </span>
      </div>

      <div className={`${styles.canvasWrap} checkerboard`}>
        <canvas ref={canvasRef} className={styles.canvas} />
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Output File:</span>
          <span className={styles.metaVal}>{sampleFilename}</span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Target Resolution:</span>
          <span className={styles.metaVal}>
            {primarySize.width} × {primarySize.height} px ({orientation})
          </span>
        </div>
        <div className={styles.metaRow}>
          <span className={styles.metaLabel}>Alpha Channel:</span>
          <span className={styles.metaVal}>Transparent PNG (RGBA 8-bit)</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export default function CursorFollower() {
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only activate on devices with fine pointer (mouse)
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    const dot = cursorDotRef.current;
    const ring = cursorRingRef.current;
    if (!dot || !ring) return;

    // Fast GSAP quickTo setters for 60fps tracking
    const setDotX = gsap.quickTo(dot, "x", { duration: 0.1, ease: "power2.out" });
    const setDotY = gsap.quickTo(dot, "y", { duration: 0.1, ease: "power2.out" });
    const setRingX = gsap.quickTo(ring, "x", { duration: 0.25, ease: "power3.out" });
    const setRingY = gsap.quickTo(ring, "y", { duration: 0.25, ease: "power3.out" });

    let isHoveringInteractive = false;

    const handleMouseMove = (e: MouseEvent) => {
      setDotX(e.clientX);
      setDotY(e.clientY);
      setRingX(e.clientX);
      setRingY(e.clientY);

      // Check if hovering over interactive element
      const target = e.target as HTMLElement | null;
      const isInteractive = target?.closest(
        "button, a, input, select, textarea, [role='button'], canvas, .interactive-card"
      );

      if (isInteractive && !isHoveringInteractive) {
        isHoveringInteractive = true;
        gsap.to(ring, {
          scale: 1.8,
          borderColor: "#D4FF00",
          backgroundColor: "rgba(212, 255, 0, 0.08)",
          boxShadow: "0 0 15px rgba(212, 255, 0, 0.4)",
          duration: 0.2,
          ease: "power2.out",
        });
        gsap.to(dot, { scale: 0.5, duration: 0.2 });
      } else if (!isInteractive && isHoveringInteractive) {
        isHoveringInteractive = false;
        gsap.to(ring, {
          scale: 1,
          borderColor: "rgba(212, 255, 0, 0.35)",
          backgroundColor: "transparent",
          boxShadow: "none",
          duration: 0.2,
          ease: "power2.out",
        });
        gsap.to(dot, { scale: 1, duration: 0.2 });
      }
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <>
      {/* Precision Volt Dot */}
      <div
        ref={cursorDotRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "6px",
          height: "6px",
          marginLeft: "-3px",
          marginTop: "-3px",
          backgroundColor: "#D4FF00",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9999,
          mixBlendMode: "screen",
          boxShadow: "0 0 8px #D4FF00",
        }}
      />
      {/* Smooth Trailing Focus Ring */}
      <div
        ref={cursorRingRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "28px",
          height: "28px",
          marginLeft: "-14px",
          marginTop: "-14px",
          border: "1px solid rgba(212, 255, 0, 0.35)",
          borderRadius: "50%",
          pointerEvents: "none",
          zIndex: 9998,
          transition: "opacity 0.2s ease",
        }}
      />
    </>
  );
}

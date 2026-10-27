"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import styles from "./Hero.module.css";

export default function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const subtitleRef = useRef<HTMLSpanElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Subtitle entrance
      if (subtitleRef.current) {
        gsap.fromTo(
          subtitleRef.current,
          { opacity: 0, y: 24, letterSpacing: "0.45em" },
          { opacity: 1, y: 0, letterSpacing: "0.28em", duration: 0.9, ease: "power3.out" }
        );
      }

      // Main Title entrance
      if (titleRef.current) {
        gsap.fromTo(
          titleRef.current,
          { opacity: 0, y: 35, scale: 0.96 },
          { opacity: 1, y: 0, scale: 1, duration: 1.1, delay: 0.15, ease: "power4.out" }
        );
      }

      // Meta group entrance
      if (metaRef.current) {
        gsap.fromTo(
          metaRef.current,
          { opacity: 0, x: 25 },
          { opacity: 1, x: 0, duration: 0.9, delay: 0.3, ease: "power3.out" }
        );
      }

      // Ambient volt glow breathing effect
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          opacity: 0.45,
          scale: 1.25,
          duration: 3.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={containerRef} className={styles.heroSection}>
      <div className={styles.imageWrapper}>
        <Image
          src="/hero.jpg"
          alt="Event Photographer"
          fill
          priority
          className={styles.heroImage}
        />
        <div className={styles.overlay} />
      </div>

      {/* GSAP Ambient Volt Glow */}
      <div ref={glowRef} className={styles.ambientHeroGlow} />

      <div className={styles.content}>
        <div className={styles.titleGroup}>
          <span ref={subtitleRef} className={styles.subtitle}>
            WATERMARK
          </span>
          <h1 ref={titleRef} className={styles.title}>
            GENERATOR
          </h1>
        </div>

        <div ref={metaRef} className={styles.metaGroup}>
          <p className={styles.tagline}>
            TRANSPARENT WATERMARK TAG STUDIO FOR EVENT PHOTOGRAPHY
          </p>
          <p className={styles.subtext}>
            100% Client-Side Engine · Zero Uploads · High Precision Resampling
          </p>
        </div>
      </div>
    </section>
  );
}


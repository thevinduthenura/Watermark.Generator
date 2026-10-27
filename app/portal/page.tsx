"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/generator/Header";
import Footer from "@/components/generator/Footer";
import {
  loadPhotographerProfile,
  savePhotographerProfile,
  applyProfileToGenerator,
  DEFAULT_PRESETS,
  loadCustomPresets,
  applyPresetToGenerator,
  type PhotographerProfile,
  type StudioPreset,
} from "@/lib/portalStorage";
import gsap from "gsap";
import {
  User,
  Sliders,
  Image as ImageIcon,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Download,
  Upload,
  RefreshCw,
  Camera,
  Layers,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

export default function UserPortalPage() {
  const [activeTab, setActiveTab] = useState<"profile" | "presets" | "simulator">("profile");
  const [profile, setProfile] = useState<PhotographerProfile>(loadPhotographerProfile);
  const [customPresets, setCustomPresets] = useState<StudioPreset[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Simulator state
  const [sampleChoice, setSampleChoice] = useState<"event" | "concert" | "portrait">("event");
  const [customPhotoSrc, setCustomPhotoSrc] = useState<string | null>(null);
  const [watermarkPos, setWatermarkPos] = useState<"bottom" | "top" | "bottom-right">("bottom");
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(90);
  const [watermarkScale, setWatermarkScale] = useState<number>(100);

  const containerRef = useRef<HTMLDivElement>(null);
  const simCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setProfile(loadPhotographerProfile());
    setCustomPresets(loadCustomPresets());
  }, []);

  // GSAP animation on mount & tab change
  useEffect(() => {
    if (!containerRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        `.${styles.formCard}, .${styles.badgePreviewCard}, .${styles.presetCard}, .${styles.simulatorControls}, .${styles.simulatorCanvasWrap}`,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [activeTab]);

  const handleProfileChange = (field: keyof PhotographerProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = () => {
    savePhotographerProfile(profile);
    setFeedback("Photographer profile saved locally.");
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleApplyToGenerator = () => {
    savePhotographerProfile(profile);
    applyProfileToGenerator(profile);
    setFeedback("Profile defaults successfully pushed to Watermark Generator session!");
    setTimeout(() => setFeedback(null), 3500);
  };

  const handleActivatePreset = (preset: StudioPreset) => {
    applyPresetToGenerator(preset);
    setFeedback(`Activated "${preset.name}". Redirecting to Generator...`);
    setTimeout(() => {
      window.location.href = "/";
    }, 900);
  };

  // Draw simulator canvas
  useEffect(() => {
    if (activeTab !== "simulator" || !simCanvasRef.current) return;
    const canvas = simCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const baseWidth = 1200;
    const baseHeight = 800;
    canvas.width = baseWidth;
    canvas.height = baseHeight;

    // Draw background
    if (customPhotoSrc) {
      const img = new window.Image();
      img.src = customPhotoSrc;
      img.onload = () => {
        ctx.drawImage(img, 0, 0, baseWidth, baseHeight);
        drawWatermarkOverlay();
      };
    } else {
      // Procedural photography sample background
      if (sampleChoice === "event") {
        // Dark sports stadium arena
        const grad = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
        grad.addColorStop(0, "#080c10");
        grad.addColorStop(0.5, "#151b22");
        grad.addColorStop(1, "#05070a");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, baseWidth, baseHeight);

        // Stage lighting lights
        for (let i = 0; i < 4; i++) {
          const lGrad = ctx.createRadialGradient(250 + i * 250, 150, 10, 250 + i * 250, 150, 300);
          lGrad.addColorStop(0, "rgba(212, 255, 0, 0.2)");
          lGrad.addColorStop(1, "transparent");
          ctx.fillStyle = lGrad;
          ctx.beginPath();
          ctx.arc(250 + i * 250, 150, 300, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (sampleChoice === "concert") {
        const grad = ctx.createLinearGradient(0, 0, baseWidth, baseHeight);
        grad.addColorStop(0, "#12081c");
        grad.addColorStop(0.6, "#0a0a0f");
        grad.addColorStop(1, "#050508");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, baseWidth, baseHeight);

        const rGrad = ctx.createRadialGradient(baseWidth / 2, baseHeight / 2, 20, baseWidth / 2, baseHeight / 2, 450);
        rGrad.addColorStop(0, "rgba(212, 255, 0, 0.25)");
        rGrad.addColorStop(0.5, "rgba(80, 200, 120, 0.1)");
        rGrad.addColorStop(1, "transparent");
        ctx.fillStyle = rGrad;
        ctx.fillRect(0, 0, baseWidth, baseHeight);
      } else {
        // Studio portrait
        const grad = ctx.createRadialGradient(baseWidth / 2, baseHeight / 2 - 50, 50, baseWidth / 2, baseHeight / 2, 600);
        grad.addColorStop(0, "#222222");
        grad.addColorStop(1, "#0c0c0c");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, baseWidth, baseHeight);
      }

      // Draw photo subject placeholder silhouette
      ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
      ctx.beginPath();
      ctx.arc(baseWidth / 2, baseHeight * 0.4, 110, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(baseWidth / 2, baseHeight * 0.8, 220, 140, 0, 0, Math.PI * 2);
      ctx.fill();

      // Subject label
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.font = "600 13px Mona Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(
        sampleChoice === "event"
          ? "SIMULATED SPORTS ARENA PHOTO (1200×800)"
          : sampleChoice === "concert"
          ? "SIMULATED FESTIVAL LIVE STAGE PHOTO"
          : "SIMULATED STUDIO PORTRAIT PHOTO",
        baseWidth / 2,
        baseHeight * 0.4
      );

      drawWatermarkOverlay();
    }

    function drawWatermarkOverlay() {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = watermarkOpacity / 100;

      const scale = watermarkScale / 100;
      const bannerH = 110 * scale;

      let bannerY = baseHeight - bannerH;
      if (watermarkPos === "top") bannerY = 0;

      if (watermarkPos === "bottom-right") {
        // Corner badge watermark
        const badgeW = 340 * scale;
        const badgeH = 80 * scale;
        const badgeX = baseWidth - badgeW - 30;
        const badgeY = baseHeight - badgeH - 30;

        ctx.fillStyle = "rgba(16, 16, 16, 0.88)";
        ctx.strokeStyle = "rgba(212, 255, 0, 0.4)";
        ctx.lineWidth = 2;
        ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
        ctx.strokeRect(badgeX, badgeY, badgeW, badgeH);

        // Volt accent bar
        ctx.fillStyle = "#D4FF00";
        ctx.fillRect(badgeX, badgeY, 6 * scale, badgeH);

        // Text
        ctx.textAlign = "left";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `700 ${14 * scale}px Mona Sans, sans-serif`;
        ctx.fillText(profile.studioName || "MILAQ VISUALS", badgeX + 20 * scale, badgeY + 32 * scale);

        ctx.fillStyle = "#D4FF00";
        ctx.font = `600 ${11 * scale}px Mona Sans, sans-serif`;
        ctx.fillText(profile.photographerName || "ALEX RIVERA", badgeX + 20 * scale, badgeY + 54 * scale);

        ctx.fillStyle = "#E6E6E6";
        ctx.font = `500 ${9 * scale}px monospace`;
        ctx.fillText(profile.instagram || "@milaq_creatives", badgeX + 20 * scale, badgeY + 70 * scale);
      } else {
        // Full width banner watermark
        const bgGrad = ctx.createLinearGradient(0, bannerY, 0, bannerY + bannerH);
        bgGrad.addColorStop(0, "rgba(16, 16, 16, 0.95)");
        bgGrad.addColorStop(1, "rgba(8, 8, 8, 0.98)");
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, bannerY, baseWidth, bannerH);

        // Volt accent top border
        ctx.fillStyle = "#D4FF00";
        ctx.fillRect(0, watermarkPos === "top" ? bannerH - 3 : bannerY, baseWidth, 3);

        // Monogram square
        const boxSize = 60 * scale;
        const boxX = 40;
        const boxY = bannerY + (bannerH - boxSize) / 2;
        ctx.fillStyle = "#D4FF00";
        ctx.fillRect(boxX, boxY, boxSize, boxSize);

        ctx.fillStyle = "#101010";
        ctx.font = `800 ${24 * scale}px Mona Sans, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(profile.monogram || "MQ", boxX + boxSize / 2, boxY + boxSize / 2);

        // Event & Studio titles
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";

        ctx.fillStyle = "#FFFFFF";
        ctx.font = `700 ${22 * scale}px Mona Sans, sans-serif`;
        ctx.fillText(
          (profile.eventTitle || "CHAMPIONSHIP FINALS").toUpperCase(),
          boxX + boxSize + 25 * scale,
          bannerY + 45 * scale
        );

        ctx.fillStyle = "#D4FF00";
        ctx.font = `600 ${13 * scale}px Mona Sans, sans-serif`;
        ctx.fillText(
          `PHOTO BY ${profile.photographerName.toUpperCase()} · ${profile.studioName.toUpperCase()}`,
          boxX + boxSize + 25 * scale,
          bannerY + 75 * scale
        );

        // Right side handle & copyright
        ctx.textAlign = "right";
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `600 ${14 * scale}px monospace`;
        ctx.fillText(profile.instagram || "@milaq_creatives", baseWidth - 40, bannerY + 45 * scale);

        ctx.fillStyle = "#A0A0A0";
        ctx.font = `500 ${10 * scale}px monospace`;
        ctx.fillText(profile.copyrightNotice || "© 2026 ALL RIGHTS RESERVED", baseWidth - 40, bannerY + 75 * scale);
      }

      ctx.restore();
    }
  }, [activeTab, sampleChoice, customPhotoSrc, watermarkPos, watermarkOpacity, watermarkScale, profile]);

  const handleCustomUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (typeof ev.target?.result === "string") {
        setCustomPhotoSrc(ev.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadSimulation = () => {
    if (!simCanvasRef.current) return;
    const link = document.createElement("a");
    link.download = `watermark_simulated_${Date.now()}.jpg`;
    link.href = simCanvasRef.current.toDataURL("image/jpeg", 0.95);
    link.click();
  };

  return (
    <div className={styles.portalPage}>
      <Header activeTab="portal" />

      {/* Hero Banner */}
      <section className={styles.heroSection}>
        <div className={styles.ambientPortalGlow} />
        <div className={styles.heroContent}>
          <div className={styles.categoryTag}>
            <Sparkles size={13} />
            <span>PHOTOGRAPHER CREATIVE STUDIO // PORTAL</span>
          </div>
          <h1 className={styles.heroTitle}>
            BRAND SUITE & <span>PRESET VAULT</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Configure your studio brand identity, load photography presets, and simulate live
            watermark overlays over actual high-resolution event photographs before exporting.
          </p>

          {/* Toast / Feedback */}
          {feedback && (
            <div
              style={{
                marginTop: "16px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(212, 255, 0, 0.12)",
                border: "1px solid var(--accent-green)",
                color: "var(--accent-green)",
                padding: "8px 16px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 600,
                letterSpacing: "0.05em",
              }}
            >
              <CheckCircle2 size={15} />
              <span>{feedback}</span>
            </div>
          )}
        </div>

        {/* Tabs Bar */}
        <div className={styles.tabsBar}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "profile" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <User size={14} />
            <span>STUDIO PROFILE</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "presets" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("presets")}
          >
            <Sliders size={14} />
            <span>PRESETS VAULT</span>
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "simulator" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("simulator")}
          >
            <Camera size={14} />
            <span>LIVE PHOTO SIMULATOR</span>
          </button>
        </div>
      </section>

      {/* Main Content Area */}
      <main ref={containerRef} className={styles.mainContainer}>
        {/* TAB 1: STUDIO PROFILE */}
        {activeTab === "profile" && (
          <div className={styles.profileGrid}>
            <div className={styles.formCard}>
              <div className={styles.cardHeader}>
                <ShieldCheck size={20} color="var(--accent-green)" />
                <div>
                  <h2 className={styles.cardTitle}>Studio & Photographer Brand Identity</h2>
                  <p className={styles.cardDesc}>
                    Your defaults persist in local storage and can be pushed into the Watermark
                    Generator with one click.
                  </p>
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Studio / Agency Name</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={profile.studioName}
                    onChange={(e) => handleProfileChange("studioName", e.target.value)}
                    placeholder="e.g. MILAQ VISUALS"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Lead Photographer</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={profile.photographerName}
                    onChange={(e) => handleProfileChange("photographerName", e.target.value)}
                    placeholder="e.g. ALEX RIVERA"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Default Event / Tag Title</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={profile.eventTitle}
                    onChange={(e) => handleProfileChange("eventTitle", e.target.value)}
                    placeholder="e.g. ANNUAL GALA 2026"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Instagram / Social Handle</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={profile.instagram}
                    onChange={(e) => handleProfileChange("instagram", e.target.value)}
                    placeholder="e.g. @milaq_creatives"
                  />
                </div>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Studio Monogram (2-3 chars)</label>
                  <input
                    type="text"
                    maxLength={3}
                    className={styles.textInput}
                    value={profile.monogram}
                    onChange={(e) => handleProfileChange("monogram", e.target.value.toUpperCase())}
                    placeholder="e.g. MQ"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Copyright Line</label>
                  <input
                    type="text"
                    className={styles.textInput}
                    value={profile.copyrightNotice}
                    onChange={(e) => handleProfileChange("copyrightNotice", e.target.value)}
                    placeholder="e.g. © 2026 ALL RIGHTS RESERVED"
                  />
                </div>
              </div>

              <div className={styles.actionRow}>
                <button type="button" className="btn-primary" onClick={handleSaveProfile}>
                  <span>SAVE STUDIO PROFILE</span>
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleApplyToGenerator}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  <RefreshCw size={14} />
                  <span>SYNC TO GENERATOR</span>
                </button>
              </div>
            </div>

            {/* Interactive Photographer VIP Badge Card */}
            <div className={styles.badgePreviewCard}>
              <div className={styles.badgeGlow} />

              <div className={styles.badgeTop}>
                <div className={styles.badgeMonogram}>{profile.monogram || "WG"}</div>
                <div className={styles.badgeChip}>OFFICIAL PRESS PASS</div>
              </div>

              <div className={styles.badgeMiddle}>
                <h3 className={styles.badgeStudio}>{profile.studioName || "STUDIO BRAND"}</h3>
                <div className={styles.badgePhotographer}>
                  {profile.photographerName || "PHOTOGRAPHER NAME"}
                </div>
                <div className={styles.badgeEvent}>EVENT: {profile.eventTitle || "MAIN EVENT"}</div>
              </div>

              <div className={styles.badgeBottom}>
                <span className={styles.badgeHandle}>{profile.instagram || "@studio"}</span>
                <div className={styles.badgeStatus}>
                  <div className={styles.statusDot} />
                  <span>SYNC READY</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRESETS VAULT */}
        {activeTab === "presets" && (
          <div>
            <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "16px", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>
                  Curated Photography Presets
                </h2>
                <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: "4px 0 0" }}>
                  1-Click activation instantly applies theme typography and parameters to the Watermark Generator.
                </p>
              </div>
              <Link
                href="/"
                className="btn-secondary"
                style={{ fontSize: "11px", display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <span>OPEN GENERATOR</span>
                <ArrowRight size={13} />
              </Link>
            </div>

            <div className={styles.presetsGrid}>
              {DEFAULT_PRESETS.map((preset) => (
                <div key={preset.id} className={styles.presetCard}>
                  <div>
                    <div className={styles.presetHeader}>
                      <span className={styles.presetCategory}>{preset.category}</span>
                    </div>
                    <h3 className={styles.presetName}>{preset.name}</h3>
                    <p className={styles.presetDesc}>{preset.description}</p>

                    <div className={styles.presetDetails}>
                      {preset.values.eventTitle && (
                        <div className={styles.presetRow}>
                          <span className={styles.presetRowKey}>EVENT</span>
                          <span className={styles.presetRowVal}>{preset.values.eventTitle}</span>
                        </div>
                      )}
                      {preset.values.photographer && (
                        <div className={styles.presetRow}>
                          <span className={styles.presetRowKey}>CREDIT</span>
                          <span className={styles.presetRowVal}>{preset.values.photographer}</span>
                        </div>
                      )}
                      {preset.values.tag && (
                        <div className={styles.presetRow}>
                          <span className={styles.presetRowKey}>TAG</span>
                          <span className={styles.presetRowVal}>{preset.values.tag}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn-primary"
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => handleActivatePreset(preset)}
                  >
                    <span>ACTIVATE & LOAD TO STUDIO</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: LIVE PHOTO SIMULATOR */}
        {activeTab === "simulator" && (
          <div className={styles.simulatorGrid}>
            <div className={styles.simulatorControls}>
              <div className={styles.cardHeader} style={{ marginBottom: 0, paddingBottom: "12px" }}>
                <Camera size={18} color="var(--accent-green)" />
                <h3 className={styles.cardTitle}>SIMULATOR CONTROLS</h3>
              </div>

              <div>
                <label className={styles.formLabel}>Choose Test Photo</label>
                <div className={styles.samplePhotoButtons}>
                  <button
                    type="button"
                    className={`${styles.sampleBtn} ${sampleChoice === "event" && !customPhotoSrc ? styles.activeSample : ""}`}
                    onClick={() => {
                      setCustomPhotoSrc(null);
                      setSampleChoice("event");
                    }}
                  >
                    SPORTS
                  </button>
                  <button
                    type="button"
                    className={`${styles.sampleBtn} ${sampleChoice === "concert" && !customPhotoSrc ? styles.activeSample : ""}`}
                    onClick={() => {
                      setCustomPhotoSrc(null);
                      setSampleChoice("concert");
                    }}
                  >
                    CONCERT
                  </button>
                  <button
                    type="button"
                    className={`${styles.sampleBtn} ${sampleChoice === "portrait" && !customPhotoSrc ? styles.activeSample : ""}`}
                    onClick={() => {
                      setCustomPhotoSrc(null);
                      setSampleChoice("portrait");
                    }}
                  >
                    PORTRAIT
                  </button>
                </div>
              </div>

              {/* Upload Own Test Photo */}
              <div>
                <label className={styles.formLabel}>Or Upload Your Photo</label>
                <div className={styles.uploadZone} onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} color="var(--accent-green)" style={{ margin: "0 auto 6px" }} />
                  <div>
                    <span style={{ fontSize: "11px", color: "var(--text-primary)" }}>
                      {customPhotoSrc ? "Photo Loaded (Click to replace)" : "Drop or click to upload PNG/JPG"}
                    </span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleCustomUpload}
                  />
                </div>
              </div>

              {/* Position */}
              <div>
                <label className={styles.formLabel}>Watermark Position</label>
                <div className={styles.samplePhotoButtons}>
                  <button
                    type="button"
                    className={`${styles.sampleBtn} ${watermarkPos === "bottom" ? styles.activeSample : ""}`}
                    onClick={() => setWatermarkPos("bottom")}
                  >
                    BOTTOM FULL
                  </button>
                  <button
                    type="button"
                    className={`${styles.sampleBtn} ${watermarkPos === "bottom-right" ? styles.activeSample : ""}`}
                    onClick={() => setWatermarkPos("bottom-right")}
                  >
                    CORNER BADGE
                  </button>
                  <button
                    type="button"
                    className={`${styles.sampleBtn} ${watermarkPos === "top" ? styles.activeSample : ""}`}
                    onClick={() => setWatermarkPos("top")}
                  >
                    TOP BAR
                  </button>
                </div>
              </div>

              {/* Opacity */}
              <div>
                <div className={styles.sliderRow}>
                  <label className={styles.formLabel} style={{ margin: 0 }}>
                    Opacity
                  </label>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent-green)" }}>
                    {watermarkOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={watermarkOpacity}
                  onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                  className={styles.rangeInput}
                />
              </div>

              {/* Scale */}
              <div>
                <div className={styles.sliderRow}>
                  <label className={styles.formLabel} style={{ margin: 0 }}>
                    Watermark Scale
                  </label>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "11px", color: "var(--accent-green)" }}>
                    {watermarkScale}%
                  </span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="140"
                  value={watermarkScale}
                  onChange={(e) => setWatermarkScale(Number(e.target.value))}
                  className={styles.rangeInput}
                />
              </div>

              <button
                type="button"
                className="btn-primary"
                onClick={handleDownloadSimulation}
                style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              >
                <Download size={15} />
                <span>DOWNLOAD TEST PHOTO</span>
              </button>
            </div>

            {/* Canvas View */}
            <div className={styles.simulatorCanvasWrap}>
              <canvas ref={simCanvasRef} className={styles.simCanvas} />
              <div
                style={{
                  marginTop: "12px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                Real-time interactive canvas render · 100% Client-Side
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

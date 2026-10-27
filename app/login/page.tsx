"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/generator/Header";
import Footer from "@/components/generator/Footer";
import {
  adminGetCurrentUser,
  adminSignIn,
  adminSignOut,
  getSupabase,
  isSupabaseConfigured,
} from "@/lib/supabase";
import gsap from "gsap";
import {
  Mail,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  LogOut,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  Camera,
  Activity,
  Layers,
  Zap,
  Check,
} from "lucide-react";
import styles from "./page.module.css";

interface LocalUser {
  email: string;
  name: string;
  role: string;
}

const LOCAL_AUTH_KEY = "watermark_studio_active_user_v1";

const SHOWCASE_PRESETS = [
  {
    id: "sports",
    label: "Sports Marathon",
    shutter: "1/4000s",
    aperture: "ƒ/2.0",
    iso: "ISO 200",
    lens: "70-200mm GM",
    tagTitle: "COLOMBO MARATHON 2026",
    tagSub: "FINISHER PHOTO PASS // #4921",
    tagPhotog: "BY MILAQ VISUALS",
    accent: "#D4FF00",
  },
  {
    id: "concert",
    label: "Festival Neon",
    shutter: "1/1000s",
    aperture: "ƒ/1.4",
    iso: "ISO 1600",
    lens: "35mm GM II",
    tagTitle: "NEON HORIZON FESTIVAL",
    tagSub: "STAGE VIP ACCESS // OFFICIAL",
    tagPhotog: "DIRECTOR OF PHOTOGRAPHY",
    accent: "#00F0FF",
  },
  {
    id: "portrait",
    label: "Editorial Studio",
    shutter: "1/250s",
    aperture: "ƒ/1.8",
    iso: "ISO 50",
    lens: "85mm GM II",
    tagTitle: "VOGUE EDITORIAL",
    tagSub: "LOOKBOOK PARIS // AUTUMN",
    tagPhotog: "ALEX RIVERA STUDIO",
    accent: "#D4FF00",
  },
];

export default function LoginPage() {
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studioName, setStudioName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [user, setUser] = useState<LocalUser | null>(null);
  const [activePreset, setActivePreset] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const leftColRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);
  const ambientGlowRef = useRef<HTMLDivElement>(null);

  // Check current auth status on mount
  useEffect(() => {
    async function checkAuth() {
      // 1. Check Supabase session if configured
      if (isSupabaseConfigured()) {
        try {
          const sbUser = await adminGetCurrentUser();
          if (sbUser && sbUser.email) {
            setUser({
              email: sbUser.email,
              name: (sbUser.user_metadata?.studio_name as string) || "STUDIO PRO",
              role: "Verified Cloud Creator",
            });
            return;
          }
        } catch {
          // ignore error
        }
      }

      // 2. Check local studio session
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(LOCAL_AUTH_KEY);
        if (stored) {
          try {
            setUser(JSON.parse(stored));
          } catch {
            // ignore
          }
        }
      }
    }

    checkAuth();
  }, []);

  // GSAP Entrance Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (leftColRef.current && rightColRef.current) {
        gsap.fromTo(
          leftColRef.current,
          { opacity: 0, x: -30 },
          { opacity: 1, x: 0, duration: 0.9, ease: "power3.out" }
        );
        gsap.fromTo(
          rightColRef.current,
          { opacity: 0, x: 30 },
          { opacity: 1, x: 0, duration: 0.9, delay: 0.1, ease: "power3.out" }
        );
      }

      if (ambientGlowRef.current) {
        gsap.to(ambientGlowRef.current, {
          opacity: 0.45,
          scale: 1.2,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const sbUser = await adminSignIn(email, password);
        const authedUser: LocalUser = {
          email: sbUser.email || email,
          name: (sbUser.user_metadata?.studio_name as string) || "STUDIO CREATOR",
          role: "Cloud Authenticated",
        };
        setUser(authedUser);
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(authedUser));
        setSuccess("Signed in successfully with Supabase Cloud!");
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error("Please enter both email and password.");
        }
        const localUser: LocalUser = {
          email,
          name: email.split("@")[0].toUpperCase() + " STUDIO",
          role: "Pro Photographer",
        };
        setUser(localUser);
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(localUser));
        setSuccess("Welcome back! Studio session initiated.");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isSupabaseConfigured()) {
        const sb = getSupabase();
        if (!sb) throw new Error("Supabase is not ready");
        const { data, error: signUpError } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: {
              studio_name: studioName || "Milaq Visuals",
            },
          },
        });
        if (signUpError) throw new Error(signUpError.message);
        if (data.user) {
          const newUser: LocalUser = {
            email: data.user.email || email,
            name: studioName || "STUDIO PRO",
            role: "Creator",
          };
          setUser(newUser);
          localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(newUser));
          setSuccess("Account created successfully! Check your email to verify.");
        }
      } else {
        if (!email.trim() || !password.trim()) {
          throw new Error("Please enter email, password, and studio name.");
        }
        const newUser: LocalUser = {
          email,
          name: studioName || "MILAQ VISUALS",
          role: "Studio Director",
        };
        setUser(newUser);
        localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(newUser));
        setSuccess("Studio account created and active!");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to register");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = () => {
    const demoUser: LocalUser = {
      email: "demo@milaq.studio",
      name: "ALEX RIVERA (MILAQ VISUALS)",
      role: "Lead Photographer // Pass #0429",
    };
    setUser(demoUser);
    localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(demoUser));
    setSuccess("Logged in as Demo Studio Photographer!");
    setError(null);
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured()) {
      await adminSignOut();
    }
    localStorage.removeItem(LOCAL_AUTH_KEY);
    setUser(null);
    setSuccess("Signed out successfully.");
    setError(null);
  };

  const curPreset = SHOWCASE_PRESETS[activePreset];

  return (
    <div ref={containerRef} className={styles.loginContainer}>
      <Header activeTab="login" />

      {/* Atmospheric Background Camera Grid Markers */}
      <div className={styles.cornerBracketTopLeft} />
      <div className={styles.cornerBracketTopRight} />
      <div className={styles.cornerBracketBottomLeft} />
      <div className={styles.cornerBracketBottomRight} />
      <div ref={ambientGlowRef} className={styles.ambientBackdropGlow} />

      <main className={styles.loginMain}>
        <div className={styles.gridWrapper}>
          {/* ================= LEFT COLUMN: PRO WATERMARK SHOWCASE ================= */}
          <div ref={leftColRef} className={styles.showcaseColumn}>
            <div className={styles.viewfinderCard}>
              {/* Camera Viewfinder Top Bar */}
              <div className={styles.viewfinderTopBar}>
                <div className={styles.recIndicator}>
                  <span className={styles.recDot} />
                  <span>REC RAW 14-BIT</span>
                </div>
                <div className={styles.cameraTelemetry}>
                  <span>{curPreset.shutter}</span>
                  <span>{curPreset.aperture}</span>
                  <span>{curPreset.iso}</span>
                  <span className={styles.lensBadge}>{curPreset.lens}</span>
                </div>
              </div>

              {/* Viewfinder Preview Image & Overlay */}
              <div className={styles.previewFrame}>
                <Image
                  src="/hero.jpg"
                  alt="Pro Photographer Showcase"
                  fill
                  priority
                  className={styles.previewImage}
                />
                <div className={styles.previewVignette} />

                {/* Viewfinder Rule-of-Thirds Grid Lines */}
                <div className={styles.gridLineH1} />
                <div className={styles.gridLineH2} />
                <div className={styles.gridLineV1} />
                <div className={styles.gridLineV2} />

                {/* Center Autofocus Reticle */}
                <div className={styles.afReticle}>
                  <div className={styles.afReticleInner} />
                </div>

                {/* Live Watermark Tag Graphic Floating Overlay */}
                <div className={styles.simulatedWatermark}>
                  <div className={styles.wmHoloHeader}>
                    <div className={styles.wmHoloAperture}>
                      <Camera size={12} />
                    </div>
                    <div>
                      <div className={styles.wmTitle}>{curPreset.tagTitle}</div>
                      <div className={styles.wmSub}>{curPreset.tagSub}</div>
                    </div>
                  </div>
                  <div className={styles.wmPhotog}>{curPreset.tagPhotog}</div>
                </div>

                {/* Live Resolution Stamp */}
                <div className={styles.resolutionStamp}>
                  <span>4K DCI</span>
                  <span className={styles.stampDivider}>//</span>
                  <span>60 FPS</span>
                  <span className={styles.stampDivider}>//</span>
                  <span>ALPHA LOSSLESS</span>
                </div>
              </div>

              {/* Preset Selector Buttons */}
              <div className={styles.presetBar}>
                <span className={styles.presetBarLabel}>TEST PRESET:</span>
                <div className={styles.presetButtons}>
                  {SHOWCASE_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`${styles.presetBtn} ${activePreset === idx ? styles.presetActive : ""}`}
                      onClick={() => setActivePreset(idx)}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Key Architecture Metrics */}
              <div className={styles.metricsRow}>
                <div className={styles.metricItem}>
                  <div className={styles.metricVal}>0.00s</div>
                  <div className={styles.metricLab}>CLOUD UPLOAD TIME (CLIENT-SIDE)</div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricVal}>1,000+</div>
                  <div className={styles.metricLab}>PHOTOS BATCH STAMP / MIN</div>
                </div>
                <div className={styles.metricItem}>
                  <div className={styles.metricVal}>ED25519</div>
                  <div className={styles.metricLab}>CRYPTOGRAPHIC WATERMARK</div>
                </div>
              </div>
            </div>

            {/* Endorsement Footnote */}
            <div className={styles.endorsement}>
              <ShieldCheck size={14} className={styles.shieldIcon} />
              <span>
                Standard operational suite used by freelance sports & concert photographers across 18 countries.
              </span>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: STUDIO ACCESS CONSOLE ================= */}
          <div ref={rightColRef} className={styles.consoleColumn}>
            <div className={styles.consoleCard}>
              {/* Console Header */}
              <div className={styles.consoleHeader}>
                <div className={styles.consoleBadge}>
                  <span className={styles.badgePulse} />
                  <span>SECURE ACCESS PORTAL // ID-01</span>
                </div>

                <div className={styles.brandTitleRow}>
                  <div className={styles.apertureBox}>
                    <svg
                      width="26"
                      height="26"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="m14.31 8 5.74 9.94" />
                      <path d="M9.69 8h11.48" />
                      <path d="m7.38 12 5.74-9.94" />
                      <path d="M9.69 16 3.95 6.06" />
                      <path d="M14.31 16H2.83" />
                      <path d="m16.62 12-5.74 9.94" />
                    </svg>
                  </div>
                  <div>
                    <h1 className={styles.title}>
                      {user ? "STUDIO PASS" : tab === "signin" ? "STUDIO SIGN IN" : "CREATOR PASS"}
                    </h1>
                    <p className={styles.subtitle}>
                      {user
                        ? "Active verified photographer session"
                        : "Enter your credentials to manage cloud presets"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Feedback Alerts */}
              {error && (
                <div className={`${styles.alertBox} ${styles.alertError}`}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
                  <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
                  <span>{success}</span>
                </div>
              )}

              {/* ACTIVE USER DASHBOARD (WHEN LOGGED IN) */}
              {user ? (
                <div className={styles.loggedInView}>
                  <div className={styles.passCard}>
                    <div className={styles.passHeader}>
                      <div className={styles.passChip}>
                        <div className={styles.chipMetallic} />
                        <span className={styles.chipText}>MILAQ PRESS VERIFIED</span>
                      </div>
                      <span className={styles.passCode}>ID-9042-X</span>
                    </div>

                    <div className={styles.passBody}>
                      <div className={styles.passAvatar}>
                        <UserIcon size={26} color="var(--accent-green)" />
                      </div>
                      <div className={styles.passDetails}>
                        <div className={styles.passName}>{user.name}</div>
                        <div className={styles.passEmail}>{user.email}</div>
                        <div className={styles.passRoleBadge}>
                          <span className={styles.roleDot} />
                          {user.role}
                        </div>
                      </div>
                    </div>

                    <div className={styles.passBarCodeRow}>
                      <div className={styles.simulatedBarcode} />
                      <span className={styles.passExpiry}>VALID: PERPETUAL PRO</span>
                    </div>
                  </div>

                  <div className={styles.quickNavList}>
                    <Link href="/portal" className={styles.navRowBtn}>
                      <div className={styles.navRowLeft}>
                        <Sparkles size={15} className={styles.navIcon} />
                        <div>
                          <div className={styles.navRowTitle}>PHOTOGRAPHER PORTAL</div>
                          <div className={styles.navRowSub}>Manage custom tags, fonts & presets vault</div>
                        </div>
                      </div>
                      <ArrowRight size={14} />
                    </Link>

                    <Link href="/" className={styles.navRowBtn}>
                      <div className={styles.navRowLeft}>
                        <Camera size={15} className={styles.navIcon} />
                        <div>
                          <div className={styles.navRowTitle}>WATERMARK GENERATOR</div>
                          <div className={styles.navRowSub}>Process batch event photos with active tag</div>
                        </div>
                      </div>
                      <ArrowRight size={14} />
                    </Link>

                    <Link href="/admin" className={styles.navRowBtn}>
                      <div className={styles.navRowLeft}>
                        <SlidersHorizontal size={15} className={styles.navIcon} />
                        <div>
                          <div className={styles.navRowTitle}>ADMIN TEMPLATE BUILDER</div>
                          <div className={styles.navRowSub}>Design, publish & sync cloud templates</div>
                        </div>
                      </div>
                      <ArrowRight size={14} />
                    </Link>
                  </div>

                  <button
                    type="button"
                    className={styles.signOutBtn}
                    onClick={handleSignOut}
                  >
                    <LogOut size={14} />
                    <span>SIGN OUT OF STUDIO WORKSPACE</span>
                  </button>
                </div>
              ) : (
                /* AUTH FORM (SIGN IN / REGISTER) */
                <div>
                  {/* Segmented Switcher */}
                  <div className={styles.tabSegment}>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${tab === "signin" ? styles.tabActive : ""}`}
                      onClick={() => {
                        setTab("signin");
                        setError(null);
                      }}
                    >
                      <LogIn size={13} />
                      <span>SIGN IN</span>
                    </button>
                    <button
                      type="button"
                      className={`${styles.tabBtn} ${tab === "signup" ? styles.tabActive : ""}`}
                      onClick={() => {
                        setTab("signup");
                        setError(null);
                      }}
                    >
                      <UserPlus size={13} />
                      <span>CREATE PASS</span>
                    </button>
                  </div>

                  <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className={styles.form}>
                    {tab === "signup" && (
                      <div className={styles.inputGroup}>
                        <label className={styles.inputLabel}>
                          <span>// FIELD 01</span>
                          <span>STUDIO OR PHOTOGRAPHER NAME</span>
                        </label>
                        <div className={styles.inputWrapper}>
                          <UserIcon size={16} className={styles.inputIcon} />
                          <input
                            type="text"
                            className={styles.inputField}
                            placeholder="e.g. Milaq Visuals Studio"
                            value={studioName}
                            onChange={(e) => setStudioName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>
                        <span>// FIELD {tab === "signup" ? "02" : "01"}</span>
                        <span>REGISTERED EMAIL</span>
                      </label>
                      <div className={styles.inputWrapper}>
                        <Mail size={16} className={styles.inputIcon} />
                        <input
                          type="email"
                          className={styles.inputField}
                          placeholder="photographer@milaq.studio"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className={styles.inputGroup}>
                      <label className={styles.inputLabel}>
                        <span>// FIELD {tab === "signup" ? "03" : "02"}</span>
                        <span>STUDIO MASTER KEY</span>
                      </label>
                      <div className={styles.inputWrapper}>
                        <Lock size={16} className={styles.inputIcon} />
                        <input
                          type={showPassword ? "text" : "password"}
                          className={styles.inputField}
                          placeholder="••••••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <button
                          type="button"
                          className={styles.togglePassBtn}
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className={styles.submitBtn}
                    >
                      {loading ? (
                        <span>AUTHENTICATING WITH CLOUD...</span>
                      ) : tab === "signin" ? (
                        <>
                          <span>SIGN IN TO WORKSPACE</span>
                          <ArrowRight size={15} />
                        </>
                      ) : (
                        <>
                          <span>GENERATE STUDIO ACCOUNT</span>
                          <ArrowRight size={15} />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Fast Pass / Instant Access Section */}
                  <div className={styles.dividerRow}>
                    <span className={styles.dividerLine} />
                    <span className={styles.dividerText}>OR FAST PASS ACCESS</span>
                    <span className={styles.dividerLine} />
                  </div>

                  <button
                    type="button"
                    className={styles.demoPassBtn}
                    onClick={handleQuickDemoLogin}
                  >
                    <div className={styles.demoPassIcon}>
                      <Zap size={14} />
                    </div>
                    <div className={styles.demoPassContent}>
                      <div className={styles.demoPassTitle}>INSTANT DEMO PHOTOGRAPHER PASS</div>
                      <div className={styles.demoPassSub}>Alex Rivera · Milaq Visuals Studio Pro</div>
                    </div>
                    <span className={styles.demoBadge}>1-CLICK</span>
                  </button>
                </div>
              )}

              {/* Bottom Security Assurance */}
              <div className={styles.securityFooter}>
                <ShieldCheck size={13} className={styles.shieldSm} />
                <span>
                  ENCRYPTED VIA SUPABASE AUTH · ZERO IMAGE TELEMETRY · 100% PRIVATE
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

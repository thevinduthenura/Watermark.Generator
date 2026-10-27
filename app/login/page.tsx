"use client";

import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";
import styles from "./page.module.css";

interface LocalUser {
  email: string;
  name: string;
  role: string;
}

const LOCAL_AUTH_KEY = "watermark_studio_active_user_v1";

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

  const cardRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

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
              role: "Verified Creator",
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

  // GSAP animation on mount
  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { opacity: 0, y: 35, scale: 0.98 },
        { opacity: 1, y: 0, scale: 1, duration: 0.75, ease: "power3.out" }
      );
    }
    if (glowRef.current) {
      gsap.to(glowRef.current, {
        opacity: 0.35,
        scale: 1.2,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
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
        // Local studio auth mode
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
      role: "Lead Photographer",
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

  return (
    <div className={styles.loginContainer}>
      <Header />

      <main className={styles.loginMain}>
        <div ref={glowRef} className={styles.ambientGlow} />

        <div ref={cardRef} className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <div className={styles.badgeMonogram}>WG</div>
            <h1 className={styles.title}>
              {user ? "STUDIO ACCOUNT" : tab === "signin" ? "STUDIO SIGN IN" : "CREATE STUDIO ACCOUNT"}
            </h1>
            <p className={styles.subtitle}>
              {user
                ? "Your watermark studio session is active."
                : isSupabaseConfigured()
                ? "Access your cloud templates and photographer presets"
                : "Manage your watermark presets and studio profiles"}
            </p>
          </div>

          {error && (
            <div className={`${styles.alertBox} ${styles.alertError}`}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={`${styles.alertBox} ${styles.alertSuccess}`}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          {user ? (
            /* Logged in state dashboard */
            <div>
              <div className={styles.userBox}>
                <div className={styles.userRow}>
                  <div className={styles.userAvatar}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <div className={styles.userName}>{user.name}</div>
                    <div className={styles.userEmail}>{user.email}</div>
                    <div
                      style={{
                        marginTop: "4px",
                        fontSize: "10px",
                        color: "var(--accent-green)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      ● {user.role}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.quickLinks}>
                <Link href="/portal" className={styles.quickLink}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={14} color="var(--accent-green)" />
                    <span>OPEN USER PORTAL & PRESETS</span>
                  </span>
                  <ArrowRight size={14} />
                </Link>

                <Link href="/" className={styles.quickLink}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <Sparkles size={14} color="var(--accent-green)" />
                    <span>OPEN WATERMARK GENERATOR</span>
                  </span>
                  <ArrowRight size={14} />
                </Link>

                <Link href="/admin" className={styles.quickLink}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                    <SlidersHorizontal size={14} color="var(--accent-green)" />
                    <span>OPEN ADMIN BUILDER</span>
                  </span>
                  <ArrowRight size={14} />
                </Link>
              </div>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleSignOut}
                style={{
                  width: "100%",
                  marginTop: "20px",
                  justifyContent: "center",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <LogOut size={14} />
                <span>SIGN OUT OF STUDIO</span>
              </button>
            </div>
          ) : (
            /* Sign In / Sign Up Form */
            <div>
              <div className={styles.tabSwitch}>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${tab === "signin" ? styles.activeTab : ""}`}
                  onClick={() => {
                    setTab("signin");
                    setError(null);
                  }}
                >
                  SIGN IN
                </button>
                <button
                  type="button"
                  className={`${styles.tabBtn} ${tab === "signup" ? styles.activeTab : ""}`}
                  onClick={() => {
                    setTab("signup");
                    setError(null);
                  }}
                >
                  REGISTER
                </button>
              </div>

              <form onSubmit={tab === "signin" ? handleSignIn : handleSignUp} className={styles.form}>
                {tab === "signup" && (
                  <div className={styles.fieldGroup}>
                    <label className={styles.label}>Studio / Photographer Name</label>
                    <div className={styles.inputWrapper}>
                      <UserIcon size={16} className={styles.inputIcon} />
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="e.g. Milaq Visuals"
                        value={studioName}
                        onChange={(e) => setStudioName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Email Address</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={16} className={styles.inputIcon} />
                    <input
                      type="email"
                      className={styles.input}
                      placeholder="photographer@studio.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Password</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={16} className={styles.inputIcon} />
                    <input
                      type={showPassword ? "text" : "password"}
                      className={styles.input}
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
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`btn-primary ${styles.submitBtn}`}
                  style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
                >
                  {loading ? (
                    <span>AUTHENTICATING...</span>
                  ) : tab === "signin" ? (
                    <>
                      <LogIn size={15} />
                      <span>SIGN IN TO STUDIO</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={15} />
                      <span>CREATE STUDIO ACCOUNT</span>
                    </>
                  )}
                </button>
              </form>

              <div className={styles.altActions}>
                <button type="button" className={styles.demoBtn} onClick={handleQuickDemoLogin}>
                  <Sparkles size={14} />
                  <span>ONE-CLICK DEMO LOGIN (ALEX RIVERA)</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

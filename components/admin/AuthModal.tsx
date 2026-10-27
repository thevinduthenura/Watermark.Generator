"use client";

import { useEffect, useState } from "react";
import {
  adminGetCurrentUser,
  adminSignIn,
  adminSignOut,
  isSupabaseConfigured,
} from "@/lib/supabase";
import { AlertTriangle, LogIn, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import styles from "./AuthModal.module.css";

interface AuthModalProps {
  onSessionChange: (user: User | null) => void;
}

export default function AuthModal({ onSessionChange }: AuthModalProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    async function check() {
      if (!configured) {
        setLoading(false);
        return;
      }
      try {
        const u = await adminGetCurrentUser();
        setUser(u);
        onSessionChange(u);
      } catch (err) {
        console.warn("Auth check error:", err);
      } finally {
        setLoading(false);
      }
    }
    check();
  }, [configured, onSessionChange]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const u = await adminSignIn(email, password);
      setUser(u);
      onSessionChange(u);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await adminSignOut();
    setUser(null);
    onSessionChange(null);
  };

  if (!configured) {
    return (
      <div className={styles.noticeBox}>
        <div className={styles.noticeHeader}>
          <span className={styles.badgeOffline}>REPO MODE</span>
          <span className={styles.noticeTitle}>Local Template Builder</span>
        </div>
        <p className={styles.noticeText}>
          Supabase is not configured yet. You can build templates, upload blank tags, test
          zones, and <strong>Export template ZIP packages</strong> to commit to the repository.
        </p>
      </div>
    );
  }

  if (loading) return null;

  if (user) {
    return (
      <div className={styles.userBar}>
        <div className={styles.userStatus}>
          <span className={styles.onlineDot} />
          <span className={styles.userEmail}>{user.email} (Admin)</span>
        </div>
        <button
          type="button"
          className="btn-secondary"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          onClick={handleLogout}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  return (
    <div className={styles.loginCard}>
      <h3 className={styles.loginTitle}>Admin Cloud Authentication</h3>
      <p className={styles.loginSub}>
        Sign in with your verified Supabase admin account to publish templates directly to the cloud.
      </p>

      {error && (
        <div className={styles.alertError} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className={styles.form}>
        <input
          type="email"
          placeholder="Admin Email"
          className="text-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="text-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          className="btn-primary"
          style={{ width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          disabled={isSubmitting}
        >
          <LogIn size={14} />
          <span>{isSubmitting ? "SIGNING IN..." : "SIGN IN AS ADMIN"}</span>
        </button>
      </form>
    </div>
  );
}

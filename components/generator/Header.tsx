"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Stamp,
  SlidersHorizontal,
  User,
  LogIn,
  Menu,
  X,
  ExternalLink,
} from "lucide-react";
import styles from "./Header.module.css";

interface HeaderProps {
  activeTab?: "generator" | "stamper" | "admin" | "portal" | "login";
}

export default function Header({ activeTab = "generator" }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    {
      id: "generator" as const,
      label: "GENERATOR",
      desc: "Event Photo Watermark Engine",
      href: "/",
      icon: Sparkles,
      badge: "LIVE",
    },
    {
      id: "stamper" as const,
      label: "PHOTO STAMPER",
      desc: "Direct Batch & Auto Chroma Key",
      href: "/stamper",
      icon: Stamp,
      badge: "NEW",
    },
    {
      id: "portal" as const,
      label: "USER PORTAL",
      desc: "Manage & Preview Events",
      href: "/portal",
      icon: User,
    },
    {
      id: "admin" as const,
      label: "ADMIN BUILDER",
      desc: "Live Studio Customizer",
      href: "/admin",
      icon: SlidersHorizontal,
    },
    {
      id: "login" as const,
      label: "ACCOUNT",
      desc: "Photographer Access",
      href: "/login",
      icon: LogIn,
    },
  ];

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoGroup} onClick={() => setMobileMenuOpen(false)}>
          <div className={styles.apertureIconWrapper}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.apertureSvg}
            >
              <circle cx="12" cy="12" r="10" />
              <path d="m14.31 8 5.74 9.94" />
              <path d="M9.69 8h11.48" />
              <path d="m7.38 12 5.74-9.94" />
              <path d="M9.69 16 3.95 6.06" />
              <path d="M14.31 16H2.83" />
              <path d="m16.62 12-5.74 9.94" />
            </svg>
            <span className={styles.apertureDot} />
          </div>
          <div className={styles.brandMeta}>
            <span className={styles.brandName}>WATERMARK STUDIO</span>
            <span className={styles.brandSub}>PRO EVENT SUITE</span>
          </div>
        </Link>

        {/* Live Studio Status Pill */}
        <div className={styles.engineBadge}>
          <span className={styles.statusPulse} />
          <span className={styles.engineText}>ENGINE ACTIVE</span>
        </div>

        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${styles.navLink} ${isActive ? styles.active : ""}`}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Icon size={13} />
                <span>{item.label}</span>
                {item.badge && <span className={styles.navChip}>{item.badge}</span>}
              </Link>
            );
          })}

          <a
            href="https://github.com/thevinduthenura/Watermark.Generator"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.gitLink}
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>CODE</span>
          </a>
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          className={styles.mobileMenuToggle}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Horizontal Quick-Scroll Bar (Visible on mobile/tablets) */}
      <div className={styles.mobileTabBar}>
        <div className={styles.mobileTabScroll}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`${styles.mobileTabPill} ${isActive ? styles.mobileTabActive : ""}`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
                {item.badge && <span className={styles.mobileTabBadge}>{item.badge}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Mobile Slide-Down Drawer */}
      {mobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <div className={styles.mobileDrawerContent}>
            <div className={styles.drawerHeader}>
              <span className={styles.drawerTitle}>STUDIO NAVIGATION</span>
              <span className={styles.drawerEngineBadge}>
                <span className={styles.statusPulse} />
                <span>ONLINE</span>
              </span>
            </div>

            <div className={styles.drawerLinks}>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`${styles.drawerLinkCard} ${isActive ? styles.drawerLinkActive : ""}`}
                  >
                    <div className={styles.drawerIconBox}>
                      <Icon size={18} />
                    </div>
                    <div className={styles.drawerMeta}>
                      <div className={styles.drawerRow}>
                        <span className={styles.drawerLabel}>{item.label}</span>
                        {item.badge && <span className={styles.drawerBadge}>{item.badge}</span>}
                      </div>
                      <span className={styles.drawerDesc}>{item.desc}</span>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className={styles.drawerFooter}>
              <a
                href="https://github.com/thevinduthenura/Watermark.Generator"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.drawerGithubLink}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span>View Source on GitHub</span>
                <ExternalLink size={13} style={{ marginLeft: "auto" }} />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

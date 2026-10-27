"use client";

import Link from "next/link";
import styles from "./Header.module.css";

interface HeaderProps {
  activeTab?: "generator" | "admin";
}

export default function Header({ activeTab = "generator" }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link href="/" className={styles.logoGroup}>
          <span className={styles.monogram}>WG</span>
          <span className={styles.brandName}>WATERMARK STUDIO</span>
        </Link>

        <nav className={styles.nav}>
          <Link
            href="/"
            className={`${styles.navLink} ${activeTab === "generator" ? styles.active : ""}`}
          >
            GENERATOR
          </Link>
          <Link
            href="/admin"
            className={`${styles.navLink} ${activeTab === "admin" ? styles.active : ""}`}
          >
            ADMIN BUILDER
          </Link>
          <a
            href="https://github.com/thevinduthenura/Watermark.Generator"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.navLink}
          >
            GITHUB
          </a>
        </nav>
      </div>
    </header>
  );
}

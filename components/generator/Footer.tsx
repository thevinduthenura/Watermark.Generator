import Link from "next/link";
import styles from "./Footer.module.css";

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.topRow}>
          <div className={styles.brandGroup}>
            <span className={styles.brandTitle}>WATERMARK GENERATOR</span>
            <p className={styles.brandDesc}>
              High-performance client-side watermark tag composer for photography societies & events.
            </p>
          </div>

          <div className={styles.linksGroup}>
            <Link href="/" className={styles.footerLink}>
              GENERATOR
            </Link>
            <Link href="/admin" className={styles.footerLink}>
              ADMIN TEMPLATE BUILDER
            </Link>
            <a
              href="https://github.com/thevinduthenura/Watermark.Generator"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.footerLink}
            >
              SOURCE CODE
            </a>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.bottomRow}>
          <div className={styles.privacyNotice}>
            <span className={styles.lockIcon}>🔒</span>
            <span>
              <strong>Zero-Upload Privacy:</strong> All watermark processing, image decoding, and
              text composition happens 100% inside your local browser. Your photos, partner logos,
              and event details are never uploaded or tracked.
            </span>
          </div>
          <span className={styles.copy}>
            SSC PHOTOGRAPHIC CLUB © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </footer>
  );
}

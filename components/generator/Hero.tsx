import Image from "next/image";
import styles from "./Hero.module.css";

export default function Hero() {
  return (
    <section className={styles.heroSection}>
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

      <div className={styles.content}>
        <div className={styles.titleGroup}>
          <span className={styles.subtitle}>WATERMARK</span>
          <h1 className={styles.title}>GENERATOR</h1>
        </div>

        <div className={styles.metaGroup}>
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

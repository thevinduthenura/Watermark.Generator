# Watermark Generator

A high-performance, client-side static web app designed for photography societies and event photographers. It generates transparent PNG watermark tags (bottom banners) that photographers overlay onto batches of high-resolution event photos using Adobe Lightroom, Photoshop, or Snapseed.

Built with **Next.js (App Router) + TypeScript**, Canvas API, JSZip, and optional **Supabase Cloud Templates**. Operates 100% client-side with zero photo uploads.

---

## 🌟 Key Features

- **100% Client-Side Privacy**: Photos, partner logos, QR codes, and event metadata never leave your browser.
- **Dynamic Field Generation**: Form inputs are generated dynamically from the active template schema.
- **Live Debounced Preview**: Sub-100ms preview rendered onto a checkerboard background to visualize transparency.
- **True Multi-Resolution Export**:
  - Presets: `6000×4000`, `5472×3648`, `5184×3456` (default), `4608×3072`, `4000×2667`, `3840×2560`, `3000×2000`, `2400×1600`, `1920×1280`, `1080×720`.
  - Portrait / Landscape orientation toggle.
  - Custom canvas width & height.
  - Single resolution exports a clean PNG: `<event>_<photographer>_<W>x<H>.png`.
  - Multiple resolutions export a single ZIP archive containing all rendered PNGs.
  - "Banner only" mode for cropped horizontal strips.
- **Partner & Sponsor Logo Auto-Arrangement**:
  - Upload multiple sponsor/partner logos (PNG, SVG, JPG, WebP).
  - Drag-and-drop reordering.
  - Automatically scaled to the template's zone height and evenly spaced with uniform auto-shrink if overflowing.
- **QR Code Support**: Upload and embed custom square QR code tags.
- **Multilingual & Sinhala Typography**:
  - Bundled with Google Fonts (`Outfit`, `Inter`).
  - Automatic fallback to `Noto Sans Sinhala` ensuring Sinhala glyphs and ligatures render accurately.
- **Visual Admin Template Builder (`/admin`)**:
  - Upload any blank tag PNG banner.
  - Visually drag, resize, and configure text zones, logo slots, QR slots, and extra logo rows.
  - Export template ZIP bundles to commit to GitHub, or save & publish directly to Supabase with real authentication.

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (Node 20+ recommended)
- npm or pnpm

### Run Locally
```bash
# Clone the repository
git clone https://github.com/thevinduthenura/Watermark.Generator.git
cd Watermark.Generator

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
The Admin Template Builder is accessible at [http://localhost:3000/admin](http://localhost:3000/admin).

### Static Build & Test
```bash
# Type check and build static export (outputs to /out)
npm run build
```

---

## ☁️ Supabase Cloud Template Storage (Optional)

Templates can either be committed directly to the Git repository or managed in the cloud via Supabase so admin changes appear immediately on the website without triggering a rebuild or git commit.

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the Supabase Dashboard, open **SQL Editor** -> **New Query**.
3. Copy and run the contents of [`supabase/schema.sql`](supabase/schema.sql). This provisions the `templates` and `admins` tables, public storage bucket, and strict Row Level Security (RLS) policies.

### 2. Create Admin Account
1. In Supabase Dashboard -> **Authentication** -> **Users**, click **Add User** -> **Create User**.
2. Provide an email and password.
3. Copy the user's UUID.
4. Run this query in the SQL Editor to grant admin privileges:
   ```sql
   insert into public.admins (user_id, email)
   values ('YOUR-USER-UUID-HERE', 'admin@example.com');
   ```

### 3. Add Environment Variables
Create a `.env.local` file in your project root (or set GitHub Actions Variables):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

*Note: If these environment variables are left blank, the app functions seamlessly in offline/repo-only mode.*

---

## 📦 How Admin Creates a Template & Adds to Repo

If not using Supabase, you can package templates into the repository:

1. Open `/admin` in your browser.
2. Upload your blank tag PNG banner (e.g. 5184×285 px).
3. Use the toolbar to draw your text fields (Event Name, Photographer, etc.), logo slots, and QR code slot.
4. Configure fonts, text alignment, uppercase constraints, and colors in the right property panel.
5. Click **Export Template ZIP**.
6. Extract the downloaded ZIP file into a new directory:
   ```
   public/templates/<your-template-slug>/
     ├── template.json
     ├── blank-tag.png
     └── fonts/ (optional custom font files)
   ```
7. Register your template in `public/templates/index.json`:
   ```json
   [
     {
       "id": "default",
       "name": "SSC PGC Standard Banner",
       "path": "templates/default"
     },
     {
       "id": "sports-meet",
       "name": "Annual Sports Meet 2026",
       "path": "templates/sports-meet"
     }
   ]
   ```
8. Commit and push the changes to GitHub.

---

## 📄 Template Schema Reference (`template.json`)

```json
{
  "name": "SSC PGC Standard Banner",
  "blankTag": "blank-tag.png",
  "naturalWidth": 5184,
  "naturalHeight": 285,
  "placement": {
    "widthPercent": 100,
    "bottomMarginPercent": 0,
    "align": "center"
  },
  "fields": [
    {
      "id": "event",
      "label": "Event Name",
      "placeholder": "COLOURS NIGHT 2026",
      "defaultValue": "ANNUAL COLOURS NIGHT",
      "box": { "x": 0.30, "y": 0.10, "w": 0.41, "h": 0.80 },
      "font": "Outfit",
      "weight": 700,
      "color": "#ffffff",
      "align": "center",
      "valign": "middle",
      "uppercase": false,
      "maxFontSize": 0.58,
      "minFontSize": 0.20,
      "maxLines": 2
    }
  ],
  "logoSlots": [],
  "qrSlot": {
    "label": "QR Code",
    "box": { "x": 0.945, "y": 0.14, "w": 0.042, "h": 0.72 }
  },
  "extraLogosZone": {
    "box": { "x": 0.20, "y": 0.18, "w": 0.085, "h": 0.64 },
    "gapPercent": 0.008,
    "align": "center"
  },
  "googleFonts": ["Outfit", "Inter"]
}
```

- **Coordinates**: `box.x`, `box.y`, `box.w`, `box.h` are stored as fractions (0.0 to 1.0) of the banner width and height.
- **Font Sizes**: `maxFontSize` and `minFontSize` are fractions of the banner height.
- **Text Fitting**: Uses binary search to determine optimal font size, wraps up to `maxLines`, and gracefully truncates with an ellipsis if text exceeds the boundary.

---

## 🚢 Deploying to GitHub Pages

1. In your GitHub repository, navigate to **Settings** -> **Pages**.
2. Under **Build and deployment** -> **Source**, select **GitHub Actions**.
3. (Optional) If using Supabase, add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under **Settings** -> **Secrets and variables** -> **Actions** -> **Variables**.
4. Push your code to the `main` branch:
   ```bash
   git add .
   git commit -m "feat: complete watermark generator app"
   git push -u origin main
   ```
5. The GitHub Actions workflow (`.github/workflows/pages.yml`) will build and deploy the app to `https://<username>.github.io/<repo>/`.

### Custom Domain Setup
To use a custom domain (e.g. `watermark.yourdomain.com`):
1. In repository **Settings** -> **Pages**, enter your custom domain under **Custom domain**.
2. Add a CNAME record in your DNS provider pointing to `<username>.github.io`.
3. If using a custom domain at root level, ensure `NEXT_PUBLIC_BASE_PATH` is left empty.

---

## 🛡️ License

MIT License. See [LICENSE](LICENSE) for details.

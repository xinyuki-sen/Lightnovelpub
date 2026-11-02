# ⚡ LightnovelPub — Luxury Web Novel & Light Novel Reader

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python)](https://python.org)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-6b21a8?style=flat-square)](https://lightnovelpub.vercel.app)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://lightnovelpub.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

> A high-performance web novel and light novel reading platform featuring **Manga Telemetry Editorial typography**, **5 curated screen-reading fonts**, a **resilient paragraph-anchor progress engine**, **dual-tier Edge-TTS neural audio with 60FPS exact word boundary tracking**, and **automated EPUB & PDF chapter extraction**.

🌐 **Live Production Deployment**: [https://lightnovelpub.vercel.app](https://lightnovelpub.vercel.app)

---

## 🌟 Key Features

### 🎧 1. Neural Edge-TTS with 60FPS Word Boundary Tracking
* **Tier 1 (High-Fidelity Neural Edge-TTS)**: Human-like voice synthesis streaming crisp MP3 narration with lookahead buffer and client-side IndexedDB caching.
* **Exact WordBoundary Synchronization**: Backend extracts sub-millisecond word offsets from Edge-TTS (`X-Word-Boundaries`), mapping audio playback time directly to individual text tokens.
* **60FPS Frame Tracker (`requestAnimationFrame`)**: Replaces coarse 250ms `ontimeupdate` events with 60FPS/120FPS display-synced frame tracking, eliminating visual lag on mobile Android Chrome.
* **Reflow-Free Highlighting**: Uses `display: inline` and `box-decoration-break: clone` to ensure zero line jumping, zero layout shifts, and zero text stuttering during narration.
* **Zero Lingering Trails**: Strictly illuminates only the single active word being spoken per user mandate; automatically clears during speech pauses.
* **Tier 2 (Web Speech API Fallback)**: Instant, zero-bandwidth device speech engine running 100% offline.
* **Lock-Screen Controls (`MediaSession`)**: Playback control directly from Android notification shade, lock-screen, and smartwatches with a silent audio loop keep-alive.

### 📱 2. Android Mobile First & Gesture Navigation
* **Horizontal Swipe Navigation**: Fluid touch swipe gestures (left to advance to Next Chapter, right for Previous Chapter) with haptic feedback pulses (`navigator.vibrate(25)`).
* **2-Column Bookstore Grid**: High-density cover layout optimized for mobile screens ($\le 640\text{px}$) with safe-area insets.
* **AMOLED Battery Saver**: Pitch Black mode (`#09090b` / true `#000000`) for near-zero battery drain on OLED devices.

### 🎨 3. Bento & Manga Telemetry Design System
* **Reticle Framing**: Technical crosshair accents (`+`) and telemetry micro-chips (`ARCHIVE // VOL. 01`, `5 CURATED FONTS`, `60FPS TTS`, `OFFLINE DEXIE`).
* **Bento Stats Grid**: Dynamic library telemetry displaying indexed novels, chapter counts, and active reader metrics.
* **Cinematic Book Covers**: 3D perspective depth with hover elevation and quick-action overlay pills.
* **Blurred Glass Backdrop**: Ambient frosted glass backdrop mirroring the novel's cover palette on detail views.

### 🖋️ 4. Curated 5-Font Typography Engine
Tested across desktop screens and Android high-DPI displays to eliminate eye fatigue:
1. **Times New Roman**: Classic literary serif with authoritative readability.
2. **Merriweather**: Generous x-height and sturdy serifs calibrated specifically for screen reading.
3. **Lora**: Calligraphic contemporary serif with balanced flow.
4. **Nunito Sans**: Clean, modern geometric sans-serif for minimal distraction.
5. **Open Sans**: Ultra-legible humanist sans-serif.

> Switchable on the fly via the **Settings Drawer**, **1-Touch Visual Pills**, or the floating **Reader HUD Quick Cycler (`Aa`)**.

### 🎭 5. Seven Reading Themes
* **Pitch Black (OLED)**: `#09090b` canvas for 0% battery draw on AMOLED displays.
* **Ruined King (Emerald Mist)**: Deep dark teal `#081313` with luminous emerald accents (`#10b981`).
* **Manga Ink (Halftone)**: High-contrast manga editorial style with subtle paper texture.
* **Deep Midnight**: Sleek `#0d1117` GitHub dark mode aesthetic.
* **Forest Night**: Botanical `#0b1411` deep night tone.
* **Parchment Sepia**: `#fbf0d9` warm contrast tone for daytime reading.
* **Day Light**: Clean paper-white high-contrast mode.

### 📈 6. Resilient Dual-Tier Reading Progress Engine
* **Continuous Composite Novel Progress**:
  $$\text{Composite Progress} = \min\left(100.0, \max\left(0.0, \frac{(\text{Chapter} - 1) + (\text{Chapter \%} / 100)}{\text{Total Chapters}} \times 100\%\right)\right)$$
* **Paragraph-Anchor Tracking**: Tags every paragraph with `data-para-idx`. Anchors to the active paragraph in view rather than volatile pixel scroll offsets, achieving **0.0% reading drift** across font resizing or orientation flips.
* **Client-Side Authoritative Hydration**: Powered by [Dexie.js](https://dexie.org/) (IndexedDB). Persists reading progress and TOC status badges (`✓ Finished`, `▶ Reading X%`) even across serverless cold starts.

### 🛡️ 7. Security Hardening
* **Magic-Byte Inspection**: Validates binary headers (`%PDF-` for PDFs, `PK\x03\x04` for EPUBs) to reject disguised payloads before parsing.
* **Chunked Upper Bound**: 45MB upper limit on uploads to protect against memory exhaustion and DoS attacks.
* **Admin Deletion Token**: Optional `ADMIN_TOKEN` / `X-Admin-Token` authentication guard on destructive novel deletion routes.
* **Strict Security Headers Middleware**: Automatic enforcement of `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`, and `Referrer-Policy: strict-origin-when-cross-origin`.

### 📄 8. Automated EPUB & PDF Chapter Ingestion
Drop any novel EPUB or PDF into the uploader:
* **EPUB Parser (`epub_parser.py`)**: Reads Open Container Format (OCF), extracts `content.opf`, parses NCX/Nav tables of contents, and extracts embedded cover art.
* **PDF Parser (`pdf_parser.py`)**: Multi-engine PDF slicer with bookmark/outline extraction, soft-hyphen repair (`tele-\nphone` $\to$ `telephone`), and semantic paragraph reassembly.

---

## 📂 File Architecture

```
Lightnovelpub/
├── api/
│   └── index.py            # Vercel Serverless Function entrypoint
├── data/
│   └── library.db          # SQLite seeded library database (WAL mode enabled)
├── static/
│   ├── covers/             # Novel book cover art
│   ├── css/
│   │   └── style.css       # Master design system (Bento, Editorial, Themes)
│   ├── img/
│   │   ├── logo.png        # Brand emblem
│   │   ├── icon-192.svg    # PWA icons
│   │   └── icon-512.svg
│   ├── js/
│   │   ├── dexie.min.js    # IndexedDB persistence layer
│   │   ├── reader.js       # Core reader engine (Audio, Progress, Fonts, HUD)
│   │   └── upload.js       # EPUB & PDF drag & drop conversion handler
│   ├── manifest.json       # PWA web app manifest
│   └── sw.js               # Service Worker cache engine (v13)
├── templates/
│   ├── base.html           # Master shell layout & upload modal
│   ├── index.html          # Library collection, search, and bento hero
│   ├── novel_detail.html   # Novel TOC, reading chips, and chapter index
│   └── reader.html         # Immersive chapter reading canvas & audio dock
├── database.py             # SQLite data access, indexing, & migrations
├── epub_parser.py          # Pure Python standard-library EPUB chapter extractor
├── main.py                 # FastAPI application, REST endpoints, & static routing
├── pdf_parser.py           # Multi-engine PDF chapter slicer (pypdfium2 / pypdf)
├── requirements.txt        # Python dependency manifest
├── vercel.json             # Vercel serverless deployment configuration
├── run.bat                 # One-click Windows development launcher
└── README.md               # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
* Python 3.10 or higher
* Modern web browser (Chrome, Edge, Firefox, or Safari)

### 1. Clone the Repository
```bash
git clone https://github.com/xinyuki-sen/Lightnovelpub.git
cd Lightnovelpub
```

### 2. Install Dependencies
```bash
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Linux / macOS:
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Run the Development Server
```bash
# On Windows, you can simply double-click run.bat, or run:
python main.py
```
Open **`http://localhost:8000`** in your browser.

---

## ⌨️ Reader Keyboard Shortcuts & Gestures

| Shortcut / Gesture | Action |
| :--- | :--- |
| `←` (Left Arrow) or Swipe Right | Navigate to Previous Chapter |
| `→` (Right Arrow) or Swipe Left | Navigate to Next Chapter |
| `Space` | Toggle Audio Play / Pause |
| `J` | Rewind Audio by 10 Seconds |
| `L` | Fast-Forward Audio by 10 Seconds |
| `A` | Toggle Floating Audio Player |
| `T` or `O` | Toggle Typography Drawer |
| `F` | Toggle Distraction-Free Fullscreen |
| `/` | Focus Library Search |
| `?` or `Shift + /` | Open Keyboard Shortcuts Cheat Sheet |

---

## ☁️ Deployment

### Deploying to Vercel
This repository is configured for zero-config deployment on [Vercel](https://vercel.com):
1. Import the repository into your Vercel Dashboard.
2. The framework preset is automatically detected via `vercel.json` and `api/index.py`.
3. Set your deployment — no extra environment variables are required!

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

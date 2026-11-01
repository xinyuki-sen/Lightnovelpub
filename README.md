# ⚡ LightnovelPub — Luxury Web Novel & Light Novel Reader

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python)](https://python.org)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-6b21a8?style=flat-square)](https://lightnovelpub.vercel.app)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://lightnovelpub.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

> A modern web novel and light novel reading platform with **Bento & Manga Editorial typography**, **5 curated screen-reading fonts**, a **resilient paragraph-anchor progress engine**, **dual-tier Edge-TTS neural audio**, and **automated PDF chapter extraction**.

🌐 **Live Production Deployment**: [https://lightnovelpub.vercel.app](https://lightnovelpub.vercel.app)

---

## 🌟 Key Features

### 🎨 1. Bento & Manga Editorial UI System
* **Reticle Framing**: Tech-editorial crosshair marks (`+`) and telemetry micro-chips (`ARCHIVE // VOL. 01`, `5 CURATED FONTS`, `NEURAL TTS`, `OFFLINE DEXIE`).
* **Bento Stats Grid**: Dynamic library telemetry displaying indexed novels, chapter counts, and active reader metrics.
* **Cinematic Book Covers**: 3D perspective depth with hover elevation and quick-action overlay pills.
* **Blurred Glass Backdrop**: Ambient frosted glass backdrop mirroring the novel's cover palette on detail views.

### 🖋️ 2. Curated 5-Font Typography Engine
Tested across desktop screens and Android high-DPI displays to eliminate eye fatigue:
1. **Times New Roman**: Classic literary serif with authoritative readability.
2. **Merriweather**: Generous x-height and sturdy serifs calibrated specifically for screen reading.
3. **Lora**: Calligraphic contemporary serif with balanced flow.
4. **Nunito Sans**: Clean, modern geometric sans-serif for minimal distraction.
5. **Open Sans**: Ultra-legible humanist sans-serif.

> Switchable on the fly via the **Settings Drawer**, **1-Touch Visual Pills**, or the floating **Reader HUD Quick Cycler (`Aa`)**.

### 🎭 3. Six Reading Themes
* **Pitch Black (OLED)**: `#09090b` canvas for 0% battery draw on AMOLED displays.
* **Ruined King (Emerald Mist)**: Deep dark teal `#081313` with luminous emerald accents (`#10b981`).
* **Deep Midnight**: Sleek `#0d1117` GitHub dark mode aesthetic.
* **Forest Night**: Botanical `#0b1411` deep night tone.
* **Parchment Sepia**: `#fbf0d9` warm contrast tone for daytime reading.
* **Day Light**: Clean paper-white high-contrast mode.

### 📈 4. Resilient Dual-Tier Reading Progress Engine
* **Continuous Composite Novel Progress**:
  $$\text{Composite Progress} = \min\left(100.0, \max\left(0.0, \frac{(\text{Chapter} - 1) + (\text{Chapter \%} / 100)}{\text{Total Chapters}} \times 100\%\right)\right)$$
  Replaces coarse integer steps with a smooth, continuous percentage across the entire novel.
* **Paragraph-Anchor Tracking**: Tags every paragraph with `data-para-idx`. Anchors to the active paragraph in view rather than volatile pixel scroll offsets, achieving **0.0% reading drift** when switching fonts, font sizes, or rotating Android screens between portrait and landscape.
* **Client-Side Authoritative Hydration**: Powered by [Dexie.js](https://dexie.org/) (IndexedDB). Hydrates reading progress and Table of Contents status badges (`✓ Finished`, `▶ Reading X%`) even across serverless cold-start restarts.

### 🎧 5. Dual-Tier Audio TTS Engine (Novel Phoenix Replica)
* **Tier 1 (High-Fidelity Neural Edge-TTS)**: Human-like voice synthesis streaming crisp MP3 narration with client-side IndexedDB audio caching.
* **Tier 2 (Web Speech API Fallback)**: Instant, zero-bandwidth device speech engine running 100% offline.
* **Amber Word Follower**: Glowing word highlight (`.np-spoken-word`) synchronized to spoken words in real time.
* **Precision $\pm 10\text{s}$ Seeking**: Instant rewind and fast-forward with paragraph boundary wrapping.
* **Lock-Screen Controls**: Integrated with the `MediaSession` API, allowing playback control from the Android notification shade, lock-screen, and smartwatches.
* **Silent Audio Pipeline**: Loop keep-alive prevents mobile browsers from terminating speech when the screen turns off.

### 📚 6. Library Management & Android Mobile Optimization
* **Integrated Search**: Real-time title and author search synchronized between the top navbar and collection toolbar.
* **4-Way Status Filtering**: 1-click filter pills for *All*, *In Progress*, *Unread*, and *Completed*.
* **Instant Client-Side Sorting**: Sort by *Recently Read*, *Title (A-Z)*, *Highest Progress*, or *Most Chapters*.
* **2-Column Bookstore Grid**: High-density 2-column cover grid on mobile viewports ($\le 640\text{px}$) with safe-area insets.
* **Direct Library Deletion (`🗑️`)**: Card-level delete button with confirmation dialog and automatic purge of SQLite, Dexie IndexedDB, and LocalStorage keys.

### 📄 7. Automated PDF Chapter Ingestion
Drop any novel PDF into the uploader:
* Automatically extracts novel title, author, and embedded cover art.
* Scans PDF bookmarks and outline tables to extract segmented chapters.
* Cleans soft hyphens (`tele-\nphone` $\to$ `telephone`) and merges ragged linebreaks into semantic paragraphs.

---

## 📂 File Architecture

The repository is organized following clean separation of concerns:

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
│   │   └── upload.js       # PDF drag & drop conversion handler
│   ├── manifest.json       # PWA web app manifest
│   └── sw.js               # Service Worker cache engine (v11)
├── templates/
│   ├── base.html           # Master shell layout & upload modal
│   ├── index.html          # Library collection, search, and bento hero
│   ├── novel_detail.html   # Novel TOC, reading chips, and chapter index
│   └── reader.html         # Immersive chapter reading canvas & audio dock
├── database.py             # SQLite data access, indexing, & migrations
├── main.py                 # FastAPI application, REST endpoints, & static routing
├── pdf_parser.py           # Multi-engine PDF chapter slicer (pypdfium2 / pypdf)
├── requirements.txt        # Python dependency manifest
├── vercel.json             # Vercel serverless deployment configuration
├── run.bat                 # One-click Windows development launcher
├── .gitignore              # Git ignore rules
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

## ⌨️ Reader Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `←` (Left Arrow) | Navigate to Previous Chapter |
| `→` (Right Arrow) | Navigate to Next Chapter |
| `Space` | Toggle Audio Play / Pause |
| `J` | Rewind Audio by 10 Seconds |
| `L` | Fast-Forward Audio by 10 Seconds |
| `A` | Toggle Audio Mode on / off |
| `T` or `O` | Toggle Typography Optimize Drawer |
| `F` | Toggle Distraction-Free Fullscreen |

---

## ☁️ Deployment

### Deploying to Vercel
This repository is configured for 1-click deployment on [Vercel](https://vercel.com):
1. Import the repository into your Vercel Dashboard.
2. The framework preset is automatically detected via `vercel.json` and `api/index.py`.
3. Set your deployment — no extra environment variables are required!

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

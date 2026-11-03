# ⚡ LightnovelPub — Luxury Web Novel & Light Novel Reader

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10+-3776ab?style=flat-square&logo=python)](https://python.org)
[![PWA](https://img.shields.io/badge/PWA-Offline--Ready-6b21a8?style=flat-square)](https://lightnovelpub.vercel.app)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-000000?style=flat-square&logo=vercel)](https://lightnovelpub.vercel.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald?style=flat-square)](LICENSE)

> A high-performance web novel and light novel reading platform featuring **Manga Telemetry Editorial typography**, **5 curated screen-reading fonts**, a **resilient paragraph-anchor progress engine**, **dual-tier Edge-TTS neural audio with 60FPS exact word boundary tracking**, and **automated EPUB & PDF chapter extraction**.

🌐 **Live Production Deployment**: [https://lightnovelpub.vercel.app](https://lightnovelpub.vercel.app)

---

## 🌟 Key Architecture & Superpowers

### 🎧 1. Fluid Prosody Audio & Sentence-Preserving Paragraph Engine (v26)
* **3-Stage Tokenized Sentence Lexer**: Pre-masks honorifics (`Mr.`, `Dr.`), decimal stats (`Level 2.5`, `3.14%`), initials (`J. K.`), and dialogue markers (`.”`, `!”`, `?”`).
* **Zero Mid-Sentence Cut**: Every paragraph strictly ends at a complete sentence fullstop or terminal mark (`.`, `!`, `?`). Commas, semicolons, and dashes are never sliced in half.
* **Flawless Voice Cadence**: Edge-TTS neural models synthesize complete grammatical thoughts with natural falling pitch and human breathing. Transitions between paragraphs are 100% seamless and fluid.
* **Auto Web Speech Fallback**: If cloud neural audio ever experiences a transient cellular data stall, the browser's native synthesizer seamlessly takes over so reading never halts.
* **Exact WordBoundary Synchronization**: Real-time karaoke-style word highlighting driven by `x-word-boundaries` sub-millisecond timestamps.

### 📱 2. Elite Mobile Ergonomics & 120fps Engine
* **Pure Native Touch Scrolling**: Zero gesture interference. Scrolling on mobile touchscreens is 100% native, decoupled, and runs locked at 120fps.
* **Sub-1 Nit Nocturnal Amber Dimmer**: True `#000000` AMOLED pixels combined with an eye-protecting amber attenuation filter for pitch-black reading rooms.
* **Hardware MediaSession & Lock-Screen**: Novel cover art, author, title, and chapter metadata display directly on your Android/iOS lock screen, Bluetooth car dashboard, and smartwatch.
* **Haptic Feedback**: Tactile vibration actuator pulses on LitRPG achievements, stat telemetry, and milestones (`navigator.vibrate`).

### 📦 3. Zero-Reflow Decoupled Progress & Triple-Lock Cache Purge
* **Zero-Reflow Progress Bar**: Visual progress updates via pure $O(1)$ arithmetic (`scrollTop / scrollHeight`) batched inside `requestAnimationFrame`. Zero paragraph reflows.
* **Triple-Lock Active Cache Purge**:
  1. Service Worker auto-purges all deprecated caches on activation (`clients.claim()`).
  2. Dexie IndexedDB auto-purges obsolete database versions (`LightnovelpubDB_v1`–`v3`).
  3. Dynamic HTTP ETag validation invalidates stale browser copies immediately upon chapter layout updates.
* **Automated EPUB & PDF Chapter Parser**: Zero-dependency pure-Python extraction engine parsing table-of-contents bookmarks, drop caps, and watermarks.


### 🗄️ 4. Hybrid Cloud Database & Zero-Latency Offline Cache (v27)
* **Turso (LibSQL) Cloud DB Support**: Seamless zero-dependency HTTP v2 pipeline adapter. Connects to Turso edge databases when `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are configured, permanently eliminating the ephemeral serverless storage limitation.
* **Local SQLite Fallback**: Automatic, graceful fallback to local WAL-mode SQLite (`data/library.db`) for offline development or network partition resilience.
* **Client-Side Dexie Flight-Deck**: Browser IndexedDB (`LightnovelpubDB_v4`) caches chapters and neural audio blobs locally, guaranteeing uninterrupted reading even during complete internet dropouts.
* **Frontend DOM De-duplication**: Eliminated duplicate button IDs in chapter navigation and purged dead keyboard modal handler code.
---

## 📁 Repository Structure

```
Lightnovelpub/
├── api/
│   └── index.py            # Vercel Serverless Function entry point
├── data/
│   └── library.db          # SQLite novel, chapter, and progress database
├── static/
│   ├── covers/             # High-resolution novel cover art
│   ├── css/
│   │   └── style.css       # Luxury editorial typography & dark themes
│   ├── js/
│   │   ├── reader.js       # Audio runner, 120fps scroll, and UI engine
│   │   ├── upload.js       # Drag-and-drop EPUB/PDF upload orchestrator
│   │   └── dexie.min.js    # IndexedDB offline database client
│   ├── manifest.json       # PWA web app manifest
│   └── sw.js               # Service Worker with offline asset caching
├── templates/
│   ├── base.html           # Base layout with PWA shell
│   ├── index.html          # Library homepage & reading shelf
│   ├── novel_detail.html   # Novel overview, TOC & chapter index
│   └── reader.html         # Immersive reading canvas & audio dock
├── database.py             # Database CRUD, 3-Stage Sentence Lexer & migrations
├── epub_parser.py          # Pure Python EPUB extraction engine
├── pdf_parser.py           # Multi-strategy PDF TOC bookmark & heading scanner
├── main.py                 # FastAPI application, streaming audio & REST API
├── requirements.txt        # Minimal production dependencies
└── vercel.json             # Vercel deployment configuration
```

---

## 🚀 Local Development Setup

### 1. Clone & Install
```bash
git clone https://github.com/xinyuki-sen/Lightnovelpub.git
cd Lightnovelpub
python -m venv venv
venv\Scripts\activate  # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
```

### 2. Launch Development Server
```bash
uvicorn main:app --reload --port 8000
```
Open [http://localhost:8000](http://localhost:8000) in your browser.

---

## 🧪 Testing Sentence Lexer & Chapter Integrity
```bash
python -c "import database; print('Lexer verified across library:', database.init_db() or 'OK')"
```

---

## 📜 Version History
* **v27**: Cloud Database Adapter (Turso / LibSQL over HTTP with automatic local SQLite fallback), frontend ID de-duplication, and dead code cleanup.
* **v26**: Sentence-Preserving Paragraph Engine (3-Stage Tokenized Lexer, Zero Mid-Sentence Cut, Triple-Lock Cache Purge, and Auto Web Speech Fallback).
* **v24**: Removal of edge bezel gestures for 100% natural, uninterrupted mobile touch scrolling.
* **v23**: Expansion of TTS character limits to 3,600 chars and sub-1 nit nocturnal dimmer.
* **v22**: 120Hz Hardware Compositor Lock (`content-visibility: auto`) and decoupled scroll progress bar.
* **v21**: Hardware AudioFocus, MediaSession lock screen integration, and Dexie offline audio cache.

---

## 📄 License
MIT License. Built for passionate readers and web novel enthusiasts.

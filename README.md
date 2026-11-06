# Lightnovelpub — Luxury Web & Mobile Novel Reader

An ultra-responsive, mobile-first web application and PWA for reading and listening to light novels and web novels. Supports custom EPUB and PDF uploads, instant client-side chapter transitions, offline IndexedDB storage, and neural Edge-TTS audio with real-time word-by-word synchronized highlighting.

[![Python](https://img.shields.io/badge/Python-3.11-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg?style=flat&logo=render&logoColor=white)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Key Capabilities

- **Intelligent EPUB & PDF Ingestion**:
  - Multi-tier chapter division engine matching numerical, roman, and written word chapter formats.
  - Automatic detection and filtration of in-text Table of Contents pages, frontmatter stubs, and promotional backmatter.
  - High-performance, streaming PDF extraction using `pypdfium2` with `pypdf` fallback.
  - Safe 45MB upload envelope with decompression bomb guards.

- **Neural Edge-TTS Audio Engine**:
  - Cloud-powered neural text-to-speech utilizing Microsoft Edge-TTS voices (`en-US-ChristopherNeural`, `en-US-AvaNeural`, etc.).
  - Real-time word boundary synchronization with glowing karaoke word highlights.
  - 10-paragraph predictive offline runway caching for gapless, zero-buffering playback.
  - MediaSession API integration for full lock-screen and headphone control (Play/Pause, Seek +/-10s, Previous/Next Track).
  - Background audio keep-alive via persistent HTML5 audio session.

- **Offline-First PWA Architecture**:
  - Full client-side storage powered by **Dexie.js (IndexedDB)**.
  - Instantaneous (<50ms) chapter switching without full page reloads via dynamic DOM hydration.
  - Reading progress, settings, and custom chapters persisted locally for offline reading.

- **Resilient Hybrid Database**:
  - Cloud-native **Turso (LibSQL)** support with HTTP pipeline statement batching and exponential backoff retry.
  - Seamless local **SQLite** fallback for self-hosted or offline environments.
  - Database schema migrations and auto-cleanup of orphan frontmatter stubs.

---

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Backend** | Python 3.11, FastAPI, Uvicorn | High-throughput asynchronous REST API & SSR |
| **Audio Service** | Edge-TTS, Web Speech API | Dual-tier neural speech synthesis with word boundary cues |
| **Parsing** | PyPDFium2, PyPDF, Pillow, zipfile | Native, memory-safe PDF & EPUB parsing pipelines |
| **Database** | Turso (LibSQL) / SQLite3 | Dual-engine storage with automatic table initialization |
| **Client Cache** | Dexie.js (IndexedDB) | Client-authoritative offline storage & fast hydration |
| **UI / Styling** | Vanilla HTML5, CSS3, Jinja2 | Cyber-OLED aesthetic, responsive mobile & desktop views |
| **Deployment** | Render (`render.yaml`) | Cloud hosting with automated CI/CD deployment |

---

## Architecture Overview

```
├── main.py                  # FastAPI server, API endpoints, upload handlers, ETag caching
├── database.py              # Turso LibSQL & SQLite adapter, schema migrations, batching
├── pdf_parser.py            # PDF chapter division sorter, in-text TOC detection, watermarking
├── epub_parser.py           # EPUB3 & OPF spine extractor, HTML text cleaner, natural sort
├── render.yaml              # Render web service blueprint & build configuration
├── requirements.txt         # Core dependencies
├── run.bat                  # Windows one-click local launcher
├── static/
│   ├── css/
│   │   └── style.css        # Cyber-OLED styles, mobile reader layouts, responsive HUD
│   ├── js/
│   │   ├── reader.js        # Audio player, Dexie hydration, keyboard/touch handlers
│   │   ├── upload.js        # Client upload orchestrator, local DB sync, progress bar
│   │   └── dexie.min.js     # IndexedDB wrapper for client-first persistence
│   └── covers/              # Cached novel cover images
└── templates/
    ├── base.html            # PWA shell, top navigation, theme root
    ├── index.html           # Library home, novel cards, search & filter
    ├── novel_detail.html    # Bento-grid metadata, chapter table of contents, progress
    └── reader.html          # Clean reader canvas, Cyber-OLED audio HUD sheet
```

---

## Local Development

### Prerequisites
- Python 3.10+
- `pip` package manager

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/xinyuki-sen/Lightnovelpub.git
   cd Lightnovelpub
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the development server:
   ```bash
   python main.py
   ```
   Or on Windows:
   ```cmd
   run.bat
   ```

4. Open your browser at `http://localhost:8000`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TURSO_DB_URL` | Optional | Turso database URL (e.g., `libsql://your-db.turso.io`). Defaults to local SQLite if omitted. |
| `TURSO_AUTH_TOKEN` | Optional | Authentication token for Turso cloud database. |
| `PORT` | Optional | Port for Uvicorn server (defaults to `8000`). Automatically set on Render. |
| `ADMIN_TOKEN` | Optional | Optional bearer token for protected administrative routes (e.g., library deletions). |

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

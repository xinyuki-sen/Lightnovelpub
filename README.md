# Lightnovelpub — Luxury Web & Mobile Novel Reader

An ultra-responsive, mobile-first web application and Progressive Web App (PWA) engineered for reading and listening to light novels and web novels. Built with Python FastAPI, Dexie.js (IndexedDB), and Microsoft Edge-TTS neural speech synthesis, delivering instant client-side chapter transitions, offline persistence, and real-time word-synchronized highlighting.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg?style=flat&logo=render&logoColor=white)](https://render.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Key Capabilities

- **Intelligent EPUB & PDF Ingestion Engine**:
  - Multi-tier chapter division lexer handling bracketed numbers (`[ 01 ]`), standard headings (`Chapter 1 - The Beginning`), natural numbers (`4. Starting Somewhere`), and Roman numerals.
  - Automatic identification and filtration of in-text Table of Contents pages, publisher frontmatter, copyright disclaimers, and pirate banner watermarks.
  - Memory-safe PDF stream ingestion powered by `pypdfium2` with `pypdf` fallback.
  - Generous 45MB upload envelope with zip-bomb and decompression expansion guards.

- **Cyber-OLED LitRPG HUD & Paragraph Segregation Engine**:
  - **Lookahead Boundary Paragraph Cleaving**: Automatically separates embedded LitRPG stat dumps from trailing narrative prose into distinct paragraphs, preventing narrative sentences from being swallowed into stat cards or muted during audio playback.
  - **6-Taxonomy System HUD Cards**: Classifies game notifications into specialized visual components with cybernetic badge ribbons:
    - `Stats HUD`: Character sheets and attribute lists with triadic grouping.
    - `Title Bestowed`: Achievement and moniker unlocks.
    - `Quest Directive`: Mission objectives and condition alerts.
    - `Skill & Ability`: Spell, perk, and technique registrations.
    - `Entity Tooltip Scan`: Monster and item appraisal descriptions.
    - `System Broadcast`: World announcements and administrator notices.
  - **Balanced RPG Attribute Triads**: Groups stats into Physical (`STR`, `DEX`, `END`, `AGI`, `VIT`), Mental (`INT`, `WIS`, `WILL`, `PER`), and Progression (`Level`, `Free Stats`, `Nexus Coins`, `Credits`, `EXP`) chips rendered in responsive inline triads (`.stat-card-row`).
  - **Dynamic Stat Delta & Perk Styling**: Bidirectional regex styling for stat gains and buffs (e.g., `+5 STR`, `All stats +10%`, `Strength +1`, `Agility +2`).
  - **Smart Card Folding**: System cards exceeding 4 lines automatically include a smooth toggle control (`Show Less ▲` / `Show More ▼`) with click-propagation guards.

- **Dual-Engine Audio Narration Architecture**:
  - **Studio Neural (Cloud Edge-TTS)**: High-fidelity cloud neural speech synthesis (`en-US-ChristopherNeural`, `en-US-AvaNeural`, multilingual voices) with base64 `X-Word-Boundaries` timestamps for real-time sentence and karaoke word-by-word highlighting.
  - **LitRPG Audio Summaries**: Dense stat boxes are condensed into conversational spoken summaries (e.g. *"Status Screen: 9 attributes detected."*) during cloud TTS narration instead of drone-reading numbers.
  - **Infinite Local (Web Speech API)**: Zero-latency, zero-bandwidth browser speech synthesis engine with an anti-cascade watchdog timer and chunk boundary tracking.
  - **Predictive Audio Runway**: 10-paragraph forward pre-buffering pipeline for seamless, gapless chapter playback.
  - **MediaSession & Lock Screen**: Full native OS lock-screen metadata, headphone click controls, and persistent audio singleton with silent PCM handoff to prevent mobile autoplay blocks.

- **Offline-First PWA Architecture & Dexie.js**:
  - Client-authoritative storage powered by **Dexie.js (IndexedDB)** for full offline library reading and instant chapter navigation.
  - Sub-50ms instantaneous chapter transitions via single-roundtrip DOM hydration without page reloads.
  - Real-time reading progress tracking, font personalization, and OLED themes preserved locally and synchronized with the server.
  - Sub-5ms HTTP ETag (`304 Not Modified`) chapter revalidation with MD5 content hashing.

- **Resilient Hybrid Database**:
  - High-concurrency cloud **Turso (LibSQL)** support with single-roundtrip chapter and Table of Contents hydration.
  - Zero-config local **SQLite** fallback with automatic table initialization and schema migrations.
  - Automatic frontmatter pruning engine that filters empty or sub-100-word divider pages.

---

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Backend** | Python 3.11+, FastAPI, Uvicorn | Asynchronous REST API, server-side template rendering, ETag cache |
| **Audio Service** | Edge-TTS, Web Speech API, Web Audio | Dual-engine narration: Studio Neural (cloud) + Infinite Local (offline browser) |
| **Document Parsers** | PyPDFium2, PyPDF, Pillow, zipfile | Native, memory-safe PDF & EPUB chapter segregation pipelines |
| **Typography Engine** | Jinja2 Filters & Client Regex | Unified SSR/client paragraph classification, LitRPG stat triads, and perk deltas |
| **Database** | Turso (LibSQL) / SQLite3 | Dual-mode database with single-connection chapter and ToC queries |
| **Client Storage** | Dexie.js (IndexedDB) | Client-first offline storage, sub-50ms hydration, and reading cache |
| **Interface & PWA** | Vanilla HTML5, CSS3, Jinja2, ServiceWorker | Cyber-OLED aesthetic, 6 LitRPG HUD cards, responsive mobile reader, installable PWA |
| **Hosting & CI/CD** | Render (`render.yaml`) | Automated cloud deployment on Git push |

---

## Architecture Overview

```
Lightnovelpub/
├── main.py                  # FastAPI server, REST routes, Edge-TTS bridge, ETag caching, Jinja2 filters
├── database.py              # Turso LibSQL & SQLite adapter, LitRPG paragraph segregation, lexer
├── pdf_parser.py            # PDF chapter division parser, in-text ToC filter, watermark stripper
├── epub_parser.py           # EPUB3 & OPF spine extractor, HTML text cleaner, natural sort
├── render.yaml              # Render web service blueprint & build configuration
├── requirements.txt         # Core dependencies
├── data/
│   └── library.db           # Pre-seeded local library SQLite database
├── static/
│   ├── css/
│   │   └── style.css        # Cyber-OLED theme, LitRPG HUD cards, stat triads, reading canvas
│   ├── js/
│   │   ├── reader.js        # Dual-engine player (Neural/Local), Dexie hydration, card collapse
│   │   ├── upload.js        # Chunked client upload orchestrator, local DB sync, progress bar
│   │   ├── dexie.min.js     # IndexedDB client persistence engine
│   │   └── sw.js            # PWA Service Worker for offline asset caching
│   ├── img/                 # PWA application icons, badges, and logos
│   └── covers/              # Cached novel cover images
└── templates/
    ├── base.html            # PWA application shell, global navigation, modal roots
    ├── index.html           # Library home, search, sort, and novel cards
    ├── novel_detail.html    # Bento-grid metadata, chapter table of contents, progress
    └── reader.html          # Distraction-free reader canvas, Cyber-OLED HUD cards, audio controls
```

---

## Local Development

### Prerequisites
- Python 3.10 or higher
- `pip` package manager

### Setup Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/xinyuki-sen/Lightnovelpub.git
   cd Lightnovelpub
   ```

2. **Create and activate a virtual environment (recommended):**
   ```bash
   python -m venv .venv
   # Windows:
   .venv\Scripts\activate
   # macOS / Linux:
   source .venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Start the application:**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

5. Open your browser and navigate to `http://localhost:8000`.

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `TURSO_DATABASE_URL` | Optional | `""` | Turso database URL (`libsql://...` or `https://...`). If omitted, uses local SQLite database at `data/library.db`. |
| `TURSO_AUTH_TOKEN` | Optional | `""` | Bearer authentication token for Turso cloud database. |
| `PORT` | Optional | `8000` | Port for the Uvicorn web server (automatically configured on Render). |
| `ADMIN_TOKEN` | Optional | `""` | Bearer token for protected administrative operations (e.g. library resets). |

---

## Production Deployment (Render)

This repository includes a [`render.yaml`](render.yaml) blueprint ready for zero-configuration deployment:

1. Link your GitHub repository to [Render](https://render.com).
2. Select **New > Blueprint** and choose the repository.
3. (Optional) Provide `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Render Environment Settings for cloud persistence.
4. Render will automatically build the dependencies and launch the Uvicorn server.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

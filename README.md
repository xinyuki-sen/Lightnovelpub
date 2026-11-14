# Lightnovelpub — Luxury Web & Mobile Novel Reader

An ultra-responsive, mobile-first web application and Progressive Web App (PWA) engineered for reading and listening to light novels and web novels. Built with Python FastAPI, Dexie.js (IndexedDB), and Microsoft Edge-TTS neural speech synthesis, delivering instant client-side chapter transitions, offline persistence, and real-time word-synchronized highlighting.

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB.svg?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Render](https://img.shields.io/badge/Deploy-Render-46E3B7.svg?style=flat&logo=render&logoColor=white)](https://render.com/)
[![PWA](https://img.shields.io/badge/PWA-v59-brightgreen.svg?style=flat&logo=pwa&logoColor=white)](static/sw.js)
[![Forge Verified](https://img.shields.io/badge/Forge%20Suite-38%2F38%20PASS-success.svg?style=flat)](forge_verification_suite.py)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## Key Capabilities

- **Intelligent EPUB & PDF Ingestion Engine**:
  - Multi-tier chapter division lexer handling bracketed numbers (`[ 01 ]`), standard headings (`Chapter 1 - The Beginning`), natural numbers (`4. Starting Somewhere`), and Roman numerals.
  - Automatic identification and filtration of in-text Table of Contents pages, publisher frontmatter, copyright disclaimers, and pirate banner watermarks (`OceanofPDF.com`).
  - Drop-cap line stitching (`fix_pdf_dropcap_lines`) that heals split initial capital letters into continuous words.
  - Memory-safe PDF stream ingestion powered by `pypdfium2` with `pypdf` fallback.
  - Generous 45MB upload envelope with zip-bomb and decompression expansion guards.

- **Modular Typesetting & Natural Language Processing Engine (`typesetter.py`)**:
  - **Decoupled Architecture**: Pure typography and paragraph classification separated from database persistence into a dedicated, high-speed NLP pipeline.
  - **3-Stage Abbreviation-Safe Tokenization**: Pre-masks honorifics, abbreviations (`Mr.`, `Dr.`, `p.m.`, `e.g.`), initials, decimals, and ellipses to guarantee sentence cuts happen strictly at true grammatical boundaries.
  - **Lookahead Boundary Paragraph Cleaving (`segregate_mixed_paragraph`)**: Separates embedded LitRPG stat blocks from story lead-ins and trailing narrative prose into clean, distinct paragraphs.
  - **Pipe-Safe Delimitation Protection**: Multi-item piped skill lists (`Freeze Lvl 26 | Stalemate Breaker Lvl 29 | ...`) are protected against premature regex sentence splits, keeping full skill rosters unified inside stat cards.
  - **Server-Side Speech Sanitizer (`clean_speech_text`)**: Converts decorative scene breaks (`***`, `◆◆◆`, `═════`) and markdown syntax into natural speech pauses before TTS processing, preventing audio synthetic glitches.

- **Cyber-OLED LitRPG HUD & Paragraph Classification**:
  - **6-Taxonomy System HUD Cards**: Classifies system notifications into specialized visual components with cybernetic badge ribbons:
    - `Stats HUD`: Character sheets and attribute lists with triadic grouping.
    - `Title Bestowed`: Achievement and moniker unlocks.
    - `Quest Directive`: Mission objectives and condition alerts.
    - `Skill & Ability`: Spell, perk, and technique registrations.
    - `Entity Tooltip Scan`: Monster and item appraisal descriptions.
    - `System Broadcast`: World announcements and administrator notices.
  - **Balanced RPG Attribute Triads**: Groups stats into Physical (`STR`, `DEX`, `END`, `AGI`, `VIT`), Mental (`INT`, `WIS`, `WILL`, `PER`), and Progression (`Level`, `Free Stats`, `Nexus Coins`, `Credits`, `EXP`) chips rendered in responsive inline triads (`.stat-card-row`).
  - **Dynamic Stat Delta & Perk Styling**: Bidirectional styling for stat gains and buffs (e.g., `+5 STR`, `All stats +10%`, `Strength +1`, `Agility +2`).
  - **Smart Card Folding**: System cards exceeding 4 lines automatically include smooth toggle controls (`Show Less ▲` / `Show More ▼`) with click-propagation guards.

- **Dual-Engine Audio Narration Architecture**:
  - **Studio Neural (Cloud Edge-TTS)**: High-fidelity cloud neural speech synthesis (`en-US-ChristopherNeural`, `en-US-AvaNeural`, multilingual voices) generating pure 1.0x baseline reference audio with base64 `X-Word-Boundaries` timestamps for real-time sentence and karaoke word-by-word highlighting.
  - **LitRPG Audio Summaries**: Dense stat boxes are condensed into conversational spoken summaries (e.g., *"Status Screen: 9 attributes detected."*) during narration rather than reading endless numbers.
  - **Infinite Local (Web Speech API)**: Zero-latency, zero-bandwidth browser speech synthesis engine with an anti-cascade watchdog timer and chunk boundary tracking.
  - **Predictive Audio Runway**: 10-paragraph forward pre-buffering pipeline for seamless, gapless chapter playback.
  - **MediaSession & Lock Screen**: Full native OS lock-screen metadata, headphone click controls, and persistent audio singleton with silent PCM handoff to prevent mobile autoplay blocks.
  - **Cross-Chapter Composite Keying**: IndexedDB audio caching keyed by `${chNum}:${idx}` with active abort controllers terminating stale requests on chapter navigation.

- **Real-Time Reading Telemetry & Smart Shelves**:
  - **Live Reading Activity Tracker**: Real-time session time, all-time duration, books completed/active, and total pages read (standardized at 250 words/page) with offline Dexie synchronization.
  - **Dynamic Velocity Time-Remaining Badges**: Automatically calculates user reading velocity (words per minute) and dynamically updates time-to-finish estimates (e.g., `~14h 20m left`) on library cards.
  - **Smart Shelves**: 1-tap filtering for `All`, `⭐ Favorites`, `📖 Reading`, `Unread`, and `✔️ Completed` with 1-tap star toggles.
  - **1-Tap Bedtime Sleep Timer**: Integrated into audio player header and floating mobile dock (15m, 30m, 45m, 60m, off) with gradual volume decay.

- **Offline-First PWA Architecture & Dexie.js (v59)**:
  - Client-authoritative storage powered by **Dexie.js (IndexedDB)** for full offline library reading and instant chapter navigation.
  - Sub-50ms instantaneous chapter transitions via single-roundtrip DOM hydration without page reloads.
  - Real-time reading progress tracking, font personalization, and OLED themes preserved locally and synchronized with the server.
  - Sub-5ms HTTP ETag (`304 Not Modified`) chapter revalidation with MD5 content hashing.
  - Version-gated cache eviction (`v59`) ensuring mobile browsers instantly adopt updated styles and scripts.

- **Resilient Hybrid Database**:
  - High-concurrency cloud **Turso (LibSQL)** support with single-roundtrip chapter and Table of Contents hydration.
  - Zero-config local **SQLite** fallback with automatic table initialization and schema migrations.
  - Automatic frontmatter pruning engine that filters empty or sub-100-word divider pages.

---

## 8-Loop Forge Verification Suite

LightnovelPub includes an exhaustive automated verification suite (`forge_verification_suite.py`) testing all critical runtime subsystems across 8 continuous loops:

```
==================================================================
  FORGE VERIFICATION SUITE ARCHITECTURE
==================================================================
  Loop 1: Syntax & Bytecode Compilation (Python + JavaScript)
  Loop 2: PWA & Cache-Busting Coherence (v59 synchronization)
  Loop 3: Edge-TTS API & Master Audio Integrity (1.0x baseline, MP3 stream)
  Loop 4: Chapter Reader DOM & UI Segmented Tabs
  Loop 5: Decorative Character & Symbol Cleaner (Speech text sanitizer)
  Loop 6: Chapter Composite Keying & Cross-Chapter Isolation
  Loop 7: Watchdog Isolation (Neural vs Infinite)
  Loop 8: Anti-Cascade Guard & EOF Skip Prevention
==================================================================
  38 / 38 CHECKS PASSED (100% GREEN)
==================================================================
```

Run the suite locally:
```bash
python forge_verification_suite.py
```

---

## Tech Stack

| Component | Technology | Description |
|---|---|---|
| **Backend API** | Python 3.11+, FastAPI, Uvicorn | Asynchronous REST API, server-side template rendering, ETag 304 caching |
| **Typesetting & NLP** | `typesetter.py` | Modular sentence tokenization, LitRPG stat-block segregation, speech text sanitizer |
| **Audio Service** | Edge-TTS, Web Speech API, Web Audio | Dual-engine narration: Studio Neural (cloud) + Infinite Local (offline browser) |
| **Document Parsers** | PyPDFium2, PyPDF, Pillow, zipfile | Native, memory-safe PDF & EPUB chapter segregation pipelines |
| **Database** | Turso (LibSQL) / SQLite3 | Dual-mode database with single-connection chapter and ToC queries |
| **Client Storage** | Dexie.js (IndexedDB) | Client-first offline storage, sub-50ms hydration, composite audio cache |
| **Interface & PWA** | Vanilla HTML5, CSS3, Jinja2, ServiceWorker | Cyber-OLED aesthetic, 6 LitRPG HUD cards, responsive mobile reader, installable PWA v59 |
| **Verification** | `forge_verification_suite.py` | 8-loop architectural verification suite with 38 automated assertions |
| **Hosting & CI/CD** | Render (`render.yaml`) | Automated cloud deployment on Git push to `main` |

---

## Architecture Overview

```
Lightnovelpub/
├── main.py                     # FastAPI server, REST routes, Edge-TTS bridge, ETag caching
├── typesetter.py               # Modular NLP engine: sentence tokenization, stat segregation, speech sanitizer
├── database.py                 # Turso LibSQL & SQLite adapter, schema migrations, library persistence
├── forge_verification_suite.py # 8-Loop architectural regression and verification suite
├── pdf_parser.py               # PDF chapter division parser, in-text ToC filter, watermark stripper
├── epub_parser.py              # EPUB3 & OPF spine extractor, HTML text cleaner, natural sort
├── render.yaml                 # Render web service blueprint & build configuration
├── requirements.txt            # Core dependencies
├── data/
│   └── library.db              # Pre-seeded local library SQLite database
├── static/
│   ├── css/
│   │   └── style.css           # Cyber-OLED theme, LitRPG HUD cards, stat triads, reading canvas
│   ├── js/
│   │   ├── reader.js           # Dual-engine player (Neural/Local), Dexie hydration, card collapse
│   │   ├── upload.js           # Chunked client upload orchestrator, local DB sync, progress bar
│   │   ├── dexie.min.js        # IndexedDB client persistence engine
│   │   └── sw.js               # PWA Service Worker for offline asset caching (v59)
│   ├── img/                    # PWA application icons, badges, and logos
│   └── covers/                 # Cached novel cover images
└── templates/
    ├── base.html               # PWA application shell, global navigation, modal roots
    ├── index.html              # Library home, telemetry banner, search, sort, and novel cards
    ├── novel_detail.html       # Bento-grid metadata, chapter table of contents, progress
    └── reader.html             # Distraction-free reader canvas, Cyber-OLED HUD cards, audio controls
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

4. **Run the Forge Verification Suite:**
   ```bash
   python forge_verification_suite.py
   ```

5. **Start the application:**
   ```bash
   uvicorn main:app --reload --host 127.0.0.1 --port 8000
   ```

6. Open your browser and navigate to `http://localhost:8000`.

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

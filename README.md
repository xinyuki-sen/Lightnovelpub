# Lightnovelpub

Custom light novel reader with EPUB/PDF parsing, offline support, and built-in text-to-speech — styled after the Novel Phoenix reading experience.

## What It Does

Lightnovelpub is a self-hosted web reader that lets you upload EPUB and PDF novels, read them chapter-by-chapter in a clean distraction-free interface, and listen to chapters with browser-native text-to-speech. It works offline as a Progressive Web App (PWA).

## Key Features

- **EPUB & PDF parsing** — extracts chapters and metadata from uploaded files server-side
- **Clean reader UI** — dark-themed, mobile-friendly reading interface with adjustable settings
- **Text-to-speech** — browser-native TTS for hands-free reading
- **Offline support** — PWA with service worker caching for reading without internet
- **Library management** — SQLite-backed library with cover art and reading progress

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database | SQLite |
| Frontend | Vanilla HTML/CSS/JS, Jinja2 templates |
| Offline | Service Worker, Web App Manifest (PWA) |
| Parsing | Custom EPUB/PDF parsers |
| Deployment | Vercel (serverless Python) |

## Project Structure

```
api/              Vercel serverless entry point
static/
├── css/          Reader and library styles
├── js/           Client-side reader logic, upload handler, Dexie (IndexedDB)
├── covers/       Book cover images
└── img/          PWA icons and favicon
templates/        Jinja2 HTML templates (library, reader, novel detail)
main.py           FastAPI application entry
database.py       SQLite library management
epub_parser.py    EPUB chapter extraction
pdf_parser.py     PDF chapter extraction
```

## Getting Started

```bash
pip install -r requirements.txt
python main.py
# or on Windows:
run.bat
```

## License

MIT

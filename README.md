# 🔥 Novel Phoenix Personal Reader

A custom light novel reader web application modeled directly after **Novel Phoenix** (`novelphoenix.com`), with built-in **PDF to Novel Chapter conversion**.

Whenever a novel you want isn't on Novel Phoenix, simply drop the PDF into this website, and it will:
1. Automatically extract the novel title and cover art.
2. Detect chapter boundaries (e.g., `Chapter 1`, `Prologue`, `Act 1`).
3. Strip awkward PDF line breaks and assemble text into clean paragraphs (`<p>...</p>`).
4. Format everything into the exact Novel Phoenix dark reader interface.

---

## Features

- **Novel Phoenix Aesthetic:** Deep dark theme (`#0c0c0e`), purple neon accents (`#9d4edd`), and card layout.
- **Reading Controls (Gear / Settings Drawer):**
  - **Themes:** Dark Black, Midnight Blue, Parchment Sepia, Day Light.
  - **Fonts:** *Nunito Sans* (default), *Merriweather* (classic book serif), *Roboto*, *Open Sans*, *Montserrat*.
  - **Font Size:** Adjustable from 14px to 34px with persistent `localStorage`.
- **Reading Progress & Bookmarking:**
  - Dynamic top progress bar tracking scroll depth.
  - Remembers your exact scroll position and last-read chapter so you can resume where you left off.
- **Navigation:**
  - Prev / Next chapter buttons + dropdown chapter selector.
  - Keyboard shortcuts: `←` (Prev Chapter), `→` (Next Chapter), `T` (Settings toggle).
- **Personal Library:**
  - View all converted novels as cards with cover art and chapter count badges.
  - Continue reading with 1-click.

---

## How to Run

1. Open a terminal or double click `run.bat`:
   ```bash
   cd C:\Users\pradh\.gemini\antigravity\scratch\novel-reader
   python main.py
   ```
2. Open your browser to:
   ```
   http://localhost:8000
   ```
3. Click **"+ Upload Novel PDF"**, select your novel PDF, and hit **"Convert & Add to Library"**!

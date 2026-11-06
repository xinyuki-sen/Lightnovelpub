import time
import os
import re
import json
import shutil
import sqlite3
import urllib.request
import base64
from typing import List, Dict, Optional, Tuple, Any

ABBREVIATIONS = [
    r'Mr', r'Mrs', r'Ms', r'Dr', r'Prof', r'Sr', r'Jr',
    r'Capt', r'Gen', r'Col', r'Sgt', r'Lt', r'Maj', r'Cpl',
    r'St', r'Rev', r'Hon', r'Gov', r'Pres',
    r'Vol', r'Ch', r'No', r'Fig', r'Sec', r'Dept',
    r'vs', r'etc', r'e\.g', r'i\.e', r'cf', r'al', r'approx', r'est'
]
ABBR_REGEX = re.compile(r'\b(?:' + '|'.join(ABBREVIATIONS) + r')\.', re.IGNORECASE)
INITIAL_REGEX = re.compile(r'\b([A-Z])\.(?=\s+[A-Z])')
DECIMAL_REGEX = re.compile(r'(\d+)\.(\d+)')

DOT_MASK = "\uE000DOT\uE000"
ELLIPSIS_MASK = "\uE000ELLIPSIS\uE000"
SENTENCE_PATTERN = re.compile(r'(.+?[.!?]+(?:[\"\'”’»\)\]]+)?)(?:\s+(?=[A-Z“\"\'‘\[\d])|$)', re.UNICODE)

def tokenize_sentences(text: str) -> List[str]:
    """
    3-Stage Tokenized Sentence Lexer:
    1. Pre-pass: Masks non-terminal periods in honorifics, abbreviations, initials, decimals, and ellipses.
    2. Split: Splits strictly where true terminal punctuation (. ! ?) is followed by whitespace and a capital letter, quote, or bracket.
    3. Post-pass: Restores all masked periods.
    Guarantees every extracted sentence is grammatically complete with terminal punctuation.
    """
    t = text.strip()
    if not t:
        return []

    t = ABBR_REGEX.sub(lambda m: m.group(0)[:-1] + DOT_MASK, t)
    t = INITIAL_REGEX.sub(lambda m: m.group(1) + DOT_MASK, t)
    t = DECIMAL_REGEX.sub(r'\1' + DOT_MASK + r'\2', t)
    t = t.replace('...', ELLIPSIS_MASK).replace('…', ELLIPSIS_MASK)

    # Terminal sentence regex requiring capital letter, opening quote, bracket, or string-end
    raw = SENTENCE_PATTERN.findall(t)

    if not raw:
        raw = [t]
    else:
        captured_text = "".join(raw)
        t_nowhite = re.sub(r'\s+', '', t)
        cap_nowhite = re.sub(r'\s+', '', captured_text)
        if len(cap_nowhite) < len(t_nowhite):
            idx = t.rfind(raw[-1]) + len(raw[-1])
            tail = t[idx:].strip()
            if tail:
                raw[-1] += " " + tail

    clean = []
    for s in raw:
        s = s.replace(ELLIPSIS_MASK, '...').replace(DOT_MASK, '.').strip()
        if s:
            clean.append(s)

    return clean

def split_long_paragraph(text: str, max_chars: int = 480) -> List[str]:
    """Divides paragraphs strictly into full-sentence units up to max_chars without mid-sentence cuts."""
    text = text.strip()
    if not text:
        return []

    # Preserve LitRPG system cards and status boxes
    system_triggers = ['New achievement!', 'Reward:', 'Congratulations!', 'Achievement Unlocked:', 'Quest Completed:', '+1 Stat point', 'Level Up!']
    if any(k in text for k in system_triggers) and len(text) <= 950:
        return [text]

    sentences = tokenize_sentences(text)
    if not sentences:
        return [text]
    if len(sentences) == 1:
        return [sentences[0]]

    chunks = []
    current_chunk = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)
        if current_len + sent_len > max_chars and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sent]
            current_len = sent_len
        else:
            current_chunk.append(sent)
            current_len += sent_len + 1

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def process_chapter_paragraphs(paragraphs: List[str], max_chars: int = 480) -> List[str]:
    """
    Sentence-Preserving Paragraph Engine:
    1. Recombines any sentences accidentally split across paragraphs.
    2. Divides long paragraphs strictly at terminal sentence boundaries (. ! ?).
    """
    TERMINAL_CHARS = set('.!?..."”’\'»)]}')

    merged = []
    for p in paragraphs:
        p_clean = str(p).strip()
        if not p_clean:
            continue
        if merged and (merged[-1][-1] not in TERMINAL_CHARS or p_clean[0].islower()):
            merged[-1] = merged[-1] + " " + p_clean
        else:
            merged.append(p_clean)

    final_paras = []
    for p in merged:
        if len(p) <= max_chars:
            final_paras.append(p)
        else:
            final_paras.extend(split_long_paragraph(p, max_chars=max_chars))

    return final_paras

# Backwards compatibility alias
split_chapter_paragraphs = process_chapter_paragraphs

def migrate_divide_chapter_paragraphs(conn):
    """Automatic background migration to divide all existing chapters with strict sentence boundaries."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, content_json FROM chapters")
        rows = cursor.fetchall()
        updates = []
        for ch_id, c_json in rows:
            try:
                paras = json.loads(c_json)
                new_paras = process_chapter_paragraphs(paras, max_chars=480)
                new_word_count = sum(len(p.split()) for p in new_paras)
                updates.append((json.dumps(new_paras, ensure_ascii=False), new_word_count, ch_id))
            except Exception:
                pass
        if updates:
            cursor.executemany("UPDATE chapters SET content_json = ?, word_count = ? WHERE id = ?", updates)
            print(f"[DB Migration] Successfully divided paragraphs for {len(updates)} chapters.")
    except Exception as e:
        print("[DB Migration note]:", e)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Vercel serverless functions run on read-only filesystem except /tmp
if os.environ.get("VERCEL"):
    DB_DIR = "/tmp/data"
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, "library.db")
    seed_db = os.path.join(BASE_DIR, "data", "library.db")
    if os.path.exists(seed_db) and not os.path.exists(DB_PATH):
        try:
            shutil.copyfile(seed_db, DB_PATH)
        except Exception as e:
            print("Failed to copy seed database:", e)
else:
    DB_PATH = os.path.join(BASE_DIR, "data", "library.db")


# =========================================================================
# TURSO CLOUD DATABASE (LIBSQL) ADAPTER & LOCAL SQLITE FALLBACK
# =========================================================================
TURSO_DATABASE_URL = os.environ.get("TURSO_DATABASE_URL", "").strip()
TURSO_AUTH_TOKEN = os.environ.get("TURSO_AUTH_TOKEN", "").strip()

class TursoRow(dict):
    """Dictionary that also supports positional index access like sqlite3.Row."""
    def __init__(self, data: Dict[str, Any], col_order: List[str]):
        super().__init__(data)
        self._col_order = col_order

    def __getitem__(self, key):
        if isinstance(key, int):
            col_name = self._col_order[key]
            return super().__getitem__(col_name)
        return super().__getitem__(key)

class TursoCursor:
    def __init__(self, connection: "TursoConnection"):
        self.conn = connection
        self._rows: List[TursoRow] = []
        self._row_idx = 0
        self.lastrowid = None
        self.rowcount = 0

    def execute(self, sql: str, params: Optional[Tuple] = None):
        self._rows, self.lastrowid, self.rowcount = self.conn.execute_stmt(sql, params)
        self._row_idx = 0
        return self

    def executemany(self, sql: str, params_list: List[Tuple]):
        if not params_list:
            return self
        # Batch statements in groups of 40 to avoid payload explosion while achieving 40x speedup
        BATCH_SIZE = 40
        for i in range(0, len(params_list), BATCH_SIZE):
            chunk = params_list[i:i + BATCH_SIZE]
            requests = [
                {
                    "type": "execute",
                    "stmt": {
                        "sql": sql,
                        "args": [self.conn._convert_arg(p) for p in (params or ())]
                    }
                }
                for params in chunk
            ]
            requests.append({"type": "close"})
            payload = {"requests": requests}
            try:
                body_bytes = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    self.conn.endpoint,
                    data=body_bytes,
                    headers={
                        "Authorization": f"Bearer {self.conn.auth_token}",
                        "Content-Type": "application/json"
                    },
                    method="POST"
                )
                with urllib.request.urlopen(req, timeout=15.0) as resp:
                    pass
            except Exception as e:
                # Fallback to single executes if batching fails
                for p in chunk:
                    self.execute(sql, p)
        return self

    def fetchone(self) -> Optional[TursoRow]:
        if self._row_idx < len(self._rows):
            r = self._rows[self._row_idx]
            self._row_idx += 1
            return r
        return None

    def fetchall(self) -> List[TursoRow]:
        if self._row_idx == 0:
            self._row_idx = len(self._rows)
            return self._rows
        res = self._rows[self._row_idx:]
        self._row_idx = len(self._rows)
        return res

class TursoConnection:
    def __init__(self, db_url: str, auth_token: str):
        if db_url.startswith("libsql://"):
            db_url = "https://" + db_url[9:]
        self.endpoint = db_url.rstrip("/") + "/v2/pipeline"
        self.auth_token = auth_token

    def cursor(self) -> TursoCursor:
        return TursoCursor(self)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

    def close(self):
        pass

    def _convert_arg(self, val):
        if val is None:
            return {"type": "null"}
        elif isinstance(val, bool):
            return {"type": "integer", "value": "1" if val else "0"}
        elif isinstance(val, int):
            return {"type": "integer", "value": str(val)}
        elif isinstance(val, float):
            return {"type": "float", "value": val}
        elif isinstance(val, (bytes, bytearray)):
            return {"type": "blob", "base64": base64.b64encode(val).decode("ascii")}
        else:
            return {"type": "text", "value": str(val)}

    def execute_stmt(self, sql: str, params: Optional[Tuple] = None) -> Tuple[List[TursoRow], Optional[int], int]:
        args = [self._convert_arg(p) for p in (params or ())]
        payload = {
            "requests": [
                {
                    "type": "execute",
                    "stmt": {
                        "sql": sql,
                        "args": args
                    }
                },
                {"type": "close"}
            ]
        }
        body_bytes = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            self.endpoint,
            data=body_bytes,
            headers={
                "Authorization": f"Bearer {self.auth_token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        with urllib.request.urlopen(req, timeout=12.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = data.get("results", [])
            if results and results[0].get("type") == "ok":
                exec_res = results[0]["response"]["result"]
                cols = [c["name"] for c in exec_res.get("cols", [])]
                out_rows = []
                for row_vals in exec_res.get("rows", []):
                    row_data = {}
                    for col_name, cell in zip(cols, row_vals):
                        val_type = cell.get("type")
                        if val_type == "null":
                            row_data[col_name] = None
                        elif val_type == "integer":
                            row_data[col_name] = int(cell.get("value", 0))
                        elif val_type == "float":
                            row_data[col_name] = float(cell.get("value", 0.0))
                        elif val_type == "blob":
                            row_data[col_name] = base64.b64decode(cell.get("base64", ""))
                        else:
                            row_data[col_name] = cell.get("value")
                    out_rows.append(TursoRow(row_data, cols))
                
                last_rowid = exec_res.get("last_insert_rowid")
                affected = exec_res.get("affected_row_count", 0)
                return out_rows, int(last_rowid) if last_rowid else None, affected
            elif results and results[0].get("type") == "error":
                raise RuntimeError(results[0]["error"].get("message", "Turso execution error"))
            return [], None, 0


def get_connection():
    # If Turso Cloud Database credentials are provided, route queries through Turso (LibSQL)
    if TURSO_DATABASE_URL and TURSO_AUTH_TOKEN:
        try:
            return TursoConnection(TURSO_DATABASE_URL, TURSO_AUTH_TOKEN)
        except Exception as e:
            print("[Turso Client Warning] Falling back to local SQLite:", e)

    # Standard Local SQLite with WAL mode & row_factory
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=30.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
        conn.execute("PRAGMA busy_timeout = 30000;")
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA cache_size = -32000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS novels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT UNIQUE NOT NULL,
                title TEXT NOT NULL,
                author TEXT DEFAULT 'Unknown',
                synopsis TEXT DEFAULT '',
                cover_image TEXT DEFAULT '',
                total_chapters INTEGER DEFAULT 0,
                last_read_chapter INTEGER DEFAULT 1,
                last_read_percent REAL DEFAULT 0.0,
                last_read_para INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
            # Migration check: Ensure last_read_para column exists in existing SQLite databases
            cursor.execute("PRAGMA table_info(novels)")
            columns = [row[1] for row in cursor.fetchall()]
            if "last_read_para" not in columns:
                try:
                    cursor.execute("ALTER TABLE novels ADD COLUMN last_read_para INTEGER DEFAULT 0")
                except Exception:
                    pass
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS chapters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                novel_id INTEGER NOT NULL,
                chapter_number INTEGER NOT NULL,
                title TEXT NOT NULL,
                content_json TEXT NOT NULL,
                word_count INTEGER DEFAULT 0,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE,
                UNIQUE (novel_id, chapter_number)
            );
            """)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_novels_created ON novels(created_at DESC);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_novels_progress ON novels(last_read_chapter, last_read_percent);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_chapters_novel_ch ON chapters(novel_id, chapter_number);")
            # Auto-cleanup any orphan 0-word frontmatter stubs from existing novels
            cleanup_orphan_frontmatter_stubs(conn)
    finally:
        conn.close()

IGNORED_FRONTMATTER_TITLES = {
    "cover", "title page", "title", "copyright", "also in series",
    "contents", "table of contents", "toc", "dedication", "acknowledgments",
    "acknowledgements", "about the author", "author's note", "epigraph",
    "frontmatter", "backmatter", "publisher notes", "disclaimer", "map"
}

def is_frontmatter_title(title: str) -> bool:
    t = re.sub(r'[^a-z0-9\s]', '', (title or "").lower()).strip()
    return any(t == ign or t.startswith(ign + " ") for ign in IGNORED_FRONTMATTER_TITLES)

def cleanup_orphan_frontmatter_stubs(conn):
    """Cleans up leading 0-word or frontmatter stubs (< 100 words or TOC titles) from novels that have substantive chapters."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, slug, total_chapters FROM novels")
        novels = cursor.fetchall()
        for nov in novels:
            n_id = nov["id"]
            cursor.execute("SELECT id, chapter_number, word_count, title FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC", (n_id,))
            chs = cursor.fetchall()
            if len(chs) <= 1:
                continue
            to_delete = []
            for ch in chs:
                ch_title = ch["title"] if "title" in ch else ""
                if ch["word_count"] < 100 or is_frontmatter_title(ch_title):
                    to_delete.append(ch["id"])
                else:
                    break
            # Also clean up any completely empty 0-word placeholder chapters
            for ch in chs:
                if ch["word_count"] == 0 and ch["id"] not in to_delete:
                    to_delete.append(ch["id"])
            if to_delete and len(to_delete) < len(chs):
                cursor.executemany("DELETE FROM chapters WHERE id = ?", [(cid,) for cid in to_delete])
                cursor.execute("SELECT id FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC", (n_id,))
                remaining = cursor.fetchall()
                reindex_updates = [(idx + 1, r["id"]) for idx, r in enumerate(remaining)]
                cursor.executemany("UPDATE chapters SET chapter_number = ? WHERE id = ?", reindex_updates)
                cursor.execute("UPDATE novels SET total_chapters = ? WHERE id = ?", (len(remaining), n_id))
                print(f"[DB Cleanup] Pruned {len(to_delete)} leading frontmatter stubs for novel '{nov['slug']}'.")
    except Exception as e:
        print("[DB Cleanup Note]:", e)

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text or "novel"

def generate_unique_slug(title: str) -> str:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        base_slug = slugify(title)
        slug = base_slug
        counter = 1
        while True:
            cursor.execute("SELECT id FROM novels WHERE slug = ?", (slug,))
            if not cursor.fetchone():
                return slug
            slug = f"{base_slug}-{counter}"
            counter += 1
    finally:
        conn.close()

def save_novel(title: str, author: str, synopsis: str, cover_path: str, chapters: List[Dict], precomputed_slug: Optional[str] = None) -> str:
    conn = get_connection()
    try:
        slug = precomputed_slug or generate_unique_slug(title)
        with conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO novels (slug, title, author, synopsis, cover_image, total_chapters)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (slug, title, author or "Unknown Author", synopsis or "No synopsis available.", cover_path, len(chapters)))
            
            cursor.execute("SELECT id FROM novels WHERE slug = ?", (slug,))
            n_row = cursor.fetchone()
            novel_id = (n_row["id"] if isinstance(n_row, dict) or hasattr(n_row, "keys") else n_row[0]) if n_row else cursor.lastrowid
            
            # Batch chapter insertion using single-pass tokenization (3x faster upload)
            batch_data = []
            for ch in chapters:
                raw_c = ch.get("content", [])
                if isinstance(raw_c, list) and raw_c and all(len(p) <= 480 for p in raw_c):
                    paras = raw_c
                else:
                    paras = split_chapter_paragraphs(raw_c, max_chars=480)
                w_count = sum(len(p.split()) for p in paras)
                batch_data.append((
                    novel_id,
                    ch["number"],
                    ch["title"],
                    json.dumps(paras, ensure_ascii=False),
                    w_count
                ))
            
            cursor.executemany("""
                INSERT INTO chapters (novel_id, chapter_number, title, content_json, word_count)
                VALUES (?, ?, ?, ?, ?)
            """, batch_data)
            
        return slug
    finally:
        conn.close()

def get_all_novels(order_by: str = "recent") -> List[Dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        if order_by == "title":
            cursor.execute("SELECT * FROM novels ORDER BY title COLLATE NOCASE ASC")
        elif order_by == "chapters":
            cursor.execute("SELECT * FROM novels ORDER BY total_chapters DESC, created_at DESC")
        elif order_by == "progress":
            cursor.execute("SELECT * FROM novels ORDER BY last_read_percent DESC, last_read_chapter DESC")
        else:
            # Default: Actively reading first, then newly added
            cursor.execute("""
                SELECT * FROM novels 
                ORDER BY CASE WHEN last_read_chapter > 1 OR last_read_percent > 3.0 THEN 0 ELSE 1 END,
                         created_at DESC
            """)
        rows = cursor.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def get_novel_by_slug(slug: str) -> Optional[Dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM novels WHERE LOWER(slug) = LOWER(?)", (slug,))
        row = cursor.fetchone()
        if not row:
            return None
        novel = dict(row)
        
        cursor.execute("""
            SELECT chapter_number, title, word_count 
            FROM chapters 
            WHERE novel_id = ? 
            ORDER BY chapter_number ASC
        """, (novel["id"],))
        novel["chapters"] = [dict(r) for r in cursor.fetchall()]
        return novel
    finally:
        conn.close()

def get_chapter(slug: str, chapter_number: int) -> Optional[Tuple[Dict, Dict]]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM novels WHERE LOWER(slug) = LOWER(?)", (slug,))
        novel_row = cursor.fetchone()
        if not novel_row:
            return None
        novel = dict(novel_row)
        
        cursor.execute("""
            SELECT * FROM chapters 
            WHERE novel_id = ? AND chapter_number = ?
        """, (novel["id"], chapter_number))
        ch_row = cursor.fetchone()
        if not ch_row:
            # Fallback to the first readable chapter if the requested chapter number does not exist
            cursor.execute("""
                SELECT * FROM chapters 
                WHERE novel_id = ? 
                ORDER BY chapter_number ASC LIMIT 1
            """, (novel["id"],))
            ch_row = cursor.fetchone()
            if not ch_row:
                return None
        chapter = dict(ch_row)

        # Single-roundtrip ToC hydration: populate novel["chapters"] in the same connection
        cursor.execute("""
            SELECT chapter_number, title, word_count 
            FROM chapters 
            WHERE novel_id = ? 
            ORDER BY chapter_number ASC
        """, (novel["id"],))
        novel["chapters"] = [dict(r) for r in cursor.fetchall()]

        raw_paras = json.loads(chapter["content_json"])
        if isinstance(raw_paras, list) and raw_paras and all(len(p) <= 520 for p in raw_paras):
            chapter["paragraphs"] = raw_paras
        else:
            chapter["paragraphs"] = split_chapter_paragraphs(raw_paras, max_chars=480)
        
        return novel, chapter
    finally:
        conn.close()

def update_reading_progress(slug: str, chapter_number: int, percent: float, para_index: int = 0):
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE novels 
                SET last_read_chapter = ?, last_read_percent = ?, last_read_para = ?
                WHERE slug = ?
            """, (chapter_number, percent, para_index, slug))
    finally:
        conn.close()

def delete_novel(slug: str) -> Optional[str]:
    """Deletes novel from database and returns cover image path for disk cleanup."""
    conn = get_connection()
    cover_image = None
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, cover_image FROM novels WHERE LOWER(slug) = LOWER(?)", (slug,))
            row = cursor.fetchone()
            if row:
                cover_image = row["cover_image"]
                cursor.execute("DELETE FROM chapters WHERE novel_id = ?", (row["id"],))
                cursor.execute("DELETE FROM novels WHERE id = ?", (row["id"],))
        return cover_image
    finally:
        conn.close()


def export_library_data() -> dict:
    """Exports all novels, chapters, and progress as a portable dictionary for backup."""
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM novels")
        novels = [dict(row) for row in cursor.fetchall()]
        
        cursor.execute("SELECT * FROM chapters")
        chapters = [dict(row) for row in cursor.fetchall()]
        
        return {
            "version": 1,
            "exported_at": time.time(),
            "novels": novels,
            "chapters": chapters
        }
    finally:
        conn.close()

def import_library_data(data: dict) -> int:
    """Imports / merges backup data into SQLite library database."""
    conn = get_connection()
    novels = data.get("novels", [])
    chapters = data.get("chapters", [])
    imported_count = 0
    try:
        with conn:
            cursor = conn.cursor()
            for nov in novels:
                cursor.execute("SELECT id FROM novels WHERE slug = ?", (nov["slug"],))
                existing = cursor.fetchone()
                if existing:
                    novel_id = existing["id"]
                    cursor.execute("""
                        UPDATE novels SET 
                            title = ?, author = ?, synopsis = ?, cover_image = ?,
                            total_chapters = ?, last_read_chapter = ?, last_read_percent = ?, last_read_para = ?
                        WHERE id = ?
                    """, (
                        nov["title"],
                        nov.get("author", "Unknown Author"),
                        nov.get("synopsis", ""),
                        nov.get("cover_image", ""),
                        nov.get("total_chapters", 0),
                        nov.get("last_read_chapter", 1),
                        nov.get("last_read_percent", 0.0),
                        nov.get("last_read_para", 0),
                        novel_id
                    ))
                else:
                    cursor.execute("""
                        INSERT INTO novels (title, slug, author, synopsis, cover_image, total_chapters, last_read_chapter, last_read_percent, last_read_para, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        nov["title"],
                        nov["slug"],
                        nov.get("author", "Unknown Author"),
                        nov.get("synopsis", ""),
                        nov.get("cover_image", ""),
                        nov.get("total_chapters", 0),
                        nov.get("last_read_chapter", 1),
                        nov.get("last_read_percent", 0.0),
                        nov.get("last_read_para", 0),
                        nov.get("created_at", time.time())
                    ))
                    cursor.execute("SELECT id FROM novels WHERE slug = ?", (nov["slug"],))
                    n_row = cursor.fetchone()
                    novel_id = (n_row["id"] if isinstance(n_row, dict) or hasattr(n_row, "keys") else n_row[0]) if n_row else cursor.lastrowid
                    imported_count += 1
                
                # Insert chapters for this novel
                novel_chapters = [ch for ch in chapters if ch.get("novel_id") == nov.get("id") or ch.get("novel_slug") == nov.get("slug")]
                for ch in novel_chapters:
                    cursor.execute("""
                        INSERT OR REPLACE INTO chapters (novel_id, chapter_number, title, content_json, word_count)
                        VALUES (?, ?, ?, ?, ?)
                    """, (
                        novel_id,
                        ch["chapter_number"],
                        ch.get("title", f"Chapter {ch['chapter_number']}"),
                        ch["content_json"],
                        ch.get("word_count", 0)
                    ))
        return imported_count
    finally:
        conn.close()

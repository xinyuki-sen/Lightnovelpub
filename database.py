import time
import os
import re
import json
import shutil
import sqlite3
from typing import List, Dict, Optional, Tuple

def split_long_paragraph(text: str, max_chars: int = 480) -> List[str]:
    """Intelligently splits monolithic paragraphs at natural sentence boundaries without breaking text."""
    text = text.strip()
    if not text:
        return []
    
    # Check if this is a compact LitRPG system card / status box; keep intact if under 900 chars
    system_triggers = ['New achievement!', 'Reward:', 'Congratulations!', 'Achievement Unlocked:', 'Quest Completed:', '+1 Stat point', 'Level Up!']
    if any(k in text for k in system_triggers) and len(text) <= 900:
        return [text]

    if len(text) <= max_chars:
        return [text]

    # Sentence boundary regex (handles quotes, ellipses, question marks, exclamation points)
    sentence_pattern = re.compile(r'([^.!?]+[.!?]+(?:["\'”’»]+)?(?:\s+|$))', re.UNICODE)
    raw_sentences = sentence_pattern.findall(text)
    
    matched_len = sum(len(s) for s in raw_sentences)
    if matched_len < len(text):
        remaining = text[matched_len:].strip()
        if remaining:
            raw_sentences.append(remaining)

    if not raw_sentences:
        raw_sentences = [text]

    chunks = []
    current_chunk = []
    current_len = 0

    for sent in raw_sentences:
        s = sent.strip()
        if not s:
            continue
        
        # Sub-split rare gigantic sentences with commas/semicolons
        if len(s) > max_chars * 1.4:
            if current_chunk:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
                current_len = 0
            
            clause_pattern = re.compile(r'([^,;:—]+[,;:—]+(?:\s+|$))', re.UNICODE)
            clauses = clause_pattern.findall(s)
            c_matched_len = sum(len(c) for c in clauses)
            if c_matched_len < len(s):
                c_rem = s[c_matched_len:].strip()
                if c_rem:
                    clauses.append(c_rem)
            
            sub_chunk = []
            sub_len = 0
            for c in (clauses if clauses else [s]):
                c = c.strip()
                if not c:
                    continue
                if sub_len + len(c) > max_chars and sub_chunk:
                    chunks.append(" ".join(sub_chunk))
                    sub_chunk = [c]
                    sub_len = len(c)
                else:
                    sub_chunk.append(c)
                    sub_len += len(c) + 1
            if sub_chunk:
                chunks.append(" ".join(sub_chunk))
            continue

        if current_len + len(s) > max_chars and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [s]
            current_len = len(s)
        else:
            current_chunk.append(s)
            current_len += len(s) + 1

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return [c for c in chunks if c.strip()]

def split_chapter_paragraphs(paragraphs: List[str], max_chars: int = 480) -> List[str]:
    """Divides chapters into breathable, light-novel paragraphs with bounded text length."""
    new_paragraphs = []
    for p in paragraphs:
        if not p or not str(p).strip():
            continue
        p_str = str(p).strip()
        if len(p_str) <= max_chars:
            new_paragraphs.append(p_str)
        else:
            new_paragraphs.extend(split_long_paragraph(p_str, max_chars=max_chars))
    return new_paragraphs

def migrate_divide_chapter_paragraphs(conn):
    """Automatic background migration to divide all existing chapters in database."""
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, content_json FROM chapters")
        rows = cursor.fetchall()
        updates = []
        for ch_id, c_json in rows:
            try:
                paras = json.loads(c_json)
                if any(len(p) > 550 for p in paras):
                    new_paras = split_chapter_paragraphs(paras, max_chars=480)
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

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=20.0)
    conn.execute("PRAGMA foreign_keys = ON;")
    try:
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
    finally:
        conn.close()

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
            
            novel_id = cursor.lastrowid
            
            # Batch chapter insertion using executemany for peak performance
            batch_data = [
                (
                    novel_id,
                    ch["number"],
                    ch["title"],
                    json.dumps(split_chapter_paragraphs(ch.get("content", []), max_chars=480), ensure_ascii=False),
                    sum(len(p.split()) for p in split_chapter_paragraphs(ch.get("content", []), max_chars=480))
                )
                for ch in chapters
            ]
            
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
        cursor.execute("SELECT * FROM novels WHERE slug = ?", (slug,))
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
        cursor.execute("SELECT * FROM novels WHERE slug = ?", (slug,))
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
            return None
        chapter = dict(ch_row)
        chapter["paragraphs"] = split_chapter_paragraphs(json.loads(chapter["content_json"]), max_chars=480)
        
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
            cursor.execute("SELECT id, cover_image FROM novels WHERE slug = ?", (slug,))
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
                    novel_id = cursor.lastrowid
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

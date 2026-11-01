import sqlite3
import json
import os
import re
from typing import List, Dict, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

if os.environ.get("VERCEL"):
    DB_DIR = "/tmp/data"
    os.makedirs(DB_DIR, exist_ok=True)
    DB_PATH = os.path.join(DB_DIR, "library.db")
    seed_db = os.path.join(BASE_DIR, "data", "library.db")
    if os.path.exists(seed_db) and not os.path.exists(DB_PATH):
        import shutil
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
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """)
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
            
            # Batch chapter insertion using executemany for high performance
            batch_data = [
                (
                    novel_id,
                    ch["number"],
                    ch["title"],
                    json.dumps(ch["content"], ensure_ascii=False),
                    ch.get("word_count", 0)
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

def get_all_novels() -> List[Dict]:
    conn = get_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM novels ORDER BY created_at DESC")
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
        
        # Fetch chapters
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
        chapter["paragraphs"] = json.loads(chapter["content_json"])
        
        return novel, chapter
    finally:
        conn.close()

def update_reading_progress(slug: str, chapter_number: int, percent: float):
    conn = get_connection()
    try:
        with conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE novels 
                SET last_read_chapter = ?, last_read_percent = ?
                WHERE slug = ?
            """, (chapter_number, percent, slug))
    finally:
        conn.close()

def delete_novel(slug: str) -> Optional[str]:
    """Deletes novel and returns cover image path for disk cleanup."""
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

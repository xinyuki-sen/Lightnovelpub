import sqlite3
import json
import os
import re
from typing import List, Dict, Optional, Tuple

DB_PATH = os.path.join(os.path.dirname(__file__), "data", "library.db")

def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
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
    conn.commit()
    conn.close()

def slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r'[^a-z0-9]+', '-', text).strip('-')
    return text or "novel"

def save_novel(title: str, author: str, synopsis: str, cover_path: str, chapters: List[Dict]) -> str:
    conn = get_connection()
    cursor = conn.cursor()
    
    base_slug = slugify(title)
    slug = base_slug
    counter = 1
    
    # Ensure unique slug
    while True:
        cursor.execute("SELECT id FROM novels WHERE slug = ?", (slug,))
        if not cursor.fetchone():
            break
        slug = f"{base_slug}-{counter}"
        counter += 1
        
    cursor.execute("""
        INSERT INTO novels (slug, title, author, synopsis, cover_image, total_chapters)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (slug, title, author or "Unknown Author", synopsis or "No synopsis available.", cover_path, len(chapters)))
    
    novel_id = cursor.lastrowid
    
    for ch in chapters:
        cursor.execute("""
            INSERT INTO chapters (novel_id, chapter_number, title, content_json, word_count)
            VALUES (?, ?, ?, ?, ?)
        """, (
            novel_id,
            ch["number"],
            ch["title"],
            json.dumps(ch["content"], ensure_ascii=False),
            ch.get("word_count", 0)
        ))
        
    conn.commit()
    conn.close()
    return slug

def get_all_novels() -> List[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM novels ORDER BY created_at DESC")
    rows = cursor.fetchall()
    novels = [dict(row) for row in rows]
    conn.close()
    return novels

def get_novel_by_slug(slug: str) -> Optional[Dict]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM novels WHERE slug = ?", (slug,))
    row = cursor.fetchone()
    if not row:
        conn.close()
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
    conn.close()
    return novel

def get_chapter(slug: str, chapter_number: int) -> Optional[Tuple[Dict, Dict]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM novels WHERE slug = ?", (slug,))
    novel_row = cursor.fetchone()
    if not novel_row:
        conn.close()
        return None
    novel = dict(novel_row)
    
    cursor.execute("""
        SELECT * FROM chapters 
        WHERE novel_id = ? AND chapter_number = ?
    """, (novel["id"], chapter_number))
    ch_row = cursor.fetchone()
    if not ch_row:
        conn.close()
        return None
    chapter = dict(ch_row)
    chapter["paragraphs"] = json.loads(chapter["content_json"])
    
    conn.close()
    return novel, chapter

def update_reading_progress(slug: str, chapter_number: int, percent: float):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE novels 
        SET last_read_chapter = ?, last_read_percent = ?
        WHERE slug = ?
    """, (chapter_number, percent, slug))
    conn.commit()
    conn.close()

def delete_novel(slug: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM novels WHERE slug = ?", (slug,))
    conn.commit()
    conn.close()

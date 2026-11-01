import sqlite3
import json
import re
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "data", "library.db")

if not os.path.exists(DB_PATH):
    print(f"Database not found at {DB_PATH}")
    exit(0)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Get the existing novel 4
cursor.execute('SELECT content_json FROM chapters WHERE novel_id = 4 AND chapter_number = 1')
row = cursor.fetchone()
if not row:
    print("Novel 4 not found.")
    exit(0)

content = json.loads(row[0])

# Also get epilogue if exists
cursor.execute('SELECT content_json FROM chapters WHERE novel_id = 4 AND chapter_number = 2')
row_ep = cursor.fetchone()
if row_ep:
    content.extend(json.loads(row_ep[0]))

CHAPTER_PATTERNS = [
    re.compile(r'^\s*\[\s*(?:chapter\s+)?(\d+|[ivxlcdm]+)\s*\](?:\s*(.*))?$', re.IGNORECASE),
    re.compile(r'^\s*(?:chapter|ch\.)\s+(\d+|[ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    re.compile(r'^\s*(?:chapter)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    re.compile(r'^\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*$', re.IGNORECASE),
    re.compile(r'^\s*(prologue|epilogue|interlude|introduction|afterword|preface)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
]

PAGE_NUMBER_PATTERN = re.compile(r'^(?:page\s+)?[-–—]?\s*\d+\s*[-–—]?$', re.IGNORECASE)

def check_heading(text):
    t = text.strip()
    if PAGE_NUMBER_PATTERN.match(t):
        return None, t

    m_bracket = re.match(r'^\s*\[\s*(\d+)\s*\]\s*(.*)$', t)
    if m_bracket:
        ch_num = m_bracket.group(1)
        rest = m_bracket.group(2)
        return f'Chapter {ch_num}', rest

    if len(t) <= 80:
        for pat in CHAPTER_PATTERNS:
            m = pat.match(t)
            if m:
                return t, ''
    return None, t

chapters = []
cur_title = 'Prologue'
cur_paras = []

for p in content:
    heading, rest = check_heading(p)
    if heading:
        if cur_paras:
            chapters.append({
                'title': cur_title,
                'content': list(cur_paras),
                'word_count': sum(len(x.split()) for x in cur_paras)
            })
            cur_paras = []
        cur_title = heading
        if rest and len(rest.strip()) > 0:
            cur_paras.append(rest.strip())
    else:
        cur_paras.append(p)

if cur_paras:
    chapters.append({
        'title': cur_title,
        'content': list(cur_paras),
        'word_count': sum(len(x.split()) for x in cur_paras)
    })

print(f"Reparsing Novel 4 into {len(chapters)} chapters...")

# Clear old chapters for novel_id 4
cursor.execute('DELETE FROM chapters WHERE novel_id = 4')

# Insert the split chapters
for i, ch in enumerate(chapters):
    cursor.execute('''
        INSERT INTO chapters (novel_id, chapter_number, title, content_json, word_count)
        VALUES (?, ?, ?, ?, ?)
    ''', (
        4,
        i + 1,
        ch['title'],
        json.dumps(ch['content'], ensure_ascii=False),
        ch['word_count']
    ))

# Update total_chapters in novels table
cursor.execute('UPDATE novels SET total_chapters = ? WHERE id = 4', (len(chapters),))
conn.commit()
conn.close()

print(f"Successfully updated novel 4 with {len(chapters)} distinct chapters!")

import re
import os
import io
from typing import List, Dict, Tuple, Optional
from PIL import Image

CHAPTER_PATTERNS = [
    # Bracketed numbers: [ 1 ], [ 01 ], [1], [ Chapter 1 ]
    re.compile(r'^\s*\[\s*(?:chapter\s+)?(\d+|[ivxlcdm]+)\s*\](?:\s*(.*))?$', re.IGNORECASE),
    # Standard: Chapter 1: The Beginning / Chapter 1 - The Beginning / Ch. 1
    re.compile(r'^\s*(?:chapter|ch\.)\s+(\d+|[ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    # Words: Chapter One / Chapter Two
    re.compile(r'^\s*(?:chapter)\s+(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    # Standalone number words on line: ONE, TWO, THREE...
    re.compile(r'^\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty)\s*$', re.IGNORECASE),
    # Prologue / Epilogue / Interlude
    re.compile(r'^\s*(prologue|epilogue|interlude|introduction|afterword|preface)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    # Volume 1 Chapter 1 / Act 1 / Part 1
    re.compile(r'^\s*(?:volume\s+\d+\s+)?(?:act|chapter|part|book)\s+(\d+|[ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    # Standalone numbers on a single line: 1, 2, 3...
    re.compile(r'^\s*(\d{1,3})\s*$'),
]

def clean_lines_into_paragraphs(lines: List[str]) -> List[str]:
    """
    Takes raw lines from PDF pages, removes running headers/footers,
    merges lines broken across wrap boundaries, and fixes soft hyphens.
    """
    paragraphs = []
    current_para = []

    for raw_line in lines:
        line = raw_line.strip()
        
        # Skip empty lines (paragraph boundaries)
        if not line:
            if current_para:
                para_text = " ".join(current_para).strip()
                # Fix hyphenated words: "tele-\nphone" -> "telephone"
                para_text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', para_text)
                para_text = re.sub(r'\s+', ' ', para_text)
                if len(para_text) > 0:
                    paragraphs.append(para_text)
                current_para = []
            continue

        # Skip isolated page numbers: "14", "Page 14", "- 14 -"
        if re.match(r'^(?:page\s+)?[-–—]?\s*\d+\s*[-–—]?$', line, re.IGNORECASE):
            continue

        current_para.append(line)

    if current_para:
        para_text = " ".join(current_para).strip()
        para_text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', para_text)
        para_text = re.sub(r'\s+', ' ', para_text)
        if len(para_text) > 0:
            paragraphs.append(para_text)

    return paragraphs

def check_heading(line: str) -> Tuple[Optional[str], str]:
    """
    Checks if a text line contains or starts with a chapter heading.
    Returns: (heading_title_or_None, remaining_text)
    """
    t = line.strip()
    
    # 1. Check if line starts with bracketed chapter like: '[ 1 ] THE TRANSFORMATION...' or '[ 1 ]'
    m_bracket = re.match(r'^\s*\[\s*(\d+|[ivxlcdm]+)\s*\]\s*(.*)$', t, re.IGNORECASE)
    if m_bracket:
        ch_num = m_bracket.group(1)
        rest = m_bracket.group(2)
        return f'Chapter {ch_num}', rest

    # 2. Check if whole line matches standard chapter heading
    if len(t) <= 85:
        for pat in CHAPTER_PATTERNS:
            m = pat.match(t)
            if m:
                return t, ''

    return None, t

def extract_pdf_toc_bookmarks(file_path: str) -> List[Tuple[str, int]]:
    """
    Extracts outline/bookmarks from PDF using pypdfium2 and pypdf.
    Returns list of (title, 0-indexed page_number).
    """
    entries = []
    
    # 1. Try pypdfium2 first
    try:
        import pypdfium2
        pdf = pypdfium2.PdfDocument(file_path)
        for bm in pdf.get_toc():
            title = bm.get_title().strip() if bm.get_title() else ""
            dest = bm.get_dest()
            if dest and title:
                page_idx = dest.get_index()
                if page_idx is not None and page_idx >= 0:
                    entries.append((title, page_idx))
    except Exception as e:
        print(f"pypdfium2 TOC extraction notice: {e}")

    # 2. Try pypdf if pypdfium2 returned empty
    if not entries:
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            def traverse(items):
                results = []
                for it in items:
                    if isinstance(it, list):
                        results.extend(traverse(it))
                    elif hasattr(it, 'title'):
                        try:
                            page_idx = reader.get_destination_page_number(it)
                            t = str(it.title).strip()
                            if t and page_idx is not None:
                                results.append((t, page_idx))
                        except Exception:
                            pass
                return results
            if reader.outline:
                entries = traverse(reader.outline)
        except Exception as e:
            print(f"pypdf outline extraction notice: {e}")

    # Deduplicate and sort by page number
    sorted_entries = sorted(entries, key=lambda x: x[1])
    filtered = []
    seen_pages = set()
    for title, page in sorted_entries:
        if page not in seen_pages:
            filtered.append((title, page))
            seen_pages.add(page)
            
    return filtered

def extract_pdf_chapters(file_path: str) -> Tuple[str, List[Dict[str, any]], Optional[bytes]]:
    """
    Extracts text from PDF, accurately divides it into chapters based on:
    1. Digital Table of Contents (Outline / Bookmarks)
    2. Heading Pattern Scanner (supports [1], Chapter 1, Words, etc.)
    3. Proportional Word Chunking (fallback)

    Returns: (novel_title, chapters_list, cover_image_bytes)
    """
    import pypdf
    import pypdfium2

    reader = pypdf.PdfReader(file_path)
    total_pages = len(reader.pages)

    # 1. Title detection
    title = os.path.splitext(os.path.basename(file_path))[0]
    if reader.metadata and reader.metadata.title:
        meta_title = reader.metadata.title.strip()
        if meta_title and len(meta_title) < 120 and meta_title.lower() != "untitled":
            title = meta_title

    # 2. Cover image extraction from page 0
    cover_bytes = None
    try:
        pdf_doc = pypdfium2.PdfDocument(file_path)
        if len(pdf_doc) > 0:
            first_page = pdf_doc[0]
            pil_image = first_page.render(scale=1.5).to_pil()
            img_buffer = io.BytesIO()
            pil_image.save(img_buffer, format="JPEG", quality=85)
            cover_bytes = img_buffer.getvalue()
    except Exception as e:
        print(f"Cover extraction note: {e}")

    # Extract raw text per page
    pages_text = []
    for page in reader.pages:
        try:
            pages_text.append(page.extract_text() or "")
        except Exception:
            pages_text.append("")

    # =========================================================================
    # STRATEGY 1: Split according to the PDF's internal Table of Contents (Index)
    # =========================================================================
    toc_bookmarks = extract_pdf_toc_bookmarks(file_path)
    if len(toc_bookmarks) >= 2:
        print(f"[PDF Parser] Found {len(toc_bookmarks)} chapter bookmarks in PDF Index! Slicing chapters by index.")
        chapters = []
        for i, (bm_title, start_page) in enumerate(toc_bookmarks):
            end_page = toc_bookmarks[i + 1][1] if (i + 1) < len(toc_bookmarks) else total_pages
            start_page = max(0, min(start_page, total_pages - 1))
            end_page = max(start_page + 1, min(end_page, total_pages))

            chapter_lines = []
            for p_num in range(start_page, end_page):
                p_text = pages_text[p_num]
                for l in p_text.splitlines():
                    chapter_lines.append(l)
                chapter_lines.append("")

            paragraphs = clean_lines_into_paragraphs(chapter_lines)
            word_count = sum(len(p.split()) for p in paragraphs)
            if word_count > 0:
                chapters.append({
                    "number": len(chapters) + 1,
                    "title": bm_title,
                    "content": paragraphs,
                    "word_count": word_count
                })

        if chapters:
            return title, chapters, cover_bytes

    # =========================================================================
    # STRATEGY 2: Scan for Chapter Headings Line by Line across all pages
    # =========================================================================
    print("[PDF Parser] Scanning content lines for chapter markers ([1], Chapter X, Prologue, etc.)...")
    all_lines = []
    for p_text in pages_text:
        for l in p_text.splitlines():
            all_lines.append(l.strip())
        all_lines.append("")

    chapters = []
    cur_title = "Prologue"
    cur_lines = []
    found_any_chapter_heading = False

    for line in all_lines:
        heading, rest = check_heading(line)
        if heading:
            found_any_chapter_heading = True
            if cur_lines:
                paras = clean_lines_into_paragraphs(cur_lines)
                if paras:
                    chapters.append({
                        "number": len(chapters) + 1,
                        "title": cur_title,
                        "content": paras,
                        "word_count": sum(len(p.split()) for p in paras)
                    })
                cur_lines = []
            cur_title = heading
            if rest and len(rest.strip()) > 0:
                cur_lines.append(rest.strip())
        else:
            cur_lines.append(line)

    # Flush final chapter
    if cur_lines:
        paras = clean_lines_into_paragraphs(cur_lines)
        if paras:
            chapters.append({
                "number": len(chapters) + 1,
                "title": cur_title,
                "content": paras,
                "word_count": sum(len(p.split()) for p in paras)
            })

    # =========================================================================
    # STRATEGY 3: Fallback Chunking (~2200 words/chapter) if single giant block
    # =========================================================================
    if not found_any_chapter_heading or (len(chapters) == 1 and chapters[0]["word_count"] > 3500):
        print("[PDF Parser] Falling back to intelligent section chunking so content is comfortably readable.")
        all_paras = []
        for ch in chapters:
            all_paras.extend(ch["content"])
        if not all_paras:
            all_paras = clean_lines_into_paragraphs(all_lines)

        chunked_chapters = []
        cur_chunk = []
        cur_words = 0
        ch_idx = 1
        for p in all_paras:
            w = len(p.split())
            cur_chunk.append(p)
            cur_words += w
            if cur_words >= 2200:
                chunked_chapters.append({
                    "number": ch_idx,
                    "title": f"Chapter {ch_idx}",
                    "content": list(cur_chunk),
                    "word_count": cur_words
                })
                cur_chunk = []
                cur_words = 0
                ch_idx += 1
        if cur_chunk:
            chunked_chapters.append({
                "number": ch_idx,
                "title": f"Chapter {ch_idx}",
                "content": cur_chunk,
                "word_count": cur_words
            })
        chapters = chunked_chapters

    return title, chapters, cover_bytes

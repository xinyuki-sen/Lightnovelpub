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
]

PAGE_NUMBER_PATTERN = re.compile(r'^(?:page\s+)?[-–—]?\s*\d+\s*[-–—]?$', re.IGNORECASE)

IGNORE_FRONTMATTER_TITLES = {
    "cover", "title page", "title", "copyright", "also in series",
    "contents", "table of contents", "dedication", "acknowledgments",
    "acknowledgements", "about the author", "author's note"
}

def clean_watermarks_and_dropcaps(text: str) -> str:
    """
    Strips OceanofPDF.com watermarks and decodes PDF drop-cap artifacts like
    'R C H A P T E R O N E andidly' -> 'Randidly Ghosthound'.
    """
    # 1. Clean OceanofPDF watermark variations
    text = re.sub(r'\s*(?:https?://)?(?:www\.)?oceanofpdf\.com\s*', ' ', text, flags=re.IGNORECASE)
    
    # 2. Fix Drop Cap Chapter headings in fantasy/LitRPG PDFs
    def dropcap_sub(m):
        cap = m.group(1)
        rest = m.group(2)
        return cap + rest
    text = re.sub(r'^([A-Z])\s+C\s*H\s*A\s*P\s*T\s*E\s*R\s+[A-Z\s]+\s+([a-z]\w+)', dropcap_sub, text)
    
    # 3. Clean multiple spaces
    text = re.sub(r'[ \t]+', ' ', text).strip()
    return text

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
                para_text = clean_watermarks_and_dropcaps(para_text)
                if len(para_text) > 0:
                    paragraphs.append(para_text)
                current_para = []
            continue

        # Skip isolated page numbers: "14", "Page 14", "- 14 -"
        if PAGE_NUMBER_PATTERN.match(line):
            continue

        current_para.append(line)

    if current_para:
        para_text = " ".join(current_para).strip()
        para_text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', para_text)
        para_text = re.sub(r'\s+', ' ', para_text)
        para_text = clean_watermarks_and_dropcaps(para_text)
        if len(para_text) > 0:
            paragraphs.append(para_text)

    return format_novel_paragraphs(paragraphs)

def format_novel_paragraphs(paragraphs: List[str]) -> List[str]:
    """
    Intelligently splits monolithic paragraphs into well-spaced dialogue,
    MC narrative, MC inner thoughts, and System HUD blocks with clean spacing.
    """
    structured_paras = []

    for p in paragraphs:
        t = clean_watermarks_and_dropcaps(p.strip())
        if not t:
            continue

        # 1. Split before known LitRPG & System Triggers
        t = re.sub(r'(\bNew\s+achievement!\s*)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bReward:\s*)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bCongratulations!\s*)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bCrawler\s*#\d+)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bLevel:\s*(?:N/A|\d+))', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bLevel\s+\d+\.\s*(?:Race:|Class:|Small,|Engineers\.|\b))', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bHealth\([^)]*\):)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bMana\([^)]*\):)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bStam\([^)]*\):)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bVitality:\s*\d+)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bGoblin\s+Murder\s+Dozer)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bGoblin\s+Engineer\.\s+Level)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bGoblin\.\s+Level)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bYou\s+have\s+been\s+designated\s+Crawler)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bPlease\s+pay\s+careful\s+attention\b)', r'\n\n\1', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bDungeon\s+Floor\s+\d+\.\s*Time\s+to\s+Level\s+Collapse:[^\.]+\.)', r'\n\n\1\n\n', t, flags=re.IGNORECASE)
        t = re.sub(r'(\bYour\s+Skill\s+.*?\s+has\s+grown\s+to\s+Level\s+\d+!)', r'\n\n\1\n\n', t, flags=re.IGNORECASE)

        # 2. Split Dialogue:
        # Before opening quote preceded by terminal sentence punctuation
        t = re.sub(r'([.!?])\s*([“"][A-Z])', r'\1\n\n\2', t)
        # After closing quote followed by narrative sentence starter
        t = re.sub(r'([”"][.!?]?)\s+([A-Z][a-z]+(?:\s+[a-z]+){0,3}\s+[a-z]+)', r'\1\n\n\2', t)

        for chunk in t.split('\n\n'):
            chunk = clean_watermarks_and_dropcaps(chunk.strip())
            if chunk:
                # Merge 'Reward:' directly into preceding achievement card
                if re.match(r'^Reward:\s*', chunk, re.IGNORECASE) and structured_paras:
                    structured_paras[-1] += "\n" + chunk
                else:
                    structured_paras.append(chunk)

    return structured_paras

def check_heading(line: str) -> Tuple[Optional[str], str]:
    """
    Checks if a text line contains or starts with a chapter heading.
    Returns: (heading_title_or_None, remaining_text)
    """
    t = line.strip()
    
    # Ignore isolated numbers (they are page numbers, not chapters)
    if PAGE_NUMBER_PATTERN.match(t):
        return None, t

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
    pdf = None
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
    finally:
        if pdf is not None:
            try:
                pdf.close()
            except Exception:
                pass

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

    Filters out front-matter junk (Copyright, Contents, Cover, Also In Series).
    Returns: (novel_title, chapters_list, cover_image_bytes)
    """
    import pypdf
    import pypdfium2

    reader = pypdf.PdfReader(file_path)
    total_pages = len(reader.pages)

    # 1. Title detection
    title = os.path.splitext(os.path.basename(file_path))[0]
    # Clean leading underscore or oceanofpdf prefix
    title = re.sub(r'^_?(?:oceanofpdf\.com_)?', '', title, flags=re.IGNORECASE).replace('_', ' ').title()
    if reader.metadata and reader.metadata.title:
        meta_title = reader.metadata.title.strip()
        if meta_title and len(meta_title) < 120 and meta_title.lower() != "untitled":
            title = meta_title

    # 2. Cover image extraction from page 0 (safely closed to avoid Windows file lock)
    cover_bytes = None
    pdf_doc = None
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
    finally:
        if pdf_doc is not None:
            try:
                pdf_doc.close()
            except Exception:
                pass

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
        raw_chapters = []
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
                raw_chapters.append({
                    "title": bm_title,
                    "content": paragraphs,
                    "word_count": word_count
                })

        # Filter out front-matter (Copyright, Contents, Dedication, Cover, Also in series)
        final_chapters = []
        for ch in raw_chapters:
            t_lower = ch["title"].lower().strip()
            w = ch["word_count"]
            if t_lower in IGNORE_FRONTMATTER_TITLES or w < 18:
                continue
            ch["number"] = len(final_chapters) + 1
            final_chapters.append(ch)

        if final_chapters:
            return title, final_chapters, cover_bytes

    # =========================================================================
    # STRATEGY 2: Scan for Chapter Headings Line by Line across all pages
    # =========================================================================
    print("[PDF Parser] Scanning content lines for chapter markers ([1], Chapter X, Prologue, etc.)...")
    all_lines = []
    for p_text in pages_text:
        for l in p_text.splitlines():
            line_str = l.strip()
            # Filter out running page numbers during scanning
            if not PAGE_NUMBER_PATTERN.match(line_str):
                all_lines.append(line_str)
        all_lines.append("")

    raw_chapters = []
    cur_title = "Prologue"
    cur_lines = []
    found_any_chapter_heading = False

    for line in all_lines:
        heading, rest = check_heading(line)
        if heading:
            if cur_lines:
                paras = clean_lines_into_paragraphs(cur_lines)
                if paras:
                    total_w = sum(len(p.split()) for p in paras)
                    combined = " ".join(paras).lower()
                    # If this is text before the first chapter heading and it's copyright/publisher front-matter, skip it
                    is_frontmatter = (not found_any_chapter_heading) and (total_w < 400 and any(k in combined for k in ["copyright", "all rights reserved", "isbn", "published by", "dandy house"]))
                    if not is_frontmatter:
                        raw_chapters.append({
                            "title": cur_title,
                            "content": paras,
                            "word_count": total_w
                        })
                cur_lines = []
            found_any_chapter_heading = True
            cur_title = heading
            if rest and len(rest.strip()) > 0:
                cur_lines.append(rest.strip())
        else:
            cur_lines.append(line)

    # Flush final chapter
    if cur_lines:
        paras = clean_lines_into_paragraphs(cur_lines)
        if paras:
            raw_chapters.append({
                "title": cur_title,
                "content": paras,
                "word_count": sum(len(p.split()) for p in paras)
            })

    # Filter out non-story junk
    final_chapters = []
    for ch in raw_chapters:
        t_lower = ch["title"].lower().strip()
        w = ch["word_count"]
        if t_lower in IGNORE_FRONTMATTER_TITLES or w < 18:
            continue
        ch["number"] = len(final_chapters) + 1
        final_chapters.append(ch)

    if final_chapters and (len(final_chapters) > 1 or found_any_chapter_heading):
        return title, final_chapters, cover_bytes

    # =========================================================================
    # STRATEGY 3: Equal-Word Fallback Chunking (If PDF had no headings/TOC)
    # =========================================================================
    print("[PDF Parser] No explicit chapter markers found. Using proportional chunking...")
    all_paras = clean_lines_into_paragraphs(all_lines)
    total_words = sum(len(p.split()) for p in all_paras)

    if total_words < 500:
        return title, [{
            "number": 1,
            "title": "Complete Novel Text",
            "content": all_paras,
            "word_count": total_words
        }], cover_bytes

    WORDS_PER_CHUNK = 2500
    chunk_paras = []
    chunk_word_acc = 0
    fallback_chapters = []
    part_idx = 1

    for p in all_paras:
        w_len = len(p.split())
        chunk_paras.append(p)
        chunk_word_acc += w_len

        if chunk_word_acc >= WORDS_PER_CHUNK:
            fallback_chapters.append({
                "number": part_idx,
                "title": f"Chapter {part_idx}",
                "content": chunk_paras,
                "word_count": chunk_word_acc
            })
            part_idx += 1
            chunk_paras = []
            chunk_word_acc = 0

    if chunk_paras:
        fallback_chapters.append({
            "number": part_idx,
            "title": f"Chapter {part_idx}",
            "content": chunk_paras,
            "word_count": chunk_word_acc
        })

    return title, fallback_chapters, cover_bytes

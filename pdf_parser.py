import re
import os
import io
import time
import base64
from typing import List, Dict, Tuple, Optional
from PIL import Image

CHAPTER_PATTERNS = [
    # Bracketed numbers: [ 1 ], [ 01 ], [1], [ Chapter 1 ]
    re.compile(r'^\s*\[\s*(?:chapter\s+)?(\d+|[ivxlcdm]+)\s*\](?:\s*(.*))?$', re.IGNORECASE),
    # Standard: Chapter 1: The Beginning / Chapter 1 - The Beginning / Ch. 1 / Chapter 1
    re.compile(r'^\s*(?:chapter|ch\.)\s+(\d+|[ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    # Words: Chapter One / Chapter Ninety-Eight
    re.compile(r'^\s*(?:chapter)\s+([a-z\-\s]+)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
    # Standalone number words or headings on line
    re.compile(r'^\s*(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|prologue|epilogue|interlude|introduction|preface)\s*$', re.IGNORECASE),
    # Volume 1 Chapter 1 / Act 1 / Part 1 / Book 1
    re.compile(r'^\s*(?:volume\s+\d+\s+)?(?:act|chapter|part|book)\s+(\d+|[ivxlcdm]+)(?:[\s:\-–—\.]+(.*))?$', re.IGNORECASE),
]

PAGE_NUMBER_PATTERN = re.compile(r'^(?:page\s+)?[-–—]?\s*\d+\s*[-–—]?$', re.IGNORECASE)

IGNORE_TITLES = {
    "cover", "title page", "title", "copyright", "also in series",
    "contents", "table of contents", "dedication", "acknowledgments",
    "acknowledgements", "about the author", "author's note",
    "thank you for reading", "groups", "litrpg", "about the publisher",
    "newsletter", "patreon", "discord", "other books", "preview of",
    "sneak peek", "review", "connect with", "glossary", "advertisement"
}

def is_ignored_title(title: str, novel_title: str) -> bool:
    t = title.strip().lower()
    nt = novel_title.strip().lower()
    if t == nt:
        return True
    t_clean = re.sub(r'[^a-z0-9\s]', '', t).strip()
    for ign in IGNORE_TITLES:
        ign_clean = re.sub(r'[^a-z0-9\s]', '', ign).strip()
        if t_clean == ign_clean or t_clean.startswith(ign_clean):
            return True
    return False

def clean_watermarks(text: str) -> str:
    """Strips OceanofPDF and common piracy banner watermarks and multiple spaces."""
    text = re.sub(r'\s*(?:https?://)?(?:www\.)?oceanofpdf\.com\s*', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'\s*(?:https?://)?(?:www\.)?subscribepage\.com/\S+\s*', ' ', text, flags=re.IGNORECASE)
    text = re.sub(r'[ \t]+', ' ', text).strip()
    return text

def fix_pdf_dropcap_lines(lines: List[str]) -> List[str]:
    """
    Intelligently stitches drop-cap letters separated by decorative headings in PDFs.
    Example:
      'H'
      'CHAPTER NINETY-EIGHT'
      'elen wanted to be sympathetic...'
      -> 'Helen wanted to be sympathetic...'
    """
    new_lines = []
    i = 0
    header_regex = re.compile(r'^(?:(?:chapter|ch\.|act|book|volume)\s+[A-Za-z0-9\s\-–—]+|epilogue|prologue|interlude)\s*$', re.IGNORECASE)

    while i < len(lines):
        line = lines[i].strip()
        # Case A: 'H' -> 'CHAPTER ...' -> 'elen ...'
        if len(line) == 1 and line.isupper() and (i + 2) < len(lines):
            next_line = lines[i + 1].strip()
            third_line = lines[i + 2].strip()
            if header_regex.match(next_line) and third_line and third_line[0].islower():
                new_lines.append(line + third_line)
                i += 3
                continue
        # Case B: 'CHAPTER ...' -> 'H' -> 'elen ...'
        if header_regex.match(line) and (i + 2) < len(lines):
            next_line = lines[i + 1].strip()
            third_line = lines[i + 2].strip()
            if len(next_line) == 1 and next_line.isupper() and third_line and third_line[0].islower():
                new_lines.append(next_line + third_line)
                i += 3
                continue
        # Case C: 'H' -> 'elen ...'
        if len(line) == 1 and line.isupper() and (i + 1) < len(lines):
            next_line = lines[i + 1].strip()
            if next_line and next_line[0].islower():
                new_lines.append(line + next_line)
                i += 2
                continue

        new_lines.append(lines[i])
        i += 1

    return new_lines

def clean_lines_into_paragraphs(lines: List[str]) -> List[str]:
    """
    Takes raw lines from PDF pages, fixes drop caps, joins wrapped sentences,
    and returns well-formatted novel paragraphs.
    """
    lines = fix_pdf_dropcap_lines(lines)
    paragraphs = []
    current_para = []

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if current_para:
                para_text = " ".join(current_para).strip()
                para_text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', para_text)
                para_text = re.sub(r'\s+', ' ', para_text)
                para_text = clean_watermarks(para_text)
                if para_text:
                    paragraphs.append(para_text)
                current_para = []
            continue

        if PAGE_NUMBER_PATTERN.match(line):
            continue

        current_para.append(line)

    if current_para:
        para_text = " ".join(current_para).strip()
        para_text = re.sub(r'(\w+)-\s+(\w+)', r'\1\2', para_text)
        para_text = re.sub(r'\s+', ' ', para_text)
        para_text = clean_watermarks(para_text)
        if para_text:
            paragraphs.append(para_text)

    return format_novel_paragraphs(paragraphs)

def format_novel_paragraphs(paragraphs: List[str]) -> List[str]:
    """Splits dialogue and system alerts into clean paragraphs."""
    structured_paras = []
    for p in paragraphs:
        t = clean_watermarks(p.strip())
        if not t:
            continue

        # LitRPG triggers
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

        # Dialogue separation
        t = re.sub(r'([.!?])\s*([“"][A-Z])', r'\1\n\n\2', t)
        t = re.sub(r'([”"][.!?]?)\s+([A-Z][a-z]+(?:\s+[a-z]+){0,3}\s+[a-z]+)', r'\1\n\n\2', t)

        for chunk in t.split('\n\n'):
            chunk = clean_watermarks(chunk.strip())
            if chunk:
                if re.match(r'^Reward:\s*', chunk, re.IGNORECASE) and structured_paras:
                    structured_paras[-1] += "\n" + chunk
                else:
                    structured_paras.append(chunk)

    return structured_paras

def check_heading(line: str) -> Tuple[Optional[str], str]:
    t = line.strip()
    if PAGE_NUMBER_PATTERN.match(t):
        return None, t

    m_bracket = re.match(r'^\s*\[\s*(\d+|[ivxlcdm]+)\s*\]\s*(.*)$', t, re.IGNORECASE)
    if m_bracket:
        ch_num = m_bracket.group(1)
        rest = m_bracket.group(2)
        return f'Chapter {ch_num}', rest

    if len(t) <= 85:
        for pat in CHAPTER_PATTERNS:
            m = pat.match(t)
            if m:
                return t, ''

    return None, t

def extract_pdf_toc_bookmarks(file_path: str) -> List[Tuple[str, int]]:
    entries = []
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

    sorted_entries = sorted(entries, key=lambda x: x[1])
    filtered = []
    seen_pages = set()
    for title, page in sorted_entries:
        if page not in seen_pages:
            filtered.append((title, page))
            seen_pages.add(page)

    return filtered

def sanitize_title_and_author(filename_or_title: str, detected_author: Optional[str] = None) -> Tuple[str, str]:
    """
    Sanitizes book titles and extracts author names:
    - Strips OceanofPDF and common piracy watermarks.
    - Resolves 'Title - Author', 'Title by Author', or 'Title 1 Author' patterns.
    - Applies smart title casing preserving minor prepositions and conjunctions.
    """
    base = os.path.basename(filename_or_title)
    if re.search(r'\.(pdf|epub|mobi|azw3?|txt)$', base, flags=re.IGNORECASE):
        base = re.sub(r'\.(pdf|epub|mobi|azw3?|txt)$', '', base, flags=re.IGNORECASE)

    title = base
    title = re.sub(r'(?i)\[\s*oceanofpdf(?:\.com)?\s*\]', '', title)
    title = re.sub(r'(?i)\(\s*oceanofpdf(?:\.com)?\s*\)', '', title)
    title = re.sub(r'(?i)(?:https?://)?(?:www\.)?oceanofpdf(?:\.com)?', '', title)
    title = re.sub(r'[_\s]+', ' ', title).strip()

    author = (detected_author or '').strip()
    if author:
        author = re.sub(r'(?i)(?:https?://)?(?:www\.)?oceanofpdf(?:\.com)?', '', author).strip()

    if not author or author.lower() in ("unknown", "unknown author", ""):
        m = re.match(r'^(.*?)\s*[-–—]\s*([A-Za-z0-9\s.]{2,30})$', title)
        if m:
            title = m.group(1).strip()
            author = m.group(2).strip()
        else:
            m = re.match(r'(?i)^(.*?)\s+by\s+([A-Za-z0-9\s.]{2,30})$', title)
            if m:
                title = m.group(1).strip()
                author = m.group(2).strip()
            else:
                m = re.match(r'^(.*?\b(?:\d+|[IVXLCDM]+))\s+([A-Z][a-z]{2,20})$', title)
                if m:
                    title = m.group(1).strip()
                    author = m.group(2).strip()

    words = title.split()
    minor_words = {'and', 'of', 'the', 'in', 'on', 'at', 'to', 'for', 'with', 'a', 'an'}
    titled_words = [w.capitalize() if i == 0 or w.lower() not in minor_words else w.lower() for i, w in enumerate(words)]
    title = ' '.join(titled_words) if titled_words else "Untitled Novel"
    author = author.title() if author else "Unknown Author"
    return title, author

def extract_pdf_chapters(file_path: str) -> Tuple[str, str, List[Dict[str, any]], Optional[bytes], str]:
    """
    High-Speed PDF Chapter Slicing Engine (Chromium PDFium Native):
    1. Extracts full document in ~2s using pypdfium2 (10x speedup over pypdf).
    2. Slices chapters cleanly by digital TOC bookmarks or line scanner.
    3. Strips drop-cap headings, watermarks, frontmatter & backmatter.
    4. Generates both JPEG binary and Base64 Data URL for persistent offline display.
    Returns: (novel_title, detected_author, chapters_list, cover_bytes, cover_data_url)
    """
    import pypdfium2
    import pypdf

    # 1. Clean Title & Author detection
    raw_name = os.path.splitext(os.path.basename(file_path))[0]
    meta_author = ""
    try:
        reader = pypdf.PdfReader(file_path)
        if reader.metadata:
            meta_title = reader.metadata.get('/Title') or ''
            meta_author = reader.metadata.get('/Author') or ''
            if meta_title and len(meta_title.strip()) > 3:
                raw_name = meta_title.strip()
    except Exception:
        pass
    title, author = sanitize_title_and_author(raw_name, meta_author)

    # 2. Extract cover image & Data URL from page 0
    cover_bytes = None
    cover_data_url = ""
    pdf_doc = None
    total_pages = 0
    try:
        pdf_doc = pypdfium2.PdfDocument(file_path)
        total_pages = len(pdf_doc)
        if total_pages > 0:
            first_page = pdf_doc[0]
            pil_image = first_page.render(scale=1.2).to_pil()
            first_page.close()
            # Compress cover to high-quality lightweight JPEG (~45KB)
            img_buffer = io.BytesIO()
            pil_image.save(img_buffer, format="JPEG", quality=80, optimize=True)
            cover_bytes = img_buffer.getvalue()
            b64_str = base64.b64encode(cover_bytes).decode('ascii')
            cover_data_url = f"data:image/jpeg;base64,{b64_str}"
    except Exception as e:
        print(f"[PDF Parser] Cover extraction note: {e}")
    finally:
        if pdf_doc is not None:
            try:
                pdf_doc.close()
            except Exception:
                pass

    # 3. High-Speed Page Text Extraction via pypdfium2 with fallback to pypdf
    pages_text = []
    try:
        pdf_doc = pypdfium2.PdfDocument(file_path)
        for page in pdf_doc:
            tp = page.get_textpage()
            pages_text.append(tp.get_text_range() or "")
            tp.close()
            page.close()
    except Exception as e:
        print(f"[PDF Parser] Fast pypdfium2 text extraction fallback: {e}")
        try:
            reader = pypdf.PdfReader(file_path)
            pages_text = [p.extract_text() or "" for p in reader.pages]
            if not total_pages:
                total_pages = len(pages_text)
        except Exception as e2:
            print(f"[PDF Parser] pypdf fallback error: {e2}")
    finally:
        if pdf_doc is not None:
            try:
                pdf_doc.close()
            except Exception:
                pass

    if not total_pages:
        total_pages = len(pages_text)

    # =========================================================================
    # STRATEGY 1: Split according to the PDF's internal Table of Contents (Index)
    # =========================================================================
    toc_bookmarks = extract_pdf_toc_bookmarks(file_path)
    if len(toc_bookmarks) >= 2:
        print(f"[PDF Parser] Found {len(toc_bookmarks)} chapter bookmarks in PDF Index! Slicing chapters by index.")
        raw_chapters = []
        for i, (bm_title, start_page) in enumerate(toc_bookmarks):
            if is_ignored_title(bm_title, title):
                continue
            end_page = toc_bookmarks[i + 1][1] if (i + 1) < len(toc_bookmarks) else total_pages
            start_page = max(0, min(start_page, total_pages - 1))
            end_page = max(start_page + 1, min(end_page, total_pages))

            chapter_lines = []
            for p_num in range(start_page, end_page):
                if p_num < len(pages_text):
                    p_text = pages_text[p_num]
                    for l in p_text.splitlines():
                        chapter_lines.append(l)
                    chapter_lines.append("")

            paragraphs = clean_lines_into_paragraphs(chapter_lines)
            word_count = sum(len(p.split()) for p in paragraphs)
            
            # Backmatter filter: Drop short promotional pages with links
            full_str = " ".join(paragraphs).lower()
            if any(k in full_str for k in ["subscribepage.com", "discord server", "facebook | instagram", "amazon product page"]) and word_count < 250:
                continue
            if word_count < 40:
                continue

            raw_chapters.append({
                "title": bm_title,
                "content": paragraphs,
                "word_count": word_count
            })

        # Final contiguous chapter numbering
        final_chapters = []
        for idx, ch in enumerate(raw_chapters):
            ch["number"] = idx + 1
            final_chapters.append(ch)

        if final_chapters:
            return title, author, final_chapters, cover_bytes, cover_data_url

    # =========================================================================
    # STRATEGY 2: Scan for Chapter Headings Line by Line across all pages
    # =========================================================================
    print("[PDF Parser] Scanning content lines for chapter markers ([1], Chapter X, Prologue, etc.)...")
    all_lines = []
    for p_text in pages_text:
        for l in p_text.splitlines():
            line_str = l.strip()
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
                    is_frontmatter = (not found_any_chapter_heading) and (total_w < 400 and any(k in combined for k in ["copyright", "all rights reserved", "isbn", "published by"]))
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

    if cur_lines:
        paras = clean_lines_into_paragraphs(cur_lines)
        if paras:
            raw_chapters.append({
                "title": cur_title,
                "content": paras,
                "word_count": sum(len(p.split()) for p in paras)
            })

    final_chapters = []
    for ch in raw_chapters:
        if is_ignored_title(ch["title"], title) or ch["word_count"] < 40:
            continue
        ch["number"] = len(final_chapters) + 1
        final_chapters.append(ch)

    if final_chapters and (len(final_chapters) > 1 or found_any_chapter_heading):
        return title, author, final_chapters, cover_bytes, cover_data_url

    # =========================================================================
    # STRATEGY 3: Equal-Word Fallback Chunking (If PDF had no headings/TOC)
    # =========================================================================
    print("[PDF Parser] No explicit chapter markers found. Using proportional chunking...")
    all_paras = clean_lines_into_paragraphs(all_lines)
    total_words = sum(len(p.split()) for p in all_paras)

    if total_words < 500:
        return title, author, [{
            "number": 1,
            "title": "Complete Novel Text",
            "content": all_paras,
            "word_count": total_words
        }], cover_bytes, cover_data_url

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

    return title, author, fallback_chapters, cover_bytes, cover_data_url

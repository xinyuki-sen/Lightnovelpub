from database import split_chapter_paragraphs
import zipfile
import io
import re
import os
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

def natural_sort_key(s: str):
    """Sorts strings containing numbers in human order: ch1, ch2, ch10 (not ch1, ch10, ch2)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

IGNORE_TITLES = {
    "cover", "title page", "title", "copyright", "also in series",
    "contents", "table of contents", "toc", "dedication", "acknowledgments",
    "acknowledgements", "about the author", "author's note",
    "thank you for reading", "groups", "litrpg", "about the publisher",
    "newsletter", "patreon", "discord", "other books", "preview of",
    "sneak peek", "review", "connect with", "glossary", "advertisement",
    "about this book", "more books by", "also by", "praise for", "epigraph",
    "frontmatter", "backmatter", "publisher notes", "publisher's note",
    "disclaimer", "map", "dramatis personae", "cast of characters"
}
IGNORE_TITLES_CLEAN = {re.sub(r'[^a-z0-9\s]', '', ign).strip() for ign in IGNORE_TITLES}

def is_ignored_title(title: str, novel_title: str) -> bool:
    t = title.strip().lower()
    nt = novel_title.strip().lower()
    if t == nt:
        return True
    t_clean = re.sub(r'[^a-z0-9\s]', '', t).strip()
    for ign_clean in IGNORE_TITLES_CLEAN:
        if t_clean == ign_clean or t_clean.startswith(ign_clean):
            return True
    return False


class SimpleHTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self.current_heading = []
        self.current_para = []
        self.in_heading = False
        self.in_para = False
        self.headings = []
        self.bold_depth = 0
        self.italic_depth = 0

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ('h1', 'h2', 'h3', 'h4', 'title'):
            self.in_heading = True
            self.current_heading = []
        elif tag in ('p', 'div', 'blockquote', 'li', 'tr'):
            self.in_para = True
            self.current_para = []
        elif tag == 'br' and self.in_para:
            self.current_para.append(' ')
        elif tag in ('b', 'strong') and self.in_para:
            self.bold_depth += 1
            self.current_para.append('**')
        elif tag in ('i', 'em') and self.in_para:
            self.italic_depth += 1
            self.current_para.append('*')
        elif tag in ('td', 'th') and self.in_para:
            self.current_para.append(' | ')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ('h1', 'h2', 'h3', 'h4', 'title'):
            self.in_heading = False
            heading_text = " ".join("".join(self.current_heading).split())
            if heading_text:
                self.headings.append(heading_text)
            self.current_heading = []
        elif tag in ('b', 'strong') and self.in_para and self.bold_depth > 0:
            self.bold_depth -= 1
            self.current_para.append('**')
        elif tag in ('i', 'em') and self.in_para and self.italic_depth > 0:
            self.italic_depth -= 1
            self.current_para.append('*')
        elif tag in ('p', 'div', 'blockquote', 'li', 'tr'):
            self.in_para = False
            raw_text = "".join(self.current_para)
            # Normalize whitespace while preserving markdown emphasis
            raw_text = re.sub(r'\*\*\s+', ' **', raw_text)
            raw_text = re.sub(r'\s+\*\*', '** ', raw_text)
            raw_text = re.sub(r'\*\s+', ' *', raw_text)
            raw_text = re.sub(r'\s+\*', '* ', raw_text)
            if raw_text.strip() in ('****', '**', '*', '***'):
                raw_text = ''
            para_text = " ".join(raw_text.split())
            if para_text and len(para_text) > 1:
                self.paragraphs.append(para_text)
            self.current_para = []
            self.bold_depth = 0
            self.italic_depth = 0

    def handle_data(self, data):
        if self.in_heading:
            self.current_heading.append(data)
        elif self.in_para:
            self.current_para.append(data)

def extract_epub_chapters(epub_path: str):
    """
    Zero-dependency pure Python EPUB parser using zipfile, xml.etree, and html.parser.
    Returns: (title, author, chapters, cover_bytes, cover_data_url)
    chapters format: [{"number": 1, "title": "...", "content": [p1, p2, ...], "word_count": N}]
    """
    with zipfile.ZipFile(epub_path, 'r') as zf:
        # Zip bomb / Decompression expansion guard (120 MB max uncompressed limit)
        total_uncompressed = sum(info.file_size for info in zf.infolist())
        if total_uncompressed > 120 * 1024 * 1024:
            raise ValueError("Uncompressed EPUB archive exceeds safe 120MB upper boundary.")

        namelist = zf.namelist()
        
        # 1. Find OPF package rootfile from META-INF/container.xml
        opf_path = None
        if 'META-INF/container.xml' in namelist:
            container_xml = zf.read('META-INF/container.xml')
            root = ET.fromstring(container_xml)
            for elem in root.iter():
                if elem.tag.endswith('rootfile'):
                    opf_path = elem.attrib.get('full-path')
                    break
                    
        if not opf_path:
            for name in namelist:
                if name.endswith('.opf'):
                    opf_path = name
                    break

        if not opf_path:
            raise ValueError("Invalid EPUB: content.opf package file not found.")

        opf_dir = os.path.dirname(opf_path)
        opf_xml = zf.read(opf_path)
        opf_root = ET.fromstring(opf_xml)

        # 2. Extract Metadata (Title, Author, Synopsis, Cover ID)
        title = "Untitled Novel"
        author = "Unknown"
        synopsis = ""
        cover_id = None

        for elem in opf_root.iter():
            tag = elem.tag.lower()
            if tag.endswith('title') and elem.text and title == "Untitled Novel":
                title = elem.text.strip()
            elif tag.endswith('creator') and elem.text:
                author = elem.text.strip()
            elif tag.endswith('description') and elem.text:
                synopsis = elem.text.strip()
            elif tag.endswith('meta') and elem.attrib.get('name') == 'cover':
                cover_id = elem.attrib.get('content')

        # 3. Extract Manifest (ID to file mapping)
        manifest = {}
        cover_href = None

        for elem in opf_root.iter():
            if elem.tag.endswith('item'):
                item_id = elem.attrib.get('id')
                href = elem.attrib.get('href')
                media_type = elem.attrib.get('media-type', '')
                properties = elem.attrib.get('properties', '')
                
                if item_id and href:
                    manifest[item_id] = {
                        'href': href,
                        'media-type': media_type
                    }
                    if cover_id and item_id == cover_id:
                        cover_href = href
                    elif 'cover-image' in properties:
                        cover_href = href
                    elif not cover_href and 'cover' in href.lower() and media_type.startswith('image/'):
                        cover_href = href

        # Extract Cover Image Bytes if found
        cover_bytes = None
        if cover_href:
            cover_full_path = os.path.normpath(os.path.join(opf_dir, cover_href)).replace('\\', '/')
            if cover_full_path in namelist:
                cover_bytes = zf.read(cover_full_path)
        if not cover_bytes:
            for name in namelist:
                if 'cover' in name.lower() and (name.endswith('.jpg') or name.endswith('.jpeg') or name.endswith('.png')):
                    cover_bytes = zf.read(name)
                    break

        # 4. Extract Spine (Reading Order of Chapters)
        spine_item_ids = []
        for elem in opf_root.iter():
            if elem.tag.endswith('itemref'):
                idref = elem.attrib.get('idref')
                if idref:
                    spine_item_ids.append(idref)

        chapters = []
        ch_num = 1

        for item_id in spine_item_ids:
            item = manifest.get(item_id)
            if not item:
                continue
            
            # Skip EPUB3 Navigation document and NCX Table of Contents files
            item_props = str(item.get('properties', '')).lower()
            if 'nav' in item_props or item_id.lower() in ('nav', 'toc', 'ncx'):
                continue
            
            href = item['href']
            # Only process html / xhtml documents
            if not any(href.lower().endswith(ext) for ext in ('.html', '.xhtml', '.htm', '.xml')):
                continue
            
            href_lower = href.lower()
            if any(href_lower.endswith(k) for k in ('toc.xhtml', 'toc.html', 'nav.xhtml', 'contents.xhtml', 'table_of_contents.xhtml')):
                continue

            full_path = os.path.normpath(os.path.join(opf_dir, href)).replace('\\', '/')
            if full_path not in namelist:
                continue

            try:
                html_bytes = zf.read(full_path)
                html_str = html_bytes.decode('utf-8', errors='ignore')
                
                parser = SimpleHTMLTextExtractor()
                parser.feed(html_str)

                # Skip pages with zero substantial text (e.g. standalone cover or blank separator)
                if not parser.paragraphs:
                    continue

                total_words = sum(len(p.split()) for p in parser.paragraphs)
                # Determine Chapter Title
                ch_title = parser.headings[0] if parser.headings else ""
                if not ch_title and parser.paragraphs:
                    # Check first paragraph for explicit chapter marker
                    first_p = parser.paragraphs[0].strip()
                    m_ch = re.match(r'^(?:(?:Chapter|Ch\.|Volume|Vol\.|Book|Part|Act)\s+[\dIVXLCDM]+.*)$', first_p, re.IGNORECASE)
                    if m_ch and len(first_p) <= 85:
                        ch_title = first_p
                if not ch_title or len(ch_title) > 90:
                    ch_title = f"Chapter {ch_num}"

                # Skip frontmatter/divider pages (< 80 words or ignored title)
                if total_words < 80 or is_ignored_title(ch_title, title):
                    if ch_num <= 3 or total_words < 40:
                        continue

                divided_content = split_chapter_paragraphs(parser.paragraphs, max_chars=480)
                chapters.append({
                    "number": ch_num,
                    "title": ch_title,
                    "content": divided_content,
                    "word_count": sum(len(p.split()) for p in divided_content)
                })
                ch_num += 1
            except Exception as read_err:
                print(f"[EPUB Parser] Skipping {full_path}: {read_err}")

        # Fallback: if no chapters were parsed via spine, parse any HTML files in the zip
        if not chapters:
            html_files = sorted([n for n in namelist if n.endswith(('.xhtml', '.html', '.htm'))], key=natural_sort_key)
            for hf in html_files:
                try:
                    html_bytes = zf.read(hf)
                    html_str = html_bytes.decode('utf-8', errors='ignore')
                    parser = SimpleHTMLTextExtractor()
                    parser.feed(html_str)
                    if parser.paragraphs:
                        chapters.append({
                            "number": len(chapters) + 1,
                            "title": parser.headings[0] if parser.headings else f"Chapter {len(chapters) + 1}",
                            "content": parser.paragraphs,
                            "word_count": sum(len(p.split()) for p in parser.paragraphs)
                        })
                except Exception:
                    pass

        # Strip any leading stub chapters (cover / title / dedication pages with < 100 words)
        while chapters and len(chapters) > 1 and (chapters[0].get("word_count", 0) < 100 or is_ignored_title(chapters[0].get("title", ""), title)):
            print(f"[EPUB Parser] Dropped frontmatter stub chapter '{chapters[0]['title']}' ({chapters[0].get('word_count', 0)} words)")
            chapters.pop(0)

        # Strip any trailing stub chapters (< 100 words or promotional)
        while chapters and len(chapters) > 1 and (chapters[-1].get("word_count", 0) < 100 or is_ignored_title(chapters[-1].get("title", ""), title)):
            print(f"[EPUB Parser] Dropped backmatter stub chapter '{chapters[-1]['title']}' ({chapters[-1].get('word_count', 0)} words)")
            chapters.pop()

        # Re-index chapters contiguously from 1
        for idx, ch in enumerate(chapters):
            ch["number"] = idx + 1

        cover_data_url = ""
        if cover_bytes:
            import base64
            cover_data_url = f"data:image/jpeg;base64,{base64.b64encode(cover_bytes).decode('ascii')}"
        return title, author, chapters, cover_bytes, cover_data_url

# Self-test with synthesized EPUB
if __name__ == '__main__':
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        zf.writestr('mimetype', 'application/epub+zip')
        zf.writestr('META-INF/container.xml', '<?xml version="1.0"?><container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>')
        zf.writestr('OEBPS/content.opf', '<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="2.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Solo Leveling Vol 1</dc:title><dc:creator>Chugong</dc:creator></metadata><manifest><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="c1"/></spine></package>')
        zf.writestr('OEBPS/ch1.xhtml', '<html><body><h1>Chapter 1: The D-Rank Hunter</h1><p>Sung Jin-Woo gripped his dagger tightly.</p><p>The double dungeon doors groaned open.</p></body></html>')

    test_file = 'test_sample.epub'
    with open(test_file, 'wb') as f:
        f.write(buf.getvalue())

    t, auth, chs, cov, cov_url = extract_epub_chapters(test_file)
    print("EPUB Extracted Title:", t)
    print("Total Chapters:", len(chs))
    print("Chapter 1 Title:", chs[0]["title"])
    print("Chapter 1 Paragraphs:", len(chs[0]["content"]))
    print("Chapter 1 Word Count:", chs[0]["word_count"])
    os.remove(test_file)
    print("SUCCESS: EPUB parser self-test passed successfully!")

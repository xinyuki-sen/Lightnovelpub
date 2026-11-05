from database import split_chapter_paragraphs
import zipfile
import io
import re
import os
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

class SimpleHTMLTextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.paragraphs = []
        self.current_heading = []
        self.current_para = []
        self.in_heading = False
        self.in_para = False
        self.headings = []

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in ('h1', 'h2', 'h3', 'h4', 'title'):
            self.in_heading = True
            self.current_heading = []
        elif tag in ('p', 'div', 'blockquote', 'li'):
            self.in_para = True
            self.current_para = []
        elif tag == 'br' and self.in_para:
            self.current_para.append(' ')

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in ('h1', 'h2', 'h3', 'h4', 'title'):
            self.in_heading = False
            heading_text = " ".join("".join(self.current_heading).split())
            if heading_text:
                self.headings.append(heading_text)
            self.current_heading = []
        elif tag in ('p', 'div', 'blockquote', 'li'):
            self.in_para = False
            para_text = " ".join("".join(self.current_para).split())
            if para_text and len(para_text) > 1:
                self.paragraphs.append(para_text)
            self.current_para = []

    def handle_data(self, data):
        if self.in_heading:
            self.current_heading.append(data)
        elif self.in_para:
            self.current_para.append(data)

def extract_epub_chapters(epub_path: str):
    """
    Zero-dependency pure Python EPUB parser using zipfile, xml.etree, and html.parser.
    Returns: (title, chapters, cover_bytes)
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
            
            href = item['href']
            # Only process html / xhtml documents
            if not any(href.lower().endswith(ext) for ext in ('.html', '.xhtml', '.htm', '.xml')):
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
                if total_words < 15 and ch_num == 1:
                    # Likely a title page or copyright notice
                    continue

                # Determine Chapter Title
                ch_title = parser.headings[0] if parser.headings else f"Chapter {ch_num}"
                # Clean up heading if it's very long
                if len(ch_title) > 90:
                    ch_title = f"Chapter {ch_num}"

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
            html_files = sorted([n for n in namelist if n.endswith(('.xhtml', '.html', '.htm'))])
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

    t, chs, cov = extract_epub_chapters(test_file)
    print("EPUB Extracted Title:", t)
    print("Total Chapters:", len(chs))
    print("Chapter 1 Title:", chs[0]["title"])
    print("Chapter 1 Paragraphs:", len(chs[0]["content"]))
    print("Chapter 1 Word Count:", chs[0]["word_count"])
    os.remove(test_file)
    print("SUCCESS: EPUB parser self-test passed successfully!")

import json
import time
import os
import shutil
import tempfile
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, Response, RedirectResponse
from starlette.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Optional
from pydantic import BaseModel

import database
from pdf_parser import extract_pdf_chapters
from epub_parser import extract_epub_chapters

app = FastAPI(title="LightnovelPub Custom Novel Reader")
app.add_middleware(GZipMiddleware, minimum_size=1000)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "SAMEORIGIN"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")

if os.environ.get("VERCEL"):
    COVERS_DIR = "/tmp/covers"
else:
    COVERS_DIR = os.path.join(STATIC_DIR, "covers")

try:
    os.makedirs(COVERS_DIR, exist_ok=True)
except Exception:
    pass

# Dedicated cover image route supporting both Vercel /tmp/covers and static/covers (Hardened against traversal)
@app.get("/static/covers/{filename}")
async def serve_cover_image(filename: str):
    safe_filename = os.path.basename(filename)
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid cover filename")

    # Check COVERS_DIR first
    disk_cover = os.path.join(COVERS_DIR, safe_filename)
    if os.path.exists(disk_cover):
        return FileResponse(disk_cover, media_type="image/jpeg")
    
    # Fallback to repo static/covers
    static_cover = os.path.join(STATIC_DIR, "covers", safe_filename)
    if os.path.exists(static_cover):
        return FileResponse(static_cover, media_type="image/jpeg")
        
    # Default fallback to logo if cover doesn't exist
    fallback_logo = os.path.join(STATIC_DIR, "img", "logo.png")
    if os.path.exists(fallback_logo):
        return FileResponse(fallback_logo, media_type="image/png")
    return Response(status_code=404)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Initialize database schema
database.init_db()

@app.get("/sw.js")
async def service_worker():
    sw_path = os.path.join(STATIC_DIR, "sw.js")
    return FileResponse(
        sw_path, 
        media_type="application/javascript",
        headers={
            "Service-Worker-Allowed": "/",
            "Cache-Control": "no-cache, no-store, must-revalidate"
        }
    )

@app.get("/", response_class=HTMLResponse)
async def library_home(request: Request, sort: Optional[str] = "recent"):
    novels = database.get_all_novels(order_by=sort or "recent")
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"novels": novels, "current_sort": sort or "recent"}
    )

@app.get("/novel/{slug}", response_class=HTMLResponse)
async def novel_detail(request: Request, slug: str):
    novel = database.get_novel_by_slug(slug)
    if not novel:
        raise HTTPException(status_code=404, detail="Novel not found")
    return templates.TemplateResponse(
        request=request,
        name="novel_detail.html",
        context={"novel": novel}
    )

@app.get("/novel/{slug}/chapter/{chapter_number}", response_class=HTMLResponse)
async def chapter_reader(request: Request, slug: str, chapter_number: int):
    data = database.get_chapter(slug, chapter_number)
    if not data:
        full_novel = database.get_novel_by_slug(slug)
        if full_novel and full_novel.get("chapters"):
            first_ch = full_novel["chapters"][0]["chapter_number"]
            return RedirectResponse(url=f"/novel/{slug}/chapter/{first_ch}", status_code=302)
        raise HTTPException(status_code=404, detail="Chapter not found")
    novel, chapter = data
    
    all_chapters = novel.get("chapters", [])
    if not all_chapters:
        full_novel = database.get_novel_by_slug(slug)
        all_chapters = full_novel.get("chapters", []) if full_novel else []
    
    # Robust previous and next chapter resolution against non-contiguous numbering
    ch_nums = [c["chapter_number"] for c in all_chapters] if all_chapters else []
    if chapter_number in ch_nums:
        idx = ch_nums.index(chapter_number)
        prev_chapter = ch_nums[idx - 1] if idx > 0 else None
        next_chapter = ch_nums[idx + 1] if idx < len(ch_nums) - 1 else None
    else:
        prev_chapter = chapter_number - 1 if chapter_number > 1 else None
        next_chapter = chapter_number + 1 if chapter_number < novel.get("total_chapters", len(all_chapters)) else None
    
    return templates.TemplateResponse(
        request=request,
        name="reader.html",
        context={
            "novel": novel,
            "chapter": chapter,
            "all_chapters": all_chapters,
            "prev_chapter": prev_chapter,
            "next_chapter": next_chapter
        }
    )

@app.get("/api/novel/{slug}/chapter/{chapter_number}")
async def get_chapter_json(request: Request, slug: str, chapter_number: int):
    """High-speed JSON endpoint for instantaneous client-side chapter transitions (<50ms) with ETag caching."""
    data = database.get_chapter(slug, chapter_number)
    if not data:
        full_novel = database.get_novel_by_slug(slug)
        if full_novel and full_novel.get("chapters"):
            first_ch = full_novel["chapters"][0]["chapter_number"]
            data = database.get_chapter(slug, first_ch)
        if not data:
            raise HTTPException(status_code=404, detail="Chapter not found")
    novel, chapter = data
    
    all_chapters = novel.get("chapters", [])
    if not all_chapters:
        full_novel = database.get_novel_by_slug(slug)
        all_chapters = full_novel.get("chapters", []) if full_novel else []
    
    ch_nums = [c["chapter_number"] for c in all_chapters] if all_chapters else []
    if chapter_number in ch_nums:
        idx = ch_nums.index(chapter_number)
        prev_ch = ch_nums[idx - 1] if idx > 0 else None
        next_ch = ch_nums[idx + 1] if idx < len(ch_nums) - 1 else None
    else:
        prev_ch = chapter_number - 1 if chapter_number > 1 else None
        next_ch = chapter_number + 1 if chapter_number < novel.get("total_chapters", len(all_chapters)) else None

    word_count = chapter.get("word_count", 0)
    mins = max(1, round(word_count / 220))
    
    etag = f'W/"ch-{slug}-{chapter["chapter_number"]}-{len(chapter.get("paragraphs", []))}-{word_count}"'
    if_none_match = request.headers.get("if-none-match")
    if if_none_match and if_none_match == etag:
        return Response(status_code=304)

    return JSONResponse(
        content={
            "slug": slug,
            "novel_title": novel["title"],
            "chapter_number": chapter["chapter_number"],
            "title": chapter["title"],
            "paragraphs": chapter.get("paragraphs", []),
            "word_count": word_count,
            "read_time_mins": mins,
            "prev_chapter": prev_ch,
            "next_chapter": next_ch,
            "total_chapters": novel.get("total_chapters", len(all_chapters))
        },
        headers={
            "ETag": etag,
            "Cache-Control": "public, max-age=3600, must-revalidate"
        }
    )

MAX_UPLOAD_SIZE = 45 * 1024 * 1024  # 45 MB Limit

@app.post("/api/upload")
async def upload_novel(
    file: UploadFile = File(...),
    title: str = Form(None),
    author: str = Form(None),
    synopsis: str = Form(None)
):
    if not file.filename:
        return JSONResponse({"error": "No file uploaded."}, status_code=400)
    
    fname = file.filename.lower()
    is_pdf = fname.endswith(".pdf")
    is_epub = fname.endswith(".epub")

    if not is_pdf and not is_epub:
        return JSONResponse({"error": "Only PDF and EPUB files are supported."}, status_code=400)
    
    # 1. Inspect first 2KB for Magic Bytes
    header = await file.read(2048)
    if is_pdf and not header.startswith(b"%PDF-"):
        return JSONResponse({"error": "Invalid PDF file: corrupted or invalid magic byte header."}, status_code=400)
    if is_epub and not header.startswith(b"PK\x03\x04"):
        return JSONResponse({"error": "Invalid EPUB file: corrupted or invalid zip magic byte signature."}, status_code=400)
    
    await file.seek(0)

    # 2. Stream chunked file with 45MB upper limit guard (DoS protection)
    suffix = ".pdf" if is_pdf else ".epub"
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            total_size = 0
            while chunk := await file.read(65536):  # 64KB chunks
                total_size += len(chunk)
                if total_size > MAX_UPLOAD_SIZE:
                    return JSONResponse({"error": "File exceeds maximum 45MB size limit."}, status_code=413)
                tmp.write(chunk)
            tmp_path = tmp.name

        if is_epub:
            detected_title, chapters, cover_bytes = extract_epub_chapters(tmp_path)
        else:
            detected_title, chapters, cover_bytes = extract_pdf_chapters(tmp_path)
        
        if not chapters:
            return JSONResponse({"error": "Could not extract any readable chapters from the file."}, status_code=400)

        final_title = title.strip() if title and title.strip() else detected_title
        if not final_title:
            final_title = os.path.splitext(file.filename)[0].replace("_", " ").title()
            
        slug = database.generate_unique_slug(final_title)
        cover_url = ""
        
        if cover_bytes:
            cover_filename = f"{slug}.jpg"
            cover_disk_path = os.path.join(COVERS_DIR, cover_filename)
            try:
                with open(cover_disk_path, "wb") as f_cover:
                    f_cover.write(cover_bytes)
                cover_url = f"/static/covers/{cover_filename}"
            except Exception as cov_err:
                print("Cover save note:", cov_err)
            
        saved_slug = database.save_novel(
            title=final_title,
            author=author.strip() if author and author.strip() else "Unknown Author",
            synopsis=synopsis.strip() if synopsis and synopsis.strip() else f"Imported from {file.filename}.",
            cover_path=cover_url,
            chapters=chapters,
            precomputed_slug=slug
        )
        
        return {
            "success": True,
            "slug": saved_slug,
            "title": final_title,
            "total_chapters": len(chapters)
        }
    except Exception as e:
        return JSONResponse({"error": f"Failed to parse file: {str(e)}"}, status_code=500)
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass

class ProgressPayload(BaseModel):
    slug: str
    chapter_number: int
    percent: float
    para_index: Optional[int] = 0

@app.post("/api/progress")
async def save_progress(payload: ProgressPayload):
    database.update_reading_progress(payload.slug, payload.chapter_number, payload.percent, payload.para_index or 0)
    return {"status": "ok"}

@app.delete("/api/novel/{slug}")
async def delete_novel_api(slug: str, request: Request):
    # Admin security guard: if ADMIN_TOKEN is configured in environment, require matching header
    admin_token = os.environ.get("ADMIN_TOKEN")
    if admin_token:
        client_token = request.headers.get("X-Admin-Token")
        if client_token != admin_token:
            raise HTTPException(status_code=403, detail="Unauthorized: Invalid admin token")

    cover_image = database.delete_novel(slug)
    if cover_image and cover_image.startswith("/static/covers/"):
        filename = cover_image.replace("/static/covers/", "")
        for target_dir in [COVERS_DIR, os.path.join(STATIC_DIR, "covers")]:
            target_path = os.path.join(target_dir, filename)
            if os.path.exists(target_path):
                try:
                    os.remove(target_path)
                except Exception:
                    pass
    return {"status": "deleted"}

@app.get("/api/backup")
async def export_backup_api():
    data = database.export_library_data()
    return JSONResponse(content=data, headers={
        "Content-Disposition": f"attachment; filename=lightnovelpub_backup_{int(time.time())}.json"
    })

@app.post("/api/restore")
async def import_backup_api(file: UploadFile = File(...)):
    try:
        content = await file.read()
        data = json.loads(content.decode('utf-8'))
        imported = database.import_library_data(data)
        return {"status": "ok", "imported_count": imported}
    except Exception as e:
        return JSONResponse({"error": f"Failed to restore backup: {str(e)}"}, status_code=400)

class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-ChristopherNeural"
    rate: float = 1.0
    pitch: Optional[float] = 1.0

@app.post("/api/tts")
async def generate_tts(req: TTSRequest):
    text = req.text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Text cannot be empty")
    
    # Generous limit covering 100% of literary paragraphs without dropping text (Max in library is 2502 chars)
    if len(text) > 3600:
        text = text[:3600]

    rate_percent = int((req.rate - 1.0) * 100)
    rate_str = f"{rate_percent:+d}%"

    pitch_val = req.pitch if req.pitch is not None else 1.0
    pitch_hz = int((pitch_val - 1.0) * 50)
    pitch_str = f"{pitch_hz:+d}Hz"

    try:
        import base64
        import json
        import edge_tts
        comm = edge_tts.Communicate(
            text=text, 
            voice=req.voice, 
            rate=rate_str, 
            pitch=pitch_str, 
            boundary="WordBoundary",
            connect_timeout=6,
            receive_timeout=25
        )
        chunks = []
        word_boundaries = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset and duration in 100ns units -> convert to milliseconds
                start_ms = int(chunk["offset"] / 10000)
                dur_ms = int(chunk["duration"] / 10000)
                word_boundaries.append([start_ms, dur_ms, chunk["text"]])
        
        audio_data = b"".join(chunks)
        headers = {
            "Cache-Control": "public, max-age=86400, immutable",
            "Access-Control-Expose-Headers": "X-Word-Boundaries"
        }
        if word_boundaries:
            b64_wb = base64.b64encode(json.dumps(word_boundaries, separators=(',', ':')).encode('utf-8')).decode('ascii')
            headers["X-Word-Boundaries"] = b64_wb

        return Response(content=audio_data, media_type="audio/mpeg", headers=headers)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("LightnovelPub Novel Reader Starting...")
    print("Open http://localhost:8000 in your browser!")
    print("="*50 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

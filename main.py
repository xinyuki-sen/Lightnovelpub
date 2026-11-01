import os
import shutil
import tempfile
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from typing import Optional
from pydantic import BaseModel

import database
from pdf_parser import extract_pdf_chapters

app = FastAPI(title="LightnovelPub Custom Novel Reader")

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

# Dedicated cover image route supporting both Vercel /tmp/covers and static/covers
@app.get("/static/covers/{filename}")
async def serve_cover_image(filename: str):
    # Check COVERS_DIR first
    disk_cover = os.path.join(COVERS_DIR, filename)
    if os.path.exists(disk_cover):
        return FileResponse(disk_cover, media_type="image/jpeg")
    
    # Fallback to repo static/covers
    static_cover = os.path.join(STATIC_DIR, "covers", filename)
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

@app.post("/api/upload")
async def upload_pdf(
    file: UploadFile = File(...),
    title: str = Form(None),
    author: str = Form(None),
    synopsis: str = Form(None)
):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return JSONResponse({"error": "Only PDF files are supported."}, status_code=400)
    
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        detected_title, chapters, cover_bytes = extract_pdf_chapters(tmp_path)
        
        final_title = title.strip() if title and title.strip() else detected_title
        if not final_title:
            final_title = os.path.splitext(file.filename)[0].replace("_", " ").title()
            
        slug = database.generate_unique_slug(final_title)
        cover_url = ""
        
        if cover_bytes:
            cover_filename = f"{slug}.jpg"
            cover_disk_path = os.path.join(COVERS_DIR, cover_filename)
            with open(cover_disk_path, "wb") as f_cover:
                f_cover.write(cover_bytes)
            cover_url = f"/static/covers/{cover_filename}"
            
        saved_slug = database.save_novel(
            title=final_title,
            author=author.strip() if author and author.strip() else "Unknown Author",
            synopsis=synopsis.strip() if synopsis and synopsis.strip() else f"Converted from {file.filename}.",
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
        return JSONResponse({"error": f"Failed to parse PDF: {str(e)}"}, status_code=500)
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
async def delete_novel_api(slug: str):
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
    
    if len(text) > 1500:
        text = text[:1500]

    rate_percent = int((req.rate - 1.0) * 100)
    rate_str = f"{rate_percent:+d}%"

    pitch_val = req.pitch if req.pitch is not None else 1.0
    pitch_hz = int((pitch_val - 1.0) * 50)
    pitch_str = f"{pitch_hz:+d}Hz"

    try:
        import edge_tts
        comm = edge_tts.Communicate(text=text, voice=req.voice, rate=rate_str, pitch=pitch_str)
        chunks = []
        async for chunk in comm.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        
        audio_data = b"".join(chunks)
        return Response(content=audio_data, media_type="audio/mpeg", headers={
            "Cache-Control": "public, max-age=86400, immutable"
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("LightnovelPub Novel Reader Starting...")
    print("Open http://localhost:8000 in your browser!")
    print("="*50 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

import os
import shutil
import tempfile
from fastapi import FastAPI, Request, UploadFile, File, Form, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

import database
from pdf_parser import extract_pdf_chapters

app = FastAPI(title="Novel Phoenix Custom Reader")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, "static")
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
COVERS_DIR = os.path.join(STATIC_DIR, "covers")

os.makedirs(COVERS_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
templates = Jinja2Templates(directory=TEMPLATES_DIR)

# Initialize database
database.init_db()

@app.get("/", response_class=HTMLResponse)
async def library_home(request: Request):
    novels = database.get_all_novels()
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={"novels": novels}
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
    
    novel_full = database.get_novel_by_slug(slug)
    all_chapters = novel_full.get("chapters", [])
    
    prev_chapter = chapter_number - 1 if chapter_number > 1 else None
    next_chapter = chapter_number + 1 if chapter_number < novel["total_chapters"] else None
    
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
    if not file.filename.lower().endswith(".pdf"):
        return JSONResponse({"error": "Only PDF files are supported."}, status_code=400)
    
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        detected_title, chapters, cover_bytes = extract_pdf_chapters(tmp_path)
        
        final_title = title.strip() if title and title.strip() else detected_title
        cover_url = ""
        
        # Save cover image if extracted
        if cover_bytes:
            cover_filename = f"{database.slugify(final_title)}.jpg"
            cover_disk_path = os.path.join(COVERS_DIR, cover_filename)
            with open(cover_disk_path, "wb") as f_cover:
                f_cover.write(cover_bytes)
            cover_url = f"/static/covers/{cover_filename}"
            
        slug = database.save_novel(
            title=final_title,
            author=author.strip() if author and author.strip() else "Unknown",
            synopsis=synopsis.strip() if synopsis and synopsis.strip() else f"Converted from {file.filename}.",
            cover_path=cover_url,
            chapters=chapters
        )
        
        return {
            "success": True,
            "slug": slug,
            "title": final_title,
            "total_chapters": len(chapters)
        }
    except Exception as e:
        return JSONResponse({"error": f"Failed to parse PDF: {str(e)}"}, status_code=500)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)

class ProgressPayload(BaseModel):
    slug: str
    chapter_number: int
    percent: float

@app.post("/api/progress")
async def save_progress(payload: ProgressPayload):
    database.update_reading_progress(payload.slug, payload.chapter_number, payload.percent)
    return {"status": "ok"}

@app.delete("/api/novel/{slug}")
async def delete_novel_api(slug: str):
    database.delete_novel(slug)
    return {"status": "deleted"}

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*50)
    print("Novel Phoenix Custom Reader Starting...")
    print("Open http://localhost:8000 in your browser!")
    print("="*50 + "\n")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)

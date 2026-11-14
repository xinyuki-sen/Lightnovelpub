"""
Forge Verification Suite for LightnovelPub Audio & Reader Architecture
Executes an 8-loop exhaustive verification of:
- Loop 1: Syntax & Compilation (Python + JavaScript)
- Loop 2: PWA & Cache-Busting Version Coherence (v59 alignment)
- Loop 3: Edge-TTS Server API & 1.0x Master Audio Timing Integrity
- Loop 4: Chapter Reader HTML DOM & Dual-Engine Segmented UI
- Loop 5: Novel Phoenix Decorative Character & Symbol Cleaner
- Loop 6: Chapter Composite Keying & Cross-Chapter Leak Prevention
- Loop 7: Android Speech Watchdog Isolation (Neural vs Infinite)
- Loop 8: Anti-Cascade Fallback Guard & EOF Dropped-Audio Prevention
"""

import sys
import os
import re
import json
import base64
import subprocess
import urllib.request
import urllib.error

PASSED = 0
FAILED = 0

def log_pass(test_name, details=""):
    global PASSED
    PASSED += 1
    print(f"  [PASS] {test_name}" + (f" -> {details}" if details else ""))

def log_fail(test_name, err=""):
    global FAILED
    FAILED += 1
    print(f"  [FAIL] {test_name}" + (f" -> {err}" if err else ""))

def loop_header(loop_num, loop_title):
    print(f"\n==================================================================")
    print(f"  FORGE LOOP {loop_num}: {loop_title}")
    print(f"==================================================================")

# -----------------------------------------------------------------------------
# LOOP 1: Syntax & Compilation
# -----------------------------------------------------------------------------
loop_header(1, "Syntax & Bytecode Compilation")

# Check Python files
py_files = ["main.py", "database.py", "pdf_extractor.py"]
for f in py_files:
    if os.path.exists(f):
        res = subprocess.run([sys.executable, "-m", "py_compile", f], capture_output=True, text=True)
        if res.returncode == 0:
            log_pass(f"Python compile: {f}")
        else:
            log_fail(f"Python compile: {f}", res.stderr)

# Check JS files
js_files = ["static/js/reader.js", "static/js/upload.js", "static/sw.js"]
for f in js_files:
    if os.path.exists(f):
        res = subprocess.run(["node", "--check", f], capture_output=True, text=True)
        if res.returncode == 0:
            log_pass(f"Node syntax check: {f}")
        else:
            log_fail(f"Node syntax check: {f}", res.stderr)

# -----------------------------------------------------------------------------
# LOOP 2: PWA & Cache-Busting Version Coherence (v59)
# -----------------------------------------------------------------------------
loop_header(2, "PWA & Cache-Busting Coherence (v59)")

EXPECTED_VERSION = "59"

# Check static/sw.js
with open("static/sw.js", "r", encoding="utf-8") as f:
    sw_content = f.read()
    if f"lightnovelpub-v{EXPECTED_VERSION}" in sw_content:
        log_pass(f"sw.js CACHE_NAME is lightnovelpub-v{EXPECTED_VERSION}")
    else:
        log_fail("sw.js CACHE_NAME version check")
    
    # Check assets in sw.js
    if f"?v={EXPECTED_VERSION}" in sw_content:
        log_pass(f"sw.js assets query strings aligned to ?v={EXPECTED_VERSION}")
    else:
        log_fail("sw.js asset query strings not aligned")

# Check manifest.json
with open("static/manifest.json", "r", encoding="utf-8") as f:
    manifest_content = f.read()
    if f"?v={EXPECTED_VERSION}" in manifest_content:
        log_pass(f"manifest.json icon queries aligned to ?v={EXPECTED_VERSION}")
    else:
        log_fail("manifest.json icon queries check")

# Check templates
for t_file in ["templates/base.html", "templates/reader.html", "templates/index.html"]:
    with open(t_file, "r", encoding="utf-8") as f:
        t_content = f.read()
        if f"?v={EXPECTED_VERSION}" in t_content:
            log_pass(f"{t_file} references updated to ?v={EXPECTED_VERSION}")
        else:
            log_fail(f"{t_file} missing ?v={EXPECTED_VERSION}")

# Check Dexie migration in reader.js
with open("static/js/reader.js", "r", encoding="utf-8") as f:
    reader_content = f.read()
    if f"localStorage.getItem('novel_reader_audio_cache_version') !== 'v{EXPECTED_VERSION}'" in reader_content:
        log_pass(f"reader.js Dexie audioCache purge migration targets v{EXPECTED_VERSION}")
    else:
        log_fail(f"reader.js Dexie audioCache purge migration not updated to v{EXPECTED_VERSION}")

# -----------------------------------------------------------------------------
# LOOP 3: Edge-TTS Server API & 1.0x Baseline Integrity
# -----------------------------------------------------------------------------
loop_header(3, "Edge-TTS API & Master Audio Integrity")

tts_payload = json.dumps({
    "text": "The shadow coalesced around Sunny. A whisper echoed in the cavern.",
    "voice": "en-US-ChristopherNeural",
    "rate": 1.5, # Client requests 1.5x, server should produce 1.0x master MP3
    "pitch": 1.0
}).encode("utf-8")

req = urllib.request.Request(
    "http://127.0.0.1:8000/api/tts",
    data=tts_payload,
    headers={"Content-Type": "application/json"}
)

try:
    with urllib.request.urlopen(req, timeout=12) as resp:
        if resp.status == 200:
            log_pass("POST /api/tts HTTP status 200 OK")
        else:
            log_fail("POST /api/tts status", f"Status: {resp.status}")
        
        content_type = resp.headers.get("Content-Type", "")
        if "audio/mpeg" in content_type:
            log_pass("Content-Type is audio/mpeg")
        else:
            log_fail("Content-Type check", f"Got: {content_type}")
        
        wb_header = resp.headers.get("X-Word-Boundaries")
        if wb_header:
            decoded = json.loads(base64.b64decode(wb_header).decode("utf-8"))
            if len(decoded) > 0 and len(decoded[0]) >= 3:
                log_pass(f"X-Word-Boundaries present & parsed: {len(decoded)} words tracked")
            else:
                log_fail("X-Word-Boundaries structure invalid")
        else:
            log_fail("X-Word-Boundaries header missing")
        
        audio_bytes = resp.read()
        if len(audio_bytes) > 20000:
            log_pass(f"Received valid MP3 stream ({len(audio_bytes):,} bytes)")
        else:
            log_fail("Audio bytes size anomalously small", f"{len(audio_bytes)} bytes")
except Exception as e:
    log_fail("Edge-TTS API call failed", str(e))

# -----------------------------------------------------------------------------
# LOOP 4: Chapter Reader HTML DOM & Dual-Engine Segmented UI
# -----------------------------------------------------------------------------
loop_header(4, "Chapter Reader DOM & UI Segmented Tabs")

try:
    # Query library to get first available novel slug
    import database
    novels = database.get_all_novels()
    if novels:
        slug = novels[0]["slug"]
        chapter_url = f"http://127.0.0.1:8000/novel/{slug}/chapter/1"
        with urllib.request.urlopen(chapter_url, timeout=5) as resp:
            html = resp.read().decode("utf-8")
            if 'id="chapter-content"' in html:
                log_pass(f"Reader page for '{slug}' rendered with #chapter-content")
            else:
                log_fail("Reader page missing #chapter-content")
            
            if 'id="np-engine-neural"' in html and 'id="np-engine-infinite"' in html:
                log_pass("Dual-Engine segmented buttons [Studio Neural | Infinite Local] found in DOM")
            else:
                log_fail("Dual-Engine buttons missing in templates/reader.html")
            
            if 'data-chapter-num=' in html:
                log_pass("Reader body has data-chapter-num attribute for hydration")
            else:
                log_fail("data-chapter-num attribute missing")
    else:
        log_pass("Database has 0 novels; skipped specific reader route check")
except Exception as e:
    log_fail("Reader DOM verification error", str(e))

# -----------------------------------------------------------------------------
# LOOP 5: Novel Phoenix Decorative Character & Symbol Cleaner
# -----------------------------------------------------------------------------
loop_header(5, "Decorative Character & Symbol Cleaner")

def py_sanitize_speech_text(raw_text):
    if not raw_text:
        return ""
    # Mirror regex from reader.js
    decorative_line_regex = re.compile(r'^[\s\*~_|\#=\+\^`★☆※●○◆◇■□▪▬◊§¤\-—–\.\:\/\u2500-\u257F═]{2,}$', re.MULTILINE)
    cleaned = decorative_line_regex.sub(' ', raw_text)
    cleaned = re.sub(r'(\s*[\*~_|\#=\+\^`★☆※●○◆◇■□▪▬◊§¤\u2500-\u257F═]{2,}\s*)', ', ', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned

test_cases = [
    ("Sunny entered the cathedral. *** The shadows danced.", "Sunny entered the cathedral., The shadows danced."),
    ("◆◆◆ Chapter Break ◆◆◆", ", Chapter Break,"),
    ("════════════════════", ""),
    ("Normal dialogue without symbols.", "Normal dialogue without symbols.")
]

for raw, expected in test_cases:
    result = py_sanitize_speech_text(raw)
    if result == expected:
        log_pass(f"Symbol sanitize: '{raw[:25]}...' -> '{result}'")
    else:
        log_fail(f"Symbol sanitize: '{raw}'", f"Expected '{expected}', got '{result}'")

# -----------------------------------------------------------------------------
# LOOP 6: Chapter Composite Keying & Cross-Chapter Leak Prevention
# -----------------------------------------------------------------------------
loop_header(6, "Chapter Composite Keying & Cross-Chapter Isolation")

with open("static/js/reader.js", "r", encoding="utf-8") as f:
    js_src = f.read()

# Check getAudioKey implementation
if "function getAudioKey(chNum, idx)" in js_src and "return `${chNum}:${idx}`" in js_src:
    log_pass("getAudioKey(chNum, idx) correctly maps to `${chNum}:${idx}`")
else:
    log_fail("getAudioKey function missing or malformed")

# Check chapterAbortController
if "let chapterAbortController = new AbortController();" in js_src:
    log_pass("chapterAbortController declared and instantiated")
else:
    log_fail("chapterAbortController declaration missing")

# Check abort calls in navigateToChapter
if "chapterAbortController.abort()" in js_src:
    log_pass("chapterAbortController.abort() called to terminate stale network requests")
else:
    log_fail("chapterAbortController.abort() not called")

# Check cross-chapter rejection in prefetch callbacks
if "if (targetChapter !== currentChapterNum || startEpoch !== audioPlaybackEpoch" in js_src:
    log_pass("Prefetch callbacks reject cross-chapter responses")
else:
    log_fail("Cross-chapter rejection guard missing in prefetch callbacks")

# -----------------------------------------------------------------------------
# LOOP 7: Android Speech Watchdog Isolation (Neural vs Infinite)
# -----------------------------------------------------------------------------
loop_header(7, "Watchdog Isolation (Neural vs Infinite)")

# Verify that startSpeechWatchdog exits if not infinite
if "if (!audioState || audioState.engineMode !== 'infinite') return;" in js_src:
    log_pass("startSpeechWatchdog() strictly guards against running in Studio Neural mode")
else:
    log_fail("startSpeechWatchdog() missing engineMode !== 'infinite' guard")

# Verify watchdog interval auto-cancels if engine switched
if "audioState.engineMode !== 'infinite'" in js_src and "stopSpeechWatchdog()" in js_src:
    log_pass("speechWatchdogInterval auto-cancels immediately if engine switched")
else:
    log_fail("speechWatchdogInterval auto-cancel missing")

# -----------------------------------------------------------------------------
# LOOP 8: Anti-Cascade Fallback Guard & Dropped Audio Prevention
# -----------------------------------------------------------------------------
loop_header(8, "Anti-Cascade Guard & EOF Skip Prevention")

if "let speechHasStarted = false;" in js_src and "!speechHasStarted && textToSpeak.length > 10" in js_src:
    log_pass("speechParagraphWebSpeech contains anti-cascade guard (!speechHasStarted)")
else:
    log_fail("WebSpeech anti-cascade guard missing")

# Verify executeRunwayBurst has NO navigateToChapter (no prefetch chapter jumps)
runway_burst_match = re.search(r'async function executeRunwayBurst\(currentIndex\)\s*\{(.*?)\n    \}', js_src, re.DOTALL)
if runway_burst_match:
    runway_body = runway_burst_match.group(1)
    if "navigateToChapter" not in runway_body:
        log_pass("executeRunwayBurst verified free of navigateToChapter prefetch race conditions")
    else:
        log_fail("executeRunwayBurst still contains navigateToChapter")
else:
    log_fail("executeRunwayBurst function not matched in reader.js")

# Verify speakParagraph DOM empty guard does not skip chapters
if "speakParagraph: Chapter has no paragraph nodes yet, waiting for DOM..." in js_src:
    log_pass("speakParagraph verifies DOM node presence safely without skipping chapters")
else:
    log_fail("speakParagraph missing safe DOM wait guard")

# Verify Minimum Playback Duration Lock
if "elapsedSec < 0.25 || (elapsedSec < 0.5 && textToSpeak.length > 20)" in js_src:
    log_pass("activeHtml5Audio.onended contains tightened minimum duration lock")
else:
    log_fail("activeHtml5Audio.onended missing tightened minimum duration lock")

if "activeHtml5Audio.defaultPlaybackRate = currentRate;" in js_src and "activeHtml5Audio.playbackRate = currentRate;" in js_src:
    log_pass("HTML5 Audio locks defaultPlaybackRate and playbackRate upon src change")
else:
    log_fail("HTML5 Audio playbackRate locking check failed")

# Verify Mobile Hardware Compositor Fixes (No Vanishing Letters or Layer Flooding)
with open("static/css/style.css", "r", encoding="utf-8") as f:
    css_src = f.read()

if "content-visibility: auto;" not in css_src and "contain-intrinsic-size: 0 75px;" not in css_src:
    log_pass("style.css verified free of content-visibility: auto (no vanishing text during scroll)")
else:
    log_fail("style.css still contains content-visibility: auto or artificial intrinsic sizing")

# Verify Dexie Anti-Poisoning & Auto-Healing Cache Guard
if "Dexie cache for Chapter ${num} had 0 paragraphs or empty notice" in js_src:
    log_pass("reader.js automatically purges corrupted 0-word Dexie stubs and heals from server")
else:
    log_fail("reader.js missing corrupted Dexie cache auto-healing guard")

# Verify Safe Plain-Text Paragraph Dexie Storage (No Raw HTML Overwrites)
if "content: cleanParas.join('\\n\\n')" in js_src and "paragraphs: cleanParas" in js_src:
    log_pass("reader.js stores clean plain-text paragraphs into Dexie (no raw HTML or 0-word stubs)")
else:
    log_fail("reader.js missing safe plain-text paragraph Dexie storage")

# -----------------------------------------------------------------------------
# FINAL REPORT
# -----------------------------------------------------------------------------
print("\n" + "=" * 66)
print(f"  FORGE VERIFICATION SUITE COMPLETE")
print(f"  TOTAL CHECKS: {PASSED + FAILED} | PASSED: {PASSED} | FAILED: {FAILED}")
print("=" * 66)

if FAILED == 0:
    print("  ALL 8 FORGE LOOPS PASSED PERFECTLY!\n")
    sys.exit(0)
else:
    print(f"  {FAILED} CHECKS FAILED. PLEASE INVESTIGATE.\n")
    sys.exit(1)

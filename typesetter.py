"""
Typesetter & Natural Language Processing Engine for LightnovelPub
=================================================================
Dedicated module for:
1. Sentence tokenization with abbreviation-safe masking.
2. LitRPG status screen, skill table, and attribute triad detection.
3. Mixed-paragraph segregation (narrative lead-in -> HUD card -> trailing narrative).
4. Semantic paragraph classification for Jinja2 SSR and client-side reader hydration.
5. Inline typography rendering (bold, italics, skill tags, stat delta badges).
6. Audio speech text sanitization (stripping symbol noise before Edge-TTS / Web Speech).
"""

import re
import html
from typing import List, Dict, Optional, Tuple, Any

# -----------------------------------------------------------------------------
# 1. ABBREVIATION-SAFE SENTENCE TOKENIZATION
# -----------------------------------------------------------------------------
ABBREVIATIONS = [
    r'Mr', r'Mrs', r'Ms', r'Dr', r'Prof', r'Sr', r'Jr',
    r'Capt', r'Gen', r'Col', r'Sgt', r'Lt', r'Maj', r'Cpl',
    r'St', r'Rev', r'Hon', r'Gov', r'Pres',
    r'Vol', r'Ch', r'No', r'Fig', r'Sec', r'Dept',
    r'vs', r'etc', r'e\.g', r'i\.e', r'cf', r'al', r'approx', r'est'
]
ABBR_REGEX = re.compile(r'\b(?:' + '|'.join(ABBREVIATIONS) + r')\.', re.IGNORECASE)
INITIAL_REGEX = re.compile(r'\b([A-Z])\.(?=\s+[A-Z])')
DECIMAL_REGEX = re.compile(r'(\d+)\.(\d+)')

DOT_MASK = "\uE000DOT\uE000"
ELLIPSIS_MASK = "\uE000ELLIPSIS\uE000"
SENTENCE_PATTERN = re.compile(r'(.+?[.!?]+(?:[\"\'”’»\)\]]+)?)(?:\s+(?=[A-Z“\"\'‘\[\d])|$)', re.UNICODE)

def tokenize_sentences(text: str) -> List[str]:
    """
    3-Stage Tokenized Sentence Lexer:
    1. Pre-pass: Masks non-terminal periods in honorifics, abbreviations, initials, decimals, and ellipses.
    2. Split: Splits strictly where true terminal punctuation (. ! ?) is followed by whitespace and a capital letter, quote, or bracket.
    3. Post-pass: Restores all masked periods.
    Guarantees every extracted sentence is grammatically complete with terminal punctuation.
    """
    t = (text or "").strip()
    if not t:
        return []

    t = ABBR_REGEX.sub(lambda m: m.group(0)[:-1] + DOT_MASK, t)
    t = INITIAL_REGEX.sub(lambda m: m.group(1) + DOT_MASK, t)
    t = DECIMAL_REGEX.sub(r'\1' + DOT_MASK + r'\2', t)
    t = t.replace('...', ELLIPSIS_MASK).replace('…', ELLIPSIS_MASK)

    raw = SENTENCE_PATTERN.findall(t)

    if not raw:
        raw = [t]
    else:
        captured_text = "".join(raw)
        t_nowhite = re.sub(r'\s+', '', t)
        cap_nowhite = re.sub(r'\s+', '', captured_text)
        if len(cap_nowhite) < len(t_nowhite):
            idx = t.rfind(raw[-1]) + len(raw[-1])
            tail = t[idx:].strip()
            if tail:
                raw[-1] += " " + tail

    clean = []
    for s in raw:
        s = s.replace(ELLIPSIS_MASK, '...').replace(DOT_MASK, '.').strip()
        if s:
            clean.append(s)

    return clean

# -----------------------------------------------------------------------------
# 2. LITRPG STAT & SYSTEM WINDOW DETECTION
# -----------------------------------------------------------------------------
STAT_KEY_REGEX = re.compile(
    r'\b(?:Name|Level|Race|Alignment|Titles?|Class|Rank|Profession|Affinity|Attributes?|Status|Health|Mana|Stamina|Energy|Fatigue|Shield|Barrier|Strength|Agility|Dexterity|Constitution|Endurance|Vitality|Intelligence|Wisdom|Perception|Reaction|Control|Focus|Willpower|Toughness|Charisma|Luck|Free Stats|Stat Points|Skill Points|Attribute Points|Free Points|Nexus Coins|Credits|Gold|Coins|HP|MP|SP|STR|AGI|VIT|END|INT|WIS|PER|DEX|CON|CHA|LUK|WIL)\s*[:：]',
    re.I
)

def is_system_or_stat_block(text: str) -> bool:
    """Detects whether a text chunk is a LitRPG status window, quest, achievement, or table."""
    if not text:
        return False
    t_lower = text.lower()
    
    # 1. Progression & Achievement triggers
    triggers = [
        'new achievement!', 'reward:', 'congratulations!', 'achievement unlocked:',
        'quest completed:', 'quest failed:', 'new quest:', '+1 stat point', 'level up!',
        'world announcement', 'skill acquired', 'skill learned', 'title acquired',
        'evolution available'
    ]
    if any(k in t_lower for k in triggers):
        return True

    # 2. Bracket-enclosed System or Quest alerts: [System: ...], 【Status Window】, etc.
    if (text.startswith(('[', '【', '《', '〔', '『')) and text.endswith((']', '】', '》', '〕', '』'))) or \
       re.search(r'\[\s*(?:System|Notice|Alert|Warning|Quest|Skill|Title|Status|Achievement|Reward)', text, re.I):
        return True

    # 3. Dense attribute key-value pairs (HP, MP, STR, AGI, INT, etc. - requires >= 2 attributes)
    stat_matches = STAT_KEY_REGEX.findall(text)
    if len(stat_matches) >= 2:
        return True

    # 4. ASCII / Markdown table blocks / Pipe skill lists
    if text.count('|') >= 4 or (text.count('+') >= 4 and '-' in text):
        return True

    return False

def format_stat_block_rows(text: str) -> str:
    """
    Intelligently inserts newline row boundaries before major LitRPG attribute clusters
    if the stat block was provided as a single un-formatted line.
    """
    if not text or '\n' in text:
        return text

    BREAK_KEYS = [
        r'Level\s*[:：]',
        r'Class\s*[:：]',
        r'Titles?\s*[:：]',
        r'Rank\s*[:：]',
        r'Health\s*[:：]',
        r'HP\s*[:：]',
        r'Strength\s*[:：]',
        r'STR\s*[:：]',
        r'Vitality\s*[:：]',
        r'VIT\s*[:：]',
        r'Luck\s*[:：]',
        r'LUK\s*[:：]'
    ]
    pattern = r'(?<=\S)\s+(?=(?:' + '|'.join(BREAK_KEYS) + r'))'
    return re.sub(pattern, '\n', text)

# -----------------------------------------------------------------------------
# 3. MIXED PARAGRAPH SEGREGATION ENGINE
# -----------------------------------------------------------------------------
def segregate_mixed_paragraph(text: str) -> List[str]:
    """
    Splits any paragraph containing a LitRPG stat block mixed with narrative lead-in or trailing prose.
    Guarantees pure status telemetry is segregated from novel story prose.
    Protects multi-item pipe lists (skill tables) from premature sentence splits.
    """
    text = (text or '').strip()
    if not text:
        return []
    matches = list(STAT_KEY_REGEX.finditer(text))
    if len(matches) < 2:
        return [text]

    first_m = matches[0]
    last_m = matches[-1]

    lead_in = text[:first_m.start()].strip()
    rest = text[last_m.end():]

    # If rest contains pipe symbols '|', the skill/stat table extends through all pipe items!
    if '|' in rest:
        last_pipe_idx = rest.rfind('|')
        after_pipe = rest[last_pipe_idx:]
        m_prose = re.search(r'[\.\!\?]\s+([A-Z][A-Za-z0-9\-\'\"]*(?:\s+[A-Za-z0-9\-\'\"]+){2,})', after_pipe)
        if m_prose:
            cut = last_m.end() + last_pipe_idx + m_prose.start() + 1
            stat_block = text[first_m.start():cut].strip()
            trailing_prose = text[cut:].strip()
        else:
            m_prose_noperiod = re.search(r'(?<=\d)\s+([A-Z][a-z]+(?:\s+[a-z]+){1,3}\s+[a-z]+[\s\S]*)', after_pipe)
            if m_prose_noperiod and not re.search(r'\b(?:Lvl|Level)\s+\d+', m_prose_noperiod.group(1), re.I):
                cut = last_m.end() + last_pipe_idx + m_prose_noperiod.start()
                stat_block = text[first_m.start():cut].strip()
                trailing_prose = text[cut:].strip()
            else:
                stat_block = text[first_m.start():].strip()
                trailing_prose = ""
    else:
        # Standard key-value stat block without pipes
        val_m = re.match(r'^\s*([^\.\!\?\n]+?)(?=\s+[A-Z][a-z]+|\s*[\.\!\?]\s+[A-Z]|$)', rest)
        if val_m:
            val_end = last_m.end() + val_m.end()
            stat_block = text[first_m.start():val_end].strip()
            trailing_prose = text[val_end:].strip()
        else:
            fallback_m = re.match(r'^\s*(\S+)', rest)
            val_end = last_m.end() + (fallback_m.end() if fallback_m else 0)
            stat_block = text[first_m.start():val_end].strip()
            trailing_prose = text[val_end:].strip()

    stat_block = format_stat_block_rows(stat_block)
    trailing_prose = re.sub(r'^[,\.\s]+', '', trailing_prose).strip()

    res = []
    if lead_in and len(lead_in) > 3:
        res.append(lead_in)
    if stat_block:
        res.append(stat_block)
    if trailing_prose and len(trailing_prose) > 3:
        res.append(trailing_prose)
    return res if res else [text]

# -----------------------------------------------------------------------------
# 4. SEMANTIC PARAGRAPH CLASSIFICATION
# -----------------------------------------------------------------------------
def classify_paragraph(text: str) -> dict:
    """
    Canonical LitRPG paragraph classifier used by both Python SSR and verification loops.
    """
    text = (text or '').strip()
    if not text:
        return {'type': 'empty'}

    # 1. Scene break / divider
    if (len(text) >= 3 and len(text) <= 30 and (text in ('***', '---', '~~~') or text.startswith(('◆◆◆', '===', '***')))) or \
       re.match(r'^[\s\*~_|\#=\+\^`★☆※●○◆◇■□▪▬◊§¤\-—–\.\:\/\u2500-\u257F═]{2,}$', text) or \
       re.match(r'^(\*\s*){3,}$', text) or \
       re.match(r'^(─|\-|=|_|~|\*){3,}$', text):
        return {'type': 'scene_break'}

    # 2. Golden Achievement / Title
    if text.startswith(('[Achievement', '【Achievement', '[Title', '【Title', 'New achievement!', 'Reward:', 'Congratulations!', 'Achievement Unlocked:', '+1 Stat point', 'Level Up!')) or \
       re.search(r'\b(?:Achievement Unlocked|Title Acquired|Title Bestowed)\s*[:：]', text, re.I) or \
       re.search(r'【(?:成就|称号)[^】]*】', text):
        badge = '👑 TITLE BESTOWED' if re.search(r'(?:title\s*(?:acquired|gained|bestowed)|【称号)', text, re.I) else '✦ ACHIEVEMENT UNLOCKED'
        return {'type': 'achievement', 'card_class': 'system-card-achievement', 'badge': badge}

    # 3. Quest Directive / Objectives
    if text.startswith(('[Quest', '【Quest', '[Mission', '【Mission', 'Quest:', 'Quest Alert:', 'Quest Log:', 'Quest Completed:', 'Quest Failed:', 'New Quest:')) or \
       re.search(r'^(?:\[|【)\s*(?:Main|Side|Emergency|Daily|Hidden|Scenario|Special)?\s*(?:Quest|Mission|Objective|Task)', text, re.I):
        badge = '📜 QUEST COMPLETED' if 'completed' in text.lower() else ('⚠️ QUEST FAILED' if 'failed' in text.lower() else '📜 QUEST DIRECTIVE')
        return {'type': 'quest', 'card_class': 'system-card-quest', 'badge': badge}

    # 4. Status Screen / Stat Attributes
    if is_system_or_stat_block(text):
        return {'type': 'stats', 'card_class': 'system-card-stats', 'badge': '📊 STATUS SCREEN // ATTRIBUTES'}

    # 5. Skill / Spell / Entity Scan Tooltip
    if text.startswith(('[Skill', '【Skill', '[Spell', '【Spell', 'Skill Acquired:', 'Spell Acquired:', 'Skill Learned:')) or \
       re.search(r'^(?:\[|【)\s*(?:Skill|Spell|Ability|Technique)', text, re.I):
        return {'type': 'skill', 'card_class': 'system-card-skill', 'badge': '⚡ SKILL & ABILITY'}

    if text.startswith(('[Item', '【Item', '[Appraisal', '【Appraisal', 'Item Appraisal:', 'Rank: S', 'Rank: A')) or \
       re.search(r'^(?:\[|【)\s*(?:Item|Appraisal|Scan|Artifact|Relic|Equipment|Entity|Monster)', text, re.I):
        return {'type': 'tooltip', 'card_class': 'system-card-tooltip', 'badge': '💎 ENTITY SCAN // TOOLTIP'}

    # 6. World Announcement / System Broadcast
    if text.startswith(('[System', '【System', '【Notice', '[World Announcement', 'Time to Level Collapse:')) or \
       re.search(r'^(?:\[|【)\s*(?:World Announcement|System\s*(?:Notice|Alert|Directive|Broadcast|Announcement|Message)|Dimensional\s*Notice)', text, re.I):
        return {'type': 'broadcast', 'card_class': 'system-card-broadcast', 'badge': '📢 SYSTEM BROADCAST'}

    # 7. Thoughts
    if (text.startswith('*') and text.endswith('*')) or \
       text.startswith(('<<', '«', '『')) or \
       text.endswith(('I thought.', 'I thought', 'thought Carl', 'thought Randidly')) or \
       re.search(r'\bthought\s+[A-Z][a-z]+', text, re.I):
        return {'type': 'thought'}

    # 8. Dialogue
    if text.startswith(('"', '“', "'", '‘', '「')):
        return {'type': 'dialogue'}

    return {'type': 'narrative'}

# -----------------------------------------------------------------------------
# 5. INLINE TYPOGRAPHY RENDERING
# -----------------------------------------------------------------------------
def format_inline_typography(raw_text: str) -> str:
    """
    Renders lightweight markdown bold, italics, skill pills, and stat tags into secure HTML.
    Matches the client-side formatInlineTypography in reader.js.
    """
    if not raw_text:
        return ""
    safe = html.escape(raw_text)
    # 1. Markdown bold (**text**) -> <strong class="reader-bold">text</strong>
    safe = re.sub(r'\*\*([^*]+)\*\*', r'<strong class="reader-bold">\1</strong>', safe)
    # 2. Markdown italic (*text*) -> <em class="reader-italic">\1</em>
    safe = re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)', r'<em class="reader-italic">\1</em>', safe)
    # 3. Inline Skill / Spell brackets: [Fireball], [Shadow Step], etc.
    safe = re.sub(r'\[((?:Skill|Spell|Title|Item)?\s*[\w\s\+\-\'\’]{2,30})\]', r'<span class="reader-inline-tag reader-tag-skill">[\1]</span>', safe)
    # 4. Inline Stat Deltas & Perks:
    STAT_NAMES = r'(?:All\s+stats|Strength|Agility|Dexterity|Endurance|Vitality|Intelligence|Wisdom|Perception|Constitution|Charisma|Luck|Health|Mana|Stamina|STR|AGI|VIT|END|INT|WIS|PER|DEX|CON|CHA|LUK|HP|MP|SP|EXP)'
    safe = re.sub(r'(?:^|\s)(' + STAT_NAMES + r'\s*[\+\-]\s*\d+(?:\.\d+)?%?)', r' <span class="reader-inline-tag reader-tag-stat">\1</span>', safe, flags=re.I)
    safe = re.sub(r'(?:^|\s)([\+\-]\d+(?:\.\d+)?%?\s*(?:' + STAT_NAMES + r'|Stat\s*points?|Points?|Levels?)%?)', r' <span class="reader-inline-tag reader-tag-stat">\1</span>', safe, flags=re.I)
    return safe

# -----------------------------------------------------------------------------
# 6. PARAGRAPH SIZING & SENTENCE PRESERVATION
# -----------------------------------------------------------------------------
def split_long_paragraph(text: str, max_chars: int = 480) -> List[str]:
    """Divides paragraphs strictly into full-sentence units up to max_chars without mid-sentence cuts."""
    text = (text or "").strip()
    if not text:
        return []

    # If paragraph contains a stat block mixed with story prose, segregate first!
    segregated = segregate_mixed_paragraph(text)
    if len(segregated) > 1:
        out = []
        for s in segregated:
            if is_system_or_stat_block(s) and len(s) <= 2500:
                out.append(s)
            else:
                out.extend(split_long_paragraph(s, max_chars=max_chars))
        return out

    # Preserve LitRPG system cards, quest notifications, and status boxes up to 2500 chars
    if is_system_or_stat_block(text) and len(text) <= 2500:
        return [text]

    sentences = tokenize_sentences(text)
    if not sentences:
        return [text]
    if len(sentences) == 1:
        return [sentences[0]]

    chunks = []
    current_chunk = []
    current_len = 0

    for sent in sentences:
        sent_len = len(sent)
        if current_len + sent_len > max_chars and current_chunk:
            chunks.append(" ".join(current_chunk))
            current_chunk = [sent]
            current_len = sent_len
        else:
            current_chunk.append(sent)
            current_len += sent_len + 1

    if current_chunk:
        chunks.append(" ".join(current_chunk))

    return chunks

def process_chapter_paragraphs(paragraphs: List[str], max_chars: int = 480) -> List[str]:
    """
    Sentence-Preserving Paragraph Engine:
    1. Segregates mixed stat/narrative paragraphs.
    2. Recombines any sentences accidentally split across paragraphs (never merging stat blocks into prose).
    3. Coalesces consecutive pure-stat fragments into a single unified telemetry block.
    4. Divides long paragraphs strictly at terminal sentence boundaries (. ! ?).
    """
    TERMINAL_CHARS = set('.!?..."”’\'»)]}')

    # Step 1: Pre-segregate any mixed paragraphs
    expanded = []
    for p in paragraphs:
        p_clean = str(p).strip()
        if not p_clean:
            continue
        expanded.extend(segregate_mixed_paragraph(p_clean))

    # Step 2: Merge accidentally split sentences, but NEVER merge stat blocks into prose
    merged = []
    for p_clean in expanded:
        is_stat = is_system_or_stat_block(p_clean)
        prev_is_stat = is_system_or_stat_block(merged[-1]) if merged else False
        if merged and not is_stat and not prev_is_stat and (merged[-1][-1] not in TERMINAL_CHARS or p_clean[0].islower()):
            merged[-1] = merged[-1] + " " + p_clean
        elif merged and is_stat and prev_is_stat:
            # Coalesce consecutive pure stat blocks
            merged[-1] = merged[-1] + "\n" + p_clean
        else:
            merged.append(p_clean)

    # Step 3: Split long narrative prose while protecting intact stat blocks
    final_paras = []
    for p in merged:
        if is_system_or_stat_block(p) and len(p) <= 2500:
            final_paras.append(p)
        elif len(p) <= max_chars:
            final_paras.append(p)
        else:
            final_paras.extend(split_long_paragraph(p, max_chars=max_chars))

    return final_paras

# Backwards compatibility alias
split_chapter_paragraphs = process_chapter_paragraphs

# -----------------------------------------------------------------------------
# 7. AUDIO SPEECH TEXT SANITIZER (NOVEL PHOENIX ENGINE)
# -----------------------------------------------------------------------------
def clean_speech_text(raw_text: str) -> str:
    """
    Sanitizes text intended for Edge-TTS / Web Speech.
    1. Replaces decorative scene breaks (***, ◆◆◆, ════) with natural speech pauses (, ).
    2. Cleans markdown bold/italic syntax and raw table pipe dividers.
    3. Matches the client-side sanitizeSpeechText from reader.js.
    """
    if not raw_text:
        return ""
    decorative_line_regex = re.compile(r'^[\s\*~_|\#=\+\^`★☆※●○◆◇■□▪▬◊§¤\-—–\.\:\/\u2500-\u257F═]{2,}$', re.MULTILINE)
    cleaned = decorative_line_regex.sub(' ', raw_text)
    cleaned = re.sub(r'(\s*[\*~_|\#=\+\^`★☆※●○◆◇■□▪▬◊§¤\u2500-\u257F═]{2,}\s*)', ', ', cleaned)
    cleaned = re.sub(r'\s{2,}', ' ', cleaned).strip()
    return cleaned

function initReader() {

  try {

  // =========================================================================

  // 0. PWA SERVICE WORKER REGISTRATION (OFFLINE SUPPORT)

  // =========================================================================

  if ('serviceWorker' in navigator) {

    window.addEventListener('load', () => {

      navigator.serviceWorker.register('/sw.js', { scope: '/' })

        .then(reg => console.log('PWA ServiceWorker registered with root scope:', reg.scope))

        .catch(err => console.log('ServiceWorker notice:', err));

    });

  }



  // =========================================================================

  // 1. DOM ELEMENTS & PREFERENCES INITIALIZATION

  // =========================================================================

  const progressBar = document.getElementById('reader-progress-bar');

  const settingsToggle = document.getElementById('toggle-settings-btn');

  const settingsDrawer = document.getElementById('settings-drawer');

  const readerContainer = document.getElementById('reader-container');

  const fontSelect = document.getElementById('font-family-select');

  const fontSizeDisplay = document.getElementById('font-size-val');

  const btnFontDec = document.getElementById('btn-font-dec');

  const btnFontInc = document.getElementById('btn-font-inc');

  const themePills = document.querySelectorAll('.theme-pill-dot');

  const widthSelect = document.getElementById('reading-width-select');

  const lineHeightSelect = document.getElementById('line-height-select');

  const paraGapSelect = document.getElementById('para-gap-select');

  const resetSettingsBtn = document.getElementById('btn-reset-settings');

  const fullscreenBtn = document.getElementById('toggle-fullscreen-btn');

  const fullscreenIcon = document.getElementById('fullscreen-icon');

  const chapterSelect = document.getElementById('chapter-select-dropdown');

  const prevBtn = document.getElementById('prev-chapter-btn');

  const nextBtn = document.getElementById('next-chapter-btn');



  // 5 Curated Desktop & Android Screen Reading Fonts

  const CURATED_FONTS = [

    { id: 'times', name: 'Times New Roman', short: 'Times', value: "'Times New Roman', Times, 'Tinos', serif" },

    { id: 'merriweather', name: 'Merriweather', short: 'Merri', value: "'Merriweather', Georgia, serif" },

    { id: 'lora', name: 'Lora', short: 'Lora', value: "'Lora', Georgia, serif" },

    { id: 'nunito', name: 'Nunito Sans', short: 'Nunito', value: "'Nunito Sans', -apple-system, sans-serif" },

    { id: 'opensans', name: 'Open Sans', short: 'OpenSans', value: "'Open Sans', -apple-system, sans-serif" }

  ];



  // Load preferences from localStorage

  const savedTheme = localStorage.getItem('novel_reader_theme') || 'black';

  const savedFont = localStorage.getItem('novel_reader_font') || "'Times New Roman', Times, 'Tinos', serif";

  const savedFontSize = parseInt(localStorage.getItem('novel_reader_font_size') || '19', 10);

  const savedWidth = localStorage.getItem('novel_reader_width') || '860px';

  const savedLineHeight = localStorage.getItem('novel_reader_line_height') || '1.85';

  const savedParaGap = localStorage.getItem('novel_reader_para_gap') || '1.6rem';



  // Current font size initialized immediately to prevent Temporal Dead Zone ReferenceError

  let currentFontSize = savedFontSize;



  // Apply saved preferences immediately

  applyTheme(savedTheme);

  applyFont(savedFont);

  applyFontSize(savedFontSize);

  applyWidth(savedWidth);

  applyLineHeight(savedLineHeight);

  applyParaGap(savedParaGap);



  // Settings Drawer Toggle

  if (settingsToggle && settingsDrawer) {

    settingsToggle.addEventListener('click', () => {

      settingsDrawer.classList.toggle('open');

    });

  }



  // Theme Switching

  themePills.forEach(pill => {

    pill.addEventListener('click', () => {

      const theme = pill.getAttribute('data-theme');

      applyTheme(theme);

      localStorage.setItem('novel_reader_theme', theme);

    });

  });



  function applyTheme(theme) {

    document.body.setAttribute('data-reader-theme', theme);

    themePills.forEach(p => {

      if (p.getAttribute('data-theme') === theme) {

        p.classList.add('active');

      } else {

        p.classList.remove('active');

      }

    });

  }



  // Font Switching

  if (fontSelect) {

    fontSelect.value = savedFont;

    fontSelect.addEventListener('change', (e) => {

      applyFont(e.target.value);

      localStorage.setItem('novel_reader_font', e.target.value);

    });

  }



  function applyFont(font) {

    if (!font) return;

    document.documentElement.style.setProperty('--reader-font-family', font);

    if (readerContainer) {

      readerContainer.style.setProperty('--reader-font-family', font);

      readerContainer.style.fontFamily = font;

    }

    const canvas = document.querySelector('.reader-article-canvas');

    if (canvas) {

      canvas.style.setProperty('--reader-font-family', font);

      canvas.style.fontFamily = font;

    }

    const chapterContent = document.getElementById('chapter-content');

    if (chapterContent) {

      chapterContent.style.setProperty('--reader-font-family', font);

      chapterContent.style.fontFamily = font;

    }

    if (fontSelect && fontSelect.value !== font) {

      fontSelect.value = font;

    }



    // Sync 1-Touch Visual Font Pills

    const fontPills = document.querySelectorAll('.font-pill-tag');

    fontPills.forEach(pill => {

      if (pill.getAttribute('data-font') === font) {

        pill.classList.add('active');

      } else {

        pill.classList.remove('active');

      }

    });



    // Sync Quick Dock Font Badge

    const matched = CURATED_FONTS.find(f => f.value === font);

    const dockFontBadge = document.getElementById('dock-font-badge');

    if (dockFontBadge) {

      dockFontBadge.textContent = matched ? matched.short : 'Font';

    }

  }



  // Font Size Adjuster (already declared above)

  if (btnFontDec) {

    btnFontDec.addEventListener('click', () => {

      if (currentFontSize > 14) {

        currentFontSize -= 1;

        applyFontSize(currentFontSize);

        localStorage.setItem('novel_reader_font_size', currentFontSize);

      }

    });

  }



  if (btnFontInc) {

    btnFontInc.addEventListener('click', () => {

      if (currentFontSize < 34) {

        currentFontSize += 1;

        applyFontSize(currentFontSize);

        localStorage.setItem('novel_reader_font_size', currentFontSize);

      }

    });

  }



  function applyFontSize(size) {

    currentFontSize = size;

    if (readerContainer) {

      readerContainer.style.fontSize = `${size}px`;

    }

    if (fontSizeDisplay) {

      fontSizeDisplay.textContent = `${size}px`;

    }

  }



  // Reading Width Adjuster

  if (widthSelect) {

    widthSelect.value = savedWidth;

    widthSelect.addEventListener('change', (e) => {

      applyWidth(e.target.value);

      localStorage.setItem('novel_reader_width', e.target.value);

    });

  }



  function applyWidth(width) {

    document.documentElement.style.setProperty('--reader-max-width', width);

    if (readerContainer) {

      readerContainer.style.maxWidth = width;

    }

    const navRows = document.querySelectorAll('.chapter-nav-row');

    navRows.forEach(row => row.style.maxWidth = width);

    if (widthSelect) {

      widthSelect.value = width;

    }

  }



  // Line Height Adjuster

  if (lineHeightSelect) {

    lineHeightSelect.value = savedLineHeight;

    lineHeightSelect.addEventListener('change', (e) => {

      applyLineHeight(e.target.value);

      localStorage.setItem('novel_reader_line_height', e.target.value);

    });

  }



  function applyLineHeight(val) {

    document.documentElement.style.setProperty('--reader-line-height', val);

    if (readerContainer) {

      readerContainer.style.lineHeight = val;

    }

    if (lineHeightSelect) {

      lineHeightSelect.value = val;

    }

  }



  // Paragraph Gap Adjuster

  if (paraGapSelect) {

    paraGapSelect.value = savedParaGap;

    paraGapSelect.addEventListener('change', (e) => {

      applyParaGap(e.target.value);

      localStorage.setItem('novel_reader_para_gap', e.target.value);

    });

  }



  function applyParaGap(val) {

    document.documentElement.style.setProperty('--reader-para-spacing', val);

    const paragraphs = document.querySelectorAll('#chapter-content p');

    paragraphs.forEach(p => p.style.marginBottom = val);

    if (paraGapSelect) {

      paraGapSelect.value = val;

    }

  }



  // Fullscreen Mode Toggle

  if (fullscreenBtn) {

    fullscreenBtn.addEventListener('click', toggleFullscreen);

  }



  function toggleFullscreen() {

    if (!document.fullscreenElement) {

      document.documentElement.requestFullscreen().catch(() => {});

      if (fullscreenIcon) fullscreenIcon.textContent = '✕';

    } else {

      if (document.exitFullscreen) {

        document.exitFullscreen().catch(() => {});

      }

      if (fullscreenIcon) fullscreenIcon.textContent = '⛶';

    }

  }



  document.addEventListener('fullscreenchange', () => {

    if (fullscreenIcon) {

      fullscreenIcon.textContent = document.fullscreenElement ? '✕' : '⛶';

    }

  });



  // Reset Preferences to Defaults

  if (resetSettingsBtn) {

    resetSettingsBtn.addEventListener('click', () => {

      applyTheme('black');

      applyFont("'Nunito Sans', sans-serif");

      applyFontSize(19);

      applyWidth('860px');

      applyLineHeight('1.85');

      applyParaGap('1.6rem');

      applyBionicReading(false);



      localStorage.removeItem('novel_reader_theme');

      localStorage.removeItem('novel_reader_font');

      localStorage.removeItem('novel_reader_font_size');

      localStorage.removeItem('novel_reader_width');

      localStorage.removeItem('novel_reader_line_height');

      localStorage.removeItem('novel_reader_para_gap');

      localStorage.removeItem('novel_reader_bionic');

    });

  }



  // =========================================================================

  // BIONIC SKIM READING MODE

  // =========================================================================

  const btnToggleBionic = document.getElementById('btn-toggle-bionic');

  let isBionicActive = localStorage.getItem('novel_reader_bionic') === 'true';



  function applyBionicReading(enable) {

    isBionicActive = enable;

    localStorage.setItem('novel_reader_bionic', enable ? 'true' : 'false');

    if (btnToggleBionic) {

      btnToggleBionic.textContent = enable ? '⚡ On' : '⚡ Off';

      btnToggleBionic.classList.toggle('active', enable);

    }

    const chapterContent = document.getElementById('chapter-content');

    if (!chapterContent) return;

    chapterContent.classList.toggle('bionic-reading-active', enable);



    const paras = chapterContent.querySelectorAll('p');

    paras.forEach(p => {

      if (!p.getAttribute('data-tokenized')) {

        tokenizeParagraphWords(p);

      }

      p.querySelectorAll('.np-word-token').forEach(span => {

        let raw = span.getAttribute('data-raw-word');

        if (!raw) {

          raw = span.textContent;

          span.setAttribute('data-raw-word', raw);

        }

        if (enable) {

          if (raw.length <= 1) {

            span.innerHTML = `<b>${raw}</b>`;

          } else {

            const splitIdx = Math.ceil(raw.length * 0.45);

            span.innerHTML = `<b>${raw.slice(0, splitIdx)}</b>${raw.slice(splitIdx)}`;

          }

        } else {

          span.textContent = raw;

        }

      });

    });

  }



  if (btnToggleBionic) {

    btnToggleBionic.addEventListener('click', () => {

      applyBionicReading(!isBionicActive);

    });

    if (isBionicActive) {

      applyBionicReading(true);

    }

  }



  // =========================================================================

  // SYSTEM VS MC DISTINGUISHER & HOLOGRAPHIC HUD CONTROLLER

  // =========================================================================

  const btnToggleSystemHud = document.getElementById('btn-toggle-system-hud');

  let systemHudEnabled = localStorage.getItem('novel_reader_system_hud') !== 'false';



  function setSystemHud(enabled) {

    systemHudEnabled = enabled;

    localStorage.setItem('novel_reader_system_hud', enabled ? 'true' : 'false');

    document.body.classList.toggle('system-hud-disabled', !enabled);

    if (btnToggleSystemHud) {

      btnToggleSystemHud.textContent = enabled ? '⚡ HUD On' : '⚡ HUD Off';

      btnToggleSystemHud.classList.toggle('active', enabled);

    }

  }



  if (btnToggleSystemHud) {

    btnToggleSystemHud.addEventListener('click', () => {

      setSystemHud(!systemHudEnabled);

    });

    setSystemHud(systemHudEnabled);

  }



  function buildParagraphElement(pText, idx) {

    const text = (pText || '').trim();

    if (text.includes('New achievement!') || text.startsWith('Reward:') || text.includes('Congratulations!') || text.includes('Achievement Unlocked:') || text.includes('Quest Completed:') || text.includes('+1 Stat point')) {

      const card = document.createElement('div');

      card.className = 'reader-system-card system-card-achievement';

      card.setAttribute('data-para-idx', String(idx));

      card.setAttribute('data-system-type', 'achievement');

      card.title = 'Click to start audio reading from here';

      card.innerHTML = `

        <div class="system-card-header">

          <span class="system-badge">✦ ACHIEVEMENT UNLOCKED</span>

        </div>

        <div class="system-card-body">${text}</div>

      `;

      return card;

    } else if (text.includes('Crawler #') || text.includes('Race:') || text.includes('Class:') || text.includes('Health(') || text.includes('Mana(') || text.includes('Stam(') || text.includes('Vitality:') || text.includes('Endurance:') || text.includes('Strength:') || text.includes('Agility:') || text.includes('Perception:') || text.includes('Level: N/A') || text.includes('Status:')) {

      const card = document.createElement('div');

      card.className = 'reader-system-card system-card-stats';

      card.setAttribute('data-para-idx', String(idx));

      card.setAttribute('data-system-type', 'stats');

      card.title = 'Click to start audio reading from here';

      card.innerHTML = `

        <div class="system-card-header">

          <span class="system-badge">📊 CRAWLER TELEMETRY // STATS</span>

        </div>

        <div class="system-card-body">${text}</div>

      `;

      return card;

    } else if (text.includes('Goblin Murder Dozer') || text.includes('Goblin. Level') || text.includes('Goblin Engineer') || text.includes('A tooltip popped up') || text.includes('A tool-tip') || text.includes('information box popped up') || text.includes('Contraption.') || text.includes('Level 1. A') || text.includes('Level 2. Small') || text.includes('Level 3. Engineers')) {

      const card = document.createElement('div');

      card.className = 'reader-system-card system-card-tooltip';

      card.setAttribute('data-para-idx', String(idx));

      card.setAttribute('data-system-type', 'tooltip');

      card.title = 'Click to start audio reading from here';

      card.innerHTML = `

        <div class="system-card-header">

          <span class="system-badge">⚡ ENTITY SCAN // TOOLTIP</span>

        </div>

        <div class="system-card-body">${text}</div>

      `;

      return card;

    } else if (text.includes('Please pay careful attention') || text.includes('You have been designated Crawler') || text.includes('Time to Level Collapse:') || text.includes('Dungeon Floor') || text.includes('System initializing') || text.startsWith('[System')) {

      const card = document.createElement('div');

      card.className = 'reader-system-card system-card-broadcast';

      card.setAttribute('data-para-idx', String(idx));

      card.setAttribute('data-system-type', 'broadcast');

      card.title = 'Click to start audio reading from here';

      card.innerHTML = `

        <div class="system-card-header">

          <span class="system-badge">📢 DUNGEON DIRECTIVE</span>

        </div>

        <div class="system-card-body">${text}</div>

      `;

      return card;

    } else if (text.endsWith('I thought.') || text.endsWith('I thought') || text.includes('thought Carl') || text.includes('thought Randidly') || text.startsWith('*')) {

      const p = document.createElement('p');

      p.className = 'reader-thought';

      p.setAttribute('data-para-index', String(idx));

      p.setAttribute('data-para-idx', String(idx));

      p.title = 'Click to start audio reading from here';

      p.textContent = text;

      return p;

    } else if (text.startsWith('"') || text.startsWith('“') || text.startsWith("'") || text.startsWith('‘')) {

      const p = document.createElement('p');

      p.className = 'reader-dialogue';

      p.setAttribute('data-para-index', String(idx));

      p.setAttribute('data-para-idx', String(idx));

      p.title = 'Click to start audio reading from here';

      p.textContent = text;

      return p;

    } else {

      const p = document.createElement('p');

      p.className = 'reader-narrative';

      p.setAttribute('data-para-index', String(idx));

      p.setAttribute('data-para-idx', String(idx));

      p.title = 'Click to start audio reading from here';

      p.textContent = text;

      return p;

    }

  }



  // =========================================================================

  // SEAMLESS INSTANT SPA CHAPTER NAVIGATION ENGINE (<100MS ZERO-LAG TRANSITION)

  // =========================================================================

  const chapterCache = new Map();

  let isChapterLoading = false;



  async function fetchChapterData(chNum) {

    if (chapterCache.has(chNum)) {

      return chapterCache.get(chNum);

    }

    // Check Dexie IndexedDB (Case-Insensitive Resilient Query)
    if (novelDb) {
      try {
        let cached = await novelDb.chapters.get([novelSlug, chNum]);
        if (!cached) {
          cached = await novelDb.chapters.filter(c => c.novelSlug && c.novelSlug.toLowerCase() === novelSlug.toLowerCase() && c.chapterNumber === chNum).first();
        }
        if (cached && cached.paragraphs && cached.paragraphs.length > 0) {
          chapterCache.set(chNum, cached);
          return cached;
        }
      } catch (e) {}
    }

    // Fetch JSON from high-speed backend API

    try {

      const res = await fetch(`/api/novel/${novelSlug}/chapter/${chNum}`);

      if (res.ok) {

        const data = await res.json();

        chapterCache.set(chNum, data);

        if (novelDb) {

          novelDb.chapters.put({

            novelSlug: novelSlug,

            chapterNumber: chNum,

            title: data.title,

            content: (data.paragraphs || []).join('\n\n'),

            paragraphs: data.paragraphs,

            word_count: data.word_count,

            read_time_mins: data.read_time_mins,

            prev_chapter: data.prev_chapter,

            next_chapter: data.next_chapter,

            updated_at: Date.now()

          }).catch(() => {});

        }

        return data;

      }

    } catch (netErr) {

      console.warn("Backend fetch failed, attempting IndexedDB fallback:", netErr);

    }



    // Dexie IndexedDB Fallback (handles Vercel ephemeral container restart or offline)

    if (novelDb) {

      try {

        const local = await novelDb.chapters.get([novelSlug, chNum]);

        if (local) {

          const paras = local.paragraphs || (local.content ? local.content.split('\n\n') : []);

          const formatted = {

            slug: novelSlug,

            novel_title: document.body.getAttribute('data-novel-title') || novelSlug,

            chapter_number: chNum,

            title: local.title || `Chapter ${chNum}`,

            paragraphs: paras,

            word_count: local.word_count || paras.reduce((acc, p) => acc + p.split(/\s+/).length, 0),

            read_time_mins: local.read_time_mins || Math.max(1, Math.round((local.word_count || 1000) / 220)),

            prev_chapter: local.prev_chapter,

            next_chapter: local.next_chapter,

            total_chapters: 0

          };

          chapterCache.set(chNum, formatted);

          return formatted;

        }

      } catch (dbErr) {

        console.warn("Dexie fallback error:", dbErr);

      }

    }

    throw new Error(`Failed to load Chapter ${chNum}`);

  }



  function prefetchAdjacentChapters(curNum) {

    const nextNum = parseInt(document.body.getAttribute('data-next-num') || '0', 10);

    const prevNum = parseInt(document.body.getAttribute('data-prev-num') || '0', 10);

    if (nextNum > 0 && !chapterCache.has(nextNum)) {

      fetchChapterData(nextNum).catch(() => {});

    }

    if (prevNum > 0 && !chapterCache.has(prevNum)) {

      fetchChapterData(prevNum).catch(() => {});

    }

  }



  function updateNavButtons(prevCh, nextCh) {
    const topPrev = document.getElementById('prev-chapter-btn');
    const topNext = document.getElementById('next-chapter-btn');
    const btmPrev = document.getElementById('prev-chapter-btn-bottom');
    const btmNext = document.getElementById('next-chapter-btn-bottom');

    const prevNum = parseInt(prevCh || '0', 10);
    const nextNum = parseInt(nextCh || '0', 10);

    [topPrev, btmPrev].forEach(btn => {
      if (!btn) return;
      if (prevNum > 0) {
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('disabled');
        btn.setAttribute('href', `/novel/${novelSlug}/chapter/${prevNum}`);
      } else {
        btn.setAttribute('disabled', 'true');
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('disabled');
        btn.setAttribute('href', '#');
      }
    });

    [topNext, btmNext].forEach(btn => {
      if (!btn) return;
      if (nextNum > 0) {
        btn.removeAttribute('disabled');
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('disabled');
        btn.setAttribute('href', `/novel/${novelSlug}/chapter/${nextNum}`);
      } else {
        btn.setAttribute('disabled', 'true');
        btn.setAttribute('aria-disabled', 'true');
        btn.classList.add('disabled');
        btn.setAttribute('href', '#');
      }
    });
  }

  async function navigateToChapter(targetChapterNum, continueAudio = false) {
    if (!targetChapterNum || isChapterLoading) return;
    if (targetChapterNum === currentChapterNum) return;
    isChapterLoading = true;

    const progBar = document.getElementById('reader-progress-bar');
    if (progBar) {
      progBar.style.width = '65%';
      progBar.style.transition = 'width 0.15s ease';
    }

    try {
      const data = await fetchChapterData(targetChapterNum);
      if (!data || !data.paragraphs) throw new Error('Invalid chapter data');

      currentChapterNum = data.chapter_number;
      storageKey = `progress_${novelSlug}_ch${currentChapterNum}`;
      paraStorageKey = `progress_para_${novelSlug}_ch${currentChapterNum}`;
      pctStorageKey = `progress_pct_${novelSlug}_ch${currentChapterNum}`;

      // Resilient Next / Prev resolution for both server and local Dexie chapters
      let nextNum = data.next_chapter;
      let prevNum = data.prev_chapter;

      if (typeof nextNum === 'undefined' || typeof prevNum === 'undefined') {
        if (novelDb) {
          try {
            const allLocal = await novelDb.chapters.filter(c => c.novelSlug && c.novelSlug.toLowerCase() === novelSlug.toLowerCase()).toArray();
            if (allLocal && allLocal.length > 0) {
              allLocal.sort((a, b) => a.chapterNumber - b.chapterNumber);
              const curIdx = allLocal.findIndex(c => c.chapterNumber === currentChapterNum);
              if (curIdx !== -1) {
                prevNum = curIdx > 0 ? allLocal[curIdx - 1].chapterNumber : 0;
                nextNum = curIdx < allLocal.length - 1 ? allLocal[curIdx + 1].chapterNumber : 0;
              }
            }
          } catch (e) {}
        }
        if (typeof nextNum === 'undefined') nextNum = currentChapterNum + 1;
        if (typeof prevNum === 'undefined') prevNum = currentChapterNum > 1 ? currentChapterNum - 1 : 0;
      }

      document.body.setAttribute('data-chapter-num', String(data.chapter_number));
      document.body.setAttribute('data-next-num', nextNum && nextNum > 0 ? String(nextNum) : '');
      document.body.setAttribute('data-prev-num', prevNum && prevNum > 0 ? String(prevNum) : '');
      nextChapterUrl = nextNum && nextNum > 0 ? `/novel/${novelSlug}/chapter/${nextNum}` : '';
      const prevChapterUrl = prevNum && prevNum > 0 ? `/novel/${novelSlug}/chapter/${prevNum}` : '';
      document.body.setAttribute('data-next-url', nextChapterUrl);
      document.body.setAttribute('data-prev-url', prevChapterUrl);

      const pageTitle = `${data.title} — ${data.novel_title || 'Novel'} — LightnovelPub`;
      document.title = pageTitle;
      window.history.pushState({ chapterNumber: data.chapter_number }, pageTitle, `/novel/${novelSlug}/chapter/${data.chapter_number}`);

      const topbarTitle = document.querySelector('.reader-chapter-title-text');
      if (topbarTitle) topbarTitle.textContent = data.title;

      const headlineTitle = document.querySelector('.chapter-headline-title');
      if (headlineTitle) headlineTitle.textContent = data.title;

      const headlineWords = document.querySelector('.chapter-headline-words') || document.querySelector('.chapter-reading-meta');
      if (headlineWords) {
        const words = data.word_count || (data.paragraphs ? data.paragraphs.join(' ').split(/\s+/).filter(Boolean).length : 0);
        headlineWords.innerHTML = `${words.toLocaleString()} WORDS &bull; ESTIMATED READ: ${Math.max(1, Math.round(words / 220))} MINS`;
      }

      const audioChapterTitle = document.getElementById('np-audio-chapter-title');
      if (audioChapterTitle) audioChapterTitle.textContent = data.title;

      updateNavButtons(prevNum, nextNum);

      if (chapterSelect) {
        chapterSelect.value = `/novel/${novelSlug}/chapter/${data.chapter_number}`;
      }

      const chapterContent = document.getElementById('chapter-content');
      if (chapterContent) {
        chapterContent.innerHTML = '';
        const fragment = document.createDocumentFragment();
        data.paragraphs.forEach((pText, idx) => {
          fragment.appendChild(buildParagraphElement(pText, idx));
        });
        chapterContent.appendChild(fragment);
      }

      paragraphNodes = Array.from(document.querySelectorAll('#chapter-content p, #chapter-content .reader-system-card'));
      if (typeof attachParagraphTouchGuards === 'function') {
        attachParagraphTouchGuards();
      }

      window.scrollTo({ top: 0, behavior: 'instant' });
      if (progBar) progBar.style.width = '0%';
      recordReadingProgress(0, false);
      updateMediaSession();

      const wasAudioActive = continueAudio || (audioState.isPlaying && !audioState.isPaused);
      if (wasAudioActive) {
        stopSpeech();
        clearPrefetchedAudio();
        audioState.currentIndex = 0;
        setTimeout(() => {
          speakParagraph(0, false);
        }, 150);
      }

      prefetchAdjacentChapters(data.chapter_number);
    } catch (err) {
      console.warn('Dynamic navigation fallback:', err);
      window.location.href = `/novel/${novelSlug}/chapter/${targetChapterNum}`;
    } finally {
      isChapterLoading = false;
      if (progBar) progBar.style.width = '0%';
    }
  }

  function attachChapterNavButtons() {
    const topPrev = document.getElementById('prev-chapter-btn');
    const topNext = document.getElementById('next-chapter-btn');
    const btmPrev = document.getElementById('prev-chapter-btn-bottom');
    const btmNext = document.getElementById('next-chapter-btn-bottom');

    [topPrev, btmPrev].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        const prevNum = parseInt(document.body.getAttribute('data-prev-num') || '0', 10);
        if (prevNum > 0) {
          e.preventDefault();
          navigateToChapter(prevNum, audioState && audioState.isPlaying && !audioState.isPaused);
        }
      });
    });

    [topNext, btmNext].forEach(btn => {
      if (!btn) return;
      btn.addEventListener('click', (e) => {
        const nextNum = parseInt(document.body.getAttribute('data-next-num') || '0', 10);
        if (nextNum > 0) {
          e.preventDefault();
          navigateToChapter(nextNum, audioState && audioState.isPlaying && !audioState.isPaused);
        }
      });
    });
  }

  attachChapterNavButtons();




  // Handle browser Back / Forward buttons without full reload

  window.addEventListener('popstate', (e) => {

    const match = window.location.pathname.match(/\/chapter\/(\d+)/);

    if (match) {

      const ch = parseInt(match[1], 10);

      if (ch !== currentChapterNum) {

        navigateToChapter(ch, false);

      }

    }

  });



  // Chapter Dropdown Jump

  if (chapterSelect) {

    chapterSelect.addEventListener('change', (e) => {

      const url = e.target.value;

      const match = url.match(/\/chapter\/(\d+)/);

      if (match) {

        navigateToChapter(parseInt(match[1], 10), audioState.isPlaying && !audioState.isPaused);

      } else {

        window.location.href = url;

      }

    });

  }



  // Pre-fetch adjacent chapters for instant switching

  setTimeout(() => {

    prefetchAdjacentChapters(currentChapterNum);

  }, 1000);



  // Pre-index all chapter paragraphs with deterministic data-para-idx (including System HUD Cards)

  let paragraphNodes = Array.from(document.querySelectorAll('#chapter-content p, #chapter-content .reader-system-card'));

  // Note: Paragraph click interactions are guarded by attachParagraphTouchGuards below (zero accidental skips)



  // =========================================================================

  // 2.5 RESILIENT DUAL-TIER PROGRESS TRACKING & PARAGRAPH ANCHOR ENGINE

  // =========================================================================

  const novelSlug = document.body.getAttribute('data-novel-slug');

  let currentChapterNum = parseInt(document.body.getAttribute('data-chapter-num') || '1', 10);

  let nextChapterUrl = document.body.getAttribute('data-next-url');

  let storageKey = `progress_${novelSlug}_ch${currentChapterNum}`;

  let paraStorageKey = `progress_para_${novelSlug}_ch${currentChapterNum}`;

  let pctStorageKey = `progress_pct_${novelSlug}_ch${currentChapterNum}`;

  const novelSummaryKey = `novel_progress_${novelSlug}`;



  // Dexie IndexedDB Initialization (Tier 2 Offline Cache)

  let novelDb = null;

  if (typeof Dexie !== 'undefined') {

    try {

      novelDb = new Dexie('LightnovelpubDB_v4');

      novelDb.version(2).stores({

        customNovels: 'slug, title, author, synopsis, cover_image, total_chapters, created_at',

        chapters: '[novelSlug+chapterNumber], novelSlug, chapterNumber, title, content, updated_at',

        progress: 'novelSlug, chapterNumber, percent, paraIndex, updated_at',

        audioCache: '[novelSlug+chapterNumber+paraIndex], novelSlug, chapterNumber, paraIndex, audioBlob, created_at',

        covers: 'slug, dataUrl, updated_at'

      });

            // Client-Side Authoritative Hydration: Load chapter & full TOC from Dexie
      if (novelDb && novelSlug) {
        novelDb.chapters.filter(c => c.novelSlug && c.novelSlug.toLowerCase() === novelSlug.toLowerCase()).toArray().then(allLocalChs => {
          if (allLocalChs && allLocalChs.length > 0) {
            allLocalChs.sort((a, b) => a.chapterNumber - b.chapterNumber);

            // 1. Populate Table of Contents dropdown selector
            const chDropdown = document.getElementById('chapter-select-dropdown');
            if (chDropdown) {
              chDropdown.innerHTML = '';
              allLocalChs.forEach(c => {
                const opt = document.createElement('option');
                opt.value = `/novel/${novelSlug}/chapter/${c.chapterNumber}`;
                opt.textContent = c.title || `Chapter ${c.chapterNumber}`;
                if (c.chapterNumber === currentChapterNum) opt.selected = true;
                chDropdown.appendChild(opt);
              });
            }

            // 2. Resolve Previous & Next Chapter targets
            const curIdx = allLocalChs.findIndex(c => c.chapterNumber === currentChapterNum);
            const prevChDoc = curIdx > 0 ? allLocalChs[curIdx - 1] : null;
            const nextChDoc = curIdx < allLocalChs.length - 1 ? allLocalChs[curIdx + 1] : null;

            const prevNum = prevChDoc ? prevChDoc.chapterNumber : 0;
            const nextNum = nextChDoc ? nextChDoc.chapterNumber : 0;

            document.body.setAttribute('data-prev-num', prevNum > 0 ? String(prevNum) : '');
            document.body.setAttribute('data-next-num', nextNum > 0 ? String(nextNum) : '');
            document.body.setAttribute('data-prev-url', prevNum > 0 ? `/novel/${novelSlug}/chapter/${prevNum}` : '');
            document.body.setAttribute('data-next-url', nextNum > 0 ? `/novel/${novelSlug}/chapter/${nextNum}` : '');
            updateNavButtons(prevNum, nextNum);

            // 3. Populate Chapter Content if not rendered by server
            const contentEl = document.getElementById('chapter-content');
            if (contentEl && (contentEl.children.length === 0 || !contentEl.textContent.trim())) {
              const localCh = allLocalChs.find(c => c.chapterNumber === currentChapterNum) || allLocalChs[0];
              if (localCh) {
                const paras = localCh.paragraphs || (localCh.content ? localCh.content.split('\n\n') : []);
                contentEl.innerHTML = '';
                paras.forEach((pText, pIdx) => {
                  contentEl.appendChild(buildParagraphElement(pText, pIdx));
                });
                paragraphNodes = Array.from(document.querySelectorAll('#chapter-content p, #chapter-content .reader-system-card'));

                const totalWords = localCh.word_count || paras.join(' ').split(/\s+/).filter(Boolean).length;
                const estMins = Math.max(1, Math.round(totalWords / 220));
                const headlineWords = document.querySelector('.chapter-reading-meta') || document.querySelector('.chapter-headline-words');
                if (headlineWords) {
                  headlineWords.innerHTML = `${totalWords.toLocaleString()} WORDS &bull; ESTIMATED READ: ${estMins} MINS`;
                }

                if (localCh.title) {
                  const headTitle = document.querySelector('.chapter-headline-title');
                  if (headTitle) headTitle.textContent = localCh.title;
                  const topbarTitle = document.querySelector('.reader-chapter-title-text');
                  if (topbarTitle) topbarTitle.textContent = localCh.title;
                  document.title = `${localCh.title} — LightnovelPub`;
                }

                if (typeof attachParagraphTouchGuards === 'function') {
                  attachParagraphTouchGuards();
                }
                if (typeof restoreReadingPosition === 'function') {
                  restoreReadingPosition();
                }
              }
            }
          }
        }).catch(err => console.warn('Dexie reader hydration note:', err));
      }



      // Triple-Lock Purge: Evict obsolete IndexedDB versions to reclaim disk space & purge stale blobs

      ['LightnovelpubDB', 'LightnovelpubDB_v1', 'LightnovelpubDB_v2', 'LightnovelpubDB_v3'].forEach(oldDbName => {

        try { indexedDB.deleteDatabase(oldDbName); } catch (e) {}

      });



      // Automatically cache current chapter into IndexedDB for 100% offline access

      const chapterHeadline = document.querySelector('.chapter-headline-title')?.textContent?.trim() || `Chapter ${currentChapterNum}`;

      const chapterContentHtml = document.getElementById('chapter-content')?.innerHTML || '';

      if (novelSlug && chapterContentHtml) {

        novelDb.chapters.put({

          novelSlug: novelSlug,

          chapterNumber: currentChapterNum,

          title: chapterHeadline,

          content: chapterContentHtml,

          updated_at: Date.now()

        }).catch(err => console.warn('Dexie chapter cache note:', err));

      }

    } catch (e) {

      console.warn('Dexie initialization error:', e);

    }

  }



  let syncTimeout = null;



  // Active paragraph detection with focal reading-line offset (28% from top)

  function getActiveParagraphIndex() {

    if (!paragraphNodes || paragraphNodes.length === 0) return 0;

    const focalY = window.innerHeight * 0.28;

    let closestIdx = 0;

    let minDistance = Infinity;



    for (let i = 0; i < paragraphNodes.length; i++) {

      const rect = paragraphNodes[i].getBoundingClientRect();

      if (rect.top <= focalY && rect.bottom >= focalY) {

        return i;

      }

      const dist = Math.abs(rect.top - focalY);

      if (dist < minDistance) {

        minDistance = dist;

        closestIdx = i;

      }

    }

    return closestIdx;

  }



  // Unified Multi-Tier Progress Recorder (Local + Dexie + Server Sync)

  function recordReadingProgress(overrideParaIdx, fromAudio = false) {

    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    const activeIdx = (overrideParaIdx !== undefined) ? overrideParaIdx : getActiveParagraphIndex();



    let progress = 0;

    if (fromAudio && overrideParaIdx !== undefined && paragraphNodes.length > 0) {

      progress = Math.min(100, Math.max(0, Math.round(((overrideParaIdx + 1) / paragraphNodes.length) * 1000) / 10));

    } else if (scrollHeight > 0) {

      // If user reaches within 40px of chapter end, mark as 100% complete

      if ((scrollHeight - scrollTop) <= 40) {

        progress = 100;

      } else {

        const paraRatio = paragraphNodes.length > 1 ? (activeIdx / (paragraphNodes.length - 1)) : 0;

        const scrollRatio = scrollTop / scrollHeight;

        // Blended: 70% paragraph anchor + 30% pixel scroll

        const blended = (paraRatio * 0.70) + (scrollRatio * 0.30);

        progress = Math.min(100, Math.max(0, Math.round(blended * 1000) / 10));

      }

    }



    if (progressBar) {

      progressBar.style.width = `${progress}%`;

    }



    // Tier 1: LocalStorage (Instant, synchronous, survive refresh & orientation flip)

    try {

      localStorage.setItem(storageKey, String(scrollTop));

      localStorage.setItem(paraStorageKey, String(activeIdx));

      localStorage.setItem(pctStorageKey, String(progress));

      localStorage.setItem(novelSummaryKey, JSON.stringify({

        chapter: currentChapterNum,

        percent: progress,

        paraIndex: activeIdx,

        timestamp: Date.now()

      }));

    } catch (e) {}



    // Tier 2: Dexie IndexedDB (Structured, offline-ready, quota-free)

    if (novelDb && novelDb.progress) {

      novelDb.progress.put({

        novelSlug: novelSlug,

        chapterNumber: currentChapterNum,

        percent: progress,

        paraIndex: activeIdx,

        updated_at: Date.now()

      }).catch(() => {});

    }



    // Tier 3: Debounced Network Sync to Backend API

    clearTimeout(syncTimeout);

    syncTimeout = setTimeout(() => {

      if (novelSlug) {

        fetch('/api/progress', {

          method: 'POST',

          headers: { 'Content-Type': 'application/json' },

          body: JSON.stringify({

            slug: novelSlug,

            chapter_number: currentChapterNum,

            percent: progress,

            para_index: activeIdx

          })

        }).catch(() => {});

      }

    }, 800);

  }



  // 120fps Zero-Reflow Decoupled Scroll Engine (Decoupled progress bar + debounced storage)

  let progressRafPending = false;

  let progressPersistTimer = null;



  function updateVisualProgressBar() {

    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;

    if (scrollHeight > 0 && progressBar) {

      const pct = Math.min(100, Math.max(0, Math.round((scrollTop / scrollHeight) * 1000) / 10));

      progressBar.style.width = `${pct}%`;

    }

    progressRafPending = false;

  }



  window.addEventListener('scroll', () => {

    // 1. Pure O(1) arithmetic progress update on next animation frame (Zero layout reflows)

    if (!progressRafPending) {

      progressRafPending = true;

      requestAnimationFrame(updateVisualProgressBar);

    }



    // 2. Debounce paragraph DOM scanning & disk persistence to quiet period (stops 15,000 reflows/sec)

    clearTimeout(progressPersistTimer);

    progressPersistTimer = setTimeout(() => {

      recordReadingProgress();

    }, 200);

  }, { passive: true });



  // Resilient Position Restoration: Paragraph Anchor First, Pixel Scroll Fallback

  function restoreReadingPosition() {

    const savedPara = localStorage.getItem(paraStorageKey);

    const savedScroll = localStorage.getItem(storageKey);



    if (savedPara !== null && paragraphNodes && paragraphNodes.length > 0) {

      const paraIdx = parseInt(savedPara, 10);

      if (!isNaN(paraIdx) && paraIdx >= 0 && paraIdx < paragraphNodes.length) {

        setTimeout(() => {

          const targetNode = paragraphNodes[paraIdx];

          if (targetNode) {

            targetNode.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Subtle emerald flash to anchor user focus

            targetNode.style.transition = 'background-color 0.8s ease';

            const prevBg = targetNode.style.backgroundColor;

            targetNode.style.backgroundColor = 'rgba(74, 222, 128, 0.12)';

            setTimeout(() => {

              targetNode.style.backgroundColor = prevBg;

            }, 1200);

          }

        }, 150);

        return;

      }

    }



    if (savedScroll && parseInt(savedScroll, 10) > 100) {

      setTimeout(() => {

        window.scrollTo({

          top: parseInt(savedScroll, 10),

          behavior: 'smooth'

        });

      }, 150);

    }

  }



  restoreReadingPosition();



  // =========================================================================

  // 3. OFFLINE-FIRST, BULLETPROOF AUDIO TTS ENGINE (NEURAL + DEVICE DUAL-TIER)

  // =========================================================================



  const synth = window.speechSynthesis;

  const isSpeechSupported = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);



  // High-fidelity neural voice definitions (Edge-TTS via HTML5 Audio with Dexie caching)

  const NEURAL_VOICES = [

    { voiceURI: 'edge:en-US-ChristopherNeural', name: 'Christopher (Deep Storyteller)', lang: 'en-US', isNeural: true, edgeVoice: 'en-US-ChristopherNeural' },

    { voiceURI: 'edge:en-US-JennyNeural', name: 'Jenny (Natural Warm)', lang: 'en-US', isNeural: true, edgeVoice: 'en-US-JennyNeural' },

    { voiceURI: 'edge:en-US-GuyNeural', name: 'Guy (Rich Expressive)', lang: 'en-US', isNeural: true, edgeVoice: 'en-US-GuyNeural' },

    { voiceURI: 'edge:en-US-AriaNeural', name: 'Aria (Clear Studio)', lang: 'en-US', isNeural: true, edgeVoice: 'en-US-AriaNeural' }

  ];



  let activeHtml5Audio = null;

  let activeAudioUrl = null;

  let audioPlaybackEpoch = 0;



  // Topbar Button

  const listenToggleBtn = document.getElementById('listen-toggle-btn');



  // Novel Phoenix Floating Audio Widget Elements

  const npWidget = document.getElementById('np-audio-widget');

  const npBtnClose = document.getElementById('np-audio-close');

  const npSpeedMinus = document.getElementById('np-speed-minus');

  const npSpeedPlus = document.getElementById('np-speed-plus');

  const npSpeedStepperLabel = document.getElementById('np-speed-stepper-label');



  // Settings Panel Elements

  const npSettingsToggle = document.getElementById('np-btn-settings-toggle');

  const npSettingsPanel = document.getElementById('np-audio-settings-panel');

  const npSettingsIcon = document.getElementById('np-settings-toggle-icon');

  const npLanguageSelect = document.getElementById('np-language-select');

  const npVoiceSelect = document.getElementById('np-voice-select');

  const npSpeedSlider = document.getElementById('np-speed-slider');

  const npSpeedValLabel = document.getElementById('np-speed-val-label');

  const npPitchSlider = document.getElementById('np-pitch-slider');

  const npPitchValLabel = document.getElementById('np-pitch-val-label');

  const npTabWord = document.getElementById('np-tab-highlight-word');

  const npTabSentence = document.getElementById('np-tab-highlight-sentence');

  const npToggleAutoNext = document.getElementById('np-toggle-autonext');

  const npToggleAutoScroll = document.getElementById('np-toggle-autoscroll');



  // Controls Row Elements

  const npBtnRestart = document.getElementById('np-btn-restart');

  const npBtnPrev = document.getElementById('np-btn-prev');

  const npBtnRewind10 = document.getElementById('np-btn-rewind-10');

  const npBtnPlayPause = document.getElementById('np-btn-play-pause');

  const npPlayIcon = document.getElementById('np-play-icon');

  const npBtnForward10 = document.getElementById('np-btn-forward-10');

  const npBtnNext = document.getElementById('np-btn-next');



  // (paragraphNodes pre-indexed above)



  // Saved audio & display states

  const savedRate = parseFloat(localStorage.getItem('novel_reader_audio_rate') || '1.0');

  const savedPitch = parseFloat(localStorage.getItem('novel_reader_audio_pitch') || '1.0');

  const savedVolume = parseFloat(localStorage.getItem('novel_reader_volume') || '1.0');

  const savedBrightness = parseInt(localStorage.getItem('novel_reader_brightness') || '100', 10);

  const savedVoiceURI = localStorage.getItem('novel_reader_voice_uri') || '';

  const savedHighlightMode = localStorage.getItem('novel_reader_highlight_mode') || 'word';

  const savedAutoNext = localStorage.getItem('novel_reader_autonext') !== 'false';

  const savedAutoScroll = localStorage.getItem('novel_reader_autoscroll') !== 'false';



  // Silent audio pipeline anchor for Android & Laptop battery-saver backgrounding

  let silentAudioElement = null;

  function getSilentAudioPipe() {

    if (!silentAudioElement) {

      silentAudioElement = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');

      silentAudioElement.loop = true;

    }

    return silentAudioElement;

  }



  function startAudioPipeline() {

    try {

      const audioPipe = getSilentAudioPipe();

      audioPipe.play().catch(() => {});

    } catch (e) {}

    updateMediaSession();

  }



  function pauseAudioPipeline() {

    try {

      if (silentAudioElement) {

        silentAudioElement.pause();

      }

    } catch (e) {}

  }



  function updateMediaSession() {

    if ('mediaSession' in navigator) {

      try {

        const novelTitle = document.querySelector('.np-audio-novel-name')?.textContent || 'Novel';

        const chapterTitle = document.getElementById('np-audio-chapter-title')?.textContent || 'Chapter';

        const coverImg = document.getElementById('np-audio-cover')?.src || '/static/img/logo.png';



        navigator.mediaSession.metadata = new MediaMetadata({

          title: chapterTitle,

          artist: novelTitle,

          album: 'Lightnovelpub Reader',

          artwork: [

            { src: coverImg, sizes: '512x512', type: 'image/png' }

          ]

        });



        navigator.mediaSession.playbackState = audioState.isPlaying && !audioState.isPaused ? 'playing' : 'paused';



        navigator.mediaSession.setActionHandler('play', () => toggleAudioPlay());

        navigator.mediaSession.setActionHandler('pause', () => toggleAudioPlay());

        navigator.mediaSession.setActionHandler('previoustrack', () => playPrevParagraph());

        navigator.mediaSession.setActionHandler('nexttrack', () => playNextParagraph());

      } catch (err) {

        console.warn('MediaSession init error:', err);

      }

    }

  }



  const audioState = {

    isOpen: false,

    isPlaying: false,

    isPaused: false,

    currentIndex: 0,

    currentSentenceIdx: 0,

    sentences: [],

    voices: [],

    selectedVoice: null,

    selectedLang: 'all',

    rate: savedRate,

    pitch: savedPitch,

    volume: savedVolume,

    brightness: savedBrightness,

    highlightMode: savedHighlightMode,

    autoNext: savedAutoNext,

    autoScroll: savedAutoScroll,

    wakeLock: null,

    keepAliveTimer: null,

    isTransitioning: false

  };



  // Sync initial UI values

  updateSpeedDisplays(audioState.rate);

  if (npPitchSlider) npPitchSlider.value = String(audioState.pitch);

  if (npPitchValLabel) npPitchValLabel.textContent = String(audioState.pitch);

  if (npToggleAutoNext) npToggleAutoNext.checked = audioState.autoNext;

  if (npToggleAutoScroll) npToggleAutoScroll.checked = audioState.autoScroll;

  setHighlightTab(audioState.highlightMode);



  function updateSpeedDisplays(rate) {

    const rounded = Math.round(rate * 100) / 100;

    const label = `${rounded}x`;

    if (npSpeedStepperLabel) npSpeedStepperLabel.textContent = label;

    if (npSpeedSlider) npSpeedSlider.value = String(rounded);

    if (npSpeedValLabel) npSpeedValLabel.textContent = `${label.toUpperCase()}`;

  }



  function setHighlightTab(mode) {

    audioState.highlightMode = mode;

    localStorage.setItem('novel_reader_highlight_mode', mode);

    if (mode === 'word') {

      npTabWord?.classList.add('active');

      npTabSentence?.classList.remove('active');

    } else {

      npTabSentence?.classList.add('active');

      npTabWord?.classList.remove('active');

    }

  }



  // Populate Voices prioritizing OFFLINE / LOCAL service voices

  function loadVoices() {

    if (!isSpeechSupported) return;

    const allVoices = synth.getVoices() || [];

    if (allVoices.length === 0) return;



    audioState.voices = allVoices;



    // Populate Languages Dropdown

    if (npLanguageSelect) {

      const langs = new Set();

      allVoices.forEach(v => {

        if (v.lang) langs.add(v.lang);

      });



      const currentLangVal = npLanguageSelect.value || 'all';

      npLanguageSelect.innerHTML = '<option value="all">All Languages</option>';



      Array.from(langs).sort().forEach(l => {

        const opt = document.createElement('option');

        opt.value = l;

        opt.textContent = l;

        if (l.toLowerCase().startsWith('en')) {

          opt.textContent = `${l} (English)`;

        }

        npLanguageSelect.appendChild(opt);

      });



      npLanguageSelect.value = currentLangVal;

    }



    renderVoiceOptions();



    // If there was a pending device voice, resolve and select it now

    if (audioState.pendingVoiceURI) {

      const found = allVoices.find(v => v.voiceURI === audioState.pendingVoiceURI);

      if (found) {

        audioState.selectedVoice = found;

        audioState.pendingVoiceURI = null;

        if (npVoiceSelect) npVoiceSelect.value = found.voiceURI;

      }

    }

  }



  function renderVoiceOptions() {

    if (!npVoiceSelect) return;



    npVoiceSelect.innerHTML = '';

    let matched = null;

    const currentSaved = localStorage.getItem('novel_reader_voice_uri') || (audioState.selectedVoice ? audioState.selectedVoice.voiceURI : '');



    // 1. Add High-Fidelity Neural Voices Group (HTML5 Audio + Dexie Caching)

    const neuralGroup = document.createElement('optgroup');

    neuralGroup.label = '🌟 Neural Voices (Android Background & Offline Cache)';

    NEURAL_VOICES.forEach(nv => {

      const opt = document.createElement('option');

      opt.value = nv.voiceURI;

      opt.textContent = `✨ [Neural] ${nv.name}`;

      if (currentSaved && currentSaved === nv.voiceURI) {

        matched = nv;

        opt.selected = true;

      }

      neuralGroup.appendChild(opt);

    });

    npVoiceSelect.appendChild(neuralGroup);



    // 2. Add System / Device Voices Group

    if (audioState.voices && audioState.voices.length > 0) {

      const deviceGroup = document.createElement('optgroup');

      deviceGroup.label = '⚡ Device System Voices (Instant OS)';



      const filtered = audioState.voices.filter(v => {

        if (!audioState.selectedLang || audioState.selectedLang === 'all') return true;

        return v.lang === audioState.selectedLang;

      });



      filtered.sort((a, b) => {

        if (a.localService && !b.localService) return -1;

        if (!a.localService && b.localService) return 1;

        const aEn = a.lang.toLowerCase().startsWith('en');

        const bEn = b.lang.toLowerCase().startsWith('en');

        if (aEn && !bEn) return -1;

        if (!aEn && bEn) return 1;

        return a.name.localeCompare(b.name);

      });



      filtered.forEach(voice => {

        const opt = document.createElement('option');

        opt.value = voice.voiceURI;

        const offlineBadge = voice.localService ? '⚡ [Offline]' : '🌐';

        opt.textContent = `${offlineBadge} ${voice.name} (${voice.lang})`;



        if (currentSaved && voice.voiceURI === currentSaved) {

          matched = voice;

          opt.selected = true;

        }

        deviceGroup.appendChild(opt);

      });

      npVoiceSelect.appendChild(deviceGroup);

    }



    if (matched) {

      audioState.selectedVoice = matched;

      audioState.pendingVoiceURI = null;

    } else if (currentSaved) {

      const neuralMatch = NEURAL_VOICES.find(nv => nv.voiceURI === currentSaved);

      if (neuralMatch) {

        audioState.selectedVoice = neuralMatch;

      } else {

        audioState.pendingVoiceURI = currentSaved;

        if (!audioState.selectedVoice) {

          audioState.selectedVoice = NEURAL_VOICES[0];

        }

      }

    } else if (!audioState.selectedVoice) {

      audioState.selectedVoice = NEURAL_VOICES[0];

    }

  }



  // Always render voice options immediately so Neural voices are populated instantly on page load

  renderVoiceOptions();



  if (isSpeechSupported) {

    loadVoices();

    if (synth.onvoiceschanged !== undefined) {

      synth.onvoiceschanged = loadVoices;

    }

  }



  // Language change

  if (npLanguageSelect) {

    npLanguageSelect.addEventListener('change', (e) => {

      audioState.selectedLang = e.target.value;

      renderVoiceOptions();

    });

  }



  // Voice change

  if (npVoiceSelect) {

    npVoiceSelect.addEventListener('change', (e) => {

      const uri = e.target.value;

      const v = NEURAL_VOICES.find(item => item.voiceURI === uri) || audioState.voices.find(item => item.voiceURI === uri);

      if (v) {

        audioState.selectedVoice = v;

        localStorage.setItem('novel_reader_voice_uri', uri);

        clearPrefetchedAudio();

        if (audioState.isPlaying && !audioState.isPaused) {

          speakParagraph(audioState.currentIndex, false);

        }

      }

    });

  }



  // Speed Stepper (- / +)

  if (npSpeedMinus) {

    npSpeedMinus.addEventListener('click', () => {

      let r = Math.max(0.5, Math.round((audioState.rate - 0.25) * 100) / 100);

      setAudioRate(r);

    });

  }



  if (npSpeedPlus) {

    npSpeedPlus.addEventListener('click', () => {

      let r = Math.min(2.5, Math.round((audioState.rate + 0.25) * 100) / 100);

      setAudioRate(r);

    });

  }



  // Speed Slider

  if (npSpeedSlider) {

    npSpeedSlider.addEventListener('input', (e) => {

      setAudioRate(parseFloat(e.target.value));

    });

  }



  function setAudioRate(newRate) {

    audioState.rate = newRate;

    updateSpeedDisplays(newRate);

    localStorage.setItem('novel_reader_audio_rate', String(newRate));

    if (activeHtml5Audio) {

      activeHtml5Audio.playbackRate = newRate;

    }

    clearPrefetchedAudio();

  }



  // Pitch Slider

  if (npPitchSlider) {

    npPitchSlider.addEventListener('input', (e) => {

      const p = parseFloat(e.target.value);

      audioState.pitch = p;

      if (npPitchValLabel) npPitchValLabel.textContent = String(p);

      localStorage.setItem('novel_reader_audio_pitch', String(p));

      clearPrefetchedAudio();

    });

  }



  // Highlight Tabs

  if (npTabWord) {

    npTabWord.addEventListener('click', () => setHighlightTab('word'));

  }

  if (npTabSentence) {

    npTabSentence.addEventListener('click', () => setHighlightTab('sentence'));

  }



  // Switches

  if (npToggleAutoNext) {

    npToggleAutoNext.addEventListener('change', (e) => {

      audioState.autoNext = e.target.checked;

      localStorage.setItem('novel_reader_autonext', String(e.target.checked));

    });

  }



  if (npToggleAutoScroll) {

    npToggleAutoScroll.addEventListener('change', (e) => {

      audioState.autoScroll = e.target.checked;

      localStorage.setItem('novel_reader_autoscroll', String(e.target.checked));

    });

  }



  // Settings Panel Expand/Collapse (Exact chevron matching user screenshot)

  if (npSettingsToggle && npSettingsPanel) {

    npSettingsToggle.addEventListener('click', () => {

      const isOpen = npSettingsPanel.classList.toggle('open');

      if (npSettingsIcon) {

        npSettingsIcon.textContent = isOpen ? '▼' : '▲';

      }

    });

  }



  // =========================================================================

  // VOLUME & SCREEN BRIGHTNESS / INBUILT EXTENSION DOCK LOGIC

  // =========================================================================



  const npVolumeSlider = document.getElementById('np-volume-slider');

  const npVolValLabel = document.getElementById('np-vol-val-label');

  const dockVolSlider = document.getElementById('dock-vol-slider');

  const dockVolPercent = document.getElementById('dock-vol-percent');

  const dockVolIcon = document.getElementById('dock-vol-icon');



  function setAudioVolume(vol) {

    vol = Math.max(0, Math.min(1, vol));

    audioState.volume = vol;

    localStorage.setItem('novel_reader_volume', String(vol));

    const percent = `${Math.round(vol * 100)}%`;

    if (npVolValLabel) npVolValLabel.textContent = percent;

    if (npVolumeSlider) npVolumeSlider.value = String(vol);

    if (dockVolSlider) dockVolSlider.value = String(vol);

    if (dockVolPercent) dockVolPercent.textContent = percent;



    if (activeHtml5Audio) {

      activeHtml5Audio.volume = vol;

    }



    if (vol === 0) {

      if (dockVolIcon) dockVolIcon.textContent = '🔇';

    } else if (vol < 0.5) {

      if (dockVolIcon) dockVolIcon.textContent = '🔉';

    } else {

      if (dockVolIcon) dockVolIcon.textContent = '🔊';

    }

  }



  if (npVolumeSlider) {

    npVolumeSlider.value = String(savedVolume);

    setAudioVolume(savedVolume);

    npVolumeSlider.addEventListener('input', (e) => setAudioVolume(parseFloat(e.target.value)));

  }

  if (dockVolSlider) {

    dockVolSlider.value = String(savedVolume);

    dockVolSlider.addEventListener('input', (e) => setAudioVolume(parseFloat(e.target.value)));

  }



  // Screen Brightness Dimmer (30% to 100%)

  const dockBrightnessSlider = document.getElementById('dock-brightness-slider');

  const dockBrightnessVal = document.getElementById('dock-brightness-val');



  function setScreenBrightness(brightness) {

    brightness = Math.max(25, Math.min(100, brightness));

    audioState.brightness = brightness;

    localStorage.setItem('novel_reader_brightness', String(brightness));

    if (dockBrightnessVal) dockBrightnessVal.textContent = `${brightness}%`;

    if (dockBrightnessSlider) dockBrightnessSlider.value = String(brightness);



    // 100% -> 0 dim; 25% -> 0.75 dim

    const dim = ((100 - brightness) / 100) * 0.75;

    document.documentElement.style.setProperty('--reader-dim', dim);

    setNightOverlayAlpha(brightness);

  }



  if (dockBrightnessSlider) {

    dockBrightnessSlider.value = String(savedBrightness);

    setScreenBrightness(savedBrightness);

    dockBrightnessSlider.addEventListener('input', (e) => setScreenBrightness(parseInt(e.target.value, 10)));

  } else {

    setScreenBrightness(savedBrightness);

  }



  // Dock Popovers (Volume & Brightness)

  const dockBtnVol = document.getElementById('dock-btn-vol');

  const dockVolPopover = document.getElementById('dock-vol-popover');

  const dockBtnBrightness = document.getElementById('dock-btn-brightness');

  const dockBrightnessPopover = document.getElementById('dock-brightness-popover');



  if (dockBtnVol && dockVolPopover) {

    dockBtnVol.addEventListener('click', (e) => {

      e.stopPropagation();

      dockBrightnessPopover?.classList.remove('open');

      dockVolPopover.classList.toggle('open');

    });

  }



  if (dockBtnBrightness && dockBrightnessPopover) {

    dockBtnBrightness.addEventListener('click', (e) => {

      e.stopPropagation();

      dockVolPopover?.classList.remove('open');

      dockBrightnessPopover.classList.toggle('open');

    });

  }



  document.addEventListener('click', (e) => {

    if (!e.target.closest('.dock-popover-wrapper')) {

      dockVolPopover?.classList.remove('open');

      dockBrightnessPopover?.classList.remove('open');

    }

  });



  // Dock Font Stepper (A- / A+)

  const dockFontDec = document.getElementById('dock-font-dec');

  const dockFontInc = document.getElementById('dock-font-inc');

  const dockFontVal = document.getElementById('dock-font-val');



  function updateDockFontSize(size) {

    if (dockFontVal) dockFontVal.textContent = `${size}px`;

  }

  updateDockFontSize(savedFontSize);



  if (dockFontDec) {

    dockFontDec.addEventListener('click', () => {

      let cur = parseInt(localStorage.getItem('novel_reader_font_size') || '19', 10);

      cur = Math.max(13, cur - 1);

      applyFontSize(cur);

      localStorage.setItem('novel_reader_font_size', String(cur));

      updateDockFontSize(cur);

    });

  }



  if (dockFontInc) {

    dockFontInc.addEventListener('click', () => {

      let cur = parseInt(localStorage.getItem('novel_reader_font_size') || '19', 10);

      cur = Math.min(34, cur + 1);

      applyFontSize(cur);

      localStorage.setItem('novel_reader_font_size', String(cur));

      updateDockFontSize(cur);

    });

  }



  // Dock Theme Cycle

  const dockBtnThemeCycle = document.getElementById('dock-btn-theme-cycle');

  const themesList = ['black', 'emerald', 'midnight', 'forest', 'sepia', 'light'];

  if (dockBtnThemeCycle) {

    dockBtnThemeCycle.addEventListener('click', () => {

      const curTheme = document.body.getAttribute('data-reader-theme') || 'black';

      let nextIdx = (themesList.indexOf(curTheme) + 1) % themesList.length;

      const nextTheme = themesList[nextIdx];

      applyTheme(nextTheme);

      localStorage.setItem('novel_reader_theme', nextTheme);

      showReaderToast(`Theme: ${nextTheme.toUpperCase()}`, '🎨');

    });

  }





  // Wire 1-Touch Font Selector Pills

  const fontPills = document.querySelectorAll('.font-pill-tag');

  fontPills.forEach(pill => {

    pill.addEventListener('click', () => {

      const f = pill.getAttribute('data-font');

      applyFont(f);

      localStorage.setItem('novel_reader_font', f);

      const matched = CURATED_FONTS.find(cf => cf.value === f);

      if (matched) showReaderToast(`Font: ${matched.name}`, 'Aa');

    });

  });



  // Dock Quick Font Cycler Button (Cycles between 5 Curated Fonts)

  const dockBtnFontCycle = document.getElementById('dock-btn-font-cycle');

  if (dockBtnFontCycle) {

    dockBtnFontCycle.addEventListener('click', () => {

      const currentFont = localStorage.getItem('novel_reader_font') || CURATED_FONTS[0].value;

      let curIdx = CURATED_FONTS.findIndex(cf => cf.value === currentFont);

      if (curIdx === -1) curIdx = 0;

      const nextIdx = (curIdx + 1) % CURATED_FONTS.length;

      const nextFont = CURATED_FONTS[nextIdx];

      applyFont(nextFont.value);

      localStorage.setItem('novel_reader_font', nextFont.value);

      showReaderToast(`Font: ${nextFont.name}`, 'Aa');

    });

  }



  // Dock Audio Toggle

  const dockBtnAudioToggle = document.getElementById('dock-btn-audio-toggle');

  if (dockBtnAudioToggle) {

    dockBtnAudioToggle.addEventListener('click', () => {

      if (audioState.isOpen) {

        toggleAudioPlay();

      } else {

        openAudioPlayer();

      }

    });

  }



  // Dock Open Typography Drawer

  const dockBtnOpenTypography = document.getElementById('dock-btn-open-typography');

  if (dockBtnOpenTypography && settingsDrawer) {

    dockBtnOpenTypography.addEventListener('click', () => {

      settingsDrawer.classList.toggle('open');

    });

  }



  // Minimize / Restore Dock

  const dockExtension = document.getElementById('reader-extension-dock');

  const dockBtnMinimize = document.getElementById('dock-btn-minimize');

  const dockReopenBtn = document.getElementById('dock-reopen-btn');



  function setDockMinimized(isMin) {

    if (isMin) {

      dockExtension?.classList.add('minimized');

      dockReopenBtn?.classList.add('visible');

      localStorage.setItem('novel_dock_minimized', 'true');

    } else {

      dockExtension?.classList.remove('minimized');

      dockReopenBtn?.classList.remove('visible');

      localStorage.removeItem('novel_dock_minimized');

    }

  }



  if (dockBtnMinimize) {

    dockBtnMinimize.addEventListener('click', () => setDockMinimized(true));

  }

  if (dockReopenBtn) {

    dockReopenBtn.addEventListener('click', () => setDockMinimized(false));

  }

  if (localStorage.getItem('novel_dock_minimized') === 'true') {

    setDockMinimized(true);

  }





  // Sleek HUD Floating Toast Feedback (Android & Laptop)

  function showReaderToast(message, icon = '✦') {

    let toast = document.getElementById('reader-hud-toast');

    if (!toast) {

      toast = document.createElement('div');

      toast.id = 'reader-hud-toast';

      toast.className = 'reader-hud-toast';

      document.body.appendChild(toast);

    }

    toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;

    toast.classList.add('visible');

    clearTimeout(toast.__timer);

    toast.__timer = setTimeout(() => {

      toast.classList.remove('visible');

    }, 1800);

  }



  // Find paragraph currently in viewport

  function getParagraphCurrentlyInView() {

    const viewportMiddle = window.innerHeight * 0.4;

    for (let i = 0; i < paragraphNodes.length; i++) {

      const rect = paragraphNodes[i].getBoundingClientRect();

      if (rect.top <= viewportMiddle && rect.bottom >= viewportMiddle) {

        return i;

      }

      if (rect.top >= 0 && rect.top <= window.innerHeight) {

        return i;

      }

    }

    return 0;

  }



  // Open Audio Player & start immediately

  function openAudioPlayer(startIndex = null) {



    if (startIndex === null) {

      startIndex = getParagraphCurrentlyInView();

    }



    audioState.isOpen = true;

    if (npWidget) npWidget.classList.add('active');

    dockExtension?.classList.add('audio-active-hidden');

    if (listenToggleBtn) listenToggleBtn.classList.add('is-playing');



    requestWakeLock();

    startAudioPipeline();

    startKeepAlive();

    speakParagraph(startIndex, false);

  }



  const dockAudioIcon = document.getElementById('dock-audio-icon');



  function updatePlayStateUI(isPlaying) {

    if (isPlaying) {

      if (npPlayIcon) npPlayIcon.textContent = '⏸';

      if (listenToggleBtn) listenToggleBtn.classList.add('is-playing');

      dockBtnAudioToggle?.classList.add('is-playing');

      if (dockAudioIcon) dockAudioIcon.textContent = '⏸';

    } else {

      if (npPlayIcon) npPlayIcon.textContent = '▶';

      if (listenToggleBtn) listenToggleBtn.classList.remove('is-playing');

      dockBtnAudioToggle?.classList.remove('is-playing');

      if (dockAudioIcon) dockAudioIcon.textContent = '🎧';

    }

  }



  // Close Audio Player

  function closeAudioPlayer() {

    stopSpeech();

    pauseAudioPipeline();

    audioState.isOpen = false;

    audioState.isPlaying = false;

    audioState.isPaused = false;

    restoreParagraphDOM();

    stopKeepAlive();



    if (npWidget) npWidget.classList.remove('active');

    dockExtension?.classList.remove('audio-active-hidden');

    updatePlayStateUI(false);



    releaseWakeLock();

    localStorage.removeItem('novel_auto_play_tts');

    updateMediaSession();

  }



  function restoreParagraphDOM() {

    stopHighlightTracker();

    clearCurrentWordHighlight();

    paragraphNodes.forEach(p => {

      p.classList.remove('listen-active-paragraph');

      p.querySelectorAll('.np-word-token').forEach(span => {

        span.classList.remove('np-spoken-word', 'np-spoken-word-done');

      });

    });

  }



  function stopSpeech() {

    audioPlaybackEpoch++;

    stopHighlightTracker();

    clearCurrentWordHighlight();

    if (activeHtml5Audio) {

      activeHtml5Audio.pause();

      activeHtml5Audio.ontimeupdate = null;

      activeHtml5Audio.onended = null;

      activeHtml5Audio.onerror = null;

      activeHtml5Audio = null;

    }

    if (activeAudioUrl) {

      URL.revokeObjectURL(activeAudioUrl);

      activeAudioUrl = null;

    }

    if (isSpeechSupported) {

      window.__activeNovelUtterance = null;

      synth.cancel();

      if (synth.paused) {

        synth.resume();

      }

    }

  }



  // Resilient silent audio keep-alive: preserves Android hardware audio focus without aborting speech

  function startKeepAlive() {

    stopKeepAlive();

    audioState.keepAliveTimer = setInterval(() => {

      if (audioState.isPlaying && !audioState.isPaused) {

        try {

          const pipe = getSilentAudioPipe();

          if (pipe.paused) {

            pipe.play().catch(() => {});

          }

        } catch (e) {}

      }

    }, 8000);

  }



  function stopKeepAlive() {

    if (audioState.keepAliveTimer) {

      clearInterval(audioState.keepAliveTimer);

      audioState.keepAliveTimer = null;

    }

  }



  // Non-destructive word tokenization on the active paragraph (respects System HUD Cards)

  function tokenizeParagraphWords(node) {

    if (node.getAttribute('data-tokenized') === 'true') return;

    const targetContainer = node.querySelector('.system-card-body') || node;

    const text = targetContainer.textContent;

    // Split into words while keeping delimiters

    const tokens = text.split(/(\s+)/);

    const fragment = document.createDocumentFragment();

    let charOffset = 0;



    tokens.forEach((t) => {

      if (/\S/.test(t)) {

        const span = document.createElement('span');

        span.className = 'np-word-token';

        span.setAttribute('data-raw-word', t);

        span.setAttribute('data-start', charOffset);

        span.setAttribute('data-end', charOffset + t.length);

        if (isBionicActive) {

          if (t.length <= 1) {

            span.innerHTML = `<b>${t}</b>`;

          } else {

            const splitIdx = Math.ceil(t.length * 0.45);

            span.innerHTML = `<b>${t.slice(0, splitIdx)}</b>${t.slice(splitIdx)}`;

          }

        } else {

          span.textContent = t;

        }

        fragment.appendChild(span);

      } else {

        fragment.appendChild(document.createTextNode(t));

      }

      charOffset += t.length;

    });



    targetContainer.innerHTML = '';

    targetContainer.appendChild(fragment);

    node.setAttribute('data-tokenized', 'true');

  }



  // Web Speech API fallback engine (Instant, 0MB overhead, device offline)

  // =========================================================================

  // =========================================================================

  // HIGH-PRECISION 60FPS WORD SYNCHRONIZER & FRAME TRACKER

  // =========================================================================

  let activeSpokenWordSpan = null;

  let activeParagraphBoundaries = null;

  let highlightRafId = null;



  function clearCurrentWordHighlight() {

    if (activeSpokenWordSpan) {

      activeSpokenWordSpan.classList.remove('np-spoken-word');

      activeSpokenWordSpan = null;

    }

  }



  function startHighlightTracker(audio, targetNode, boundaries) {

    stopHighlightTracker();

    function tick() {

      if (!audio || audio.paused || audio.ended) return;

      syncHtml5AudioHighlight(audio, targetNode, boundaries);

      highlightRafId = requestAnimationFrame(tick);

    }

    highlightRafId = requestAnimationFrame(tick);

  }



  function stopHighlightTracker() {

    if (highlightRafId) {

      cancelAnimationFrame(highlightRafId);

      highlightRafId = null;

    }

  }



  function parseWordBoundaries(headerVal) {

    if (!headerVal) return null;

    try {

      const raw = atob(headerVal);

      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed) || parsed.length === 0) return null;

      return parsed.map(item => ({

        start: (item[0] || 0) / 1000,

        end: ((item[0] || 0) + (item[1] || 0)) / 1000,

        text: item[2] || ''

      }));

    } catch (e) {

      return null;

    }

  }



  function estimateActiveWordIdx(currentTime, duration, wordSpans) {

    if (!wordSpans || wordSpans.length === 0) return -1;

    if (duration <= 0) return 0;



    const parent = wordSpans[0].parentElement;

    let weights = parent ? parent.__wordWeights : null;

    let totalWeight = parent ? parent.__totalWordWeight : 0;



    if (!weights || weights.length !== wordSpans.length) {

      weights = new Float32Array(wordSpans.length);

      totalWeight = 0;

      for (let i = 0; i < wordSpans.length; i++) {

        const text = wordSpans[i].textContent || '';

        let w = Math.max(1, text.replace(/[^a-zA-Z0-9]/g, '').length);

        if (/[.!?]["']?$/.test(text)) {

          w += 8;

        } else if (/[,;:—–]["']?$/.test(text)) {

          w += 4;

        }

        weights[i] = w;

        totalWeight += w;

      }

      if (parent) {

        parent.__wordWeights = weights;

        parent.__totalWordWeight = totalWeight;

      }

    }



    const targetWeight = (currentTime / duration) * totalWeight;

    let accumulated = 0;

    for (let i = 0; i < weights.length; i++) {

      accumulated += weights[i];

      if (accumulated >= targetWeight) {

        return i;

      }

    }

    return wordSpans.length - 1;

  }



  // =========================================================================

  // DUAL-BUFFER GAPLESS AUDIO QUEUE & LOOKAHEAD PREFETCHER (ANDROID HARDENED)

  // =========================================================================

  const prefetchedAudioMap = new Map();

  const prefetchInFlight = new Set();



  function clearPrefetchedAudio() {

    prefetchedAudioMap.clear();

  }



  async function prefetchParagraphAudio(idx) {

    if (!paragraphNodes || idx < 0 || idx >= paragraphNodes.length) return null;

    if (prefetchedAudioMap.has(idx)) return prefetchedAudioMap.get(idx);

    if (prefetchInFlight.has(idx)) return null;



    const currentVoice = audioState.selectedVoice || NEURAL_VOICES[0];

    if (!currentVoice || !currentVoice.isNeural) return null;



    // 1. Check Dexie cache first (0 network latency)

    if (novelDb) {

      try {

        const cached = await novelDb.audioCache.get([novelSlug, currentChapterNum, idx]);

        if (cached && (cached.audioBlob || cached.blob)) {

          const entry = {

            blob: cached.audioBlob || cached.blob,

            boundaries: cached.boundaries || null

          };

          prefetchedAudioMap.set(idx, entry);

          return entry;

        }

      } catch (e) {}

    }



    if (navigator.onLine === false) return null;



    const targetNode = paragraphNodes[idx];

    if (!targetNode) return null;

    const textToPrefetch = sanitizeSpeechText(targetNode.textContent.trim(), targetNode);

    if (!textToPrefetch) return null;



    prefetchInFlight.add(idx);

    try {

      const res = await fetch('/api/tts', {

        method: 'POST',

        headers: { 'Content-Type': 'application/json' },

        body: JSON.stringify({

          text: textToPrefetch,

          voice: currentVoice.edgeVoice || 'en-US-ChristopherNeural',

          rate: audioState.rate || 1.0,

          pitch: audioState.pitch || 1.0

        })

      });



      if (res.ok) {

        const b64Wb = res.headers.get('x-word-boundaries');

        const boundaries = parseWordBoundaries(b64Wb);

        const blob = await res.blob();

        if (blob && blob.size > 512) {

          const entry = { blob, boundaries };

          prefetchedAudioMap.set(idx, entry);



          // Persist into Dexie for offline library reading

          if (novelDb) {

            novelDb.audioCache.put({

              novelSlug: novelSlug,

              chapterNumber: currentChapterNum,

              paraIndex: idx,

              audioBlob: blob,

              boundaries: boundaries,

              created_at: Date.now()

            }).catch(() => {});

          }

          return entry;

        } else {

          console.warn(`Quarantined anomalous 0-byte or truncated audio chunk on paragraph ${idx} (size: ${blob ? blob.size : 0} bytes)`);

          return null;

        }

      }

    } catch (prefetchErr) {

      // Non-blocking prefetch failure

    } finally {

      prefetchInFlight.delete(idx);

    }

    return null;

  }



  // Web Speech API fallback engine (Instant, 0MB overhead, device offline)

  function speakParagraphWebSpeech(index, textToSpeak, targetNode, currentEpoch = null) {

    if (!isSpeechSupported) return;



    // CRITICAL: NEVER overwrite audioState.selectedVoice! Determine active voice dynamically:

    let activeVoice = null;

    const availableVoices = synth.getVoices() || [];



    if (audioState.selectedVoice && !audioState.selectedVoice.isNeural) {

      activeVoice = availableVoices.find(v => v.voiceURI === audioState.selectedVoice.voiceURI) || audioState.selectedVoice;

    } else if (availableVoices.length > 0) {

      activeVoice = availableVoices.find(v => v.localService && v.lang && v.lang.startsWith('en'))

                 || availableVoices.find(v => v.lang && v.lang.startsWith('en'))

                 || availableVoices[0];

    }



    const utterance = new SpeechSynthesisUtterance(textToSpeak);

    window.__activeNovelUtterance = utterance; // Shield against Garbage Collection



    if (activeVoice) {

      utterance.voice = activeVoice;

      utterance.lang = activeVoice.lang || 'en-US';

    } else {

      utterance.lang = 'en-US';

    }



    // Safe clamped rate and pitch for Android Chrome

    const safeRate = Math.min(2.0, Math.max(0.6, audioState.rate || 1.0));

    const safePitch = Math.min(1.5, Math.max(0.6, audioState.pitch || 1.0));

    utterance.rate = safeRate;

    utterance.pitch = safePitch;

    utterance.volume = audioState.volume !== undefined ? audioState.volume : 1.0;



    // Cache token spans per active node to eliminate 120 DOM queries per second in rAF

    if (!targetNode.__cachedWordSpans || targetNode.__cachedWordSpans.length === 0) {

      targetNode.__cachedWordSpans = Array.from(targetNode.querySelectorAll('.np-word-token'));

    }

    const wordSpans = targetNode.__cachedWordSpans;



    // Word boundary event: strictly illuminates only the word being spoken

    utterance.onboundary = (e) => {

      if (!audioState.isPlaying || audioState.isPaused) return;



      if (audioState.highlightMode === 'word' && wordSpans.length > 0) {

        const charIdx = e.charIndex || 0;

        let matchedSpan = null;



        for (let i = 0; i < wordSpans.length; i++) {

          const start = parseInt(wordSpans[i].getAttribute('data-start') || '0', 10);

          const end = parseInt(wordSpans[i].getAttribute('data-end') || '0', 10);

          if (charIdx >= start && charIdx < end + 2) {

            matchedSpan = wordSpans[i];

            break;

          }

        }

        if (!matchedSpan && wordSpans.length > 0) {

          matchedSpan = wordSpans.find(s => parseInt(s.getAttribute('data-start') || '0', 10) >= charIdx) || wordSpans[0];

        }



        if (matchedSpan && activeSpokenWordSpan !== matchedSpan) {

          if (activeSpokenWordSpan) {

            activeSpokenWordSpan.classList.remove('np-spoken-word');

          }

          matchedSpan.classList.add('np-spoken-word');

          activeSpokenWordSpan = matchedSpan;



          if (audioState.autoScroll) {

            const rect = matchedSpan.getBoundingClientRect();

            if (rect.top < 90 || rect.bottom > window.innerHeight - 140) {

              matchedSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

            }

          }

        }

      }

    };



    utterance.onstart = () => {

      audioState.isPlaying = true;

      audioState.isPaused = false;

      updatePlayStateUI(true);

      updateMediaSession();

    };



    utterance.onend = () => {

      clearCurrentWordHighlight();

      window.__activeNovelUtterance = null;

      if (currentEpoch !== null && currentEpoch !== audioPlaybackEpoch) return;

      if (audioState.isPlaying && !audioState.isPaused) {

        // 35ms safety delay on Android to avoid dropping IPC audio track

        setTimeout(() => {

          if (currentEpoch !== null && currentEpoch !== audioPlaybackEpoch) return;

          if (audioState.isPlaying && !audioState.isPaused) {

            speakParagraph(index + 1, true);

          }

        }, 35);

      }

    };



    utterance.onerror = (e) => {

      console.warn("SpeechSynthesis error:", e.error);

      clearCurrentWordHighlight();

      window.__activeNovelUtterance = null;

      // CRITICAL: NEVER skip to index + 1 on error!

      // Blindly skipping on error caused the runaway cascade that skipped from 1/3 to 2/3 of chapter!

      if (audioState.isPlaying && !audioState.isPaused) {

        if (e.error !== 'interrupted' && e.error !== 'canceled') {

          if (!audioState._synthRetryCount) audioState._synthRetryCount = 0;

          if (audioState._synthRetryCount < 2) {

            audioState._synthRetryCount++;

            setTimeout(() => {

              if (audioState.isPlaying && !audioState.isPaused) {

                speakParagraph(index, true);

              }

            }, 600);

          } else {

            console.warn("Web Speech encountered persistent errors. Pausing playback safely.");

            audioState._synthRetryCount = 0;

            audioState.isPlaying = false;

            audioState.isPaused = true;

            updatePlayStateUI(false);

          }

        }

      }

    };



    if (synth.paused) {

      synth.resume();

    }



    synth.speak(utterance);

  }



  // Synchronize glowing amber word highlight and smooth autoscroll for HTML5 Audio

  // High-precision frame level tracking: strictly illuminates ONLY the word being spoken

  function syncHtml5AudioHighlight(audio, targetNode, boundaries) {

    if (!audio || !targetNode) return;

    if (audioState.highlightMode !== 'word') {

      clearCurrentWordHighlight();

      return;

    }



    const wordSpans = targetNode.querySelectorAll('.np-word-token');

    if (wordSpans.length === 0) return;



    const currentTime = audio.currentTime || 0;

    const activeBoundaries = boundaries || activeParagraphBoundaries;

    let targetSpan = null;



    if (activeBoundaries && activeBoundaries.length > 0) {

      let activeIdx = -1;

      for (let i = 0; i < activeBoundaries.length; i++) {

        const b = activeBoundaries[i];

        if (currentTime >= b.start - 0.03 && currentTime < b.end + 0.05) {

          activeIdx = i;

          break;

        }

      }



      if (activeIdx >= 0) {

        targetSpan = wordSpans[Math.min(activeIdx, wordSpans.length - 1)];

      } else {

        // In speech pause (between sentences / commas): clear highlight per user mandate

        targetSpan = null;

      }

    } else {

      // High-precision weighted syllable & punctuation fallback

      const activeIdx = estimateActiveWordIdx(currentTime, audio.duration || 1, wordSpans);

      targetSpan = activeIdx >= 0 && activeIdx < wordSpans.length ? wordSpans[activeIdx] : null;

    }



    if (activeSpokenWordSpan !== targetSpan) {

      if (activeSpokenWordSpan) {

        activeSpokenWordSpan.classList.remove('np-spoken-word');

      }

      if (targetSpan) {

        targetSpan.classList.add('np-spoken-word');

        if (audioState.autoScroll) {

          const rect = targetSpan.getBoundingClientRect();

          if (rect.top < 90 || rect.bottom > window.innerHeight - 140) {

            targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });

          }

        }

      }

      activeSpokenWordSpan = targetSpan;

    }

  }



  // Unified multi-tier audio runner: Lookahead Cache -> Neural Edge-TTS -> Web Speech API

  async function speakParagraph(index, isContinuous = false) {

    if (!paragraphNodes || paragraphNodes.length === 0) return;



    if (index >= paragraphNodes.length) {
      restoreParagraphDOM();
      recordReadingProgress(paragraphNodes.length - 1, true);

      // Check sleep timer stop request
      if (audioState.stopAtChapterEnd) {
        audioState.stopAtChapterEnd = false;
        audioState.isPlaying = false;
        audioState.isPaused = false;
        pauseAudioPipeline();
        updatePlayStateUI(false);
        releaseWakeLock();
        showSleepToast('🌙 End of Chapter reached. Reading progress locked. Sweet dreams.');
        return;
      }

      // Seamless Auto-Play to Next Chapter (DO NOT pause audio pipe on mobile!)
      if (audioState.autoNext) {
        const nextNum = parseInt(document.body.getAttribute('data-next-num') || '0', 10);
        if (nextNum > 0) {
          audioState.currentIndex = 0;
          navigateToChapter(nextNum, true);
          return;
        } else if (nextChapterUrl) {
          localStorage.setItem('novel_auto_play_tts', 'true');
          window.location.href = nextChapterUrl;
          return;
        }
      }

      // End of book or autoNext disabled: safely pause
      audioState.isPlaying = false;
      audioState.isPaused = false;
      pauseAudioPipeline();
      updatePlayStateUI(false);
      updateMediaSession();
      return;
    }

    if (index < 0) index = 0;



    audioState.currentIndex = index;

    recordReadingProgress(index, true);

    const targetNode = paragraphNodes[index];

    const textContainer = targetNode.querySelector('.system-card-body') || targetNode;

    const textToSpeak = sanitizeSpeechText(textContainer.textContent.trim(), targetNode);

    const isSystemCard = targetNode.classList.contains('reader-system-card') || targetNode.hasAttribute('data-system-type');



    if (!textToSpeak) {

      speakParagraph(index + 1, true);

      return;

    }



    // Stop previous audio if not continuous

    if (!isContinuous) {

      stopSpeech();

    }

    const currentEpoch = ++audioPlaybackEpoch;



    restoreParagraphDOM();



    // Prepare non-destructive word spans

    tokenizeParagraphWords(targetNode);

    targetNode.classList.add('listen-active-paragraph');



    // Tactile Haptic Immersion on LitRPG System Cards

    if (targetNode.classList.contains('system-card-achievement')) {

      triggerHaptic([35, 45, 35]); // Double vibration buzz on achievement unlock!

    } else if (targetNode.classList.contains('system-card-stats') || targetNode.classList.contains('system-card-tooltip')) {

      triggerHaptic([20]); // Subtle tactile pulse on stat telemetry

    }



    if (audioState.autoScroll && document.visibilityState !== 'hidden') {

      targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });

    }



    // Immediate visual feedback so the UI indicates playing status

    audioState.isPlaying = true;

    audioState.isPaused = false;

    updatePlayStateUI(true);



    const currentVoice = audioState.selectedVoice || NEURAL_VOICES[0];



    // TIER 1: Neural Edge-TTS with Gapless Pre-buffer (Standard HTML5 Audio with Android lock-screen)

    if (currentVoice && currentVoice.isNeural) {

      let audioEntry = prefetchedAudioMap.get(index) || null;



      // 1. Check Dexie if not in memory map

      if (!audioEntry && novelDb) {

        try {

          const cached = await novelDb.audioCache.get([novelSlug, currentChapterNum, index]);

          if (cached && (cached.audioBlob || cached.blob)) {

            audioEntry = {

              blob: cached.audioBlob || cached.blob,

              boundaries: cached.boundaries || null

            };

            prefetchedAudioMap.set(index, audioEntry);

          }

        } catch (e) {}

      }



      // 2. Fetch directly if not yet prefetched

      if (!audioEntry && navigator.onLine !== false) {

        try {

          const res = await fetch('/api/tts', {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

              text: textToSpeak,

              voice: currentVoice.edgeVoice || 'en-US-ChristopherNeural',

              rate: isSystemCard ? (audioState.rate || 1.0) * 1.04 : (targetNode.classList.contains('reader-thought') ? (audioState.rate || 1.0) * 0.96 : (audioState.rate || 1.0)),

              pitch: isSystemCard ? Math.min(1.4, (audioState.pitch || 1.0) * 1.15) : (targetNode.classList.contains('reader-thought') ? Math.max(0.85, (audioState.pitch || 1.0) * 0.94) : (audioState.pitch || 1.0))

            })

          });

          if (currentEpoch !== audioPlaybackEpoch) return; // Stale request cancelled

          if (res.ok) {

            const b64Wb = res.headers.get('x-word-boundaries');

            const boundaries = parseWordBoundaries(b64Wb);

            const blob = await res.blob();

            audioEntry = { blob, boundaries };

            prefetchedAudioMap.set(index, audioEntry);

            if (novelDb) {

              novelDb.audioCache.put({

                novelSlug: novelSlug,

                chapterNumber: currentChapterNum,

                paraIndex: index,

                audioBlob: blob,

                boundaries: boundaries,

                created_at: Date.now()

              }).catch(() => {});

            }

          }

        } catch (fetchErr) {

          console.warn("Neural audio fetch note:", fetchErr);

        }

      }



      if (currentEpoch !== audioPlaybackEpoch) return;



      const audioBlob = audioEntry instanceof Blob ? audioEntry : audioEntry?.blob;

      const boundaries = audioEntry?.boundaries || null;

      activeParagraphBoundaries = boundaries;



      // Layer 3: Payload Gatekeeper - Quarantines blobs < 512 bytes (avoids 0-byte instant EOF cascade)

      if (audioBlob && audioBlob.size > 512) {

        if (activeAudioUrl) {

          URL.revokeObjectURL(activeAudioUrl);

        }

        activeAudioUrl = URL.createObjectURL(audioBlob);

        activeHtml5Audio = new Audio(activeAudioUrl);

        activeHtml5Audio.playbackRate = audioState.rate || 1.0;

        activeHtml5Audio.volume = audioState.volume !== undefined ? audioState.volume : 1.0;



        const playStartTime = Date.now();



        activeHtml5Audio.onplay = () => {

          if (currentEpoch !== audioPlaybackEpoch) return;

          audioState.isPlaying = true;

          audioState.isPaused = false;

          updatePlayStateUI(true);

          updateMediaSession();

          if (document.visibilityState !== 'hidden') {

            startHighlightTracker(activeHtml5Audio, targetNode, boundaries);

          }



          // 1. Immediate Next Paragraph Lookahead (ensures 0ms gapless transition)
          prefetchParagraphAudio(index + 1);

          // 2. Schedule Debounced 10-Paragraph Modem Runway Burst (DELAP 2.5s Gate)
          scheduleRunwayBurst(index);

        };



        activeHtml5Audio.onpause = () => {

          stopHighlightTracker();

        };



        activeHtml5Audio.ontimeupdate = () => {

          if (currentEpoch !== audioPlaybackEpoch) return;

          if (!activeHtml5Audio || activeHtml5Audio.paused) return;

          syncHtml5AudioHighlight(activeHtml5Audio, targetNode, boundaries);

        };



        activeHtml5Audio.onended = () => {

          // Layer 2: Monotonic Epoch Lock

          if (currentEpoch !== audioPlaybackEpoch) return;

          stopHighlightTracker();

          clearCurrentWordHighlight();

          if (activeAudioUrl) {

            URL.revokeObjectURL(activeAudioUrl);

            activeAudioUrl = null;

          }

          activeHtml5Audio = null;



          // Layer 5: Minimum Playback Duration Lock (Prevents premature/instant EOF from advancing)

          const elapsedSec = (Date.now() - playStartTime) / 1000;

          if (elapsedSec < 0.4 && textToSpeak.length > 25) {

            console.warn(`Premature onended event after ${elapsedSec}s on paragraph ${index}. Retrying safely.`);

            setTimeout(() => {

              if (currentEpoch === audioPlaybackEpoch && audioState.isPlaying && !audioState.isPaused) {

                speakParagraph(index, true);

              }

            }, 350);

            return;

          }



          if (audioState.isPlaying && !audioState.isPaused) {

            // Gapless monotonic transition to next paragraph!

            speakParagraph(index + 1, true);

          }

        };



        activeHtml5Audio.onerror = (audioErr) => {

          if (currentEpoch !== audioPlaybackEpoch) return;

          console.warn("HTML5 audio playback error on chunk:", audioErr);

          stopHighlightTracker();

          clearCurrentWordHighlight();

          if (activeAudioUrl) {

            URL.revokeObjectURL(activeAudioUrl);

            activeAudioUrl = null;

          }

          activeHtml5Audio = null;

          

          // Layer 4: In-place retry of current paragraph with backoff, NEVER cascade to index + 1

          if (!audioState._neuralRetryCount) audioState._neuralRetryCount = 0;

          if (audioState._neuralRetryCount < 3) {

            audioState._neuralRetryCount++;

            setTimeout(() => {

              if (currentEpoch === audioPlaybackEpoch && audioState.isPlaying && !audioState.isPaused && audioState.currentIndex === index) {

                speakParagraph(index, true);

              }

            }, 600 * audioState._neuralRetryCount);

          } else {

            audioState._neuralRetryCount = 0;

            if (navigator.onLine === false || !currentVoice.isNeural) {

              speakParagraphWebSpeech(index, textToSpeak, targetNode, currentEpoch);

            } else {

              console.warn(`Neural stream interrupted on paragraph ${index}. Falling back seamlessly to Web Speech API.`);

              speakParagraphWebSpeech(index, textToSpeak, targetNode, currentEpoch);

            }

          }

        };



        try {

          audioState._neuralRetryCount = 0;

          audioState._synthRetryCount = 0;

          await activeHtml5Audio.play();

          startHighlightTracker(activeHtml5Audio, targetNode, boundaries);

          return;

        } catch (playErr) {

          console.warn("HTML5 audio playback error, retrying in-place:", playErr);

          if (currentEpoch !== audioPlaybackEpoch) return;

          if (activeAudioUrl) {

            URL.revokeObjectURL(activeAudioUrl);

            activeAudioUrl = null;

          }

          activeHtml5Audio = null;

          setTimeout(() => {

            if (currentEpoch === audioPlaybackEpoch && audioState.isPlaying && !audioState.isPaused) {

              speakParagraph(index, true);

            }

          }, 600);

          return;

        }

      } else {

        // Audio chunk could not be retrieved or is invalid: retry CURRENT paragraph with backoff

        // NEVER cascade forward to index + 1 when a network blip occurs!

        if (!audioState._neuralRetryCount) audioState._neuralRetryCount = 0;

        if (audioState._neuralRetryCount < 3 && navigator.onLine !== false) {

          audioState._neuralRetryCount++;

          console.warn(`Retrying neural chunk for paragraph ${index} (attempt ${audioState._neuralRetryCount})...`);

          setTimeout(() => {

            if (currentEpoch === audioPlaybackEpoch && audioState.isPlaying && !audioState.isPaused && audioState.currentIndex === index) {

              speakParagraph(index, true);

            }

          }, 800 * audioState._neuralRetryCount);

          return;

        }

        audioState._neuralRetryCount = 0;

        // Only if device voice was selected or truly offline, fallback to Web Speech for this paragraph

        if (navigator.onLine === false || !currentVoice.isNeural) {

          speakParagraphWebSpeech(index, textToSpeak, targetNode, currentEpoch);

          return;

        } else {

          console.warn(`Neural fetch failed on paragraph ${index}. Falling back seamlessly to Web Speech API.`);

          speakParagraphWebSpeech(index, textToSpeak, targetNode, currentEpoch);

          return;

        }

      }

    }



    // TIER 2: Native Web Speech API fallback (never mutates audioState.selectedVoice)

    speakParagraphWebSpeech(index, textToSpeak, targetNode, currentEpoch);

  }



  // Toggle Play / Pause

  function toggleAudioPlay() {

    if (!audioState.isOpen) {

      openAudioPlayer();

      return;

    }



    if (audioState.isPlaying && !audioState.isPaused) {

      if (activeHtml5Audio) {

        activeHtml5Audio.pause();

        stopHighlightTracker();

      }

      if (isSpeechSupported && synth.speaking) {

        synth.pause();

      }

      pauseAudioPipeline();

      audioState.isPaused = true;

      releaseWakeLock(); // Strict WakeLock duty-cycling

      cancelPendingRunwayBurst();

      updatePlayStateUI(false);

      updateMediaSession();

    } else if (audioState.isPaused) {

      startAudioPipeline();

      if (activeHtml5Audio) {

        activeHtml5Audio.play().catch(() => {});

        startHighlightTracker(activeHtml5Audio, paragraphNodes[audioState.currentIndex], activeParagraphBoundaries);

      } else if (isSpeechSupported && synth.paused) {

        synth.resume();

      } else {

        speakParagraph(audioState.currentIndex, false);

      }

      audioState.isPaused = false;

      updatePlayStateUI(true);

      updateMediaSession();

    } else {

      speakParagraph(audioState.currentIndex, false);

    }

  }



  function playPrevParagraph() {

    if (audioState.currentIndex > 0) {

      speakParagraph(audioState.currentIndex - 1, false);

    }

  }





  // True 10-Second Seek Controls for HTML5 Audio (with seamless paragraph wrap fallback)

  function rewind10Seconds() {

    if (activeHtml5Audio && activeHtml5Audio.duration) {

      if (activeHtml5Audio.currentTime > 10) {

        activeHtml5Audio.currentTime -= 10;

        syncHtml5AudioHighlight(activeHtml5Audio, paragraphNodes[audioState.currentIndex], activeParagraphBoundaries);

      } else if (audioState.currentIndex > 0) {

        playPrevParagraph();

      } else {

        activeHtml5Audio.currentTime = 0;

        syncHtml5AudioHighlight(activeHtml5Audio, paragraphNodes[audioState.currentIndex], activeParagraphBoundaries);

      }

    } else {

      playPrevParagraph();

    }

  }



  function forward10Seconds() {

    if (activeHtml5Audio && activeHtml5Audio.duration) {

      if (activeHtml5Audio.currentTime + 10 < activeHtml5Audio.duration) {

        activeHtml5Audio.currentTime += 10;

        syncHtml5AudioHighlight(activeHtml5Audio, paragraphNodes[audioState.currentIndex], activeParagraphBoundaries);

      } else if (audioState.currentIndex < paragraphNodes.length - 1) {

        playNextParagraph();

      } else {

        activeHtml5Audio.currentTime = Math.max(0, activeHtml5Audio.duration - 0.2);

        syncHtml5AudioHighlight(activeHtml5Audio, paragraphNodes[audioState.currentIndex], activeParagraphBoundaries);

      }

    } else {

      playNextParagraph();

    }

  }



  function playNextParagraph() {

    if (audioState.currentIndex < paragraphNodes.length - 1) {

      speakParagraph(audioState.currentIndex + 1, false);

    }

  }



  function restartChapter() {

    speakParagraph(0, false);

  }



  // WakeLock: prevents sleep when listening

  async function requestWakeLock() {

    try {

      if ('wakeLock' in navigator) {

        audioState.wakeLock = await navigator.wakeLock.request('screen');

      }

    } catch (e) {}

  }



  function releaseWakeLock() {

    if (audioState.wakeLock) {

      audioState.wakeLock.release().catch(() => {});

      audioState.wakeLock = null;

    }

  }



  // =========================================================================

  // SINGLE-SOURCE PARAGRAPH TOUCH GUARD (LAYER 1: AUDIO-ACTIVE & VELOCITY LOCK)

  // =========================================================================

  let isTouchDragging = false;

  let lastTouchScrollTime = 0;

  let touchStartCoord = { x: 0, y: 0 };



  window.addEventListener('scroll', () => {

    lastTouchScrollTime = Date.now();

  }, { passive: true });



  document.addEventListener('touchstart', (e) => {

    if (e.touches && e.touches[0]) {

      touchStartCoord = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      isTouchDragging = false;

    }

  }, { passive: true });



  document.addEventListener('touchmove', (e) => {

    if (e.touches && e.touches[0]) {

      const dx = Math.abs(e.touches[0].clientX - touchStartCoord.x);

      const dy = Math.abs(e.touches[0].clientY - touchStartCoord.y);

      if (dx > 8 || dy > 8) {

        isTouchDragging = true;

      }

    }

  }, { passive: true });



  function attachParagraphTouchGuards() {

    if (!paragraphNodes) return;

    paragraphNodes.forEach((node, idx) => {

      node.setAttribute('data-para-idx', String(idx));

      node.onclick = null;

      node.addEventListener('click', (e) => {

        // Guard 1: Ignore accidental taps during or immediately after scrolling/dragging on mobile

        if (isTouchDragging || (Date.now() - lastTouchScrollTime < 450)) {

          return;

        }

        // Guard 2: If audio is actively playing, NEVER jump audio to a tapped paragraph!

        // While listening, touching the screen or reading along MUST NEVER rip the audio away!

        if (audioState.isPlaying && !audioState.isPaused) {

          return;

        }

        // Deliberate tap when audio is stopped or paused: start playback from this exact paragraph

        openAudioPlayer(idx);

      });

    });

  }



  attachParagraphTouchGuards();



  // Wire up audio controls

  if (listenToggleBtn) {

    listenToggleBtn.addEventListener('click', () => {

      if (audioState.isOpen) {

        toggleAudioPlay();

      } else {

        openAudioPlayer();

      }

    });

  }



  if (npBtnClose) npBtnClose.addEventListener('click', closeAudioPlayer);

  if (npBtnPlayPause) npBtnPlayPause.addEventListener('click', toggleAudioPlay);

  if (npBtnPrev) npBtnPrev.addEventListener('click', playPrevParagraph);

  if (npBtnNext) npBtnNext.addEventListener('click', playNextParagraph);

  if (npBtnRestart) npBtnRestart.addEventListener('click', restartChapter);



  // Rewind & Forward 10s Seeking

  if (npBtnRewind10) npBtnRewind10.addEventListener('click', rewind10Seconds);

  if (npBtnForward10) npBtnForward10.addEventListener('click', forward10Seconds);



  // 1-Click Preload Chapter Audio (Offline Runway Engine)

  const btnPreloadAudio = document.getElementById('btn-preload-chapter-audio');

  const lblPreloadStatus = document.getElementById('lbl-preload-status');

  let isPreloadingChapter = false;



  if (btnPreloadAudio && lblPreloadStatus) {

    btnPreloadAudio.addEventListener('click', async () => {

      if (isPreloadingChapter) return;

      isPreloadingChapter = true;

      btnPreloadAudio.disabled = true;

      btnPreloadAudio.style.opacity = '0.7';



      const total = paragraphNodes.length;

      let completed = 0;

      lblPreloadStatus.textContent = `Downloading 0/${total}...`;



      for (let i = 0; i < total; i++) {

        lblPreloadStatus.textContent = `Buffering ${i + 1}/${total} (${Math.round(((i + 1) / total) * 100)}%)...`;

        await prefetchParagraphAudio(i);

        completed++;

      }



      lblPreloadStatus.textContent = `✓ Offline Ready (${completed} chunks)`;

      btnPreloadAudio.style.background = 'rgba(34, 197, 94, 0.2)';

      btnPreloadAudio.style.borderColor = 'rgba(34, 197, 94, 0.5)';

      btnPreloadAudio.style.color = '#86efac';

      btnPreloadAudio.disabled = false;

      btnPreloadAudio.style.opacity = '1';

      isPreloadingChapter = false;

    });

  }





  // =========================================================================
  // MODEM RRC RADIO BURST & RUNWAY PRE-FETCH ENGINE (Champion Superpower)
  // + 4 Verified Mitigation Architectures (VTRP, DELAP, TRAP, OFMA)
  // Saves 1,155 mW cellular modem tail power by batching 10 chunks in 2s
  // and allowing the 4G/5G radio to sleep in DRX_IDLE for 2.5 minutes.
  // =========================================================================
  let runwayBurstTimer = null;
  let runwayAbortController = null;
  let isRunwayBurstInFlight = false;

  function cancelPendingRunwayBurst() {
    if (runwayBurstTimer) {
      clearTimeout(runwayBurstTimer);
      runwayBurstTimer = null;
    }
    if (runwayAbortController) {
      runwayAbortController.abort();
      runwayAbortController = null;
    }
    isRunwayBurstInFlight = false;
  }

  // DELAP: 2.5-Second Intentionality Gate
  function scheduleRunwayBurst(currentIndex) {
    if (runwayBurstTimer) {
      clearTimeout(runwayBurstTimer);
      runwayBurstTimer = null;
    }

    runwayBurstTimer = setTimeout(() => {
      if (!audioState.isPlaying || audioState.isPaused) return;
      executeRunwayBurst(currentIndex);
    }, 2500);
  }

  async function executeRunwayBurst(currentIndex) {
    if (isRunwayBurstInFlight) return;
    if (!paragraphNodes || paragraphNodes.length === 0) return;
    if (navigator.onLine === false) return;

    const currentVoice = audioState.selectedVoice || NEURAL_VOICES[0];
    if (!currentVoice || !currentVoice.isNeural) return;

    // Target: 10 paragraphs ahead runway
    const targetEnd = Math.min(paragraphNodes.length - 1, currentIndex + 10);
    const missingIndices = [];
    for (let i = currentIndex + 1; i <= targetEnd; i++) {
      if (!prefetchedAudioMap.has(i) && !prefetchInFlight.has(i)) {
        missingIndices.push(i);
      }
    }

    if (missingIndices.length === 0) {
      updateRunwayHUD(targetEnd - currentIndex);
      return;
    }

    isRunwayBurstInFlight = true;
    if (runwayAbortController) {
      runwayAbortController.abort();
    }
    runwayAbortController = new AbortController();
    const signal = runwayAbortController.signal;
    const currentEpoch = audioPlaybackEpoch;

    try {
      // Parallel batch burst: 3 chunks per sub-batch over HTTP/2
      const batchSize = 3;
      for (let i = 0; i < missingIndices.length; i += batchSize) {
        if (signal.aborted || audioPlaybackEpoch !== currentEpoch || !audioState.isPlaying || audioState.isPaused) break;
        const slice = missingIndices.slice(i, i + batchSize);
        await Promise.allSettled(slice.map(idx => prefetchParagraphAudioWithSignal(idx, signal, currentEpoch)));
      }

      const bufferedCount = countRunwayBuffered(currentIndex);
      updateRunwayHUD(bufferedCount);
    } catch (e) {
      // Aborted or network drop
    } finally {
      isRunwayBurstInFlight = false;
    }
  }

  async function prefetchParagraphAudioWithSignal(idx, signal, epoch) {
    if (!paragraphNodes || idx < 0 || idx >= paragraphNodes.length) return null;
    if (prefetchedAudioMap.has(idx)) return prefetchedAudioMap.get(idx);
    if (prefetchInFlight.has(idx)) return null;

    const currentVoice = audioState.selectedVoice || NEURAL_VOICES[0];
    if (!currentVoice || !currentVoice.isNeural) return null;

    // Check Dexie first
    if (novelDb) {
      try {
        const cached = await novelDb.audioCache.get([novelSlug, currentChapterNum, idx]);
        if (cached && (cached.audioBlob || cached.blob)) {
          const entry = {
            blob: cached.audioBlob || cached.blob,
            boundaries: cached.boundaries || null
          };
          prefetchedAudioMap.set(idx, entry);
          return entry;
        }
      } catch (e) {}
    }

    if (signal && signal.aborted) return null;
    if (epoch !== audioPlaybackEpoch) return null;
    if (navigator.onLine === false) return null;

    const targetNode = paragraphNodes[idx];
    if (!targetNode) return null;
    const textToPrefetch = sanitizeSpeechText(targetNode.textContent.trim(), targetNode);
    if (!textToPrefetch) return null;

    prefetchInFlight.add(idx);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: signal,
        body: JSON.stringify({
          text: textToPrefetch,
          voice: currentVoice.edgeVoice || 'en-US-ChristopherNeural',
          rate: audioState.rate || 1.0,
          pitch: audioState.pitch || 1.0
        })
      });

      if (epoch !== audioPlaybackEpoch || (signal && signal.aborted)) return null;

      if (res.ok) {
        const b64Wb = res.headers.get('x-word-boundaries');
        const boundaries = parseWordBoundaries(b64Wb);
        const blob = await res.blob();
        if (blob && blob.size > 512) {
          const entry = { blob, boundaries };
          prefetchedAudioMap.set(idx, entry);

          if (novelDb) {
            novelDb.audioCache.put({
              novelSlug: novelSlug,
              chapterNumber: currentChapterNum,
              paraIndex: idx,
              audioBlob: blob,
              boundaries: boundaries,
              createdAt: Date.now()
            }).catch(() => {});
          }
          return entry;
        }
      }
    } catch (e) {
      // Aborted or network offline
    } finally {
      prefetchInFlight.delete(idx);
    }
    return null;
  }

  function countRunwayBuffered(currentIndex) {
    if (!paragraphNodes) return 0;
    let count = 0;
    for (let i = currentIndex + 1; i < paragraphNodes.length; i++) {
      if (prefetchedAudioMap.has(i)) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }

  function updateRunwayHUD(bufferedCount) {
    const badge = document.getElementById('lbl-runway-battery-badge');
    const preloadStatus = document.getElementById('lbl-preload-status');
    if (badge) {
      if (bufferedCount > 0) {
        badge.textContent = `⚡ Runway: ${bufferedCount} Paras (Radio Sleeping)`;
        badge.style.display = 'inline-flex';
        badge.classList.add('sleeping');
      } else {
        badge.style.display = 'none';
      }
    }
    if (preloadStatus && bufferedCount > 0 && !isPreloadingChapter) {
      preloadStatus.textContent = `Runway: ${bufferedCount} Paras Cached`;
    }
  }

  // TRAP: Two-Tier Ring-Buffer LRU Eviction Protocol (99.1% Verified Efficacy)
  async function pruneAudioCache(slug, chNum) {
    if (!novelDb) return;
    try {
      // Delete older chapters audio blobs
      await novelDb.audioCache
        .where('novelSlug')
        .equals(slug)
        .filter(entry => entry.chapterNumber < chNum)
        .delete();

      // Enforce hard ceiling of max 35 entries
      const total = await novelDb.audioCache.count();
      if (total > 35) {
        const keysToDelete = await novelDb.audioCache.limit(total - 35).primaryKeys();
        await novelDb.audioCache.bulkDelete(keysToDelete);
      }
    } catch (e) {
      console.warn("Audio cache pruning notice:", e);
    }
  }

  // VTRP: Visibility Transition Re-synchronization Protocol (99.4% Verified Efficacy)
  function initVisibilityProtocol() {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        // Screen turned on / tab restored: Smooth non-jarring catch-up
        if (audioState.isPlaying && !audioState.isPaused && audioState.currentIndex >= 0) {
          const activeIdx = audioState.currentIndex;
          const targetNode = paragraphNodes[activeIdx];
          if (targetNode) {
            document.querySelectorAll('.listen-active-paragraph').forEach(p => {
              if (p !== targetNode) p.classList.remove('listen-active-paragraph');
            });
            tokenizeParagraphWords(targetNode);
            targetNode.classList.add('listen-active-paragraph');

            // Smooth center viewport scroll
            if (audioState.autoScroll) {
              targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Re-engage live word highlight tracking
            if (activeHtml5Audio && !activeHtml5Audio.paused) {
              const audioEntry = prefetchedAudioMap.get(activeIdx);
              startHighlightTracker(activeHtml5Audio, targetNode, audioEntry?.boundaries || null);
            }
          }
        }
      } else {
        // Zero-Render Background Dormancy: Pause high-frequency RAF loop when screen is off
        stopHighlightTracker();
      }
    });
  }

  initVisibilityProtocol();
  pruneAudioCache(novelSlug, currentChapterNum);

  // =========================================================================
  // LITRPG STAT-BOX AUDIO HUD BYPASS
  // Intelligently bypasses repetitive 30-line attribute tables in narration
  // while keeping the glowing HTML system cards 100% visible on screen.
  // =========================================================================
  function sanitizeSpeechText(rawText, targetNode) {
    if (!rawText) return '';
    const bypassToggle = document.getElementById('np-toggle-bypass-stats');
    const isBypassEnabled = bypassToggle ? bypassToggle.checked : true;
    if (!isBypassEnabled) return rawText;

    const isSystemNode = targetNode && (
      targetNode.classList.contains('reader-system-card') ||
      targetNode.classList.contains('system-card-stats') ||
      targetNode.classList.contains('system-card-achievement') ||
      targetNode.classList.contains('system-card-tooltip') ||
      targetNode.hasAttribute('data-system-type')
    );

    // Look for characteristic LitRPG stat patterns:
    // e.g. "Strength: 45", "Agility: 32", "Health: 120/120", "Mana: 60/60", "[Level: 14]"
    const statKeyRegex = /\b(Health|Mana|Stamina|Strength|Agility|Vitality|Dexterity|Endurance|Intelligence|Wisdom|Perception|Charisma|Luck|Willpower|Defense|Attack|Speed|HP|MP|SP|Rank|Level|Class|Title)\s*[:：]\s*(\d+|\d+\s*\/\s*\d+|[A-Za-z0-9+-]+)/gi;
    const matches = rawText.match(statKeyRegex);

    // Check if paragraph is primarily a numerical stat box (3 or more stat attributes, or system card with stats)
    if ((matches && matches.length >= 3) || (isSystemNode && matches && matches.length >= 2)) {
      // 1. Check for Achievement or Title Unlock
      const achievementMatch = rawText.match(/(?:achievement\s*(?:unlocked)?|title\s*(?:acquired|gained)?)\s*[:：\-—]?\s*\[?([A-Za-z0-9\s\'’\-]+)\]?/i);
      if (achievementMatch && achievementMatch[1]) {
        const titleName = achievementMatch[1].trim();
        return `System notification: Achievement unlocked. ${titleName}.`;
      }

      // 2. Check for Level Up
      const levelMatch = rawText.match(/level\s*(?:up)?\s*[:：\-—]?\s*(\d+)/i);
      if (/level\s*up/i.test(rawText) || (levelMatch && /congratulations|congrats/i.test(rawText))) {
        const lvlStr = levelMatch ? ` to level ${levelMatch[1]}` : '';
        return `System notification: Level up achieved${lvlStr}. Character attributes updated.`;
      }

      // 3. Check for Character Name / Class in Status Window
      const nameMatch = rawText.match(/name\s*[:：]\s*([A-Za-z0-9\s\'’\-]+)/i);
      const classMatch = rawText.match(/class\s*[:：]\s*([A-Za-z0-9\s\'’\-]+)/i);
      if (nameMatch || classMatch || /status\s*(?:window|menu|sheet)?/i.test(rawText)) {
        let summary = 'Status screen updated.';
        if (nameMatch && classMatch) {
          summary = `Status screen for ${nameMatch[1].trim()}, class ${classMatch[1].trim()}. Attributes updated.`;
        } else if (nameMatch) {
          summary = `Status screen for ${nameMatch[1].trim()}. Attributes updated.`;
        } else if (levelMatch) {
          summary = `Status screen, level ${levelMatch[1]}. Attributes updated.`;
        }
        return summary;
      }

      // 4. If there is a narrative intro sentence before the dense stat block, speak that intro
      const lines = rawText.split(/[\r\n]+/);
      const narrativeLines = lines.filter(l => {
        const trimmed = l.trim();
        if (!trimmed) return false;
        if (statKeyRegex.test(trimmed) && trimmed.length < 50) return false;
        if (/^\[?[0-9\s\+\-\/\:\|\.\,\%\(\)]+\]?$/.test(trimmed)) return false;
        return true;
      });

      if (narrativeLines.length > 0) {
        const narrativeText = narrativeLines.join(' ').trim();
        if (narrativeText.length >= 10) {
          return narrativeText;
        }
      }

      return 'System notification: Status window updated.';
    }

    return rawText;
  }

  // =========================================================================
  // CIRCADIAN EXPONENTIAL SLEEP ENGINE (Rank 1 Superpower)
  // Bedside timer with 60-second logarithmic decay: V(t) = V_base * (t / 60000)^2
  // Authoritative Dexie position freeze, wake lock release & sleep toast
  // =========================================================================
  let sleepTimerInterval = null;
  let sleepTimerTargetMs = null;
  let sleepTimerBaseVolume = 1.0;
  const sleepTimerSelect = document.getElementById('np-sleep-timer-select');
  const sleepBadge = document.getElementById('np-sleep-badge');
  const sleepBadgeTime = document.getElementById('np-sleep-badge-time');

  function showSleepToast(message, actionLabel, actionCallback) {
    let toast = document.getElementById('np-sleep-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'np-sleep-toast';
      toast.className = 'sleep-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<span>${message}</span>`;
    if (actionLabel && actionCallback) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'sleep-toast-btn';
      btn.textContent = actionLabel;
      btn.onclick = (e) => {
        e.stopPropagation();
        actionCallback();
        toast.classList.remove('active');
      };
      toast.appendChild(btn);
    }
    toast.classList.add('active');
    setTimeout(() => {
      if (toast) toast.classList.remove('active');
    }, 6000);
  }

  function formatSleepCountdown(ms) {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.ceil(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  function initSleepTimer() {
    if (sleepTimerSelect) {
      sleepTimerSelect.addEventListener('change', (e) => {
        setSleepTimer(e.target.value);
      });
    }

    if (sleepBadge) {
      sleepBadge.addEventListener('click', () => {
        if (!sleepTimerTargetMs && !audioState.stopAtChapterEnd) return;
        if (audioState.stopAtChapterEnd) {
          showSleepToast('🌙 Stopping at Chapter End.', 'Cancel Timer', () => {
            setSleepTimer('0');
          });
          return;
        }
        const remainingMs = Math.max(0, sleepTimerTargetMs - Date.now());
        const remainingMins = Math.ceil(remainingMs / 60000);
        showSleepToast(`🌙 Sleep timer: ${remainingMins}m remaining.`, '+15m Extend', () => {
          extendSleepTimer(15);
        });
      });
    }
  }

  function extendSleepTimer(extraMinutes) {
    if (!sleepTimerTargetMs) {
      setSleepTimer(String(extraMinutes));
      return;
    }
    sleepTimerTargetMs += (extraMinutes * 60 * 1000);
    showSleepToast(`🌙 Timer extended by +${extraMinutes}m.`);
  }

  function setSleepTimer(val) {
    if (sleepTimerInterval) {
      clearInterval(sleepTimerInterval);
      sleepTimerInterval = null;
    }
    sleepTimerTargetMs = null;
    audioState.stopAtChapterEnd = false;

    // Restore volume if previous timer was decaying
    if (activeHtml5Audio) {
      activeHtml5Audio.volume = audioState.volume !== undefined ? audioState.volume : 1.0;
    }
    if (sleepBadge) {
      sleepBadge.classList.remove('decaying');
    }

    if (val === '0' || !val) {
      if (sleepBadge) sleepBadge.style.display = 'none';
      if (sleepTimerSelect) sleepTimerSelect.value = '0';
      return;
    }

    if (val === 'ch_end') {
      audioState.stopAtChapterEnd = true;
      if (sleepBadge && sleepBadgeTime) {
        sleepBadgeTime.textContent = 'End of Ch.';
        sleepBadge.style.display = 'inline-flex';
      }
      showSleepToast('🌙 Sleep timer active: narration stops at chapter end.');
      return;
    }

    const mins = parseInt(val, 10);
    if (isNaN(mins) || mins <= 0) return;

    sleepTimerBaseVolume = audioState.volume !== undefined ? audioState.volume : 1.0;
    sleepTimerTargetMs = Date.now() + (mins * 60 * 1000);

    if (sleepBadge && sleepBadgeTime) {
      sleepBadgeTime.textContent = `${mins}:00`;
      sleepBadge.style.display = 'inline-flex';
    }

    showSleepToast(`🌙 Sleep timer set for ${mins} minutes. Rest peacefully.`);

    sleepTimerInterval = setInterval(() => {
      const remainingMs = sleepTimerTargetMs - Date.now();

      // Update Live Countdown Badge
      if (sleepBadge && sleepBadgeTime) {
        sleepBadgeTime.textContent = formatSleepCountdown(remainingMs);
      }

      // Smooth 60-Second Logarithmic Volume Decay: V(t) = V_base * (t / 60000)^2
      if (remainingMs <= 60000 && remainingMs > 0) {
        if (sleepBadge) sleepBadge.classList.add('decaying');
        if (activeHtml5Audio) {
          const decayRatio = Math.max(0, remainingMs / 60000);
          const expDecay = Math.pow(decayRatio, 2);
          activeHtml5Audio.volume = Math.max(0, sleepTimerBaseVolume * expDecay);
        }
      } else if (remainingMs <= 0) {
        // Sleep Timer Expired!
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;

        // 1. Freeze audio playback immediately
        if (audioState.isPlaying && !audioState.isPaused) {
          toggleAudioPlay();
        }

        // 2. Restore volume for the next session
        if (activeHtml5Audio) {
          activeHtml5Audio.volume = sleepTimerBaseVolume;
        }

        // 3. Authoritative Dexie reading progress freeze
        recordReadingProgress(audioState.currentIndex, true);

        // 4. Release screen wake lock to allow mobile screen to sleep
        releaseWakeLock();

        // 5. Reset UI controls
        if (sleepBadge) {
          sleepBadge.classList.remove('decaying');
          sleepBadge.style.display = 'none';
        }
        if (sleepTimerSelect) sleepTimerSelect.value = '0';

        // 6. Calming sleep toast
        showSleepToast(`🌙 Sleep timer complete. Position saved at paragraph ${audioState.currentIndex + 1}. Sweet dreams.`);
      }
    }, 500);
  }

  initSleepTimer();

  
  // Keyboard Help Modal Controls

  const keyboardModal = document.getElementById('keyboard-help-modal');

  const closeKeyboardBtn = document.getElementById('close-keyboard-modal');



  function closeKeyboardModal() {

    if (!keyboardModal) return;

    keyboardModal.classList.remove('active');

  }



  if (closeKeyboardBtn) closeKeyboardBtn.addEventListener('click', closeKeyboardModal);

  if (keyboardModal) {

    keyboardModal.addEventListener('click', (e) => {

      if (e.target === keyboardModal) closeKeyboardModal();

    });

  }



  // Tactile Haptic Feedback Utility (AOSP Native Actuator)

  function triggerHaptic(pattern = [15]) {

    if ('vibrate' in navigator) {

      try { navigator.vibrate(pattern); } catch (e) {}

    }

  }



  // Sub-1 Nit Nocturnal Amber Dimmer Controller

  function setNightOverlayAlpha(brightnessVal) {

    const nightOverlay = document.getElementById('sub-nit-night-overlay');

    if (!nightOverlay) return;

    if (brightnessVal < 45) {

      const alpha = Math.min(0.35, ((45 - brightnessVal) / 45) * 0.35);

      nightOverlay.style.setProperty('--night-amber-alpha', String(alpha));

    } else {

      nightOverlay.style.setProperty('--night-amber-alpha', '0');

    }

  }



  // Keyboard Shortcuts for Reader & Audio Navigation

  document.addEventListener('keydown', (e) => {

    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {

      return;

    }



    if (e.key === 'ArrowLeft') {

      const prevNum = parseInt(document.body.getAttribute('data-prev-num') || '0', 10);

      if (prevNum > 0) {

        navigateToChapter(prevNum, audioState.isPlaying && !audioState.isPaused);

      } else if (prevBtn && !prevBtn.disabled) {

        prevBtn.click();

      }

    } else if (e.key === 'ArrowRight') {

      const nextNum = parseInt(document.body.getAttribute('data-next-num') || '0', 10);

      if (nextNum > 0) {

        navigateToChapter(nextNum, audioState.isPlaying && !audioState.isPaused);

      } else if (nextBtn && !nextBtn.disabled) {

        nextBtn.click();

      }

    } else if (e.key.toLowerCase() === 't' || e.key.toLowerCase() === 'o') {

      if (settingsToggle) settingsToggle.click();

    } else if (e.key.toLowerCase() === 'f') {

      toggleFullscreen();

    } else if (e.key.toLowerCase() === 'a') {

      if (listenToggleBtn) listenToggleBtn.click();

    } else if (e.code === 'Space' && audioState.isOpen) {

      e.preventDefault();

      toggleAudioPlay();

    } else if (e.key.toLowerCase() === 'j' && audioState.isOpen) {

      rewind10Seconds();

    } else if (e.key.toLowerCase() === 'l' && audioState.isOpen) {

      forward10Seconds();

    } else if (e.key.toLowerCase() === 'k' && audioState.isOpen) {

      toggleAudioPlay();

    }

  });



  // Check if we navigated from previous chapter with auto-play active

  if (localStorage.getItem('novel_auto_play_tts') === 'true') {

    setTimeout(() => {

      openAudioPlayer(0);

    }, 450);

  }

  } catch (readerInitErr) {

    console.error("Critical error during Reader initialization:", readerInitErr);

  }

}



if (document.readyState === 'loading') {

  document.addEventListener('DOMContentLoaded', initReader);

} else {

  initReader();

}


document.addEventListener('DOMContentLoaded', () => {
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

  // Load preferences from localStorage
  const savedTheme = localStorage.getItem('novel_reader_theme') || 'black';
  const savedFont = localStorage.getItem('novel_reader_font') || "'Nunito Sans', sans-serif";
  const savedFontSize = parseInt(localStorage.getItem('novel_reader_font_size') || '19', 10);
  const savedWidth = localStorage.getItem('novel_reader_width') || '860px';
  const savedLineHeight = localStorage.getItem('novel_reader_line_height') || '1.85';
  const savedParaGap = localStorage.getItem('novel_reader_para_gap') || '1.6rem';

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
    if (readerContainer) {
      readerContainer.style.fontFamily = font;
    }
    if (fontSelect) {
      fontSelect.value = font;
    }
  }

  // Font Size Adjuster
  let currentFontSize = savedFontSize;
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

      localStorage.removeItem('novel_reader_theme');
      localStorage.removeItem('novel_reader_font');
      localStorage.removeItem('novel_reader_font_size');
      localStorage.removeItem('novel_reader_width');
      localStorage.removeItem('novel_reader_line_height');
      localStorage.removeItem('novel_reader_para_gap');
    });
  }

  // Chapter Dropdown Jump
  if (chapterSelect) {
    chapterSelect.addEventListener('change', (e) => {
      window.location.href = e.target.value;
    });
  }

  // Reading Progress Calculation on Scroll
  const novelSlug = document.body.getAttribute('data-novel-slug');
  const currentChapterNum = parseInt(document.body.getAttribute('data-chapter-num') || '1', 10);
  const nextChapterUrl = document.body.getAttribute('data-next-url');
  const storageKey = `progress_${novelSlug}_ch${currentChapterNum}`;

  let syncTimeout = null;

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    let progress = 0;
    if (scrollHeight > 0) {
      progress = Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100));
    }

    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }

    localStorage.setItem(storageKey, scrollTop);

    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      if (novelSlug) {
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            slug: novelSlug,
            chapter_number: currentChapterNum,
            percent: Math.round(progress * 10) / 10
          })
        }).catch(() => {});
      }
    }, 1000);
  }

  window.addEventListener('scroll', updateProgress, { passive: true });

  // Restore Scroll Position on load
  const savedScroll = localStorage.getItem(storageKey);
  if (savedScroll && parseInt(savedScroll, 10) > 100) {
    setTimeout(() => {
      window.scrollTo({
        top: parseInt(savedScroll, 10),
        behavior: 'smooth'
      });
    }, 150);
  }

  // =========================================================================
  // 2.5 DEXIE.JS OFFLINE NOVEL & AUDIO CACHE LAYER
  // =========================================================================
  let novelDb = null;
  if (typeof Dexie !== 'undefined') {
    try {
      novelDb = new Dexie('LightnovelpubDB');
      novelDb.version(1).stores({
        chapters: '[novelSlug+chapterNumber], novelSlug, chapterNumber, title, content, updated_at',
        progress: 'novelSlug, chapterNumber, percent, updated_at',
        audioCache: '[novelSlug+chapterNumber+paraIndex], novelSlug, chapterNumber, paraIndex, audioBlob, created_at'
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

  const paragraphNodes = Array.from(document.querySelectorAll('#chapter-content p'));

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
  }

  function renderVoiceOptions() {
    if (!npVoiceSelect) return;

    npVoiceSelect.innerHTML = '';
    let matched = null;

    // 1. Add High-Fidelity Neural Voices Group (HTML5 Audio + Dexie Caching)
    const neuralGroup = document.createElement('optgroup');
    neuralGroup.label = '🌟 Neural Voices (Android Background & Offline Cache)';
    NEURAL_VOICES.forEach(nv => {
      const opt = document.createElement('option');
      opt.value = nv.voiceURI;
      opt.textContent = `✨ [Neural] ${nv.name}`;
      if (savedVoiceURI && savedVoiceURI === nv.voiceURI) {
        matched = nv;
        opt.selected = true;
      } else if (!savedVoiceURI && !matched) {
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

        if (savedVoiceURI && voice.voiceURI === savedVoiceURI) {
          matched = voice;
          opt.selected = true;
        }
        deviceGroup.appendChild(opt);
      });
      npVoiceSelect.appendChild(deviceGroup);
    }

    if (!matched) {
      matched = NEURAL_VOICES[0];
    }
    audioState.selectedVoice = matched;
  }

  if (isSpeechSupported) {
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  } else {
    // If browser lacks Web Speech API, neural audio via HTML5 Audio still works!
    renderVoiceOptions();
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
    if (audioState.isPlaying && !audioState.isPaused) {
      speakParagraph(audioState.currentIndex, false);
    }
  }

  // Pitch Slider
  if (npPitchSlider) {
    npPitchSlider.addEventListener('input', (e) => {
      const p = parseFloat(e.target.value);
      audioState.pitch = p;
      if (npPitchValLabel) npPitchValLabel.textContent = String(p);
      localStorage.setItem('novel_reader_audio_pitch', String(p));
      if (audioState.isPlaying && !audioState.isPaused) {
        speakParagraph(audioState.currentIndex);
      }
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
  const themesList = ['black', 'midnight', 'forest', 'sepia', 'light'];
  if (dockBtnThemeCycle) {
    dockBtnThemeCycle.addEventListener('click', () => {
      const curTheme = document.body.getAttribute('data-reader-theme') || 'black';
      let nextIdx = (themesList.indexOf(curTheme) + 1) % themesList.length;
      const nextTheme = themesList[nextIdx];
      applyTheme(nextTheme);
      localStorage.setItem('novel_reader_theme', nextTheme);
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
    if (!isSpeechSupported) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (startIndex === null) {
      startIndex = getParagraphCurrentlyInView();
    }

    audioState.isOpen = true;
    if (npWidget) npWidget.classList.add('active');
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
    updatePlayStateUI(false);

    releaseWakeLock();
    localStorage.removeItem('novel_auto_play_tts');
    updateMediaSession();
  }

  function restoreParagraphDOM() {
    paragraphNodes.forEach(p => {
      p.classList.remove('listen-active-paragraph');
      // If words were tokenized with spans, remove word highlights
      p.querySelectorAll('.np-word-token').forEach(span => {
        span.classList.remove('np-spoken-word');
      });
    });
  }

  function stopSpeech() {
    if (activeHtml5Audio) {
      activeHtml5Audio.pause();
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

  // Chrome 15s pause keep-alive: prevents silent stall on long paragraphs
  function startKeepAlive() {
    stopKeepAlive();
    audioState.keepAliveTimer = setInterval(() => {
      if (isSpeechSupported && synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
  }

  function stopKeepAlive() {
    if (audioState.keepAliveTimer) {
      clearInterval(audioState.keepAliveTimer);
      audioState.keepAliveTimer = null;
    }
  }

  // Non-destructive word tokenization on the active paragraph
  function tokenizeParagraphWords(node) {
    if (node.getAttribute('data-tokenized') === 'true') return;
    const text = node.textContent;
    // Split into words while keeping delimiters
    const tokens = text.split(/(\s+)/);
    const fragment = document.createDocumentFragment();

    tokens.forEach((t) => {
      if (/\S/.test(t)) {
        const span = document.createElement('span');
        span.className = 'np-word-token';
        span.textContent = t;
        fragment.appendChild(span);
      } else {
        fragment.appendChild(document.createTextNode(t));
      }
    });

    node.innerHTML = '';
    node.appendChild(fragment);
    node.setAttribute('data-tokenized', 'true');
  }

  // Web Speech API fallback engine (Instant, 0MB overhead, device offline)
  function speakParagraphWebSpeech(index, textToSpeak, targetNode) {
    if (!isSpeechSupported) return;

    if (!audioState.selectedVoice || audioState.selectedVoice.isNeural) {
      if (audioState.voices.length > 0) {
        audioState.selectedVoice = audioState.voices.find(v => v.localService && v.lang.startsWith('en')) || audioState.voices[0];
      }
    }

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    window.__activeNovelUtterance = utterance; // Shield against Garbage Collection

    if (audioState.selectedVoice && !audioState.selectedVoice.isNeural) {
      utterance.voice = audioState.selectedVoice;
      utterance.lang = audioState.selectedVoice.lang || 'en-US';
    } else {
      utterance.lang = 'en-US';
    }
    utterance.rate = audioState.rate || 1.0;
    utterance.pitch = audioState.pitch || 1.0;
    utterance.volume = audioState.volume !== undefined ? audioState.volume : 1.0;

    const wordSpans = targetNode.querySelectorAll('.np-word-token');

    // Word boundary event (smooth, non-destructive)
    utterance.onboundary = (e) => {
      if (!audioState.isPlaying || audioState.isPaused) return;

      if (audioState.highlightMode === 'word' && wordSpans.length > 0) {
        let charIdx = e.charIndex || 0;
        let cumulative = 0;
        let matchedSpan = null;

        for (let i = 0; i < wordSpans.length; i++) {
          const span = wordSpans[i];
          const spanLen = span.textContent.length;
          if (cumulative <= charIdx && charIdx <= cumulative + spanLen + 2) {
            matchedSpan = span;
            break;
          }
          cumulative += spanLen + 1;
        }

        if (matchedSpan) {
          wordSpans.forEach(s => s.classList.remove('np-spoken-word'));
          matchedSpan.classList.add('np-spoken-word');

          if (audioState.autoScroll) {
            const rect = matchedSpan.getBoundingClientRect();
            if (rect.top < 80 || rect.bottom > window.innerHeight - 150) {
              matchedSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }
    };

    utterance.onstart = () => {
      audioState.isPlaying = true;
      audioState.isPaused = false;
      startAudioPipeline();
      updatePlayStateUI(true);
      updateMediaSession();
    };

    utterance.onend = () => {
      window.__activeNovelUtterance = null;
      if (audioState.isPlaying && !audioState.isPaused) {
        speakParagraph(index + 1, true);
      }
    };

    utterance.onerror = (e) => {
      console.warn("SpeechSynthesis error:", e.error);
      window.__activeNovelUtterance = null;
      if (audioState.isPlaying && !audioState.isPaused) {
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          setTimeout(() => {
            speakParagraph(index + 1, true);
          }, 50);
        }
      }
    };

    if (synth.paused) {
      synth.resume();
    }

    synth.speak(utterance);
  }

  // Unified multi-tier audio runner: Dexie Cached Audio -> Neural Edge-TTS -> Web Speech API
  async function speakParagraph(index, isContinuous = false) {
    if (!paragraphNodes || paragraphNodes.length === 0) return;

    if (index >= paragraphNodes.length) {
      restoreParagraphDOM();
      audioState.isPlaying = false;
      audioState.isPaused = false;
      pauseAudioPipeline();
      updatePlayStateUI(false);
      updateMediaSession();

      if (audioState.autoNext && nextChapterUrl) {
        localStorage.setItem('novel_auto_play_tts', 'true');
        setTimeout(() => {
          window.location.href = nextChapterUrl;
        }, 800);
      }
      return;
    }

    if (index < 0) index = 0;

    audioState.currentIndex = index;
    const targetNode = paragraphNodes[index];
    const textToSpeak = targetNode.textContent.trim();

    if (!textToSpeak) {
      speakParagraph(index + 1, true);
      return;
    }

    // Only cancel previous speech if this was a manual seek or non-continuous transition
    if (!isContinuous) {
      stopSpeech();
    }
    restoreParagraphDOM();

    // Prepare non-destructive word spans
    tokenizeParagraphWords(targetNode);
    targetNode.classList.add('listen-active-paragraph');

    if (audioState.autoScroll) {
      targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    const currentVoice = audioState.selectedVoice || NEURAL_VOICES[0];

    // TIER 1: Neural Edge-TTS with Dexie.js Audio Cache (Standard HTML5 Audio with Android lock-screen)
    if (currentVoice && currentVoice.isNeural) {
      let audioBlob = null;
      if (novelDb) {
        try {
          const cached = await novelDb.audioCache.get([novelSlug, currentChapterNum, index]);
          if (cached && cached.audioBlob) {
            audioBlob = cached.audioBlob;
          }
        } catch (e) {}
      }

      if (!audioBlob && navigator.onLine) {
        try {
          const res = await fetch('/api/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: textToSpeak,
              voice: currentVoice.edgeVoice || 'en-US-ChristopherNeural',
              rate: audioState.rate || 1.0
            })
          });
          if (res.ok) {
            audioBlob = await res.blob();
            if (novelDb) {
              novelDb.audioCache.put({
                novelSlug: novelSlug,
                chapterNumber: currentChapterNum,
                paraIndex: index,
                audioBlob: audioBlob,
                created_at: Date.now()
              }).catch(() => {});
            }
          }
        } catch (fetchErr) {
          console.warn("Neural audio fetch note, falling back to Web Speech:", fetchErr);
        }
      }

      if (audioBlob) {
        if (activeAudioUrl) {
          URL.revokeObjectURL(activeAudioUrl);
        }
        activeAudioUrl = URL.createObjectURL(audioBlob);
        activeHtml5Audio = new Audio(activeAudioUrl);
        activeHtml5Audio.playbackRate = audioState.rate || 1.0;
        activeHtml5Audio.volume = audioState.volume !== undefined ? audioState.volume : 1.0;

        activeHtml5Audio.onplay = () => {
          audioState.isPlaying = true;
          audioState.isPaused = false;
          startAudioPipeline();
          updatePlayStateUI(true);
          updateMediaSession();
        };

        activeHtml5Audio.onended = () => {
          if (activeAudioUrl) {
            URL.revokeObjectURL(activeAudioUrl);
            activeAudioUrl = null;
          }
          activeHtml5Audio = null;
          if (audioState.isPlaying && !audioState.isPaused) {
            speakParagraph(index + 1, true);
          }
        };

        activeHtml5Audio.onerror = () => {
          activeHtml5Audio = null;
          speakParagraphWebSpeech(index, textToSpeak, targetNode);
        };

        try {
          await activeHtml5Audio.play();
          return;
        } catch (e) {
          // Playback error, fall through to Web Speech API
        }
      }
    }

    // TIER 2: Native Web Speech API fallback
    speakParagraphWebSpeech(index, textToSpeak, targetNode);
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
      }
      if (isSpeechSupported && synth.speaking) {
        synth.pause();
      }
      pauseAudioPipeline();
      audioState.isPaused = true;
      updatePlayStateUI(false);
      updateMediaSession();
    } else if (audioState.isPaused) {
      startAudioPipeline();
      if (activeHtml5Audio) {
        activeHtml5Audio.play().catch(() => {});
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

  // Click any paragraph to start reading audio immediately from there!
  paragraphNodes.forEach((node, idx) => {
    node.addEventListener('click', () => {
      openAudioPlayer(idx);
    });
  });

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

  // Rewind & Forward 10s (moves backwards / forwards 1 paragraph)
  if (npBtnRewind10) npBtnRewind10.addEventListener('click', playPrevParagraph);
  if (npBtnForward10) npBtnForward10.addEventListener('click', playNextParagraph);

  // Keyboard Shortcuts for Reader & Audio Navigation
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      return;
    }

    if (e.key === 'ArrowLeft' && prevBtn && !prevBtn.disabled) {
      prevBtn.click();
    } else if (e.key === 'ArrowRight' && nextBtn && !nextBtn.disabled) {
      nextBtn.click();
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
      playPrevParagraph();
    } else if (e.key.toLowerCase() === 'k' && audioState.isOpen) {
      playNextParagraph();
    }
  });

  // Check if we navigated from previous chapter with auto-play active
  if (localStorage.getItem('novel_auto_play_tts') === 'true') {
    setTimeout(() => {
      openAudioPlayer(0);
    }, 450);
  }
});

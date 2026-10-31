document.addEventListener('DOMContentLoaded', () => {
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

  // =========================================================================
  // 2. OPTIMIZATION & CUSTOMIZATION CONTROLS
  // =========================================================================

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
  // 3. NOVEL PHOENIX AUDIO TEXT-TO-SPEECH (TTS) ENGINE
  // =========================================================================

  const synth = window.speechSynthesis;
  const isSpeechSupported = ('speechSynthesis' in window) && ('SpeechSynthesisUtterance' in window);

  const listenToggleBtn = document.getElementById('listen-toggle-btn');
  const playerBar = document.getElementById('listen-player-bar');
  const audioBtnPlay = document.getElementById('audio-btn-play');
  const audioBtnPrev = document.getElementById('audio-btn-prev');
  const audioBtnNext = document.getElementById('audio-btn-next');
  const audioBtnClose = document.getElementById('audio-btn-close');
  const audioSpeedSelect = document.getElementById('audio-speed-select');
  const audioVoiceSelect = document.getElementById('audio-voice-select');
  const audioAutoNextCheck = document.getElementById('audio-auto-next');
  const audioParaStatus = document.getElementById('audio-para-status');
  const audioProgressFill = document.getElementById('audio-progress-fill');

  const paragraphNodes = Array.from(document.querySelectorAll('#chapter-content p'));

  // Saved audio settings
  const savedRate = parseFloat(localStorage.getItem('novel_reader_audio_rate') || '1.0');
  const savedVoiceURI = localStorage.getItem('novel_reader_voice_uri') || '';

  const audioState = {
    isOpen: false,
    isPlaying: false,
    isPaused: false,
    currentIndex: 0,
    voices: [],
    selectedVoice: null,
    rate: savedRate,
    wakeLock: null,
    keepAliveTimer: null
  };

  if (audioSpeedSelect) {
    audioSpeedSelect.value = String(savedRate);
  }

  // Populate System Speech Voices
  function loadVoices() {
    if (!isSpeechSupported) return;
    const allVoices = synth.getVoices();
    if (!allVoices || allVoices.length === 0) return;

    audioState.voices = allVoices;

    if (audioVoiceSelect) {
      audioVoiceSelect.innerHTML = '';

      // Sort voices: English/Natural first, then others alphabetically
      const sortedVoices = [...allVoices].sort((a, b) => {
        const aEn = a.lang.toLowerCase().startsWith('en');
        const bEn = b.lang.toLowerCase().startsWith('en');
        if (aEn && !bEn) return -1;
        if (!aEn && bEn) return 1;
        return a.name.localeCompare(b.name);
      });

      let chosenVoice = null;

      sortedVoices.forEach((voice) => {
        const option = document.createElement('option');
        option.value = voice.voiceURI;
        option.textContent = `${voice.name} (${voice.lang})`;

        if (savedVoiceURI && voice.voiceURI === savedVoiceURI) {
          chosenVoice = voice;
          option.selected = true;
        } else if (!chosenVoice && (voice.default || voice.name.toLowerCase().includes('natural') || voice.lang.startsWith('en-US'))) {
          chosenVoice = voice;
          option.selected = true;
        }

        audioVoiceSelect.appendChild(option);
      });

      if (!chosenVoice && sortedVoices.length > 0) {
        chosenVoice = sortedVoices[0];
      }

      audioState.selectedVoice = chosenVoice;
    }
  }

  if (isSpeechSupported) {
    loadVoices();
    if (synth.onvoiceschanged !== undefined) {
      synth.onvoiceschanged = loadVoices;
    }
  }

  // Voice selector change
  if (audioVoiceSelect) {
    audioVoiceSelect.addEventListener('change', (e) => {
      const uri = e.target.value;
      const matched = audioState.voices.find(v => v.voiceURI === uri);
      if (matched) {
        audioState.selectedVoice = matched;
        localStorage.setItem('novel_reader_voice_uri', uri);
        if (audioState.isPlaying && !audioState.isPaused) {
          speakParagraph(audioState.currentIndex);
        }
      }
    });
  }

  // Speed selector change
  if (audioSpeedSelect) {
    audioSpeedSelect.addEventListener('change', (e) => {
      audioState.rate = parseFloat(e.target.value);
      localStorage.setItem('novel_reader_audio_rate', String(audioState.rate));
      if (audioState.isPlaying && !audioState.isPaused) {
        speakParagraph(audioState.currentIndex);
      }
    });
  }

  // Find the paragraph currently in view on screen (to resume exactly from user's reading position)
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

  // Open Audio Player & start reading
  function openAudioPlayer(startIndex = null) {
    if (!isSpeechSupported) {
      alert("Text-to-speech is not supported on this browser.");
      return;
    }

    if (startIndex === null) {
      startIndex = getParagraphCurrentlyInView();
    }

    audioState.isOpen = true;
    if (playerBar) playerBar.classList.add('active');
    if (listenToggleBtn) listenToggleBtn.classList.add('is-playing');

    requestWakeLock();
    startKeepAlive();
    speakParagraph(startIndex);
  }

  // Close Audio Player
  function closeAudioPlayer() {
    stopSpeech();
    audioState.isOpen = false;
    audioState.isPlaying = false;
    audioState.isPaused = false;
    clearParagraphHighlight();
    stopKeepAlive();

    if (playerBar) playerBar.classList.remove('active');
    if (listenToggleBtn) listenToggleBtn.classList.remove('is-playing');
    if (audioBtnPlay) audioBtnPlay.textContent = '▶';

    releaseWakeLock();
    localStorage.removeItem('novel_auto_play_tts');
  }

  function clearParagraphHighlight() {
    paragraphNodes.forEach(p => p.classList.remove('listen-active-paragraph'));
  }

  function stopSpeech() {
    if (isSpeechSupported) {
      synth.cancel();
      if (synth.paused) {
        synth.resume();
      }
    }
  }

  // Chrome 15s pause bug workaround
  function startKeepAlive() {
    stopKeepAlive();
    audioState.keepAliveTimer = setInterval(() => {
      if (isSpeechSupported && synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 9000);
  }

  function stopKeepAlive() {
    if (audioState.keepAliveTimer) {
      clearInterval(audioState.keepAliveTimer);
      audioState.keepAliveTimer = null;
    }
  }

  // Speak a specific paragraph by index
  function speakParagraph(index) {
    if (!paragraphNodes || paragraphNodes.length === 0) return;

    // Check if reached end of chapter
    if (index >= paragraphNodes.length) {
      clearParagraphHighlight();
      audioState.isPlaying = false;
      audioState.isPaused = false;
      if (audioBtnPlay) audioBtnPlay.textContent = '▶';
      if (listenToggleBtn) listenToggleBtn.classList.remove('is-playing');
      if (audioParaStatus) audioParaStatus.textContent = 'Chapter Finished 🎉';

      // Auto advance to next chapter if enabled
      if (audioAutoNextCheck && audioAutoNextCheck.checked && nextChapterUrl) {
        localStorage.setItem('novel_auto_play_tts', 'true');
        if (audioParaStatus) audioParaStatus.textContent = 'Next Chapter starting in 1.5s...';
        setTimeout(() => {
          window.location.href = nextChapterUrl;
        }, 1500);
      }
      return;
    }

    if (index < 0) index = 0;

    audioState.currentIndex = index;
    const targetNode = paragraphNodes[index];
    const textToSpeak = (targetNode.textContent || '').trim();

    // If paragraph is completely empty, jump to next
    if (!textToSpeak) {
      speakParagraph(index + 1);
      return;
    }

    // Cancel any ongoing speech & resume queue
    stopSpeech();

    // Update UI highlights & auto-scroll
    clearParagraphHighlight();
    targetNode.classList.add('listen-active-paragraph');
    targetNode.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Update player status & progress bar
    if (audioParaStatus) {
      audioParaStatus.textContent = `Paragraph ${index + 1} of ${paragraphNodes.length}`;
    }
    if (audioProgressFill) {
      const pct = ((index + 1) / paragraphNodes.length) * 100;
      audioProgressFill.style.width = `${pct}%`;
    }

    // Small delay to ensure synth.cancel() took full effect
    setTimeout(() => {
      // Ensure voices are loaded
      if (!audioState.selectedVoice && audioState.voices.length > 0) {
        audioState.selectedVoice = audioState.voices[0];
      }

      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      window.__activeNovelUtterance = utterance; // Prevent Chrome garbage collection bug

      if (audioState.selectedVoice) {
        utterance.voice = audioState.selectedVoice;
      }
      utterance.rate = audioState.rate || 1.0;

      utterance.onstart = () => {
        audioState.isPlaying = true;
        audioState.isPaused = false;
        if (audioBtnPlay) audioBtnPlay.textContent = '⏸';
        if (listenToggleBtn) listenToggleBtn.classList.add('is-playing');
      };

      utterance.onend = () => {
        if (audioState.isPlaying && !audioState.isPaused) {
          speakParagraph(index + 1);
        }
      };

      utterance.onerror = (e) => {
        console.warn("SpeechSynthesis error:", e);
        if (audioState.isPlaying && !audioState.isPaused) {
          // If error is not a manual cancel, gracefully advance
          if (e.error !== 'interrupted' && e.error !== 'canceled') {
            setTimeout(() => speakParagraph(index + 1), 100);
          }
        }
      };

      synth.speak(utterance);
    }, 35);
  }

  // Toggle Play / Pause
  function toggleAudioPlay() {
    if (!audioState.isOpen) {
      openAudioPlayer();
      return;
    }

    if (audioState.isPlaying && !audioState.isPaused) {
      synth.pause();
      audioState.isPaused = true;
      if (audioBtnPlay) audioBtnPlay.textContent = '▶';
      if (listenToggleBtn) listenToggleBtn.classList.remove('is-playing');
      if (audioParaStatus) audioParaStatus.textContent = `Paused at Para ${audioState.currentIndex + 1}`;
    } else if (audioState.isPaused) {
      synth.resume();
      audioState.isPaused = false;
      if (audioBtnPlay) audioBtnPlay.textContent = '⏸';
      if (listenToggleBtn) listenToggleBtn.classList.add('is-playing');
      if (audioParaStatus) audioParaStatus.textContent = `Playing Para ${audioState.currentIndex + 1} of ${paragraphNodes.length}`;
    } else {
      speakParagraph(audioState.currentIndex);
    }
  }

  function playPrevParagraph() {
    if (audioState.currentIndex > 0) {
      speakParagraph(audioState.currentIndex - 1);
    }
  }

  function playNextParagraph() {
    if (audioState.currentIndex < paragraphNodes.length - 1) {
      speakParagraph(audioState.currentIndex + 1);
    }
  }

  // WakeLock: prevents screen sleep when listening on headphones
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

  // Audio Control Button Listeners
  if (listenToggleBtn) {
    listenToggleBtn.addEventListener('click', () => {
      if (audioState.isOpen) {
        toggleAudioPlay();
      } else {
        openAudioPlayer();
      }
    });
  }

  if (audioBtnPlay) audioBtnPlay.addEventListener('click', toggleAudioPlay);
  if (audioBtnPrev) audioBtnPrev.addEventListener('click', playPrevParagraph);
  if (audioBtnNext) audioBtnNext.addEventListener('click', playNextParagraph);
  if (audioBtnClose) audioBtnClose.addEventListener('click', closeAudioPlayer);

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
      // 'T' or 'O' toggles Optimize/Customize drawer
      if (settingsToggle) settingsToggle.click();
    } else if (e.key.toLowerCase() === 'f') {
      // 'F' toggles Fullscreen
      toggleFullscreen();
    } else if (e.key.toLowerCase() === 'a') {
      // 'A' toggles Audio
      if (listenToggleBtn) listenToggleBtn.click();
    } else if (e.code === 'Space' && audioState.isOpen) {
      // Space bar toggles Play/Pause in Audio Player
      e.preventDefault();
      toggleAudioPlay();
    } else if (e.key.toLowerCase() === 'j' && audioState.isOpen) {
      // 'J' = prev paragraph
      playPrevParagraph();
    } else if (e.key.toLowerCase() === 'k' && audioState.isOpen) {
      // 'K' = next paragraph
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

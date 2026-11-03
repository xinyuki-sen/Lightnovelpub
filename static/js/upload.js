document.addEventListener('DOMContentLoaded', () => {
  const uploadModal = document.getElementById('upload-modal');
  const btnOpenUpload = document.querySelectorAll('.open-upload-btn');
  const btnCloseUpload = document.getElementById('close-upload-modal');
  const dropzone = document.getElementById('pdf-dropzone');
  const fileInput = document.getElementById('pdf-file-input');
  const uploadForm = document.getElementById('upload-form');
  const fileSelectedNotice = document.getElementById('file-selected-name');
  const uploadProgress = document.getElementById('upload-status-area');
  const uploadStatusText = document.getElementById('upload-status-text');
  const btnSubmit = document.getElementById('btn-submit-upload');

  // Open Modal
  btnOpenUpload.forEach(btn => {
    btn.addEventListener('click', () => {
      if (uploadModal) uploadModal.classList.add('active');
    });
  });

  // Close Modal
  if (btnCloseUpload && uploadModal) {
    btnCloseUpload.addEventListener('click', () => {
      uploadModal.classList.remove('active');
    });
  }

  // Click outside to close
  if (uploadModal) {
    uploadModal.addEventListener('click', (e) => {
      if (e.target === uploadModal) {
        uploadModal.classList.remove('active');
      }
    });
  }

  // Dropzone interactions
  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());

    ['dragenter', 'dragover'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
    });

    ['dragleave', 'drop'].forEach(name => {
      dropzone.addEventListener(name, (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
      });
    });

    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files.length > 0 && (files[0].name.toLowerCase().endsWith('.pdf') || files[0].name.toLowerCase().endsWith('.epub'))) {
        fileInput.files = files;
        handleFileSelect(files[0]);
      } else {
        alert('Please drop a valid PDF or EPUB file.');
      }
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileSelect(fileInput.files[0]);
      }
    });
  }

  function handleFileSelect(file) {
    if (fileSelectedNotice) {
      fileSelectedNotice.textContent = `Selected: ${file.name} (${(file.size / (1024 * 1024)).toFixed(1)} MB)`;
      fileSelectedNotice.style.display = 'block';
    }
    // Auto-populate title if empty
    const titleInput = document.getElementById('novel-title-input');
    if (titleInput && !titleInput.value.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_\-]+/g, ' ');
      titleInput.value = cleanName;
    }
  }

  // Form submission with real-time XHR upload progress & Dexie client persistence
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      e.preventDefault();

      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please choose a PDF or EPUB novel file to upload.');
        return;
      }

      const file = fileInput.files[0];
      const formData = new FormData(uploadForm);

      if (uploadProgress) uploadProgress.style.display = 'block';
      if (uploadStatusText) uploadStatusText.textContent = 'Preparing upload... 0%';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Uploading...';
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/upload', true);

      // Real-time upload progress
      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable) {
          const pct = Math.round((evt.loaded / evt.total) * 100);
          const loadedMb = (evt.loaded / (1024 * 1024)).toFixed(1);
          const totalMb = (evt.total / (1024 * 1024)).toFixed(1);

          if (pct < 100) {
            if (uploadStatusText) {
              uploadStatusText.textContent = `Uploading: ${pct}% (${loadedMb}MB / ${totalMb}MB)...`;
            }
          } else {
            if (uploadStatusText) {
              uploadStatusText.textContent = `File received! Extracting and dividing chapters (native PDFium engine)...`;
            }
            if (btnSubmit) {
              btnSubmit.textContent = 'Extracting Chapters...';
            }
          }
        }
      };

      xhr.onload = async () => {
        let result = null;
        try {
          result = JSON.parse(xhr.responseText);
        } catch (jsonErr) {
          if (xhr.status === 413) {
            result = { error: 'File exceeds serverless payload limit (45MB limit).' };
          } else if (xhr.status === 504) {
            result = { error: 'Serverless execution timed out while slicing chapters.' };
          } else {
            result = { error: `Server error (HTTP ${xhr.status}).` };
          }
        }

        if (xhr.status >= 200 && xhr.status < 300 && result && result.success) {
          if (uploadStatusText) {
            uploadStatusText.textContent = `Success! Divided into ${result.total_chapters} chapters. Saving to persistent library...`;
          }

          // Authoritative Dexie IndexedDB client persistence (guarantees novel survives serverless restarts)
          if (typeof Dexie !== 'undefined') {
            try {
              const db = new Dexie('LightnovelpubDB_v4');
              db.version(2).stores({
                customNovels: 'slug, title, author, synopsis, cover_image, total_chapters, created_at',
                chapters: '[novelSlug+chapterNumber], novelSlug, chapterNumber, title, content, updated_at',
                progress: 'novelSlug, chapterNumber, percent, paraIndex, updated_at',
                audioCache: '[novelSlug+chapterNumber+paraIndex], novelSlug, chapterNumber, paraIndex, audioBlob, created_at',
                covers: 'slug, dataUrl, updated_at'
              });

              if (result.novel) {
                await db.customNovels.put(result.novel);
                if (result.novel.cover_image && result.novel.cover_image.startsWith('data:')) {
                  await db.covers.put({ slug: result.slug, dataUrl: result.novel.cover_image, updated_at: Date.now() });
                }
              }

              if (result.chapters && result.chapters.length > 0) {
                const chDocs = result.chapters.map(c => ({
                  novelSlug: result.slug,
                  chapterNumber: c.number,
                  title: c.title,
                  content: c.content || (c.paragraphs ? c.paragraphs.join('\n\n') : ''),
                  paragraphs: c.paragraphs || [],
                  word_count: c.word_count,
                  updated_at: Date.now()
                }));
                await db.chapters.bulkPut(chDocs);
              }
            } catch (dbErr) {
              console.warn('Dexie save error:', dbErr);
            }
          }

          if (uploadStatusText) {
            uploadStatusText.textContent = `Library updated! Redirecting to reader...`;
          }
          setTimeout(() => {
            window.location.href = `/novel/${result.slug}`;
          }, 600);

        } else {
          const errDetail = (result && result.error) ? result.error : `Upload failed (Status ${xhr.status})`;
          if (uploadStatusText) uploadStatusText.textContent = `Error: ${errDetail}`;
          if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Try Again';
          }
        }
      };

      xhr.onerror = () => {
        if (uploadStatusText) uploadStatusText.textContent = 'Network connection failed during upload.';
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Try Again';
        }
      };

      xhr.send(formData);
    });
  }
});

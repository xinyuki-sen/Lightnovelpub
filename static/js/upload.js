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

  // Form submission & conversion
  if (uploadForm) {
    uploadForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please choose a PDF or EPUB novel file to upload.');
        return;
      }

      const formData = new FormData(uploadForm);
      if (uploadProgress) uploadProgress.style.display = 'block';
      if (uploadStatusText) uploadStatusText.textContent = 'Uploading and processing novel chapters...';
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Extracting Chapters...';
      }

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });

        const result = await response.json();

        if (response.ok && result.success) {
          if (uploadStatusText) {
            uploadStatusText.textContent = `Success! Converted ${result.total_chapters} chapters. Redirecting...`;
          }
          setTimeout(() => {
            window.location.href = `/novel/${result.slug}`;
          }, 800);
        } else {
          throw new Error(result.error || 'Failed to convert PDF.');
        }
      } catch (err) {
        if (uploadStatusText) uploadStatusText.textContent = `Error: ${err.message}`;
        if (btnSubmit) {
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Try Again';
        }
      }
    });
  }
});

/**
 * Image Upload Widget — Reusable auto-processing upload component
 * 
 * This component wraps the ImageProcessor pipeline into a drag-and-drop
 * upload widget with:
 *   - Drag-and-drop + click-to-upload
 *   - Real-time processing step indicators
 *   - "Preview before confirm" with accept/reject
 *   - Processing metadata display (compression ratio, dimensions)
 *   - Support for single and multi-image slots
 * 
 * Usage:
 *   import { createImageUploadWidget, initImageUploadWidget } from './image-upload-widget.js';
 * 
 *   // In render():
 *   return `${createImageUploadWidget({ id: 'blogFeatured', slot: 'blogFeatured', currentUrl: post.featuredImage })}`;
 * 
 *   // In init():
 *   initImageUploadWidget('blogFeatured', {
 *     onComplete: (result) => { ... },
 *     onRemove: () => { ... }
 *   });
 */

import { ImageProcessor } from '../lib/image-processor.js';

// ─── Render ─────────────────────────────────────────────────────

/**
 * Create the HTML for an image upload widget.
 * 
 * @param {Object} config
 * @param {string} config.id        - Unique DOM ID prefix for this widget
 * @param {string} config.slot      - ImageProcessor slot name (e.g. 'blogFeatured', 'teamMember')
 * @param {string} [config.currentUrl]  - Current image URL (for editing existing items)
 * @param {string} [config.label]   - Custom label override
 * @param {boolean} [config.required] - Show required asterisk
 * @param {boolean} [config.compact] - Use compact layout (for modals)
 * @returns {string} HTML string
 */
export function createImageUploadWidget(config) {
  const { id, slot, currentUrl, label, required = false, compact = false } = config;
  const reqs = ImageProcessor.getSlotRequirements(slot);
  const displayLabel = label || reqs?.label || 'Image';
  const hasImage = !!currentUrl;

  return `
    <div class="form-group">
      <label class="form-label">${displayLabel} ${required ? '<span class="required">*</span>' : ''}</label>
      <div class="img-upload-widget ${compact ? 'img-upload-widget--compact' : ''}" id="${id}_widget" data-slot="${slot}">
        
        <!-- State: Empty / Dropzone -->
        <div class="img-upload-widget__dropzone ${hasImage ? 'img-upload-widget--hidden' : ''}" id="${id}_dropzone">
          <input type="file" id="${id}_input" accept="image/jpeg,image/png,image/webp,image/gif" class="img-upload-widget__file-input" />
          <div class="img-upload-widget__dropzone-content">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="img-upload-widget__icon">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <p>Drop image here or <strong>click to upload</strong></p>
            ${reqs ? `
              <span class="img-upload-widget__specs">
                ${reqs.dimensions} · ${reqs.minSize}
              </span>
            ` : ''}
          </div>
        </div>

        <!-- State: Processing -->
        <div class="img-upload-widget__processing img-upload-widget--hidden" id="${id}_processing">
          <div class="img-upload-widget__spinner"></div>
          <p class="img-upload-widget__step" id="${id}_step">Preparing...</p>
          <div class="img-upload-widget__progress-bar">
            <div class="img-upload-widget__progress-fill" id="${id}_progress"></div>
          </div>
        </div>

        <!-- State: Preview (post-processing, pre-confirm) -->
        <div class="img-upload-widget__preview img-upload-widget--hidden" id="${id}_preview">
          <div class="img-upload-widget__preview-image-wrap">
            <img id="${id}_previewImg" alt="Processed preview" class="img-upload-widget__preview-img" />
          </div>
          <div class="img-upload-widget__preview-meta" id="${id}_meta"></div>
          <div class="img-upload-widget__preview-actions">
            <button class="btn btn--outline btn--sm" id="${id}_rejectBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Change
            </button>
            <button class="btn btn--primary btn--sm" id="${id}_acceptBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg>
              Use This Image
            </button>
          </div>
        </div>

        <!-- State: Confirmed / Current Image -->
        <div class="img-upload-widget__current ${hasImage ? '' : 'img-upload-widget--hidden'}" id="${id}_current">
          <div class="img-upload-widget__current-image-wrap">
            <img id="${id}_currentImg" src="${currentUrl || ''}" alt="" class="img-upload-widget__current-img" />
            <div class="img-upload-widget__current-overlay">
              <button class="btn-icon btn-icon--sm" id="${id}_changeBtn" title="Change image" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon btn-icon--danger btn-icon--sm" id="${id}_removeBtn" title="Remove image" type="button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Error message -->
        <div class="img-upload-widget__error img-upload-widget--hidden" id="${id}_error"></div>
      </div>
    </div>
  `;
}


// ─── Init / Wire Events ─────────────────────────────────────────

/**
 * Initialize event listeners for an image upload widget.
 * Must be called after the widget HTML is in the DOM.
 * 
 * @param {string} id       - Same ID used in createImageUploadWidget
 * @param {Object} callbacks
 * @param {Function} callbacks.onComplete  - (result: { blob, previewUrl, width, height, ... }) => void
 * @param {Function} [callbacks.onRemove]  - () => void
 * @param {Function} [callbacks.onError]   - (error: Error) => void
 */
export function initImageUploadWidget(id, callbacks = {}) {
  const widget    = document.getElementById(`${id}_widget`);
  const dropzone  = document.getElementById(`${id}_dropzone`);
  const input     = document.getElementById(`${id}_input`);
  const processing = document.getElementById(`${id}_processing`);
  const stepEl    = document.getElementById(`${id}_step`);
  const progressEl = document.getElementById(`${id}_progress`);
  const preview   = document.getElementById(`${id}_preview`);
  const previewImg = document.getElementById(`${id}_previewImg`);
  const metaEl    = document.getElementById(`${id}_meta`);
  const acceptBtn = document.getElementById(`${id}_acceptBtn`);
  const rejectBtn = document.getElementById(`${id}_rejectBtn`);
  const current   = document.getElementById(`${id}_current`);
  const currentImg = document.getElementById(`${id}_currentImg`);
  const changeBtn = document.getElementById(`${id}_changeBtn`);
  const removeBtn = document.getElementById(`${id}_removeBtn`);
  const errorEl   = document.getElementById(`${id}_error`);

  if (!widget || !dropzone || !input) return;

  const slot = widget.dataset.slot;
  let pendingResult = null;

  // ── State transitions ────────────────────────────────────
  function showState(state) {
    const states = { dropzone, processing, preview, current };
    Object.entries(states).forEach(([key, el]) => {
      if (el) {
        if (key === state) el.classList.remove('img-upload-widget--hidden');
        else el.classList.add('img-upload-widget--hidden');
      }
    });
    if (errorEl) errorEl.classList.add('img-upload-widget--hidden');
  }

  function showError(msg) {
    if (errorEl) {
      errorEl.textContent = msg;
      errorEl.classList.remove('img-upload-widget--hidden');
    }
  }

  // ── Process a file ───────────────────────────────────────
  async function processFile(file) {
    showState('processing');
    if (stepEl) stepEl.textContent = 'Preparing...';
    if (progressEl) progressEl.style.width = '0%';

    const stepMap = {
      'validating': 15,
      'loading': 25,
      'checking-resolution': 35,
      'cropping': 50,
      'preparing': 50,
      'resizing': 65,
      'converting': 80,
      'compressing': 90,
      'finalizing': 95,
      'done': 100,
    };

    try {
      const result = await ImageProcessor.process(file, slot, {
        onStep: (step, detail) => {
          if (stepEl) stepEl.textContent = detail || step;
          if (progressEl && stepMap[step]) {
            progressEl.style.width = `${stepMap[step]}%`;
          }
        },
      });

      pendingResult = result;

      // Show preview
      if (previewImg) previewImg.src = result.previewUrl;
      if (metaEl) {
        const origKB = Math.round(result.originalSize / 1024);
        const procKB = Math.round(result.processedSize / 1024);
        metaEl.innerHTML = `
          <span class="img-upload-widget__meta-item">📐 ${result.width}×${result.height}px</span>
          <span class="img-upload-widget__meta-item">📦 ${origKB}KB → ${procKB}KB</span>
          <span class="img-upload-widget__meta-item img-upload-widget__meta-item--success">✅ ${result.compressionRatio}</span>
        `;
      }
      showState('preview');

    } catch (err) {
      console.error(`ImageUploadWidget[${id}]: processing failed`, err);
      showError(err.message);
      showState('dropzone');
      if (callbacks.onError) callbacks.onError(err);
    }
  }

  // ── Click to upload ──────────────────────────────────────
  dropzone.addEventListener('click', (e) => {
    if (e.target !== input) input.click();
  });

  input.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so the same file can be re-selected
    input.value = '';
  });

  // ── Drag and drop ────────────────────────────────────────
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.add('img-upload-widget__dropzone--dragover');
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('img-upload-widget__dropzone--dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropzone.classList.remove('img-upload-widget__dropzone--dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) processFile(file);
  });

  // ── Accept preview ───────────────────────────────────────
  if (acceptBtn) {
    acceptBtn.addEventListener('click', () => {
      if (!pendingResult) return;

      // Show the confirmed state
      if (currentImg) currentImg.src = pendingResult.previewUrl;
      showState('current');

      // Fire callback
      if (callbacks.onComplete) callbacks.onComplete(pendingResult);
    });
  }

  // ── Reject preview ───────────────────────────────────────
  if (rejectBtn) {
    rejectBtn.addEventListener('click', () => {
      if (pendingResult) {
        ImageProcessor.revokePreview(pendingResult.previewUrl);
        pendingResult = null;
      }
      showState('dropzone');
    });
  }

  // ── Change image ─────────────────────────────────────────
  if (changeBtn) {
    changeBtn.addEventListener('click', () => {
      showState('dropzone');
      // Give a tick for the DOM to update, then trigger click
      requestAnimationFrame(() => input.click());
    });
  }

  // ── Remove image ─────────────────────────────────────────
  if (removeBtn) {
    removeBtn.addEventListener('click', () => {
      if (currentImg) currentImg.src = '';
      if (pendingResult) {
        ImageProcessor.revokePreview(pendingResult.previewUrl);
        pendingResult = null;
      }
      showState('dropzone');
      if (callbacks.onRemove) callbacks.onRemove();
    });
  }
}


// ─── Programmatic API ──────────────────────────────────────────

/**
 * Set the current image URL on a widget programmatically.
 * Use this when loading an existing record into the editor.
 * 
 * @param {string} id  - Widget ID
 * @param {string} url - Image URL to display
 */
export function setWidgetImage(id, url) {
  const currentEl = document.getElementById(`${id}_current`);
  const currentImg = document.getElementById(`${id}_currentImg`);
  const dropzone = document.getElementById(`${id}_dropzone`);
  const preview = document.getElementById(`${id}_preview`);
  const processing = document.getElementById(`${id}_processing`);

  if (!currentEl) return;

  if (url) {
    currentImg.src = url;
    currentEl.classList.remove('img-upload-widget--hidden');
    if (dropzone) dropzone.classList.add('img-upload-widget--hidden');
    if (preview) preview.classList.add('img-upload-widget--hidden');
    if (processing) processing.classList.add('img-upload-widget--hidden');
  } else {
    currentEl.classList.add('img-upload-widget--hidden');
    if (dropzone) dropzone.classList.remove('img-upload-widget--hidden');
  }
}

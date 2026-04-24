/**
 * Gallery Page — Album management and photo uploads
 */

import { Store, CHAR_LIMITS } from '../store.js';
import { showToast } from '../components/toast.js';
import { showModal, closeModal } from '../components/modal.js';

let currentView = 'albums'; // 'albums' | 'album-detail' | 'new-album'
let selectedAlbumId = null;

function charCounter(current, max, id) {
  const pct = (current / max) * 100;
  const cls = pct > 90 ? 'char-counter--danger' : pct > 75 ? 'char-counter--warn' : '';
  return `<span class="char-counter ${cls}" id="${id}">${current}/${max}</span>`;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderAlbumGrid() {
  const albums = Store.getGallery();
  const stats = Store.getStats();

  const cards = albums.length === 0
    ? `<div class="empty-state">
        <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>
        <h3>No albums yet</h3>
        <p>Create your first photo album to showcase your community.</p>
       </div>`
    : `<div class="gallery-grid">
        ${albums.map(album => `
          <div class="gallery-card" data-id="${album.id}">
            <div class="gallery-card__image">
              ${album.photos.length > 0 && album.photos[album.coverIndex || 0]?.url
                ? `<img src="${album.photos[album.coverIndex || 0].url}" alt="${album.name}" />`
                : `<div class="gallery-card__placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    <span>${album.photos.length} photos</span>
                  </div>`
              }
            </div>
            <div class="gallery-card__body">
              <h3 class="gallery-card__title">${album.name}</h3>
              <p class="gallery-card__meta">${album.photos.length} photos · ${formatDate(album.createdAt)}</p>
            </div>
            <div class="gallery-card__actions">
              <button class="btn-icon" data-action="open-album" data-id="${album.id}" title="View">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn-icon btn-icon--danger" data-action="delete-album" data-id="${album.id}" title="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        `).join('')}
      </div>`;

  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>Gallery</h2>
        <p class="page-header__subtitle">${stats.albums} albums · ${stats.totalPhotos} total photos</p>
      </div>
      <button class="btn btn--primary" id="newAlbumBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Album
      </button>
    </div>
    ${cards}
  `;
}

function renderAlbumDetail(album) {
  return `
    <div class="editor-page">
      <div class="editor-topbar">
        <button class="btn btn--ghost" id="backToAlbumsBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Gallery
        </button>
      </div>

      <h2 class="editor-page__title">📸 ${album.name}</h2>
      <p class="page-header__subtitle">${album.description || 'No description'} · ${album.photos.length} photos</p>

      <div class="editor-form" style="margin-top: 1.5rem;">
        <div class="form-row">
          <div class="form-group form-group--half">
            <label class="form-label">Album Name</label>
            <div class="form-input-wrap">
              <input type="text" id="albumName" class="form-input" value="${album.name}" maxlength="${CHAR_LIMITS.albumName}" />
              ${charCounter(album.name.length, CHAR_LIMITS.albumName, 'albumNameCounter')}
            </div>
          </div>
          <div class="form-group form-group--half">
            <label class="form-label">Description</label>
            <div class="form-input-wrap">
              <input type="text" id="albumDesc" class="form-input" value="${album.description}" maxlength="${CHAR_LIMITS.albumDescription}" />
              ${charCounter(album.description.length, CHAR_LIMITS.albumDescription, 'albumDescCounter')}
            </div>
          </div>
        </div>

        <button class="btn btn--outline btn--sm" id="updateAlbumInfoBtn" style="margin-bottom: 1.5rem;">Save Album Info</button>

        <!-- Photo Grid -->
        <h3 class="form-section-title">Photos</h3>
        <div class="photo-grid">
          ${album.photos.map((photo, i) => `
            <div class="photo-grid__item" data-photo-id="${photo.id}">
              <div class="photo-grid__image">
                ${photo.url
                  ? `<img src="${photo.url}" alt="${photo.caption || ''}" />`
                  : `<div class="photo-grid__placeholder">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </div>`
                }
                <div class="photo-grid__overlay">
                  ${album.coverIndex === i ? '<span class="photo-grid__cover-badge">Cover</span>' : ''}
                  <button class="btn-icon btn-icon--danger btn-icon--sm" data-action="remove-photo" data-photo-id="${photo.id}" title="Remove">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
              </div>
              <input type="text" class="photo-grid__caption" value="${photo.caption || ''}" data-photo-id="${photo.id}" maxlength="${CHAR_LIMITS.photoCaption}" placeholder="Enter caption..." />
            </div>
          `).join('')}

          <div class="photo-grid__add" id="addPhotoSlot">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Add Photo</span>
            <span class="image-upload__hint">JPG, PNG, WebP · Max 10MB</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderNewAlbum() {
  return `
    <div class="editor-page">
      <div class="editor-topbar">
        <button class="btn btn--ghost" id="backToAlbumsBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Gallery
        </button>
      </div>

      <h2 class="editor-page__title">📸 New Album</h2>

      <div class="editor-form" style="margin-top: 1.5rem;">
        <div class="form-group">
          <label class="form-label">Album Name <span class="required">*</span></label>
          <div class="form-input-wrap">
            <input type="text" id="newAlbumName" class="form-input" maxlength="${CHAR_LIMITS.albumName}" placeholder="e.g., Easter Celebration 2026" />
            ${charCounter(0, CHAR_LIMITS.albumName, 'newAlbumNameCounter')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description</label>
          <div class="form-input-wrap">
            <input type="text" id="newAlbumDesc" class="form-input" maxlength="${CHAR_LIMITS.albumDescription}" placeholder="Brief description of this album..." />
            ${charCounter(0, CHAR_LIMITS.albumDescription, 'newAlbumDescCounter')}
          </div>
        </div>

        <div class="form-actions">
          <div></div>
          <div class="form-actions__right">
            <button class="btn btn--outline" id="cancelNewAlbumBtn">Cancel</button>
            <button class="btn btn--primary" id="createAlbumBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Create Album
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderGallery() {
  if (currentView === 'album-detail') {
    const album = Store.getAlbum(selectedAlbumId);
    if (album) return renderAlbumDetail(album);
    currentView = 'albums';
  }
  if (currentView === 'new-album') return renderNewAlbum();
  return renderAlbumGrid();
}

export function initGallery(rerender) {
  // New album
  const newBtn = document.getElementById('newAlbumBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      currentView = 'new-album';
      rerender();
    });
  }

  // Open album
  document.querySelectorAll('[data-action="open-album"]').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAlbumId = btn.dataset.id;
      currentView = 'album-detail';
      rerender();
    });
  });

  // Also allow clicking the card itself to open
  document.querySelectorAll('.gallery-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-action]')) return;
      selectedAlbumId = card.dataset.id;
      currentView = 'album-detail';
      rerender();
    });
  });

  // Delete album
  document.querySelectorAll('[data-action="delete-album"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const album = Store.getAlbum(btn.dataset.id);
      showModal({
        title: 'Delete Album',
        message: `Delete "${album.name}" and all ${album.photos.length} photos?`,
        confirmText: 'Delete',
        confirmClass: 'btn--danger',
        onConfirm: () => {
          Store.deleteAlbum(btn.dataset.id);
          showToast('Album deleted', 'success');
          closeModal();
          rerender();
        }
      });
    });
  });

  // Back button
  const backBtn = document.getElementById('backToAlbumsBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentView = 'albums';
      selectedAlbumId = null;
      rerender();
    });
  }

  // Create album
  const createBtn = document.getElementById('createAlbumBtn');
  if (createBtn) {
    createBtn.addEventListener('click', () => {
      const name = document.getElementById('newAlbumName')?.value?.trim();
      const description = document.getElementById('newAlbumDesc')?.value?.trim() || '';
      if (!name) { showToast('Album name is required', 'error'); return; }
      const newAlbum = Store.addAlbum({ name, description });
      showToast('Album created! 📸', 'success');
      selectedAlbumId = newAlbum.id;
      currentView = 'album-detail';
      rerender();
    });
  }

  // Cancel new album
  const cancelBtn = document.getElementById('cancelNewAlbumBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      currentView = 'albums';
      rerender();
    });
  }

  // Update album info
  const updateInfoBtn = document.getElementById('updateAlbumInfoBtn');
  if (updateInfoBtn && selectedAlbumId) {
    updateInfoBtn.addEventListener('click', () => {
      const name = document.getElementById('albumName')?.value?.trim();
      const description = document.getElementById('albumDesc')?.value?.trim() || '';
      if (!name) { showToast('Album name is required', 'error'); return; }
      Store.updateAlbum(selectedAlbumId, { name, description });
      showToast('Album info saved! ✅', 'success');
      rerender();
    });
  }

  // Remove photo
  document.querySelectorAll('[data-action="remove-photo"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (selectedAlbumId) {
        Store.removePhotoFromAlbum(selectedAlbumId, btn.dataset.photoId);
        showToast('Photo removed', 'success');
        rerender();
      }
    });
  });

  // Add photo (stub for now — will wire to Firebase Storage later)
  const addPhotoSlot = document.getElementById('addPhotoSlot');
  if (addPhotoSlot && selectedAlbumId) {
    addPhotoSlot.addEventListener('click', () => {
      Store.addPhotoToAlbum(selectedAlbumId, { url: null, caption: '', altText: '' });
      showToast('Photo placeholder added', 'success');
      rerender();
    });
  }

  // Char counters
  initLocalCharCounter('newAlbumName', 'newAlbumNameCounter', CHAR_LIMITS.albumName);
  initLocalCharCounter('newAlbumDesc', 'newAlbumDescCounter', CHAR_LIMITS.albumDescription);
  initLocalCharCounter('albumName', 'albumNameCounter', CHAR_LIMITS.albumName);
  initLocalCharCounter('albumDesc', 'albumDescCounter', CHAR_LIMITS.albumDescription);
}

function initLocalCharCounter(inputId, counterId, max) {
  const el = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (el && counter) {
    el.addEventListener('input', () => {
      const len = el.value.length;
      counter.textContent = `${len}/${max}`;
      counter.className = 'char-counter';
      const pct = (len / max) * 100;
      if (pct > 90) counter.classList.add('char-counter--danger');
      else if (pct > 75) counter.classList.add('char-counter--warn');
    });
  }
}

export function resetGalleryView() {
  currentView = 'albums';
  selectedAlbumId = null;
}

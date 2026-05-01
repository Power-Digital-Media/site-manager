/**
 * Modal System
 */

let overlay = null;

function ensureOverlay() {
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'modal-overlay';
    overlay.className = 'modal-overlay';
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
  }
  return overlay;
}

export function openModal({ title, content, actions, size = 'medium', onClose }) {
  const ov = ensureOverlay();
  
  const sizeClass = `modal--${size}`;

  ov.innerHTML = `
    <div class="modal ${sizeClass}">
      <div class="modal__header">
        <h3 class="modal__title">${title}</h3>
        <button class="modal__close" aria-label="Close modal">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="modal__body">${typeof content === 'string' ? content : ''}</div>
      ${actions ? `<div class="modal__footer">${actions}</div>` : ''}
    </div>
  `;

  if (typeof content !== 'string' && content instanceof HTMLElement) {
    ov.querySelector('.modal__body').innerHTML = '';
    ov.querySelector('.modal__body').appendChild(content);
  }

  ov.querySelector('.modal__close').addEventListener('click', () => {
    if (onClose) onClose();
    closeModal();
  });

  document.addEventListener('keydown', handleEscape);
  requestAnimationFrame(() => ov.classList.add('modal-overlay--show'));
  
  return ov.querySelector('.modal');
}

export function closeModal() {
  if (overlay) {
    overlay.classList.remove('modal-overlay--show');
    overlay.classList.add('modal-overlay--hide');
    document.removeEventListener('keydown', handleEscape);
    const dyingOverlay = overlay;
    // Null the reference immediately so re-entrant calls don't double-fire
    overlay = null;
    setTimeout(() => {
      dyingOverlay.remove();          // remove from DOM entirely
    }, 300);
  }
}

function handleEscape(e) {
  if (e.key === 'Escape') closeModal();
}

export function confirmModal(message, onConfirm) {
  const modal = openModal({
    title: 'Confirm Action',
    content: `<p class="modal__confirm-text">${message}</p>`,
    actions: `
      <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
      <button class="btn btn--danger" id="modal-confirm">Delete</button>
    `,
    size: 'small',
  });

  modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}

/**
 * showModal — convenience wrapper for confirm-style dialogs.
 * Accepts { title, message, confirmText, confirmClass, onConfirm }.
 */
export function showModal({ title = 'Confirm', message = '', confirmText = 'Confirm', confirmClass = 'btn--danger', onConfirm } = {}) {
  const modal = openModal({
    title,
    content: `<p class="modal__confirm-text">${message}</p>`,
    actions: `
      <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
      <button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>
    `,
    size: 'small',
  });

  modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
  modal.querySelector('#modal-confirm').addEventListener('click', () => {
    closeModal();
    if (onConfirm) onConfirm();
  });
}


/**
 * Announcements Manager
 */

import { Store } from '../store.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmModal } from '../components/modal.js';

export function renderAnnouncements() {
  const announcements = Store.getAnnouncements();

  return `
    <div class="announcements-page">
      <div class="page-top">
        <div>
          <h2>Announcements</h2>
          <p class="text-muted">Manage promotional banners and important notices for your visitors.</p>
        </div>
        <button class="btn btn--primary" id="addAnnBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Announcement
        </button>
      </div>

      <div class="announcements-list" id="annList">
        ${announcements.length ? announcements.map(a => renderAnnouncementCard(a)).join('') : `
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <h3>No Announcements</h3>
            <p>Create your first announcement to inform your visitors.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderAnnouncementCard(a) {
  const expires = a.expiresAt ? new Date(a.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No expiration';

  return `
    <div class="ann-card ${!a.active ? 'ann-card--inactive' : ''}" data-ann-id="${a.id}">
      <div class="ann-card__left">
        <div class="ann-card__urgency ann-card__urgency--${a.urgency}">
          ${a.urgency === 'high' ? '🔴' : '🔵'}
        </div>
        <div class="ann-card__content">
          <div class="ann-card__top-row">
            <h3 class="ann-card__title">${a.title}</h3>
            <span class="ann-card__status ${a.active ? 'ann-card__status--active' : 'ann-card__status--inactive'}">
              ${a.active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p class="ann-card__message">${a.message}</p>
          <div class="ann-card__meta">
            ${a.link ? `<span class="ann-card__meta-item">🔗 ${a.link}</span>` : ''}
            <span class="ann-card__meta-item">📅 Expires: ${expires}</span>
            <span class="ann-card__meta-item ann-card__meta-item--urgency">Priority: ${a.urgency === 'high' ? 'High' : 'Normal'}</span>
          </div>
        </div>
      </div>
      <div class="ann-card__actions">
        <label class="toggle" title="${a.active ? 'Deactivate' : 'Activate'}">
          <input type="checkbox" ${a.active ? 'checked' : ''} data-toggle-ann="${a.id}" />
          <span class="toggle__slider"></span>
        </label>
        <button class="btn-icon" data-edit-ann="${a.id}" title="Edit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-icon--danger" data-delete-ann="${a.id}" title="Delete">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

function getAnnFormHtml(ann = null) {
  return `
    <form id="annForm" class="modal-form">
      <div class="form-group">
        <label class="form-label">Title</label>
        <input type="text" class="form-input" name="title" value="${ann?.title || ''}" placeholder="e.g., 🌸 Easter Service — This Sunday!" required />
      </div>
      <div class="form-group">
        <label class="form-label">Message</label>
        <textarea class="form-input form-textarea" name="message" rows="3" placeholder="What do you want visitors to know?">${ann?.message || ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Link (optional)</label>
          <input type="text" class="form-input" name="link" value="${ann?.link || ''}" placeholder="e.g., #visit or https://..." />
        </div>
        <div class="form-group">
          <label class="form-label">Expiration Date</label>
          <input type="date" class="form-input" name="expiresAt" value="${ann?.expiresAt ? ann.expiresAt.split('T')[0] : ''}" />
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Priority Level</label>
          <select class="form-input form-select" name="urgency">
            <option value="normal" ${ann?.urgency !== 'high' ? 'selected' : ''}>Normal</option>
            <option value="high" ${ann?.urgency === 'high' ? 'selected' : ''}>High / Urgent</option>
          </select>
        </div>
        <div class="form-group" style="align-self:end;">
          <label class="form-label form-label--inline">
            <input type="checkbox" name="active" ${ann?.active !== false ? 'checked' : ''} />
            <span>Active</span>
          </label>
        </div>
      </div>
    </form>
  `;
}

export function initAnnouncements(rerender) {
  const addBtn = document.getElementById('addAnnBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modal = openModal({
        title: 'New Announcement',
        content: getAnnFormHtml(),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Create</button>
        `,
      });
      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#annForm');
        const fd = new FormData(form);
        if (!fd.get('title')) { showToast('Title is required', 'error'); return; }
        Store.addAnnouncement({
          title: fd.get('title'),
          message: fd.get('message'),
          link: fd.get('link'),
          urgency: fd.get('urgency'),
          active: form.querySelector('[name="active"]').checked,
          expiresAt: fd.get('expiresAt') ? new Date(fd.get('expiresAt')).toISOString() : null,
        });
        closeModal();
        showToast('Announcement created!', 'success');
        rerender();
      });
    });
  }

  // Toggle active
  document.querySelectorAll('[data-toggle-ann]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const id = toggle.dataset.toggleAnn;
      Store.updateAnnouncement(id, { active: toggle.checked });
      showToast(toggle.checked ? 'Announcement activated' : 'Announcement deactivated', 'info');
    });
  });

  // Edit
  document.querySelectorAll('[data-edit-ann]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editAnn;
      const ann = Store.getAnnouncement(id);
      if (!ann) return;
      const modal = openModal({
        title: 'Edit Announcement',
        content: getAnnFormHtml(ann),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Save Changes</button>
        `,
      });
      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#annForm');
        const fd = new FormData(form);
        Store.updateAnnouncement(id, {
          title: fd.get('title'),
          message: fd.get('message'),
          link: fd.get('link'),
          urgency: fd.get('urgency'),
          active: form.querySelector('[name="active"]').checked,
          expiresAt: fd.get('expiresAt') ? new Date(fd.get('expiresAt')).toISOString() : null,
        });
        closeModal();
        showToast('Announcement updated!', 'success');
        rerender();
      });
    });
  });

  // Delete
  document.querySelectorAll('[data-delete-ann]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteAnn;
      confirmModal('Delete this announcement?', () => {
        Store.deleteAnnouncement(id);
        showToast('Announcement deleted', 'info');
        rerender();
      });
    });
  });
}

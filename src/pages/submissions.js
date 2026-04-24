/**
 * Submissions Page — Form submissions inbox
 */

import { Store } from '../store.js';
import { showToast } from '../components/toast.js';
import { showModal, closeModal } from '../components/modal.js';

let selectedSubmissionId = null;

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatFullDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function getFormIcon(formName) {
  const map = {
    'Contact Form': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
    'Prayer Request': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    'Visit Request': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  };
  return map[formName] || map['Contact Form'];
}

export function renderSubmissions() {
  const allSubmissions = Store.getSubmissions();
  const unread = Store.getUnreadCount();
  const tier = Store.getTier();
  const FREE_LIMIT = 10;
  const isFree = tier === 'free';
  const isLimited = isFree && allSubmissions.length > FREE_LIMIT;
  const submissions = isLimited ? allSubmissions.slice(0, FREE_LIMIT) : allSubmissions;
  const hiddenCount = isLimited ? allSubmissions.length - FREE_LIMIT : 0;
  const selected = selectedSubmissionId ? Store.getSubmission(selectedSubmissionId) : null;

  const upgradeCtaBanner = isLimited ? `
    <div class="submissions-upgrade-cta">
      <div class="submissions-upgrade-cta__blur">
        ${allSubmissions.slice(FREE_LIMIT, FREE_LIMIT + 3).map(sub => `
          <div class="submission-row submission-row--ghost">
            <div class="submission-row__icon">${getFormIcon(sub.formName)}</div>
            <div class="submission-row__info">
              <div class="submission-row__header">
                <span class="submission-row__name">${sub.name}</span>
                <span class="submission-row__time">${formatDate(sub.createdAt)}</span>
              </div>
              <span class="submission-row__form">${sub.formName}</span>
              <p class="submission-row__preview">${sub.message.slice(0, 80)}…</p>
            </div>
          </div>
        `).join('')}
      </div>
      <div class="submissions-upgrade-cta__overlay">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <h4>${hiddenCount} more submission${hiddenCount !== 1 ? 's' : ''} hidden</h4>
        <p>Upgrade to <strong>AI Pro</strong> for unlimited inbox access</p>
        <button class="btn btn--accent btn--sm" id="submissionsUpgradeBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          Upgrade — $29/mo
        </button>
      </div>
    </div>
  ` : '';

  const inbox = allSubmissions.length === 0
    ? `<div class="empty-state">
        <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg></div>
        <h3>No submissions yet</h3>
        <p>Form submissions from your website will appear here.</p>
       </div>`
    : `
      <div class="submissions-layout">
        <div class="submissions-list">
          ${submissions.map(sub => `
            <div class="submission-row ${!sub.read ? 'submission-row--unread' : ''} ${selectedSubmissionId === sub.id ? 'submission-row--active' : ''}" data-id="${sub.id}">
              <div class="submission-row__icon">${getFormIcon(sub.formName)}</div>
              <div class="submission-row__info">
                <div class="submission-row__header">
                  <span class="submission-row__name">${sub.name}</span>
                  <span class="submission-row__time">${formatDate(sub.createdAt)}</span>
                </div>
                <span class="submission-row__form">${sub.formName}</span>
                <p class="submission-row__preview">${sub.message.slice(0, 80)}${sub.message.length > 80 ? '...' : ''}</p>
              </div>
              ${!sub.read ? '<span class="submission-row__dot"></span>' : ''}
            </div>
          `).join('')}
          ${upgradeCtaBanner}
        </div>

        <div class="submission-detail" id="submissionDetail">
          ${selected ? `
            <div class="submission-detail__header">
              <div class="submission-detail__meta">
                <h3>${selected.name}</h3>
                <span class="submission-detail__form-badge">${selected.formName}</span>
              </div>
              <span class="submission-detail__date">${formatFullDate(selected.createdAt)}</span>
            </div>
            <div class="submission-detail__contacts">
              ${selected.email ? `
                <a href="mailto:${selected.email}" class="submission-detail__contact">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  ${selected.email}
                </a>
              ` : ''}
              ${selected.phone ? `
                <a href="tel:${selected.phone}" class="submission-detail__contact">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  ${selected.phone}
                </a>
              ` : ''}
            </div>
            <div class="submission-detail__body">
              <p>${selected.message}</p>
            </div>
            <div class="submission-detail__actions">
              ${selected.email ? `
                <a href="mailto:${selected.email}" class="btn btn--primary btn--sm">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
                  Reply by Email
                </a>
              ` : ''}
              <button class="btn btn--danger btn--sm" data-action="delete-submission" data-id="${selected.id}">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Delete
              </button>
            </div>
          ` : `
            <div class="submission-detail__empty">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              <p>Select a submission to view details</p>
            </div>
          `}
        </div>
      </div>
    `;

  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>Submissions</h2>
        <p class="page-header__subtitle">${submissions.length} total · ${unread} unread</p>
      </div>
      ${unread > 0 ? `
        <button class="btn btn--outline" id="markAllReadBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          Mark All Read
        </button>
      ` : ''}
    </div>
    ${inbox}
  `;
}

export function initSubmissions(rerender) {
  // Select submission
  document.querySelectorAll('.submission-row').forEach(row => {
    row.addEventListener('click', () => {
      selectedSubmissionId = row.dataset.id;
      Store.markSubmissionRead(row.dataset.id);
      rerender();
    });
  });

  // Mark all read
  const markAllBtn = document.getElementById('markAllReadBtn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', () => {
      Store.markAllSubmissionsRead();
      showToast('All marked as read', 'success');
      rerender();
    });
  }

  // Delete submission
  document.querySelectorAll('[data-action="delete-submission"]').forEach(btn => {
    btn.addEventListener('click', () => {
      showModal({
        title: 'Delete Submission',
        message: 'Delete this submission? This cannot be undone.',
        confirmText: 'Delete',
        confirmClass: 'btn--danger',
        onConfirm: () => {
          Store.deleteSubmission(btn.dataset.id);
          selectedSubmissionId = null;
          showToast('Submission deleted', 'success');
          closeModal();
          rerender();
        }
      });
    });
  });

  // Submissions upgrade CTA
  const upgradeBtn = document.getElementById('submissionsUpgradeBtn');
  if (upgradeBtn) {
    upgradeBtn.addEventListener('click', () => {
      window.location.hash = '#/ai-tools';
    });
  }
}

export function resetSubmissionsView() {
  selectedSubmissionId = null;
}

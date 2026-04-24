/**
 * Team Manager
 */

import { Store } from '../store.js';
import { TIER_CONFIG } from '../constants.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmModal } from '../components/modal.js';

const FREE_TEAM_LIMIT = 3;

export function renderTeam() {
  const team = Store.getTeam();
  const tier = Store.getTier();
  const isFreeTier = tier === 'free';
  const atLimit = isFreeTier && team.length >= FREE_TEAM_LIMIT;

  return `
    <div class="team-page">
      <div class="page-top">
        <div>
          <h2>Team Members</h2>
          <p class="text-muted">Manage your staff, pastors, and ministry leaders.${isFreeTier ? ` <span class="text-dim">(${team.length}/${FREE_TEAM_LIMIT} on Free plan)</span>` : ''}</p>
        </div>
        ${atLimit ? `
          <a href="#/ai-tools" class="btn btn--accent" id="teamUpgradeBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Upgrade for Unlimited
          </a>
        ` : `
          <button class="btn btn--primary" id="addTeamBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Team Member
          </button>
        `}
      </div>

      ${atLimit ? `
        <div class="team-limit-banner">
          <div class="team-limit-banner__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="team-limit-banner__text">
            <strong>Team member limit reached</strong>
            <span>Upgrade to ${TIER_CONFIG.pro.label} to add unlimited team members — $${TIER_CONFIG.pro.price}/mo</span>
          </div>
        </div>
      ` : ''}

      <div class="team-grid" id="teamGrid">
        ${team.length ? team.map(m => renderTeamCard(m)).join('') : `
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <h3>No Team Members</h3>
            <p>Add your first team member to showcase your leadership.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderTeamCard(m) {
  const initials = m.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const colors = ['#22d3ee', '#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];
  const color = colors[m.name.length % colors.length];

  return `
    <div class="team-card" data-member-id="${m.id}">
      <div class="team-card__avatar" style="background: linear-gradient(135deg, ${color}40, ${color}20);">
        <span style="color: ${color}">${initials}</span>
      </div>
      <div class="team-card__info">
        <h3 class="team-card__name">${m.name}</h3>
        <span class="team-card__title">${m.title}</span>
        <p class="team-card__bio">${m.bio}</p>
      </div>
      <div class="team-card__actions">
        <button class="btn-icon" data-edit-member="${m.id}" title="Edit member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-icon--danger" data-delete-member="${m.id}" title="Remove member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

function getTeamFormHtml(member = null) {
  return `
    <form id="teamForm" class="modal-form">
      <div class="form-group">
        <label class="form-label">Full Name</label>
        <input type="text" class="form-input" name="name" value="${member?.name || ''}" placeholder="e.g., Josh Watts" required />
      </div>
      <div class="form-group">
        <label class="form-label">Title / Role</label>
        <input type="text" class="form-input" name="title" value="${member?.title || ''}" placeholder="e.g., Lead Pastor" required />
      </div>
      <div class="form-group">
        <label class="form-label">Bio</label>
        <textarea class="form-input form-textarea" name="bio" rows="3" placeholder="A short bio about this person">${member?.bio || ''}</textarea>
      </div>
    </form>
  `;
}

export function initTeam(rerender) {
  const addBtn = document.getElementById('addTeamBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modal = openModal({
        title: 'Add Team Member',
        content: getTeamFormHtml(),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Add Member</button>
        `,
      });
      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#teamForm');
        const fd = new FormData(form);
        if (!fd.get('name') || !fd.get('title')) { showToast('Name and title are required', 'error'); return; }
        Store.addTeamMember({
          name: fd.get('name'),
          title: fd.get('title'),
          bio: fd.get('bio'),
          photo: null,
        });
        closeModal();
        showToast('Team member added!', 'success');
        rerender();
      });
    });
  }

  document.querySelectorAll('[data-edit-member]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editMember;
      const member = Store.getTeamMember(id);
      if (!member) return;
      const modal = openModal({
        title: 'Edit Team Member',
        content: getTeamFormHtml(member),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Save Changes</button>
        `,
      });
      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#teamForm');
        const fd = new FormData(form);
        Store.updateTeamMember(id, {
          name: fd.get('name'),
          title: fd.get('title'),
          bio: fd.get('bio'),
        });
        closeModal();
        showToast('Team member updated!', 'success');
        rerender();
      });
    });
  });

  document.querySelectorAll('[data-delete-member]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteMember;
      confirmModal('Remove this team member?', () => {
        Store.deleteTeamMember(id);
        showToast('Team member removed', 'info');
        rerender();
      });
    });
  });
}

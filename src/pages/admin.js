/**
 * Admin CRM Page — v1.0
 * 
 * PDM-only page for managing client sites.
 * Features:
 *   - Client site list with search/filter
 *   - New client onboarding form
 *   - Client detail panel (edit site config, modules, tier)
 *   - Quick-switch to any client's dashboard
 */

import { Store } from '../store.js';
import { isAdmin, createClientAccount, resetPassword } from '../auth.js';
import { MODULE_DEFINITIONS, TIER_CONFIG } from '../constants.js';
import { showToast } from '../components/toast.js';

let _view = 'list'; // 'list' | 'onboard' | 'detail'
let _sites = [];
let _selectedSite = null;
let _searchQuery = '';
let _loading = true;

export function renderAdmin() {
  if (!isAdmin()) {
    return `
      <div class="module-activation">
        <div class="module-activation__card">
          <div class="module-activation__icon" style="background: var(--danger-bg);">
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--danger)" stroke-width="1.5">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <h2 class="module-activation__title">Access Denied</h2>
          <p class="module-activation__desc">This page is only accessible to PDM administrators.</p>
        </div>
      </div>
    `;
  }

  switch (_view) {
    case 'onboard': return renderOnboardForm();
    case 'detail': return renderSiteDetail();
    default: return renderClientList();
  }
}

// ─── Client List ──────────────────────────────────────────────
function renderClientList() {
  const filtered = _searchQuery
    ? _sites.filter(s => 
        s.name?.toLowerCase().includes(_searchQuery.toLowerCase()) ||
        s.domain?.toLowerCase().includes(_searchQuery.toLowerCase()) ||
        s.ownerEmail?.toLowerCase().includes(_searchQuery.toLowerCase())
      )
    : _sites;

  return `
    <div class="admin-crm">
      <div class="admin-crm__header">
        <div>
          <h2 class="admin-crm__title">Client Sites</h2>
          <p class="admin-crm__subtitle">${_sites.length} total clients managed by PDM</p>
        </div>
        <div class="admin-crm__actions">
          <button class="btn btn--primary" id="newClientBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            New Client
          </button>
        </div>
      </div>

      <div class="admin-crm__toolbar">
        <div class="admin-crm__search">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" class="form-input" id="clientSearch" placeholder="Search clients..." value="${_searchQuery}" />
        </div>
        <div class="admin-crm__filters">
          <span class="admin-crm__count">${filtered.length} of ${_sites.length} sites</span>
        </div>
      </div>

      ${_loading ? `
        <div class="admin-crm__loading">
          <div class="spinner spinner--lg"></div>
          <p>Loading client sites...</p>
        </div>
      ` : filtered.length === 0 ? `
        <div class="admin-crm__empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" style="opacity:0.3">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <line x1="17" y1="11" x2="23" y2="11"/>
          </svg>
          <h3>${_searchQuery ? 'No matches found' : 'No clients yet'}</h3>
          <p>${_searchQuery ? 'Try a different search term' : 'Click "New Client" to onboard your first site'}</p>
        </div>
      ` : `
        <div class="admin-crm__table">
          <div class="admin-crm__table-header">
            <span>Site</span>
            <span>Status</span>
            <span>Tier</span>
            <span>Modules</span>
            <span>Actions</span>
          </div>
          ${filtered.map(site => `
            <div class="admin-crm__row" data-site-id="${site.id}">
              <div class="admin-crm__site-info">
                <span class="admin-crm__site-name">${site.name || 'Unnamed'}</span>
                <span class="admin-crm__site-domain">${site.domain || 'No domain'}</span>
                ${site.ownerEmail ? `<span class="admin-crm__site-owner">${site.ownerEmail}</span>` : ''}
              </div>
              <div>
                <span class="admin-crm__status admin-crm__status--${site.status || 'setup'}">
                  ${getStatusLabel(site.status)}
                </span>
              </div>
              <div>
                <span class="admin-crm__tier">${TIER_CONFIG[site.tier]?.label || 'Free'}</span>
              </div>
              <div>
                <span class="admin-crm__modules">${(site.activeModules || []).length} active</span>
              </div>
              <div class="admin-crm__row-actions">
                <button class="btn-icon" title="View Details" data-action="detail" data-site="${site.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                </button>
                <button class="btn-icon" title="Switch to Dashboard" data-action="switch" data-site="${site.id}">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

// ─── Onboarding Form ──────────────────────────────────────────
function renderOnboardForm() {
  const allModules = Object.entries(MODULE_DEFINITIONS).filter(([_, m]) => !m.alwaysActive);

  return `
    <div class="admin-crm">
      <div class="admin-crm__header">
        <div>
          <button class="btn btn--ghost btn--sm" id="backToListBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <h2 class="admin-crm__title" style="margin-top:12px;">Onboard New Client</h2>
          <p class="admin-crm__subtitle">Set up a new client site in the PDM ecosystem</p>
        </div>
      </div>

      <form class="admin-crm__form" id="onboardForm">
        <div class="admin-crm__form-section">
          <h3 class="admin-crm__form-heading">Site Information</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="site-name">Business / Site Name *</label>
              <input type="text" id="site-name" class="form-input" placeholder="e.g. Faith Community Church" required />
            </div>
            <div class="form-group">
              <label class="form-label" for="site-domain">Domain</label>
              <input type="text" id="site-domain" class="form-input" placeholder="e.g. faithcommunitychurch.org" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="site-industry">Industry</label>
              <select id="site-industry" class="form-input form-select">
                <option value="church">Church / Ministry</option>
                <option value="business">Business</option>
                <option value="retail">Retail / E-commerce</option>
                <option value="restaurant">Restaurant</option>
                <option value="general" selected>General</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="site-tier">Tier</label>
              <select id="site-tier" class="form-input form-select">
                ${Object.entries(TIER_CONFIG).map(([key, tier]) => `
                  <option value="${key}">${tier.label} — $${tier.price}/mo</option>
                `).join('')}
              </select>
            </div>
          </div>
        </div>

        <div class="admin-crm__form-section">
          <h3 class="admin-crm__form-heading">Client Owner</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label" for="owner-name">Contact Name</label>
              <input type="text" id="owner-name" class="form-input" placeholder="e.g. Pastor Johnson" />
            </div>
            <div class="form-group">
              <label class="form-label" for="owner-email">Client Email *</label>
              <input type="email" id="owner-email" class="form-input" placeholder="e.g. pastor@church.org" required />
              <span class="form-hint">They'll use this email to sign in to their dashboard.</span>
            </div>
          </div>

          <div class="admin-crm__invite-toggle">
            <label class="admin-crm__toggle-label">
              <input type="checkbox" id="sendInvite" checked />
              <div class="admin-crm__toggle-info">
                <strong>📧 Send Invitation Email</strong>
                <span>Creates their login account and sends a "Set Your Password" email automatically. Uncheck to create the site without sending an invite yet.</span>
              </div>
            </label>
          </div>
        </div>

        <div class="admin-crm__form-section">
          <h3 class="admin-crm__form-heading">Active Modules</h3>
          <p class="text-muted" style="margin-bottom:12px;">Select which features to activate for this client's dashboard.</p>
          <div class="admin-crm__module-grid">
            ${allModules.map(([id, mod]) => `
              <label class="admin-crm__module-check">
                <input type="checkbox" name="modules" value="${id}" />
                <div class="admin-crm__module-check-card">
                  <strong>${mod.label}</strong>
                  <span>${mod.description.slice(0, 60)}...</span>
                </div>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="admin-crm__form-actions">
          <button type="button" class="btn btn--ghost" id="cancelOnboardBtn">Cancel</button>
          <button type="submit" class="btn btn--primary" id="submitOnboardBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16">
              <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
            </svg>
            Create Client Site
          </button>
        </div>
      </form>
    </div>
  `;
}

// ─── Site Detail ──────────────────────────────────────────────
function renderSiteDetail() {
  if (!_selectedSite) return renderClientList();
  const site = _selectedSite;
  const allModules = Object.entries(MODULE_DEFINITIONS).filter(([_, m]) => !m.alwaysActive);

  return `
    <div class="admin-crm">
      <div class="admin-crm__header">
        <div>
          <button class="btn btn--ghost btn--sm" id="backToListBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back
          </button>
          <h2 class="admin-crm__title" style="margin-top:12px;">${site.name}</h2>
          <p class="admin-crm__subtitle">${site.domain || 'No domain set'} · ${site.ownerEmail || 'No owner assigned'}</p>
        </div>
        <div class="admin-crm__actions">
          <button class="btn btn--primary btn--sm" id="switchToDashboardBtn" data-site="${site.id}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            Open Dashboard
          </button>
        </div>
      </div>

      <div class="admin-crm__detail-grid">
        <!-- Site Info Card -->
        <div class="admin-crm__detail-card">
          <h3>Site Configuration</h3>
          <div class="admin-crm__detail-row">
            <span>Site ID</span>
            <code>${site.id}</code>
          </div>
          <div class="admin-crm__detail-row">
            <span>Status</span>
            <span class="admin-crm__status admin-crm__status--${site.status}">${getStatusLabel(site.status)}</span>
          </div>
          <div class="admin-crm__detail-row">
            <span>Tier</span>
            <span>${TIER_CONFIG[site.tier]?.label || 'Free'}</span>
          </div>
          <div class="admin-crm__detail-row">
            <span>Industry</span>
            <span>${site.industry || 'General'}</span>
          </div>
          <div class="admin-crm__detail-row">
            <span>Created</span>
            <span>${site.createdAt ? new Date(site.createdAt).toLocaleDateString() : 'Unknown'}</span>
          </div>
          <div class="admin-crm__detail-row">
            <span>Last Published</span>
            <span>${site.lastPublished ? new Date(site.lastPublished).toLocaleDateString() : 'Never'}</span>
          </div>
        </div>

        <!-- Module Management Card -->
        <div class="admin-crm__detail-card">
          <h3>Active Modules</h3>
          <div class="admin-crm__module-list">
            ${allModules.map(([id, mod]) => {
              const isActive = (site.activeModules || []).includes(id);
              return `
                <div class="admin-crm__module-item ${isActive ? 'admin-crm__module-item--active' : ''}">
                  <div>
                    <strong>${mod.label}</strong>
                    <span class="text-muted" style="font-size:0.75rem; display:block;">${mod.category}</span>
                  </div>
                  <button class="btn btn--sm ${isActive ? 'btn--danger' : 'btn--ghost'}" 
                          data-action="${isActive ? 'deactivate' : 'activate'}"
                          data-module="${id}"
                          data-site="${site.id}">
                    ${isActive ? 'Remove' : 'Add'}
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Quick Actions Card -->
        <div class="admin-crm__detail-card">
          <h3>Quick Actions</h3>
          <div class="admin-crm__quick-actions">
            <button class="btn btn--ghost btn--sm btn--full" data-action="change-status" data-site="${site.id}" data-status="active">
              ✅ Set Active
            </button>
            <button class="btn btn--ghost btn--sm btn--full" data-action="change-status" data-site="${site.id}" data-status="setup">
              🔧 Set In Setup
            </button>
            <button class="btn btn--ghost btn--sm btn--full" data-action="change-status" data-site="${site.id}" data-status="paused">
              ⏸️ Set Paused
            </button>
            ${site.ownerEmail ? `
              <hr style="border-color: rgba(255,255,255,0.06); margin: 8px 0;" />
              <button class="admin-crm__resend-invite" id="resendInviteBtn" data-email="${site.ownerEmail}">
                📧 Resend Invitation Email
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </div>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────
function getStatusLabel(status) {
  const labels = {
    active: '🟢 Active',
    setup: '🔧 Setup',
    paused: '⏸️ Paused',
    archived: '📦 Archived',
  };
  return labels[status] || '🔧 Setup';
}

// ─── Init ─────────────────────────────────────────────────────
export async function initAdmin(rerender) {
  if (!isAdmin()) return;

  // Load all client sites
  if (_loading) {
    try {
      _sites = await Store.getAllSites();
      _loading = false;
      rerender();
    } catch (err) {
      console.error('Admin: failed to load sites', err);
      _loading = false;
      showToast('Failed to load client sites.', 'error');
      rerender();
    }
  }

  // ─── Event Listeners ──────────────────────────────────────

  // New Client button
  const newClientBtn = document.getElementById('newClientBtn');
  if (newClientBtn) {
    newClientBtn.addEventListener('click', () => {
      _view = 'onboard';
      rerender();
    });
  }

  // Back button
  const backBtn = document.getElementById('backToListBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      _view = 'list';
      _selectedSite = null;
      rerender();
    });
  }

  // Cancel onboard
  const cancelBtn = document.getElementById('cancelOnboardBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      _view = 'list';
      rerender();
    });
  }

  // Search
  const searchInput = document.getElementById('clientSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      _searchQuery = e.target.value;
      rerender();
    });
  }

  // Row actions (detail / switch)
  document.querySelectorAll('[data-action="detail"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const siteId = btn.dataset.site;
      _selectedSite = _sites.find(s => s.id === siteId);
      _view = 'detail';
      rerender();
    });
  });

  document.querySelectorAll('[data-action="switch"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const siteId = btn.dataset.site;
      const site = _sites.find(s => s.id === siteId);
      try {
        Store.setSiteId(siteId);
        await Store.init();
        showToast(`Switched to ${site?.name || siteId}`, 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        showToast('Failed to switch sites.', 'error');
      }
    });
  });

  // Switch to dashboard from detail view
  const switchBtn = document.getElementById('switchToDashboardBtn');
  if (switchBtn) {
    switchBtn.addEventListener('click', async () => {
      const siteId = switchBtn.dataset.site;
      try {
        Store.setSiteId(siteId);
        await Store.init();
        showToast(`Switched to ${_selectedSite?.name || siteId}`, 'success');
        window.location.hash = '#/dashboard';
      } catch (err) {
        showToast('Failed to switch sites.', 'error');
      }
    });
  }

  // Module activate/deactivate from detail view
  document.querySelectorAll('[data-action="activate"], [data-action="deactivate"]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const moduleId = btn.dataset.module;
      const siteId = btn.dataset.site;
      const action = btn.dataset.action;
      
      try {
        if (action === 'activate') {
          await Store.updateSiteConfig(siteId, {
            activeModules: [...(_selectedSite.activeModules || []), moduleId],
            availableModules: (_selectedSite.availableModules || []).filter(m => m !== moduleId),
          });
          _selectedSite.activeModules = [...(_selectedSite.activeModules || []), moduleId];
        } else {
          await Store.updateSiteConfig(siteId, {
            activeModules: (_selectedSite.activeModules || []).filter(m => m !== moduleId),
            availableModules: [...(_selectedSite.availableModules || []), moduleId],
          });
          _selectedSite.activeModules = (_selectedSite.activeModules || []).filter(m => m !== moduleId);
        }
        
        const label = MODULE_DEFINITIONS[moduleId]?.label || moduleId;
        showToast(`${label} ${action === 'activate' ? 'activated' : 'removed'}`, 'success');
        rerender();
      } catch (err) {
        showToast(`Failed to ${action} module.`, 'error');
      }
    });
  });

  // Status change from detail view
  document.querySelectorAll('[data-action="change-status"]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const siteId = btn.dataset.site;
      const status = btn.dataset.status;
      try {
        await Store.updateSiteConfig(siteId, { status });
        _selectedSite.status = status;
        showToast(`Site status set to ${status}`, 'success');
        rerender();
      } catch (err) {
        showToast('Failed to update status.', 'error');
      }
    });
  });

  // Resend invitation email
  const resendBtn = document.getElementById('resendInviteBtn');
  if (resendBtn) {
    resendBtn.addEventListener('click', async () => {
      const email = resendBtn.dataset.email;
      resendBtn.textContent = '📧 Sending...';
      resendBtn.style.pointerEvents = 'none';
      try {
        await resetPassword(email);
        showToast(`Password reset email sent to ${email}`, 'success');
        resendBtn.textContent = '✅ Sent!';
        setTimeout(() => {
          resendBtn.textContent = '📧 Resend Invitation Email';
          resendBtn.style.pointerEvents = '';
        }, 3000);
      } catch (err) {
        console.error('Failed to resend invitation:', err);
        showToast('Failed to send invitation email.', 'error');
        resendBtn.textContent = '📧 Resend Invitation Email';
        resendBtn.style.pointerEvents = '';
      }
    });
  }

  // Onboard form submission
  const onboardForm = document.getElementById('onboardForm');
  if (onboardForm) {
    onboardForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('site-name').value.trim();
      const domain = document.getElementById('site-domain').value.trim();
      const industry = document.getElementById('site-industry').value;
      const tier = document.getElementById('site-tier').value;
      const ownerName = document.getElementById('owner-name').value.trim();
      const ownerEmail = document.getElementById('owner-email').value.trim();
      
      // Get selected modules
      const selectedModules = Array.from(document.querySelectorAll('input[name="modules"]:checked'))
        .map(cb => cb.value);
      
      const sendInvite = document.getElementById('sendInvite')?.checked ?? true;
      
      const submitBtn = document.getElementById('submitOnboardBtn');
      submitBtn.classList.add('btn--loading');
      submitBtn.innerHTML = `<div class="spinner"></div>${sendInvite ? 'Creating & Sending Invite...' : 'Creating...'}`;

      try {
        const allToggleable = Object.keys(MODULE_DEFINITIONS).filter(id => !MODULE_DEFINITIONS[id].alwaysActive);
        const activeModules = ['pages', 'settings', ...selectedModules];
        const availableModules = allToggleable.filter(m => !selectedModules.includes(m));

        // Step 1: Create the site in Firestore
        const newSite = await Store.createSite({
          name,
          domain,
          industry,
          tier,
          ownerName,
          ownerEmail,
          activeModules,
          availableModules,
        });

        // Step 2: Create client login + send invitation
        if (sendInvite && ownerEmail) {
          try {
            await createClientAccount({
              email: ownerEmail,
              displayName: ownerName || name,
              siteId: newSite.id,
            });
            showToast(`${name} created! Invitation sent to ${ownerEmail} 📧`, 'success');
          } catch (inviteErr) {
            console.error('Admin: invite failed (site still created)', inviteErr);
            let errMsg = 'Site created, but invitation failed.';
            if (inviteErr.code === 'auth/email-already-in-use') {
              errMsg = 'Site created! That email already has an account — they can sign in now.';
            } else if (inviteErr.code === 'auth/invalid-email') {
              errMsg = 'Site created, but the email address is invalid.';
            }
            showToast(errMsg, 'warning');
          }
        } else {
          showToast(`${name} created successfully! 🎉`, 'success');
        }

        _sites.unshift(newSite);
        _view = 'list';
        rerender();
      } catch (err) {
        console.error('Admin: failed to create site', err);
        showToast('Failed to create client site. Check console for details.', 'error');
        submitBtn.classList.remove('btn--loading');
        submitBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16">
            <path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>
          </svg>
          Create Client Site
        `;
      }
    });
  }
}

export function resetAdminView() {
  _view = 'list';
  _selectedSite = null;
  _searchQuery = '';
}

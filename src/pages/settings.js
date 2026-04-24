/**
 * Settings Page
 */

import { Store } from '../store.js';
import { isAdmin, getCurrentUser } from '../auth.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmModal } from '../components/modal.js';
import { TIER_CONFIG } from '../constants.js';

// Module labels for the reset UI
const MODULE_LABELS = {
  pages:          { label: 'Pages',         icon: '📄' },
  settings:       { label: 'Settings',      icon: '⚙️' },
  blogConfig:     { label: 'Blog Config',   icon: '📝' },
  blogPosts:      { label: 'Blog Posts',     icon: '✍️' },
  productsConfig: { label: 'Products Config',icon: '🏷️' },
  products:       { label: 'Products',      icon: '📦' },
  events:         { label: 'Events',        icon: '📅' },
  announcements:  { label: 'Announcements', icon: '📢' },
  team:           { label: 'Team Members',  icon: '👥' },
  gallery:        { label: 'Gallery',       icon: '🖼️' },
};

// Cached defaults status
let _defaultsInfo = null;

export function renderSettings() {
  const settings = Store.getSettings();
  const integration = Store.getIntegrationSettings();
  const admin = isAdmin();

  return `
    <div class="settings-page">
      <div class="page-top">
        <div>
          <h2>Settings</h2>
          <p class="text-muted">Manage your site's service times, contact info, and social links.</p>
        </div>
      </div>

      <div class="settings-sections">
        <!-- Service Times -->
        <div class="settings-card">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Service Times
              </h3>
              <p class="text-muted">When does your congregation gather?</p>
            </div>
            <button class="btn btn--ghost btn--sm" id="addServiceBtn">+ Add Time</button>
          </div>
          <div class="settings-card__body">
            ${settings.serviceTimes.map(st => `
              <div class="service-time-row" data-st-id="${st.id}">
                <div class="service-time-row__info">
                  <span class="service-time-row__day">${st.day}</span>
                  <span class="service-time-row__time">${st.time}</span>
                  <span class="service-time-row__label">${st.label}</span>
                  <span class="service-time-row__desc">${st.description}</span>
                </div>
                <div class="service-time-row__actions">
                  <button class="btn-icon" data-edit-st="${st.id}" title="Edit"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                  <button class="btn-icon btn-icon--danger" data-delete-st="${st.id}" title="Delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Contact Information -->
        <div class="settings-card">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Contact Information
              </h3>
            </div>
          </div>
          <div class="settings-card__body">
            <form id="contactForm" class="settings-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Street Address</label>
                  <input type="text" class="form-input" name="address" value="${settings.contact.address}" />
                </div>
                <div class="form-group">
                  <label class="form-label">City</label>
                  <input type="text" class="form-input" name="city" value="${settings.contact.city}" />
                </div>
              </div>
              <div class="form-row form-row--3">
                <div class="form-group">
                  <label class="form-label">State</label>
                  <input type="text" class="form-input" name="state" value="${settings.contact.state}" />
                </div>
                <div class="form-group">
                  <label class="form-label">ZIP Code</label>
                  <input type="text" class="form-input" name="zip" value="${settings.contact.zip}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Phone</label>
                  <input type="tel" class="form-input" name="phone" value="${settings.contact.phone}" />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-input" name="email" value="${settings.contact.email}" />
              </div>
              <button type="submit" class="btn btn--primary btn--sm">Save Contact Info</button>
            </form>
          </div>
        </div>

        <!-- Social Media -->
        <div class="settings-card">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                Social Media Links
              </h3>
            </div>
          </div>
          <div class="settings-card__body">
            <form id="socialForm" class="settings-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Facebook</label>
                  <input type="url" class="form-input" name="facebook" value="${settings.social.facebook}" placeholder="https://facebook.com/..." />
                </div>
                <div class="form-group">
                  <label class="form-label">YouTube</label>
                  <input type="url" class="form-input" name="youtube" value="${settings.social.youtube}" placeholder="https://youtube.com/..." />
                </div>
              </div>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Instagram</label>
                  <input type="url" class="form-input" name="instagram" value="${settings.social.instagram}" placeholder="https://instagram.com/..." />
                </div>
                <div class="form-group">
                  <label class="form-label">TikTok</label>
                  <input type="url" class="form-input" name="tiktok" value="${settings.social.tiktok}" placeholder="https://tiktok.com/..." />
                </div>
              </div>
              <button type="submit" class="btn btn--primary btn--sm">Save Social Links</button>
            </form>
          </div>
        </div>

        <!-- Site Metadata -->
        ${(() => {
          const tier = Store.getTier();
          const admin = isAdmin();
          const canAccessSEO = admin || tier === 'business';
          
          if (canAccessSEO) {
            return `
        <div class="settings-card">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                SEO & Metadata
              </h3>
            </div>
          </div>
          <div class="settings-card__body">
            <form id="metaForm" class="settings-form">
              <div class="form-group">
                <label class="form-label">Site Title</label>
                <input type="text" class="form-input" name="siteTitle" value="${settings.meta.siteTitle}" />
                <span class="form-hint">This appears in browser tabs and search results.</span>
              </div>
              <div class="form-group">
                <label class="form-label">Site Description</label>
                <textarea class="form-input form-textarea" name="siteDescription" rows="2">${settings.meta.siteDescription}</textarea>
                <span class="form-hint">A brief description shown in Google search results.</span>
              </div>
              <button type="submit" class="btn btn--primary btn--sm">Save Metadata</button>
            </form>
          </div>
        </div>`;
          } else {
            const bizConfig = TIER_CONFIG.business;
            return `
        <div class="settings-card settings-card--locked">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                SEO & Metadata
                <span class="settings-card__tier-badge">${bizConfig.label}</span>
              </h3>
              <p class="text-muted">Control how your site appears in Google, social shares, and browser tabs.</p>
            </div>
          </div>
          <div class="settings-card__body settings-card__body--locked">
            <div class="settings-card__locked-preview">
              <div class="form-group" style="opacity:0.35;pointer-events:none">
                <label class="form-label">Site Title</label>
                <input type="text" class="form-input" disabled placeholder="Your Site Name" />
              </div>
              <div class="form-group" style="opacity:0.35;pointer-events:none">
                <label class="form-label">Site Description</label>
                <textarea class="form-input form-textarea" disabled rows="2" placeholder="A brief description shown in Google search results..."></textarea>
              </div>
            </div>
            <div class="settings-card__upgrade-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h4>Unlock SEO & Metadata</h4>
              <p>Take control of your search rankings and social media previews with the <strong>${bizConfig.label}</strong> plan.</p>
              <ul class="settings-card__perks">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg> Custom site title & meta description</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg> Social share image & Open Graph tags</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg> ${bizConfig.aiActions} AI actions/month</li>
              </ul>
              <button class="btn btn--accent btn--sm" id="seoUpgradeBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Upgrade to ${bizConfig.label} — $${bizConfig.price}/mo
              </button>
            </div>
          </div>
        </div>`;
          }
        })()}

        <!-- Live Site Integration -->
        ${(() => {
          const tier = Store.getTier();
          const admin = isAdmin();
          const canAccess = admin || tier === 'business';
          
          if (canAccess) {
            return `
        <div class="settings-card">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Live Site Integration
              </h3>
              <p class="text-muted">Connect this CMS to your live website for automatic content publishing.</p>
            </div>
          </div>
          <div class="settings-card__body">
            <form id="integrationForm" class="settings-form">
              <div class="form-group">
                <label class="form-label">Live Site URL</label>
                <input type="url" class="form-input" name="liveSiteUrl" value="${integration.liveSiteUrl}" placeholder="https://yoursite.com" />
                <span class="form-hint">The public URL of your live website.</span>
              </div>
              <div class="form-group">
                <label class="form-label">Deploy Hook URL</label>
                <input type="url" class="form-input" name="deployHookUrl" value="${integration.deployHookUrl}" placeholder="https://api.netlify.com/build_hooks/..." />
                <span class="form-hint">Paste your Netlify or Vercel deploy hook URL. Find it in Site Settings → Build & Deploy → Build Hooks.</span>
              </div>
              <div class="form-group">
                <label class="form-label" style="display:flex;align-items:center;gap:8px;cursor:pointer">
                  <input type="checkbox" name="autoDeploy" ${integration.autoDeploy ? 'checked' : ''} style="width:auto" />
                  Auto-deploy when content is published
                </label>
                <span class="form-hint">When enabled, publishing a blog post or product will automatically trigger a rebuild of your live site.</span>
              </div>
              ${integration.lastDeployAt ? `<p class="text-muted" style="font-size:0.85rem">Last deployed: ${new Date(integration.lastDeployAt).toLocaleString()}</p>` : ''}
              <div style="display:flex;gap:8px;align-items:center">
                <button type="submit" class="btn btn--primary btn--sm">Save Integration</button>
                <button type="button" class="btn btn--outline btn--sm" id="deployNowBtn" ${!integration.deployHookUrl ? 'disabled' : ''}>
                  🚀 Deploy Now
                </button>
              </div>
            </form>
          </div>
        </div>`;
          } else {
            const bizConfig = TIER_CONFIG.business;
            return `
        <div class="settings-card settings-card--locked">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                Live Site Integration
                <span class="settings-card__tier-badge">${bizConfig.label}</span>
              </h3>
              <p class="text-muted">Connect this CMS to your live website for automatic content publishing.</p>
            </div>
          </div>
          <div class="settings-card__body settings-card__body--locked">
            <div class="settings-card__locked-preview">
              <div class="form-group" style="opacity:0.35;pointer-events:none">
                <label class="form-label">Live Site URL</label>
                <input type="url" class="form-input" disabled placeholder="https://yoursite.com" />
              </div>
              <div class="form-group" style="opacity:0.35;pointer-events:none">
                <label class="form-label">Deploy Hook URL</label>
                <input type="url" class="form-input" disabled placeholder="https://api.netlify.com/build_hooks/..." />
              </div>
            </div>
            <div class="settings-card__upgrade-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <h4>Unlock Live Site Integration</h4>
              <p>Auto-deploy content changes directly to your website with the <strong>${bizConfig.label}</strong> plan.</p>
              <ul class="settings-card__perks">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg> One-click deploy to Netlify / Vercel</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg> Auto-deploy on content publish</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><polyline points="20 6 9 17 4 12"/></svg> ${bizConfig.aiActions} AI actions/month</li>
              </ul>
              <button class="btn btn--accent btn--sm" id="integrationUpgradeBtn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Upgrade to ${bizConfig.label} — $${bizConfig.price}/mo
              </button>
            </div>
          </div>
        </div>`;
          }
        })()}

        ${admin ? `
        <!-- ADMIN ONLY: Save Defaults -->
        <div class="settings-card" style="border: 2px solid var(--primary); background: var(--primary-bg);">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">
                <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary)" stroke-width="1.5" width="20"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                Save Default State
                <span style="font-size:0.7rem;background:var(--primary);color:white;padding:2px 8px;border-radius:10px;margin-left:8px">ADMIN</span>
              </h3>
              <p class="text-muted">Snapshot the current site as the "golden" fallback. If the client breaks anything, you can restore this state.</p>
            </div>
          </div>
          <div class="settings-card__body">
            <div id="defaultsStatus" style="margin-bottom:12px">
              <p class="text-muted" style="font-size:0.85rem">Checking defaults status…</p>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <button class="btn btn--primary" id="saveDefaultsBtn">
                🛡️ Save Current State as Default
              </button>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Reset to Defaults -->
        <div class="settings-card settings-card--danger">
          <div class="settings-card__header">
            <div>
              <h3 class="settings-card__title">🔄 Reset to Defaults</h3>
              <p class="text-muted">Restore content sections back to their original state. This undoes changes you've made.</p>
            </div>
          </div>
          <div class="settings-card__body">
            <p class="text-muted" style="font-size:0.85rem;margin-bottom:16px">Choose individual sections to reset, or reset everything at once.</p>
            
            <div class="defaults-grid" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(180px, 1fr));gap:8px;margin-bottom:16px">
              ${Object.entries(MODULE_LABELS).map(([key, mod]) => `
                <button class="btn btn--outline btn--sm" data-reset-module="${key}" style="justify-content:flex-start;gap:6px">
                  ${mod.icon} Reset ${mod.label}
                </button>
              `).join('')}
            </div>

            <div style="border-top:1px solid var(--border);padding-top:12px;margin-top:8px">
              <button class="btn btn--danger" id="resetAllBtn">
                ⚠️ Reset Everything to Defaults
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function getServiceTimeFormHtml(st = null) {
  return `
    <form id="stForm" class="modal-form">
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Day</label>
          <select class="form-input form-select" name="day">
            ${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(d => 
              `<option ${st?.day === d ? 'selected' : ''}>${d}</option>`
            ).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Time</label>
          <input type="text" class="form-input" name="time" value="${st?.time || ''}" placeholder="e.g., 10:00 AM" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Label</label>
        <input type="text" class="form-input" name="label" value="${st?.label || ''}" placeholder="e.g., Morning Worship" required />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input form-textarea" name="description" rows="2">${st?.description || ''}</textarea>
      </div>
    </form>
  `;
}

export function initSettings(rerender) {
  // Contact form
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(contactForm);
      Store.updateSettings('contact', Object.fromEntries(fd));
      showToast('Contact info saved!', 'success');
    });
  }

  // Social form
  const socialForm = document.getElementById('socialForm');
  if (socialForm) {
    socialForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(socialForm);
      Store.updateSettings('social', Object.fromEntries(fd));
      showToast('Social links saved!', 'success');
    });
  }

  // Meta form
  const metaForm = document.getElementById('metaForm');
  if (metaForm) {
    metaForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(metaForm);
      Store.updateSettings('meta', Object.fromEntries(fd));
      showToast('Metadata saved!', 'success');
    });
  }

  // Add service time
  const addBtn = document.getElementById('addServiceBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modal = openModal({
        title: 'Add Service Time',
        content: getServiceTimeFormHtml(),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Add</button>
        `,
        size: 'small',
      });
      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#stForm');
        const fd = new FormData(form);
        Store.addServiceTime({ day: fd.get('day'), time: fd.get('time'), label: fd.get('label'), description: fd.get('description') });
        closeModal();
        showToast('Service time added!', 'success');
        rerender();
      });
    });
  }

  // Edit service times
  document.querySelectorAll('[data-edit-st]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editSt;
      const settings = Store.getSettings();
      const st = settings.serviceTimes.find(s => s.id === id);
      if (!st) return;
      const modal = openModal({
        title: 'Edit Service Time',
        content: getServiceTimeFormHtml(st),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Save</button>
        `,
        size: 'small',
      });
      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#stForm');
        const fd = new FormData(form);
        Store.updateServiceTime(id, { day: fd.get('day'), time: fd.get('time'), label: fd.get('label'), description: fd.get('description') });
        closeModal();
        showToast('Service time updated!', 'success');
        rerender();
      });
    });
  });

  // Delete service times
  document.querySelectorAll('[data-delete-st]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteSt;
      confirmModal('Remove this service time?', () => {
        Store.deleteServiceTime(id);
        showToast('Service time removed', 'info');
        rerender();
      });
    });
  });

  // Integration form
  const integrationForm = document.getElementById('integrationForm');
  if (integrationForm) {
    integrationForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(integrationForm);
      Store.updateIntegrationSettings({
        liveSiteUrl: fd.get('liveSiteUrl') || '',
        deployHookUrl: fd.get('deployHookUrl') || '',
        autoDeploy: integrationForm.querySelector('[name="autoDeploy"]').checked,
      });
      showToast('Integration settings saved!', 'success');
      rerender();
    });
  }

  // Deploy Now button
  const deployNowBtn = document.getElementById('deployNowBtn');
  if (deployNowBtn) {
    deployNowBtn.addEventListener('click', async () => {
      deployNowBtn.disabled = true;
      deployNowBtn.textContent = '⏳ Deploying...';
      const result = await Store.triggerDeployHook();
      showToast(result.message, result.success ? 'success' : 'error');
      deployNowBtn.disabled = false;
      deployNowBtn.textContent = '🚀 Deploy Now';
      if (result.success) rerender();
    });
  }

  // Integration upgrade CTA (shown to Free/Pro users)
  const integrationUpgradeBtn = document.getElementById('integrationUpgradeBtn');
  if (integrationUpgradeBtn) {
    integrationUpgradeBtn.addEventListener('click', () => {
      window.location.hash = '#/ai-tools';
    });
  }

  // SEO upgrade CTA (shown to Free/Pro users)
  const seoUpgradeBtn = document.getElementById('seoUpgradeBtn');
  if (seoUpgradeBtn) {
    seoUpgradeBtn.addEventListener('click', () => {
      window.location.hash = '#/ai-tools';
    });
  }

  // Reset data
  const resetBtn = document.getElementById('resetDataBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      confirmModal('This will reset ALL content back to the demo defaults. Are you sure?', () => {
        Store.reset();
        showToast('All data has been reset to defaults', 'warning');
        rerender();
      });
    });
  }
}

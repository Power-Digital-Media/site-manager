/**
 * Module Activation Card
 * 
 * Renders an attractive CTA card for modules that are not yet
 * active on the client's site. Used in dashboard "Grow Your Site"
 * section and when navigating directly to an inactive module.
 */

import { MODULE_DEFINITIONS } from '../constants.js';

const MODULE_ICONS = {
  document: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  product: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33"/></svg>',
};

/**
 * Render a full-page activation card (shown when navigating to an inactive module)
 */
export function renderModuleActivationPage(moduleId, onActivate) {
  const mod = MODULE_DEFINITIONS[moduleId];
  if (!mod) return '<p>Unknown module</p>';

  return `
    <div class="module-activation">
      <div class="module-activation__card">
        <div class="module-activation__glow"></div>
        <div class="module-activation__icon">
          ${MODULE_ICONS[mod.icon] || MODULE_ICONS.document}
        </div>
        <h2 class="module-activation__title">Add ${mod.label} to Your Site</h2>
        <p class="module-activation__desc">${mod.description}</p>
        <button class="btn btn--primary btn--lg" id="activateModuleBtn" data-module="${moduleId}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Activate ${mod.label}
        </button>
        <p class="module-activation__hint">
          This will add ${mod.label.toLowerCase()} management to your dashboard. 
          Your PDM team may need to add the corresponding section to your website.
        </p>
      </div>
    </div>
  `;
}

/**
 * Render a compact activation card (used in dashboard "Grow Your Site" grid)
 */
export function renderModuleActivationCard(moduleId) {
  const mod = MODULE_DEFINITIONS[moduleId];
  if (!mod) return '';

  return `
    <div class="grow-card" data-module="${moduleId}">
      <div class="grow-card__icon">
        ${MODULE_ICONS[mod.icon] || MODULE_ICONS.document}
      </div>
      <div class="grow-card__info">
        <h4 class="grow-card__title">${mod.label}</h4>
        <p class="grow-card__desc">${mod.description}</p>
      </div>
      <button class="btn btn--outline btn--sm grow-card__btn" data-activate="${moduleId}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Add
      </button>
    </div>
  `;
}

/**
 * Initialize activation button listeners
 */
export function initModuleActivation(onActivate) {
  // Full-page activation button
  const activateBtn = document.getElementById('activateModuleBtn');
  if (activateBtn) {
    activateBtn.addEventListener('click', () => {
      const moduleId = activateBtn.dataset.module;
      if (onActivate) onActivate(moduleId);
    });
  }

  // Dashboard compact card activation buttons
  document.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const moduleId = btn.dataset.activate;
      if (onActivate) onActivate(moduleId);
    });
  });
}

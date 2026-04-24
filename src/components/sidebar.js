/**
 * Sidebar Navigation — v3.0
 * Dynamic nav based on active modules + admin nav + "Grow Your Site"
 */

import { Store } from '../store.js';
import { isAdmin } from '../auth.js';
import { MODULE_DEFINITIONS } from '../constants.js';

const NAV_ICONS = {
  dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  pages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
  blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  products: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  events: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
  gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  announcements: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  submissions: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
  settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  'ai-tools': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>',
  admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
};

// Build nav items dynamically based on active modules
function getNavItems() {
  const items = [
    { id: 'dashboard', label: 'Dashboard' },
  ];

  // Core modules (always shown)
  items.push({ id: 'pages', label: 'Pages' });

  // Conditional modules — only show if active
  const conditionalModules = ['blog', 'products', 'events', 'gallery', 'announcements', 'team', 'submissions'];
  for (const moduleId of conditionalModules) {
    if (Store.isModuleActive(moduleId)) {
      const mod = MODULE_DEFINITIONS[moduleId];
      items.push({
        id: moduleId,
        label: mod?.label || moduleId,
        badge: moduleId === 'submissions' ? 'count' : null,
      });
    }
  }

  // Settings (always shown)
  items.push({ id: 'settings', label: 'Settings' });

  return items;
}

export function renderSidebar(currentPage) {
  const site = Store.getSite();
  const tier = Store.getTier();
  const navItems = getNavItems();
  const inactiveModules = Store.getInactiveModules();
  const isAdminUser = isAdmin();

  // Get unread count only if submissions module is active
  const unreadCount = Store.isModuleActive('submissions') ? Store.getUnreadCount() : 0;
  
  return `
    <aside class="sidebar" id="sidebar">
      <div class="sidebar__brand">
        <div class="sidebar__logo">
          <div class="sidebar__logo-icon">
            <img src="/images/power-logo.webp" alt="Power Digital Media" />
          </div>
          <div class="sidebar__brand-text">
            <span class="sidebar__brand-name">Power Digital</span>
            <span class="sidebar__brand-sub">Site Manager</span>
          </div>
        </div>
      </div>

      <div class="sidebar__site-badge">
        <div class="sidebar__site-dot"></div>
        <div class="sidebar__site-info">
          <span class="sidebar__site-name">${site.name || 'Loading...'}</span>
          <span class="sidebar__site-domain">${site.domain || ''}</span>
        </div>
      </div>

      <nav class="sidebar__nav">
        ${isAdminUser ? `
          <div class="sidebar__admin-section">
            <a href="#/admin" class="sidebar__link sidebar__link--admin ${currentPage === 'admin' ? 'sidebar__link--active' : ''}" data-page="admin">
              <span class="sidebar__link-icon">${NAV_ICONS.admin}</span>
              <span class="sidebar__link-label">Admin CRM</span>
              <span class="sidebar__badge sidebar__badge--admin">PDM</span>
            </a>
          </div>
        ` : ''}

        <ul class="sidebar__list">
          ${navItems.map(item => {
            let badgeHtml = '';
            if (item.badge === 'count' && unreadCount > 0) {
              badgeHtml = `<span class="sidebar__badge sidebar__badge--count">${unreadCount}</span>`;
            }
            return `
            <li>
              <a href="#/${item.id}" class="sidebar__link ${currentPage === item.id ? 'sidebar__link--active' : ''}" data-page="${item.id}">
                <span class="sidebar__link-icon">${NAV_ICONS[item.id] || NAV_ICONS.pages}</span>
                <span class="sidebar__link-label">${item.label}</span>
                ${badgeHtml}
              </a>
            </li>
          `}).join('')}
        </ul>

        ${inactiveModules.length > 0 ? `
          <div class="sidebar__grow-section">
            <div class="sidebar__section-label">Grow Your Site</div>
            <ul class="sidebar__list sidebar__list--grow">
              ${inactiveModules.slice(0, 4).map(moduleId => {
                const mod = MODULE_DEFINITIONS[moduleId];
                const isLocked = mod?.requiredTier && (() => {
                  const tierOrder = ['free', 'pro', 'business'];
                  const currentTier = Store.getTier();
                  return tierOrder.indexOf(currentTier) < tierOrder.indexOf(mod.requiredTier);
                })();
                return `
                <li>
                  <a href="#/${moduleId}" class="sidebar__link sidebar__link--grow" data-page="${moduleId}">
                    <span class="sidebar__link-icon">${NAV_ICONS[moduleId] || NAV_ICONS.pages}</span>
                    <span class="sidebar__link-label">${mod?.label || moduleId}</span>
                    ${isLocked ? `
                      <span class="sidebar__badge sidebar__badge--pro">PRO</span>
                    ` : `
                      <span class="sidebar__badge sidebar__badge--add">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      </span>
                    `}
                  </a>
                </li>
              `}).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="sidebar__ai-section">
          <a href="#/ai-tools" class="sidebar__link sidebar__link--ai ${currentPage === 'ai-tools' ? 'sidebar__link--active' : ''}" data-page="ai-tools">
            <span class="sidebar__link-icon">${NAV_ICONS['ai-tools']}</span>
            <span class="sidebar__link-label">AI Tools</span>
            <span class="sidebar__badge sidebar__badge--pro">${tier === 'free' ? 'PRO' : tier.toUpperCase()}</span>
          </a>
        </div>
      </nav>

      <div class="sidebar__footer">
        <button class="sidebar__publish-btn" id="publishBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          Publish Changes
        </button>
        <button class="sidebar__install-btn" id="installAppBtn" style="display:none;">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Install App
        </button>
        <div class="sidebar__powered">
          Powered by <strong>Power Digital Media</strong>
        </div>
      </div>

      <button class="sidebar__toggle" id="sidebarToggle" aria-label="Toggle sidebar">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
      </button>
    </aside>
  `;
}

/**
 * Header Bar
 */

import { Store } from '../store.js';

export function renderHeader(pageTitle) {
  const auth = Store.getAuth();
  const site = Store.getSite();
  
  const initials = auth.name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const lastPub = site.lastPublished ? timeAgo(new Date(site.lastPublished)) : 'Never';

  return `
    <header class="header">
      <div class="header__left">
        <button class="header__menu-btn" id="mobileMenuBtn" aria-label="Open menu">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
        </button>
        <div class="header__title-group">
          <h1 class="header__title">${pageTitle}</h1>
          <span class="header__last-published">Last published ${lastPub}</span>
        </div>
      </div>
      <div class="header__right">
        <a href="${site.domain ? 'https://' + site.domain : '#'}" target="_blank" rel="noopener" class="header__view-site">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          <span>View Site</span>
        </a>
        <div class="header__user">
          <div class="header__avatar">${initials}</div>
          <div class="header__user-info">
            <span class="header__user-name">${auth.name}</span>
            <span class="header__user-role">${auth.role}</span>
          </div>
        </div>
      </div>
    </header>
  `;
}

function timeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

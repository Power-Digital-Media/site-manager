/**
 * Dashboard Page — v3.0
 * Dynamic stats based on active modules + "Grow Your Site" section
 */

import { Store } from '../store.js';
import { isAdmin } from '../auth.js';
import { MODULE_DEFINITIONS, TIER_CONFIG } from '../constants.js';
import { renderModuleActivationCard } from '../components/module-activation-card.js';
import { showToast } from '../components/toast.js';

export function renderDashboard() {
  const stats = Store.getStats();
  const site = Store.getSite();
  const activity = Store.getActivity(8);
  const auth = Store.getAuth();
  const tier = Store.getTier();
  const inactiveModules = Store.getInactiveModules();

  // Only get data for active modules
  const hasEvents = Store.isModuleActive('events');
  const hasBlog = Store.isModuleActive('blog');
  const hasAnnouncements = Store.isModuleActive('announcements');
  const hasProducts = Store.isModuleActive('products');
  const hasGallery = Store.isModuleActive('gallery');
  const hasSubmissions = Store.isModuleActive('submissions');
  const hasTeam = Store.isModuleActive('team');

  const events = hasEvents ? Store.getEvents().filter(e => e.published).slice(0, 3) : [];
  const recentPosts = hasBlog ? Store.getBlogPosts('published').slice(0, 3) : [];
  const announcements = hasAnnouncements ? Store.getAnnouncements().filter(a => a.active).slice(0, 2) : [];

  return `
    <div class="dashboard">
      <div class="dashboard__welcome">
        <div>
          <h2 class="dashboard__welcome-title">Welcome back, ${auth.name.split(' ')[0]} 👋</h2>
          <p class="dashboard__welcome-sub">Here's what's happening with <strong>${site.name || 'your site'}</strong></p>
        </div>
        <div class="dashboard__welcome-actions">
          ${hasBlog ? `
            <a href="#/blog" class="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Post
            </a>
          ` : ''}
          ${hasEvents ? `
            <a href="#/events" class="btn btn--ghost btn--sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              New Event
            </a>
          ` : ''}
        </div>
      </div>

      <!-- Dynamic Stats — only show active module stats -->
      <div class="dashboard__stats">
        ${hasBlog ? `
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            </div>
            <div class="stat-card__data">
              <span class="stat-card__number">${stats.blogPosts || 0}</span>
              <span class="stat-card__label">Blog Posts <span class="stat-card__sub">${stats.blogPostsPublished || 0} published</span></span>
            </div>
          </div>
        ` : ''}
        ${hasProducts ? `
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            </div>
            <div class="stat-card__data">
              <span class="stat-card__number">${stats.products || 0}</span>
              <span class="stat-card__label">Products <span class="stat-card__sub">${stats.productsInStock || 0} in stock</span></span>
            </div>
          </div>
        ` : ''}
        ${hasEvents ? `
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <div class="stat-card__data">
              <span class="stat-card__number">${stats.events || 0}</span>
              <span class="stat-card__label">Events <span class="stat-card__sub">${stats.eventsPublished || 0} published</span></span>
            </div>
          </div>
        ` : ''}
        ${hasSubmissions ? `
          <div class="stat-card">
            <div class="stat-card__icon stat-card__icon--orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div class="stat-card__data">
              <span class="stat-card__number">${stats.submissionsUnread || 0}</span>
              <span class="stat-card__label">Unread <span class="stat-card__sub">${stats.submissions || 0} total submissions</span></span>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Mini Stats — only show active modules -->
      <div class="dashboard__mini-stats">
        ${hasGallery ? `
          <div class="mini-stat">
            <span class="mini-stat__icon mini-stat__icon--purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </span>
            <span class="mini-stat__value">${stats.albums || 0}</span>
            <span class="mini-stat__label">Albums</span>
          </div>
          <div class="mini-stat">
            <span class="mini-stat__icon mini-stat__icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </span>
            <span class="mini-stat__value">${stats.totalPhotos || 0}</span>
            <span class="mini-stat__label">Photos</span>
          </div>
        ` : ''}
        ${hasTeam ? `
          <div class="mini-stat">
            <span class="mini-stat__icon mini-stat__icon--green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </span>
            <span class="mini-stat__value">${stats.team || 0}</span>
            <span class="mini-stat__label">Team</span>
          </div>
        ` : ''}
        ${hasAnnouncements ? `
          <div class="mini-stat">
            <span class="mini-stat__icon mini-stat__icon--orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </span>
            <span class="mini-stat__value">${stats.announcementsActive || 0}</span>
            <span class="mini-stat__label">Announcements</span>
          </div>
        ` : ''}
        <div class="mini-stat mini-stat--tier">
          <span class="mini-stat__icon mini-stat__icon--tier">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </span>
          <span class="mini-stat__value">${tier === 'free' ? 'Free' : tier.toUpperCase()}</span>
          <span class="mini-stat__label">Plan</span>
        </div>
        <div class="mini-stat mini-stat--ai-credits">
          <span class="mini-stat__icon mini-stat__icon--accent">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          </span>
          <span class="mini-stat__value">${auth.aiActionsRemaining}</span>
          <span class="mini-stat__label">AI Credits</span>
        </div>
      </div>

      ${inactiveModules.length > 0 ? `
        <!-- Grow Your Site Section -->
        <div class="dashboard__section dashboard__grow">
          <div class="dashboard__section-header">
            <h3>Grow Your Site</h3>
            <p class="dashboard__section-sub">Add new features to your website</p>
          </div>
          <div class="dashboard__grow-grid">
            ${inactiveModules.map(moduleId => renderModuleActivationCard(moduleId)).join('')}
          </div>
        </div>
      ` : ''}

      <div class="dashboard__grid">
        ${hasBlog ? `
          <!-- Recent Blog Posts -->
          <div class="dashboard__section">
            <div class="dashboard__section-header">
              <h3>Recent Blog Posts</h3>
              <a href="#/blog" class="dashboard__view-all">View all →</a>
            </div>
            <div class="dashboard__events-list">
              ${recentPosts.length ? recentPosts.map(p => `
                <div class="event-mini">
                  <div class="event-mini__date" style="background: var(--accent-blue-dim);">
                    <span class="event-mini__month"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></span>
                  </div>
                  <div class="event-mini__info">
                    <span class="event-mini__title">${p.title}</span>
                    <span class="event-mini__time">${p.category} · ${p.wordCount} words</span>
                  </div>
                </div>
              `).join('') : '<p class="empty-state-inline">No published posts yet</p>'}
            </div>
          </div>
        ` : ''}

        ${hasEvents ? `
          <!-- Upcoming Events -->
          <div class="dashboard__section">
            <div class="dashboard__section-header">
              <h3>Upcoming Events</h3>
              <a href="#/events" class="dashboard__view-all">View all →</a>
            </div>
            <div class="dashboard__events-list">
              ${events.length ? events.map(e => `
                <div class="event-mini">
                  <div class="event-mini__date">
                    <span class="event-mini__month">${new Date(e.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' })}</span>
                    <span class="event-mini__day">${new Date(e.date + 'T00:00:00').getDate()}</span>
                  </div>
                  <div class="event-mini__info">
                    <span class="event-mini__title">${e.title}</span>
                    <span class="event-mini__time">${e.time} · ${e.location}</span>
                  </div>
                </div>
              `).join('') : '<p class="empty-state-inline">No upcoming events</p>'}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="dashboard__grid">
        <!-- Recent Activity — gated for free tier -->
        ${tier !== 'free' ? `
        <div class="dashboard__section">
          <div class="dashboard__section-header">
            <h3>Recent Activity</h3>
          </div>
          <div class="dashboard__activity-list">
            ${activity.length ? activity.map(a => `
              <div class="activity-item">
                <div class="activity-item__icon activity-item__icon--${a.icon}">
                  ${getActivityIcon(a.icon)}
                </div>
                <div class="activity-item__info">
                  <span class="activity-item__action">${a.action}</span>
                  <span class="activity-item__time">${timeAgo(new Date(a.timestamp))}</span>
                </div>
              </div>
            `).join('') : '<p class="empty-state-inline">No recent activity</p>'}
          </div>
        </div>` : `
        <div class="dashboard__section dashboard__section--locked">
          <div class="dashboard__section-header">
            <h3>Recent Activity <span class="dashboard__tier-badge">Pro</span></h3>
          </div>
          <div class="dashboard__activity-locked">
            <div class="dashboard__activity-preview">
              <div class="activity-item activity-item--fake"><div class="activity-item__icon activity-item__icon--edit">${getActivityIcon('edit')}</div><div class="activity-item__info"><span class="activity-item__action">Updated homepage content</span><span class="activity-item__time">2h ago</span></div></div>
              <div class="activity-item activity-item--fake"><div class="activity-item__icon activity-item__icon--calendar">${getActivityIcon('calendar')}</div><div class="activity-item__info"><span class="activity-item__action">Published new event</span><span class="activity-item__time">5h ago</span></div></div>
              <div class="activity-item activity-item--fake"><div class="activity-item__icon activity-item__icon--user">${getActivityIcon('user')}</div><div class="activity-item__info"><span class="activity-item__action">Added team member</span><span class="activity-item__time">1d ago</span></div></div>
            </div>
            <div class="dashboard__activity-overlay">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <h4>Unlock Activity Feed</h4>
              <p>Track every content change, publish, and edit in real time with the <strong>${TIER_CONFIG.pro.label}</strong> plan.</p>
              <a href="#/ai-tools" class="btn btn--accent btn--sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                Upgrade to ${TIER_CONFIG.pro.label} — $${TIER_CONFIG.pro.price}/mo
              </a>
            </div>
          </div>
        </div>`}


        ${hasAnnouncements ? `
          <!-- Active Announcements -->
          <div class="dashboard__section">
            <div class="dashboard__section-header">
              <h3>Active Announcements</h3>
              <a href="#/announcements" class="dashboard__view-all">Manage →</a>
            </div>
            ${announcements.length ? announcements.map(a => `
              <div class="announce-card announce-card--${a.urgency}">
                <div class="announce-card__header">
                  <span class="announce-card__badge announce-card__badge--${a.urgency}">${a.urgency === 'high' ? 'Urgent' : 'Normal'}</span>
                  ${a.expiresAt ? `<span class="announce-card__expires">Expires ${new Date(a.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
                </div>
                <h4 class="announce-card__title">${a.title}</h4>
                <p class="announce-card__message">${a.message}</p>
              </div>
            `).join('') : '<p class="empty-state-inline">No active announcements</p>'}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/** Initialize dashboard interactions */
export function initDashboard(rerender) {
  // Handle "Grow Your Site" activation buttons
  document.querySelectorAll('[data-activate]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const moduleId = btn.dataset.activate;
      try {
        await Store.activateModule(moduleId);
        const label = MODULE_DEFINITIONS[moduleId]?.label || moduleId;
        showToast(`${label} activated! 🎉`, 'success');
        if (rerender) rerender();
      } catch (err) {
        showToast('Failed to activate module. Please try again.', 'error');
      }
    });
  });
}

function getActivityIcon(type) {
  const icons = {
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>',
    edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    megaphone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33"/></svg>',
    blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    product: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
  };
  return icons[type] || icons.edit;
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

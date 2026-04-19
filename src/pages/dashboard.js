/**
 * Dashboard Page
 */

import { Store } from '../store.js';

export function renderDashboard() {
  const stats = Store.getStats();
  const site = Store.getSite();
  const activity = Store.getActivity(6);
  const events = Store.getEvents().filter(e => e.published).slice(0, 3);
  const announcements = Store.getAnnouncements().filter(a => a.active).slice(0, 2);
  const auth = Store.getAuth();

  return `
    <div class="dashboard">
      <div class="dashboard__welcome">
        <div>
          <h2 class="dashboard__welcome-title">Welcome back, ${auth.name.split(' ')[0]} 👋</h2>
          <p class="dashboard__welcome-sub">Here's what's happening with <strong>${site.name}</strong></p>
        </div>
        <div class="dashboard__welcome-actions">
          <a href="#/events" class="btn btn--primary btn--sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Event
          </a>
          <a href="#/announcements" class="btn btn--ghost btn--sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New Announcement
          </a>
        </div>
      </div>

      <div class="dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div class="stat-card__data">
            <span class="stat-card__number">${stats.pages}</span>
            <span class="stat-card__label">Page Sections</span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <div class="stat-card__data">
            <span class="stat-card__number">${stats.events}</span>
            <span class="stat-card__label">Events <span class="stat-card__sub">${stats.eventsPublished} published</span></span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <div class="stat-card__data">
            <span class="stat-card__number">${stats.announcements}</span>
            <span class="stat-card__label">Announcements <span class="stat-card__sub">${stats.announcementsActive} active</span></span>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--orange">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </div>
          <div class="stat-card__data">
            <span class="stat-card__number">${stats.team}</span>
            <span class="stat-card__label">Team Members</span>
          </div>
        </div>
      </div>

      <div class="dashboard__grid">
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

        <div class="dashboard__section">
          <div class="dashboard__section-header">
            <h3>Recent Activity</h3>
          </div>
          <div class="dashboard__activity-list">
            ${activity.map(a => `
              <div class="activity-item">
                <div class="activity-item__icon activity-item__icon--${a.icon}">
                  ${getActivityIcon(a.icon)}
                </div>
                <div class="activity-item__info">
                  <span class="activity-item__action">${a.action}</span>
                  <span class="activity-item__time">${timeAgo(new Date(a.timestamp))}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="dashboard__announcements">
        <div class="dashboard__section-header">
          <h3>Active Announcements</h3>
          <a href="#/announcements" class="dashboard__view-all">Manage →</a>
        </div>
        ${announcements.length ? announcements.map(a => `
          <div class="announce-card announce-card--${a.urgency}">
            <div class="announce-card__header">
              <span class="announce-card__badge announce-card__badge--${a.urgency}">${a.urgency === 'high' ? '🔴 Urgent' : '🔵 Normal'}</span>
              ${a.expiresAt ? `<span class="announce-card__expires">Expires ${new Date(a.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>` : ''}
            </div>
            <h4 class="announce-card__title">${a.title}</h4>
            <p class="announce-card__message">${a.message}</p>
          </div>
        `).join('') : '<p class="empty-state-inline">No active announcements</p>'}
      </div>
    </div>
  `;
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

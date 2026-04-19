/**
 * Events Manager
 */

import { Store } from '../store.js';
import { showToast } from '../components/toast.js';
import { openModal, closeModal, confirmModal } from '../components/modal.js';

export function renderEvents() {
  const events = Store.getEvents();

  return `
    <div class="events-page">
      <div class="page-top">
        <div>
          <h2>Events</h2>
          <p class="text-muted">Manage your upcoming events and gatherings.</p>
        </div>
        <button class="btn btn--primary" id="addEventBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Event
        </button>
      </div>

      <div class="events-list" id="eventsList">
        ${events.length ? events.map(e => renderEventCard(e)).join('') : `
          <div class="empty-state">
            <div class="empty-state__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            </div>
            <h3>No Events Yet</h3>
            <p>Create your first event to get started.</p>
          </div>
        `}
      </div>
    </div>
  `;
}

function renderEventCard(e) {
  const dateObj = new Date(e.date + 'T00:00:00');
  const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
  const day = dateObj.getDate();
  const fullDate = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return `
    <div class="event-card ${!e.published ? 'event-card--draft' : ''}" data-event-id="${e.id}">
      <div class="event-card__date-badge">
        <span class="event-card__month">${month}</span>
        <span class="event-card__day">${day}</span>
      </div>
      <div class="event-card__content">
        <div class="event-card__top">
          <h3 class="event-card__title">${e.title}</h3>
          <span class="event-card__status ${e.published ? 'event-card__status--published' : 'event-card__status--draft'}">
            ${e.published ? 'Published' : 'Draft'}
          </span>
        </div>
        <div class="event-card__meta">
          <span class="event-card__meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/></svg>
            ${fullDate}
          </span>
          <span class="event-card__meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${e.time}
          </span>
          <span class="event-card__meta-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${e.location}
          </span>
        </div>
        <p class="event-card__desc">${e.description}</p>
      </div>
      <div class="event-card__actions">
        <button class="btn-icon" data-edit-event="${e.id}" title="Edit event">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn-icon btn-icon--danger" data-delete-event="${e.id}" title="Delete event">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    </div>
  `;
}

function getEventFormHtml(event = null) {
  return `
    <form id="eventForm" class="modal-form">
      <div class="form-group">
        <label class="form-label">Event Title</label>
        <input type="text" class="form-input" name="title" value="${event?.title || ''}" placeholder="e.g., Easter Sunday Celebration" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Date</label>
          <input type="date" class="form-input" name="date" value="${event?.date || ''}" required />
        </div>
        <div class="form-group">
          <label class="form-label">Time</label>
          <input type="text" class="form-input" name="time" value="${event?.time || ''}" placeholder="e.g., 10:00 AM" required />
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Location</label>
        <input type="text" class="form-input" name="location" value="${event?.location || ''}" placeholder="e.g., Church 244 Main Sanctuary" />
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <textarea class="form-input form-textarea" name="description" rows="3" placeholder="What should people know about this event?">${event?.description || ''}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label form-label--inline">
          <input type="checkbox" name="published" ${event?.published !== false ? 'checked' : ''} />
          <span>Publish immediately</span>
        </label>
      </div>
    </form>
  `;
}

export function initEvents(rerender) {
  // Add event
  const addBtn = document.getElementById('addEventBtn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const modal = openModal({
        title: 'Add New Event',
        content: getEventFormHtml(),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Create Event</button>
        `,
      });

      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#eventForm');
        const fd = new FormData(form);
        if (!fd.get('title') || !fd.get('date')) {
          showToast('Please fill in the required fields', 'error');
          return;
        }
        Store.addEvent({
          title: fd.get('title'),
          date: fd.get('date'),
          time: fd.get('time'),
          location: fd.get('location'),
          description: fd.get('description'),
          published: form.querySelector('[name="published"]').checked,
        });
        closeModal();
        showToast('Event created!', 'success');
        rerender();
      });
    });
  }

  // Edit events
  document.querySelectorAll('[data-edit-event]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editEvent;
      const event = Store.getEvent(id);
      if (!event) return;

      const modal = openModal({
        title: 'Edit Event',
        content: getEventFormHtml(event),
        actions: `
          <button class="btn btn--ghost" id="modal-cancel">Cancel</button>
          <button class="btn btn--primary" id="modal-save">Save Changes</button>
        `,
      });

      modal.querySelector('#modal-cancel').addEventListener('click', closeModal);
      modal.querySelector('#modal-save').addEventListener('click', () => {
        const form = modal.querySelector('#eventForm');
        const fd = new FormData(form);
        Store.updateEvent(id, {
          title: fd.get('title'),
          date: fd.get('date'),
          time: fd.get('time'),
          location: fd.get('location'),
          description: fd.get('description'),
          published: form.querySelector('[name="published"]').checked,
        });
        closeModal();
        showToast('Event updated!', 'success');
        rerender();
      });
    });
  });

  // Delete events
  document.querySelectorAll('[data-delete-event]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.deleteEvent;
      confirmModal('Are you sure you want to delete this event? This action cannot be undone.', () => {
        Store.deleteEvent(id);
        showToast('Event deleted', 'info');
        rerender();
      });
    });
  });
}

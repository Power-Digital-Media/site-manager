/**
 * Pages / Content Editor
 */

import { Store } from '../store.js';
import { showToast } from '../components/toast.js';

export function renderPagesEditor() {
  const pages = Store.getPages();

  return `
    <div class="pages-editor">
      <div class="pages-editor__header">
        <div>
          <h2>Page Content</h2>
          <p class="text-muted">Edit the text and content on your website sections.</p>
        </div>
      </div>

      <div class="pages-editor__sections">
        ${renderSection('hero', 'Hero Section', 'The first thing visitors see when they visit your site.', pages.hero, [
          { key: 'eyebrow', label: 'Eyebrow Text', type: 'text' },
          { key: 'title', label: 'Main Headline', type: 'text' },
          { key: 'subtitle', label: 'Subtitle', type: 'textarea' },
          { key: 'ctaPrimary', label: 'Primary Button Text', type: 'text' },
          { key: 'ctaSecondary', label: 'Secondary Button Text', type: 'text' },
        ])}

        ${renderSection('about', 'About Section', 'Tell visitors who you are and what you believe.', pages.about, [
          { key: 'eyebrow', label: 'Eyebrow Text', type: 'text' },
          { key: 'title', label: 'Section Title', type: 'text' },
          { key: 'description', label: 'Description', type: 'textarea' },
        ])}

        ${renderSection('pastor', 'Leadership', 'Your pastor profile and leadership information.', pages.pastor, [
          { key: 'eyebrow', label: 'Eyebrow Text', type: 'text' },
          { key: 'name', label: 'Pastor Name', type: 'text' },
          { key: 'quote', label: 'Featured Quote', type: 'textarea' },
          { key: 'bio', label: 'Biography', type: 'textarea' },
        ])}

        ${renderSection('cta', 'Call to Action', 'The closing banner that encourages visitors to take action.', pages.cta, [
          { key: 'title', label: 'Headline', type: 'text' },
          { key: 'description', label: 'Subtext', type: 'textarea' },
        ])}
      </div>
    </div>
  `;
}

function renderSection(key, title, description, data, fields) {
  return `
    <div class="editor-section" data-section="${key}">
      <div class="editor-section__header" data-toggle="${key}">
        <div class="editor-section__header-left">
          <div class="editor-section__expand">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div>
            <h3 class="editor-section__title">${title}</h3>
            <p class="editor-section__desc">${description}</p>
          </div>
        </div>
        <div class="editor-section__status">
          <span class="editor-section__badge">Live</span>
        </div>
      </div>
      <div class="editor-section__body" id="section-body-${key}">
        <form class="editor-form" data-section-form="${key}">
          ${fields.map(f => `
            <div class="form-group">
              <label class="form-label" for="field-${key}-${f.key}">${f.label}</label>
              ${f.type === 'textarea'
                ? `<textarea id="field-${key}-${f.key}" class="form-input form-textarea" data-field="${f.key}" rows="3">${data[f.key] || ''}</textarea>`
                : `<input type="text" id="field-${key}-${f.key}" class="form-input" data-field="${f.key}" value="${escapeHtml(data[f.key] || '')}" />`
              }
            </div>
          `).join('')}
          <div class="editor-form__actions">
            <button type="submit" class="btn btn--primary btn--sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save Changes
            </button>
            <button type="reset" class="btn btn--ghost btn--sm">Reset</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML.replace(/"/g, '&quot;');
}

export function initPagesEditor() {
  // Toggle sections open/closed
  document.querySelectorAll('[data-toggle]').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.editor-section');
      section.classList.toggle('editor-section--open');
    });
  });

  // Open first section by default
  const firstSection = document.querySelector('.editor-section');
  if (firstSection) firstSection.classList.add('editor-section--open');

  // Handle form submissions
  document.querySelectorAll('[data-section-form]').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const sectionKey = form.dataset.sectionForm;
      const fields = form.querySelectorAll('[data-field]');
      const updates = {};
      fields.forEach(f => {
        updates[f.dataset.field] = f.value;
      });
      Store.updatePage(sectionKey, updates);
      showToast(`${sectionKey.charAt(0).toUpperCase() + sectionKey.slice(1)} section saved!`, 'success');
    });

    form.addEventListener('reset', (e) => {
      e.preventDefault();
      const sectionKey = form.dataset.sectionForm;
      const originalData = Store.getPage(sectionKey);
      form.querySelectorAll('[data-field]').forEach(f => {
        f.value = originalData[f.dataset.field] || '';
      });
      showToast('Changes reverted', 'info');
    });
  });
}

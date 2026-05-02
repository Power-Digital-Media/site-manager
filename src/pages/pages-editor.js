/**
 * Page Composer — Visual WYSIWYG Page Builder
 * Drag & drop blocks, see live previews, click to edit.
 */
import { Store } from '../store.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { showTierUpgradeModal, showBlockLimitModal, showModuleActivationModal } from '../components/upgrade-modal.js';
import { BLOCK_REGISTRY, BLOCK_LIMITS, TIER_CONFIG, MODULE_DEFINITIONS } from '../constants.js';
import { renderBlockPreview } from './block-previews.js';
import { createImageUploadWidget, initImageUploadWidget, setWidgetImage } from '../components/image-upload-widget.js';
import { StorageService } from '../lib/storage.js';

const ICONS = {
  grip: '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><circle cx="8" cy="4" r="1.5"/><circle cx="16" cy="4" r="1.5"/><circle cx="8" cy="12" r="1.5"/><circle cx="16" cy="12" r="1.5"/><circle cx="8" cy="20" r="1.5"/><circle cx="16" cy="20" r="1.5"/></svg>',
  up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="18 15 12 9 6 15"/></svg>',
  down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="6 9 12 15 18 9"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
  save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  chevron: '<svg class="block-library__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>',
  // Preview mode icons
  desktop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  tablet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
  mobile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="16"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12" y2="18"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  exitFullscreen: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  editMode: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
};

const BLOCK_TYPE_ICONS = {
  hero:'🖥️', about:'ℹ️', leadership:'👤', cta:'✅', textBlock:'📝', imageBanner:'🖼️',
  blogPreview:'📚', productShowcase:'🛍️', eventsFeed:'📅', galleryStrip:'📸', teamGrid:'👥',
  youtubeChannel:'▶️', googleReviews:'⭐', donationWidget:'❤️', socialFeed:'📱', podcastPlayer:'🎙️',
};

let _editingBlockId = null;
let _dragBlockId = null;
let _previewMode = 'desktop';   // 'desktop' | 'tablet' | 'mobile'
let _isPreviewActive = false;    // true when in preview (no edit chrome)
let _isFullscreen = false;       // true when fullscreen overlay is open
let _savedScrollPos = 0;         // restore canvas scroll when leaving preview
let _pendingEditData = null;     // { blockId, blockType, data } — unsaved local edits

/**
 * Store the latest local edit data so it can be flushed before preview/fullscreen.
 * Called from each custom edit panel's init function whenever data changes.
 */
function _registerPendingEdit(blockId, blockType, data) {
  _pendingEditData = { blockId, blockType, data };
}

/**
 * Flush any pending (unsaved) edits to the Store.
 * Called before any transition that triggers refresh() (preview/fullscreen).
 */
async function _flushPendingEdits() {
  if (!_pendingEditData) return;
  const { blockId, data } = _pendingEditData;
  try {
    await Store.updatePageBlock(blockId, data);
  } catch (e) {
    console.warn('Auto-save flush failed:', e);
  }
  _pendingEditData = null;
}

function esc(text) {
  if (typeof text !== 'string') return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML.replace(/"/g, '&quot;');
}

// ── Main Render ─────────────────────────────────────────────────

export function renderPagesEditor() {
  const blocks = Store.getPageBlocks();
  const capacity = Store.canAddPageBlock();
  const tier = Store.getTier();

  const composerCls = [
    'vb-composer',
    _isPreviewActive ? 'vb-composer--preview' : '',
    _isFullscreen ? 'vb-composer--fullscreen' : '',
  ].filter(Boolean).join(' ');

  const canvasCls = [
    'vb-canvas',
    _isPreviewActive ? `vb-canvas--preview vb-canvas--${_previewMode}` : '',
  ].filter(Boolean).join(' ');

  return `
    <div class="${composerCls}">
      <div class="vb-composer__header">
        <div>
          <h2>Page Composer</h2>
          <p class="text-muted">Build your page visually — drag blocks, click to edit.</p>
        </div>
        <div class="vb-composer__header-right">
          ${renderPreviewToolbar()}
          <div class="vb-composer__meta">
            <span class="vb-composer__count ${!capacity.allowed ? 'vb-composer__count--full' : ''}">${capacity.current}/${capacity.limit === Infinity ? '∞' : capacity.limit} blocks</span>
            <span class="tier-badge tier-badge--${tier}">${TIER_CONFIG[tier]?.label || 'Free'}</span>
          </div>
        </div>
      </div>
      <div class="vb-composer__body">
        <aside class="vb-sidebar" id="vb-sidebar">
          <div id="vb-sidebar-library">${renderLibrary()}</div>
          <div id="vb-sidebar-editor" class="vb-edit-panel" style="display:none"></div>
        </aside>
        <main class="${canvasCls}" id="vb-canvas">
          ${_isPreviewActive ? renderPreviewCanvas(blocks) : (blocks.length === 0 ? renderEmpty() : renderCanvas(blocks))}
        </main>
      </div>
    </div>`;
}

// ── Library Sidebar ─────────────────────────────────────────────

function renderLibrary() {
  return `
    <div class="vb-library__header"><h3>Block Library</h3><p class="text-muted text-sm">Click or drag to add</p></div>
    ${renderCategory('Core Blocks', 'core', 'Available on all plans')}
    ${renderCategory('Module Blocks', 'module', 'Live data from your modules')}
    ${renderCategory('Premium', 'premium', 'Unlock with higher plans')}`;
}

function renderCategory(title, category, sub) {
  const items = Object.values(BLOCK_REGISTRY).filter(b => b.category === category);
  return `
    <div class="vb-library__cat" data-category="${category}">
      <div class="vb-library__cat-head" data-lib-toggle="${category}">
        <div><h4>${title}</h4><span class="text-muted text-xs">${sub}</span></div>
        ${ICONS.chevron}
      </div>
      <div class="vb-library__cat-items" id="lib-${category}">
        ${items.map(b => renderLibItem(b)).join('')}
      </div>
    </div>`;
}

function renderLibItem(def) {
  const check = Store.canUseBlockType(def.id);
  const locked = !check.available;
  const reason = check.reason;
  let badge = '', cls = '';
  if (reason === 'tier_locked') {
    badge = `<span class="vb-lib__badge vb-lib__badge--locked">🔒 ${TIER_CONFIG[def.minTier]?.label || def.minTier}</span>`;
    cls = 'vb-lib__item--locked';
  } else if (reason === 'module_inactive') {
    badge = `<span class="vb-lib__badge vb-lib__badge--inactive">● Inactive</span>`;
    cls = 'vb-lib__item--inactive';
  } else if (def.linkedModule) {
    badge = `<span class="vb-lib__badge vb-lib__badge--active">● Active</span>`;
  }
  return `
    <div class="vb-lib__item ${cls}" draggable="${!locked}" data-add-block="${def.id}" data-lock-reason="${reason}" title="${def.description}">
      <span class="vb-lib__icon">${BLOCK_TYPE_ICONS[def.id] || '📦'}</span>
      <div class="vb-lib__info"><span class="vb-lib__name">${def.label}</span><span class="vb-lib__desc">${def.description}</span></div>
      ${badge}
    </div>`;
}

// ── Visual Canvas ───────────────────────────────────────────────

function renderCanvas(blocks) {
  let html = '<div class="vb-drop-zone" data-drop-pos="0"></div>';
  blocks.forEach((block, idx) => {
    const def = BLOCK_REGISTRY[block.type] || {};
    const isEditing = _editingBlockId === block.id;
    html += `
      <div class="vb-block ${isEditing ? 'vb-block--editing' : ''}" data-block-id="${block.id}" data-block-type="${block.type}" draggable="true">
        <div class="vb-block__toolbar">
          <div class="vb-block__toolbar-left">
            <span class="vb-block__drag">${ICONS.grip}</span>
            <span class="vb-block__label">${BLOCK_TYPE_ICONS[block.type] || '📦'} ${def.label || block.type}</span>
            ${def.category === 'module' ? '<span class="vb-block__tag vb-block__tag--module">Module</span>' : ''}
            ${def.category === 'premium' ? '<span class="vb-block__tag vb-block__tag--premium">Premium</span>' : ''}
          </div>
          <div class="vb-block__toolbar-right">
            <button class="vb-block__btn" data-reorder="${block.id}" data-direction="up" ${idx === 0 ? 'disabled' : ''} title="Move up">${ICONS.up}</button>
            <button class="vb-block__btn" data-reorder="${block.id}" data-direction="down" ${idx === blocks.length - 1 ? 'disabled' : ''} title="Move down">${ICONS.down}</button>
            <button class="vb-block__btn vb-block__btn--edit" data-edit-block="${block.id}" title="Edit">${ICONS.edit}</button>
            <button class="vb-block__btn vb-block__btn--delete" data-delete-block="${block.id}" title="Delete">${ICONS.trash}</button>
          </div>
        </div>
        <div class="vb-block__preview">${renderBlockPreview(block.type, block.data)}</div>
      </div>
      <div class="vb-drop-zone" data-drop-pos="${idx + 1}"></div>`;
  });
  return html;
}

function renderEmpty() {
  const suggested = ['hero', 'about', 'cta'];
  return `
    <div class="vb-canvas__empty">
      <div class="vb-canvas__empty-icon">${ICONS.plus}</div>
      <h3>Start Building Your Page</h3>
      <p class="text-muted">Drag a block from the library or click one of these to begin:</p>
      <div class="vb-canvas__suggestions">
        ${suggested.map(t => {
          const b = BLOCK_REGISTRY[t];
          return b ? `<button class="vb-canvas__suggestion" data-add-block="${t}"><span>${BLOCK_TYPE_ICONS[t]}</span> ${b.label}</button>` : '';
        }).join('')}
      </div>
    </div>`;
}

// ── Preview Toolbar ─────────────────────────────────────────────

function renderPreviewToolbar() {
  const devices = [
    { key: 'desktop', icon: ICONS.desktop, label: 'Desktop' },
    { key: 'tablet',  icon: ICONS.tablet,  label: 'Tablet' },
    { key: 'mobile',  icon: ICONS.mobile,  label: 'Mobile' },
  ];

  const deviceBtns = devices.map(d => `
    <button class="pvt__device-btn ${_previewMode === d.key ? 'pvt__device-btn--active' : ''}" 
            data-preview-device="${d.key}" title="${d.label} view">
      ${d.icon}
    </button>
  `).join('');

  return `
    <div class="pvt" id="preview-toolbar">
      <div class="pvt__devices">
        ${deviceBtns}
      </div>
      <div class="pvt__divider"></div>
      <button class="pvt__action-btn ${_isPreviewActive ? 'pvt__action-btn--active' : ''}" 
              id="pvt-preview-toggle" title="${_isPreviewActive ? 'Back to Edit' : 'Preview Mode'}">
        ${_isPreviewActive ? ICONS.editMode : ICONS.eye}
        <span>${_isPreviewActive ? 'Edit' : 'Preview'}</span>
      </button>
      <button class="pvt__action-btn ${_isFullscreen ? 'pvt__action-btn--active' : ''}" 
              id="pvt-fullscreen-toggle" title="${_isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}">
        ${_isFullscreen ? ICONS.exitFullscreen : ICONS.fullscreen}
        <span>${_isFullscreen ? 'Exit' : 'Expand'}</span>
      </button>
    </div>`;
}

// ── Preview Canvas (read-only, no edit chrome) ──────────────────

function renderPreviewCanvas(blocks) {
  if (blocks.length === 0) {
    return `
      <div class="vb-preview-empty">
        <p>No blocks to preview. Add some blocks first!</p>
      </div>`;
  }
  let html = '<div class="vb-preview-frame">';
  blocks.forEach(block => {
    html += `
      <div class="vb-preview-block" data-block-type="${block.type}">
        ${renderBlockPreview(block.type, block.data)}
      </div>`;
  });
  html += '</div>';
  return html;
}

// ── Preview State Handlers ──────────────────────────────────────

function setPreviewDevice(device) {
  _previewMode = device;
  // Update canvas class without full re-render
  const canvas = document.getElementById('vb-canvas');
  if (canvas) {
    canvas.classList.remove('vb-canvas--desktop', 'vb-canvas--tablet', 'vb-canvas--mobile');
    if (_isPreviewActive) {
      canvas.classList.add(`vb-canvas--${device}`);
    }
  }
  // Update active state on device buttons
  document.querySelectorAll('[data-preview-device]').forEach(btn => {
    btn.classList.toggle('pvt__device-btn--active', btn.dataset.previewDevice === device);
  });
}

function togglePreviewMode() {
  // Auto-save any pending edits before switching modes
  _flushPendingEdits();
  _isPreviewActive = !_isPreviewActive;
  if (_isPreviewActive) {
    // Save scroll position
    const canvas = document.getElementById('vb-canvas');
    if (canvas) _savedScrollPos = canvas.scrollTop;
    // Close any open edit panel
    closeEditPanel();
  }
  refresh();
  // Restore scroll
  if (!_isPreviewActive) {
    requestAnimationFrame(() => {
      const canvas = document.getElementById('vb-canvas');
      if (canvas) canvas.scrollTop = _savedScrollPos;
    });
  }
}

function toggleFullscreen() {
  // Auto-save any pending edits before switching modes
  _flushPendingEdits();
  _isFullscreen = !_isFullscreen;
  // If entering fullscreen, also activate preview mode
  if (_isFullscreen && !_isPreviewActive) {
    _isPreviewActive = true;
    const canvas = document.getElementById('vb-canvas');
    if (canvas) _savedScrollPos = canvas.scrollTop;
    closeEditPanel();
  }
  refresh();
}

// ── Edit Panel ──────────────────────────────────────────────────

function renderEditPanel(blockId) {
  const blocks = Store.getPageBlocks();
  const block = blocks.find(b => b.id === blockId);
  if (!block) return '';
  const def = BLOCK_REGISTRY[block.type] || {};

  // ── Route custom edit panels ────────────────────────────────
  if (def.fields === 'custom' && block.type === 'leadership') {
    return renderLeadershipEditPanel(block, def);
  }
  if (def.fields === 'custom' && block.type === 'hero') {
    return renderHeroEditPanel(block, def);
  }
  if (def.fields === 'custom' && block.type === 'imageBanner') {
    return renderImageBannerEditPanel(block, def);
  }
  if (def.fields === 'custom' && block.type === 'about') {
    return renderAboutEditPanel(block, def);
  }

  if (!def.fields || def.fields === 'custom') return '<p class="text-muted" style="padding:20px">No editable fields.</p>';

  const fields = def.fields.map(f => {
    const val = block.data[f.key] || '';
    if (f.type === 'textarea') {
      return `<div class="form-group"><label class="form-label">${f.label}</label><textarea class="form-input form-textarea" data-field="${f.key}" rows="3">${esc(val)}</textarea></div>`;
    } else if (f.type === 'number') {
      return `<div class="form-group"><label class="form-label">${f.label}</label><input type="number" class="form-input" data-field="${f.key}" value="${val}" min="1" max="20" /></div>`;
    }
    return `<div class="form-group"><label class="form-label">${f.label}</label><input type="text" class="form-input" data-field="${f.key}" value="${esc(val)}" /></div>`;
  }).join('');

  return `
    <div class="vb-edit-panel__header">
      <button class="vb-edit-panel__back" id="edit-panel-back">${ICONS.back} Back</button>
    </div>
    <div class="vb-edit-panel__title">
      <span>${BLOCK_TYPE_ICONS[block.type] || '📦'}</span>
      <h3>Edit ${def.label || block.type}</h3>
    </div>
    <form class="vb-edit-panel__form" id="edit-panel-form" data-block-id="${blockId}">
      ${fields}
      <div class="vb-edit-panel__actions">
        <button type="submit" class="btn btn--primary btn--sm">${ICONS.save} Save</button>
        <button type="button" class="btn btn--ghost btn--sm" id="edit-panel-done">Done</button>
      </div>
    </form>`;
}

// ── Leadership / Team — Custom Edit Panel ───────────────────────

function renderLeadershipEditPanel(block, def) {
  const data = block.data || {};
  // Migrate legacy flat format to members array on first edit
  let members = data.members;
  if (!members || !Array.isArray(members)) {
    members = [{
      id: 'm1',
      name: data.name || '',
      role: data.quote || '',
      bio: data.bio || '',
      photo: '',
    }];
  }
  const sectionTitle = data.sectionTitle || 'Our Leadership';

  const memberCards = members.map((m, idx) => `
    <div class="le-member" data-member-idx="${idx}">
      <div class="le-member__header">
        <span class="le-member__number">${idx + 1}</span>
        <span class="le-member__label">${esc(m.name) || 'Team Member'}</span>
        ${members.length > 1 ? `<button type="button" class="le-member__remove" data-remove-member="${idx}" title="Remove member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>` : ''}
      </div>
      <div class="le-member__body">
        ${createImageUploadWidget({
          id: `leaderPhoto_${idx}`,
          slot: 'teamMember',
          currentUrl: m.photo || '',
          label: 'Headshot',
          compact: true,
        })}
        <div class="form-group">
          <label class="form-label">Name</label>
          <input type="text" class="form-input" data-member-field="name" data-member-idx="${idx}" value="${esc(m.name)}" placeholder="e.g. Jane Doe" />
        </div>
        <div class="form-group">
          <label class="form-label">Title / Role</label>
          <input type="text" class="form-input" data-member-field="role" data-member-idx="${idx}" value="${esc(m.role)}" placeholder="e.g. CEO & Founder" />
        </div>
        <div class="form-group">
          <label class="form-label">Bio</label>
          <textarea class="form-input form-textarea" data-member-field="bio" data-member-idx="${idx}" rows="3" placeholder="Short bio...">${esc(m.bio)}</textarea>
        </div>
      </div>
    </div>
  `).join('');

  return `
    <div class="vb-edit-panel__header">
      <button class="vb-edit-panel__back" id="edit-panel-back">${ICONS.back} Back</button>
    </div>
    <div class="vb-edit-panel__title">
      <span>👤</span>
      <h3>Edit ${def.label || 'Leadership'}</h3>
    </div>
    <div class="le-panel" id="leadership-edit-panel" data-block-id="${block.id}">
      <div class="form-group">
        <label class="form-label">Section Title</label>
        <input type="text" class="form-input" id="le-section-title" value="${esc(sectionTitle)}" placeholder="Our Leadership" />
      </div>

      <div class="le-members-label">
        <span>Team Members (${members.length})</span>
        <button type="button" class="btn btn--outline btn--xs" id="le-add-member">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add Member
        </button>
      </div>

      <div class="le-members-list" id="le-members-list">
        ${memberCards}
      </div>

      <div class="vb-edit-panel__actions">
        <button type="button" class="btn btn--primary btn--sm" id="le-save-btn">${ICONS.save} Save All</button>
        <button type="button" class="btn btn--ghost btn--sm" id="edit-panel-done">Done</button>
      </div>
    </div>`;
}

/**
 * Wire up all interactivity for the Leadership custom edit panel.
 * Called after the panel HTML is injected into the DOM.
 */
function initLeadershipEditPanel(blockId) {
  const panel = document.getElementById('leadership-edit-panel');
  if (!panel) return;

  const block = Store.getPageBlocks().find(b => b.id === blockId);
  if (!block) return;

  // Build a live members array we'll mutate in place
  let members = Array.isArray(block.data.members)
    ? JSON.parse(JSON.stringify(block.data.members))  // deep clone
    : [{ id: 'm1', name: block.data.name || '', role: block.data.quote || '', bio: block.data.bio || '', photo: '' }];

  // ── Init image upload widgets for each member ─────────────
  members.forEach((m, idx) => {
    initImageUploadWidget(`leaderPhoto_${idx}`, {
      onComplete: async (result) => {
        try {
          // Upload through the Automatic Tailor pipeline
          const uploaded = await StorageService.uploadTeamPhoto(result.blob);
          members[idx].photo = uploaded.url;
          showToast('Headshot uploaded!', 'success');
          livePreview();
        } catch (err) {
          showToast(`Upload failed: ${err.message}`, 'error');
        }
      },
      onRemove: () => {
        members[idx].photo = '';
        livePreview();
      },
    });
  });

  // ── Live text field syncing ───────────────────────────────
  panel.querySelectorAll('[data-member-field]').forEach(field => {
    field.addEventListener('input', () => {
      const idx = parseInt(field.dataset.memberIdx, 10);
      const key = field.dataset.memberField;
      if (members[idx]) members[idx][key] = field.value;
      debouncedPreview();
    });
  });

  // Section title live sync
  const titleInput = document.getElementById('le-section-title');
  titleInput?.addEventListener('input', () => debouncedPreview());

  // ── Add Member ────────────────────────────────────────────
  document.getElementById('le-add-member')?.addEventListener('click', () => {
    const newId = 'm' + Date.now().toString(36);
    members.push({ id: newId, name: '', role: '', bio: '', photo: '' });
    // Re-render the entire edit panel to add new member card + widget
    rerenderPanel();
  });

  // ── Remove Member ─────────────────────────────────────────
  panel.querySelectorAll('[data-remove-member]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeMember, 10);
      if (members.length <= 1) { showToast('At least one member is required.', 'warning'); return; }
      members.splice(idx, 1);
      rerenderPanel();
    });
  });

  // ── Save All ──────────────────────────────────────────────
  document.getElementById('le-save-btn')?.addEventListener('click', async () => {
    const sectionTitle = document.getElementById('le-section-title')?.value || 'Our Leadership';
    await Store.updatePageBlock(blockId, { sectionTitle, members });
    showToast('Leadership block saved!', 'success');
    updatePreviewFromData(blockId, { sectionTitle, members });
  });

  // ── Helpers ───────────────────────────────────────────────
  let _debounce = null;
  function debouncedPreview() {
    clearTimeout(_debounce);
    _debounce = setTimeout(livePreview, 300);
  }

  function livePreview() {
    const sectionTitle = document.getElementById('le-section-title')?.value || 'Our Leadership';
    _registerPendingEdit(blockId, 'leadership', { sectionTitle, members });
    updatePreviewFromData(blockId, { sectionTitle, members });
  }

  function updatePreviewFromData(bid, data) {
    const previewEl = document.querySelector(`[data-block-id="${bid}"] .vb-block__preview`);
    if (!previewEl) return;
    previewEl.innerHTML = renderBlockPreview('leadership', data);
  }

  function rerenderPanel() {
    // Persist current text values back into members array before re-render
    const editor = document.getElementById('vb-sidebar-editor');
    if (!editor) return;
    // Temporarily save to block data so renderEditPanel picks it up
    const bl = Store.getPageBlocks().find(b => b.id === blockId);
    if (bl) bl.data = { ...bl.data, members, sectionTitle: document.getElementById('le-section-title')?.value || 'Our Leadership' };
    editor.innerHTML = renderEditPanel(blockId);
    initLeadershipEditPanel(blockId);
    // Re-bind back/done buttons
    document.getElementById('edit-panel-back')?.addEventListener('click', closeEditPanel);
    document.getElementById('edit-panel-done')?.addEventListener('click', closeEditPanel);
    livePreview();
  }
}

// ── Image Banner — Custom Edit Panel ────────────────────────────

function renderImageBannerEditPanel(block, def) {
  const data = block.data || {};
  const overlayColor = data.overlayColor || 'rgba(15, 23, 42, 0.50)';
  const overlayEnabled = data.overlayEnabled !== false;
  const hasImage = !!(data.imageUrl && data.imageUrl.length > 0);

  const { hex: overlayHex, alpha: overlayAlpha } = rgbaToHexAlpha(overlayColor);

  return `
    <div class="vb-edit-panel__header">
      <button class="vb-edit-panel__back" id="edit-panel-back">${ICONS.back} Back</button>
    </div>
    <div class="vb-edit-panel__title">
      <span>🖼️</span>
      <h3>Edit ${def.label || 'Image Banner'}</h3>
    </div>
    <div class="ib-panel" id="image-banner-edit-panel" data-block-id="${block.id}">

      <!-- Banner Image -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Banner Image
        </h4>
        ${createImageUploadWidget({
          id: 'bannerImage',
          slot: 'imageBanner',
          currentUrl: data.imageUrl || '',
          label: 'Banner Background',
          compact: false,
        })}
      </div>

      <!-- Image Position Controls -->
      <div class="he-section" id="ib-position-section" ${!hasImage ? 'style="display:none"' : ''}>
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          Image Position
        </h4>
        <p class="form-help" style="margin-bottom:10px;">Pan and zoom to frame the part of your image you want visible.</p>
        <div class="he-pos-grid">
          <div class="he-pos-slider">
            <label class="form-label form-label--sm">Horizontal (X)</label>
            <div class="he-slider-wrap">
              <span class="he-slider-label-left">← Left</span>
              <input type="range" class="he-slider" id="ib-bg-pos-x" min="0" max="100" value="${data.bgPositionX !== undefined ? data.bgPositionX : 50}" />
              <span class="he-slider-label-right">Right →</span>
            </div>
            <span class="he-slider-val he-slider-val--center" id="ib-bg-pos-x-val">${data.bgPositionX !== undefined ? data.bgPositionX : 50}%</span>
          </div>
          <div class="he-pos-slider">
            <label class="form-label form-label--sm">Vertical (Y)</label>
            <div class="he-slider-wrap">
              <span class="he-slider-label-left">↑ Top</span>
              <input type="range" class="he-slider" id="ib-bg-pos-y" min="0" max="100" value="${data.bgPositionY !== undefined ? data.bgPositionY : 50}" />
              <span class="he-slider-label-right">Bottom ↓</span>
            </div>
            <span class="he-slider-val he-slider-val--center" id="ib-bg-pos-y-val">${data.bgPositionY !== undefined ? data.bgPositionY : 50}%</span>
          </div>
          <div class="he-pos-slider">
            <label class="form-label form-label--sm">Zoom (Z)</label>
            <div class="he-slider-wrap">
              <span class="he-slider-label-left">Fit</span>
              <input type="range" class="he-slider" id="ib-bg-zoom" min="100" max="300" value="${data.bgZoom !== undefined ? data.bgZoom : 100}" />
              <span class="he-slider-label-right">Close</span>
            </div>
            <span class="he-slider-val he-slider-val--center" id="ib-bg-zoom-val">${data.bgZoom !== undefined ? data.bgZoom : 100}%</span>
          </div>
          <button type="button" class="btn btn--ghost btn--xs" id="ib-pos-reset" title="Reset to center">↻ Reset Position</button>
        </div>
      </div>

      <!-- Overlay & Colors -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
          Overlay
        </h4>

        <div class="he-color-row">
          <label class="he-toggle">
            <input type="checkbox" id="ib-overlay-toggle" ${overlayEnabled ? 'checked' : ''} />
            <span class="he-toggle__slider"></span>
            <span class="he-toggle__label">Dark Overlay</span>
          </label>
        </div>

        <div class="he-color-row" id="ib-overlay-controls" ${!overlayEnabled ? 'style="opacity:0.5;pointer-events:none"' : ''}>
          <div class="he-color-picker">
            <label class="form-label form-label--sm">Overlay Color</label>
            <div class="he-color-swatch-wrap">
              <input type="color" class="he-color-input" id="ib-overlay-color" value="${overlayHex}" />
              <span class="he-color-hex" id="ib-overlay-hex">${overlayHex}</span>
            </div>
          </div>
          <div class="he-color-picker">
            <label class="form-label form-label--sm">Opacity</label>
            <div class="he-slider-wrap">
              <input type="range" class="he-slider" id="ib-overlay-opacity" min="0" max="100" value="${Math.round(overlayAlpha * 100)}" />
              <span class="he-slider-val" id="ib-overlay-opacity-val">${Math.round(overlayAlpha * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Content Fields -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Content
        </h4>
        <div class="form-group">
          <label class="form-label">Overlay Text</label>
          <input type="text" class="form-input" id="ib-overlay-text" value="${esc(data.overlayText || '')}" placeholder="e.g. Welcome to Our Story" />
        </div>
        <div class="form-group">
          <label class="form-label">Alt Text (SEO)</label>
          <input type="text" class="form-input" id="ib-alt-text" value="${esc(data.altText || '')}" placeholder="Describe the image for accessibility" />
          <span class="form-help">Helps search engines understand your image — be descriptive.</span>
        </div>
      </div>

      <div class="vb-edit-panel__actions">
        <button type="button" class="btn btn--primary btn--sm" id="ib-save-btn">${ICONS.save} Save</button>
        <button type="button" class="btn btn--ghost btn--sm" id="edit-panel-done">Done</button>
      </div>
    </div>`;
}

function initImageBannerEditPanel(blockId) {
  const panel = document.getElementById('image-banner-edit-panel');
  if (!panel) return;

  const block = Store.getPageBlocks().find(b => b.id === blockId);
  if (!block) return;

  let bannerData = JSON.parse(JSON.stringify(block.data || {}));

  // ── Init banner image upload widget ───────────────────────
  initImageUploadWidget('bannerImage', {
    onComplete: async (result) => {
      bannerData.imageUrl = result.previewUrl;
      livePreview();
      // Show position controls now that we have an image
      const posSection = document.getElementById('ib-position-section');
      if (posSection) posSection.style.display = '';

      try {
        const file = new File(
          [result.blob],
          `banner-${Date.now()}.webp`,
          { type: result.blob.type || 'image/webp' }
        );
        const uploaded = await StorageService.upload(file, StorageService.CATEGORIES.SITE);
        bannerData.imageUrl = uploaded.url;
        showToast('Banner image uploaded!', 'success');
        livePreview();
      } catch (err) {
        console.error('Banner upload failed:', err);
        showToast(`Upload failed: ${err.message}`, 'error');
        bannerData.imageUrl = '';
        livePreview();
        setWidgetImage('bannerImage', '');
        // Hide position controls on failure
        const posSection2 = document.getElementById('ib-position-section');
        if (posSection2) posSection2.style.display = 'none';
      }
    },
    onRemove: () => {
      bannerData.imageUrl = '';
      livePreview();
      // Hide position controls when image is removed
      const posSection = document.getElementById('ib-position-section');
      if (posSection) posSection.style.display = 'none';
    },
  });

  // ── Image position controls ────────────────────────────────
  const posXSlider = document.getElementById('ib-bg-pos-x');
  const posYSlider = document.getElementById('ib-bg-pos-y');
  const zoomSlider = document.getElementById('ib-bg-zoom');
  const posXVal = document.getElementById('ib-bg-pos-x-val');
  const posYVal = document.getElementById('ib-bg-pos-y-val');
  const zoomVal = document.getElementById('ib-bg-zoom-val');

  function updateImagePosition() {
    bannerData.bgPositionX = parseInt(posXSlider?.value || 50, 10);
    bannerData.bgPositionY = parseInt(posYSlider?.value || 50, 10);
    bannerData.bgZoom = parseInt(zoomSlider?.value || 100, 10);
    if (posXVal) posXVal.textContent = `${bannerData.bgPositionX}%`;
    if (posYVal) posYVal.textContent = `${bannerData.bgPositionY}%`;
    if (zoomVal) zoomVal.textContent = `${bannerData.bgZoom}%`;
    debouncedPreview();
  }

  posXSlider?.addEventListener('input', updateImagePosition);
  posYSlider?.addEventListener('input', updateImagePosition);
  zoomSlider?.addEventListener('input', updateImagePosition);

  document.getElementById('ib-pos-reset')?.addEventListener('click', () => {
    if (posXSlider) posXSlider.value = 50;
    if (posYSlider) posYSlider.value = 50;
    if (zoomSlider) zoomSlider.value = 100;
    updateImagePosition();
  });

  // ── Overlay controls ──────────────────────────────────────
  const overlayColorInput = document.getElementById('ib-overlay-color');
  const overlayOpacity = document.getElementById('ib-overlay-opacity');
  const overlayOpacityVal = document.getElementById('ib-overlay-opacity-val');
  const overlayToggle = document.getElementById('ib-overlay-toggle');
  const overlayControls = document.getElementById('ib-overlay-controls');
  const overlayHexLabel = document.getElementById('ib-overlay-hex');

  function updateOverlayColor() {
    const hex = overlayColorInput?.value || '#0f172a';
    const alpha = (overlayOpacity?.value || 50) / 100;
    bannerData.overlayColor = hexAlphaToRgba(hex, alpha);
    if (overlayHexLabel) overlayHexLabel.textContent = hex;
    if (overlayOpacityVal) overlayOpacityVal.textContent = `${Math.round(alpha * 100)}%`;
    debouncedPreview();
  }

  overlayColorInput?.addEventListener('input', updateOverlayColor);
  overlayOpacity?.addEventListener('input', updateOverlayColor);

  overlayToggle?.addEventListener('change', () => {
    bannerData.overlayEnabled = overlayToggle.checked;
    if (overlayControls) {
      overlayControls.style.opacity = overlayToggle.checked ? '1' : '0.5';
      overlayControls.style.pointerEvents = overlayToggle.checked ? 'auto' : 'none';
    }
    debouncedPreview();
  });

  // ── Text fields live sync ─────────────────────────────────
  const fieldMap = {
    'ib-overlay-text': 'overlayText',
    'ib-alt-text': 'altText',
  };

  Object.entries(fieldMap).forEach(([domId, dataKey]) => {
    const el = document.getElementById(domId);
    el?.addEventListener('input', () => {
      bannerData[dataKey] = el.value;
      debouncedPreview();
    });
  });

  // ── Save ──────────────────────────────────────────────────
  document.getElementById('ib-save-btn')?.addEventListener('click', async () => {
    Object.entries(fieldMap).forEach(([domId, dataKey]) => {
      const el = document.getElementById(domId);
      if (el) bannerData[dataKey] = el.value;
    });
    await Store.updatePageBlock(blockId, bannerData);
    showToast('Image Banner saved!', 'success');
    updatePreviewFromData(blockId, bannerData);
  });

  // ── Helpers ───────────────────────────────────────────────
  let _debounce = null;
  function debouncedPreview() {
    clearTimeout(_debounce);
    _debounce = setTimeout(livePreview, 300);
  }

  function livePreview() {
    _registerPendingEdit(blockId, 'imageBanner', bannerData);
    updatePreviewFromData(blockId, bannerData);
  }

  function updatePreviewFromData(bid, data) {
    const previewEl = document.querySelector(`[data-block-id="${bid}"] .vb-block__preview`);
    if (!previewEl) return;
    previewEl.innerHTML = renderBlockPreview('imageBanner', data);
  }
}

// ── About Section — Custom Edit Panel ───────────────────────────

function renderAboutEditPanel(block, def) {
  const data = block.data || {};

  return `
    <div class="vb-edit-panel__header">
      <button class="vb-edit-panel__back" id="edit-panel-back">${ICONS.back} Back</button>
    </div>
    <div class="vb-edit-panel__title">
      <span>ℹ️</span>
      <h3>Edit ${def.label || 'About Section'}</h3>
    </div>
    <div class="ab-panel" id="about-edit-panel" data-block-id="${block.id}">

      <!-- Section Image -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Section Image
        </h4>
        ${createImageUploadWidget({
          id: 'aboutSectionImage',
          slot: 'aboutImage',
          currentUrl: data.aboutImage || '',
          label: 'About Photo',
          compact: false,
        })}
      </div>

      <!-- Content Fields -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Content
        </h4>
        <div class="form-group">
          <label class="form-label">Eyebrow Text</label>
          <input type="text" class="form-input" id="ab-eyebrow" value="${esc(data.eyebrow || '')}" placeholder="e.g. Who We Are" />
        </div>
        <div class="form-group">
          <label class="form-label">Section Title</label>
          <input type="text" class="form-input" id="ab-title" value="${esc(data.title || '')}" placeholder="About Us" />
        </div>
        <div class="form-group">
          <label class="form-label">Description</label>
          <textarea class="form-input form-textarea" id="ab-description" rows="4" placeholder="Tell your visitors who you are, what you believe, and why they should care...">${esc(data.description || '')}</textarea>
        </div>
      </div>

      <div class="vb-edit-panel__actions">
        <button type="button" class="btn btn--primary btn--sm" id="ab-save-btn">${ICONS.save} Save</button>
        <button type="button" class="btn btn--ghost btn--sm" id="edit-panel-done">Done</button>
      </div>
    </div>`;
}

function initAboutEditPanel(blockId) {
  const panel = document.getElementById('about-edit-panel');
  if (!panel) return;

  const block = Store.getPageBlocks().find(b => b.id === blockId);
  if (!block) return;

  let aboutData = JSON.parse(JSON.stringify(block.data || {}));

  // ── Init about image upload widget ────────────────────────
  initImageUploadWidget('aboutSectionImage', {
    onComplete: async (result) => {
      aboutData.aboutImage = result.previewUrl;
      livePreview();

      try {
        const file = new File(
          [result.blob],
          `about-${Date.now()}.webp`,
          { type: result.blob.type || 'image/webp' }
        );
        const uploaded = await StorageService.upload(file, StorageService.CATEGORIES.SITE);
        aboutData.aboutImage = uploaded.url;
        showToast('About image uploaded!', 'success');
        livePreview();
      } catch (err) {
        console.error('About image upload failed:', err);
        showToast(`Upload failed: ${err.message}`, 'error');
        aboutData.aboutImage = '';
        livePreview();
        setWidgetImage('aboutSectionImage', '');
      }
    },
    onRemove: () => {
      aboutData.aboutImage = '';
      livePreview();
    },
  });

  // ── Text fields live sync ─────────────────────────────────
  const fieldMap = {
    'ab-eyebrow': 'eyebrow',
    'ab-title': 'title',
    'ab-description': 'description',
  };

  Object.entries(fieldMap).forEach(([domId, dataKey]) => {
    const el = document.getElementById(domId);
    el?.addEventListener('input', () => {
      aboutData[dataKey] = el.value;
      debouncedPreview();
    });
  });

  // ── Save ──────────────────────────────────────────────────
  document.getElementById('ab-save-btn')?.addEventListener('click', async () => {
    Object.entries(fieldMap).forEach(([domId, dataKey]) => {
      const el = document.getElementById(domId);
      if (el) aboutData[dataKey] = el.value;
    });
    await Store.updatePageBlock(blockId, aboutData);
    showToast('About section saved!', 'success');
    updatePreviewFromData(blockId, aboutData);
  });

  // ── Helpers ───────────────────────────────────────────────
  let _debounce = null;
  function debouncedPreview() {
    clearTimeout(_debounce);
    _debounce = setTimeout(livePreview, 300);
  }

  function livePreview() {
    _registerPendingEdit(blockId, 'about', aboutData);
    updatePreviewFromData(blockId, aboutData);
  }

  function updatePreviewFromData(bid, data) {
    const previewEl = document.querySelector(`[data-block-id="${bid}"] .vb-block__preview`);
    if (!previewEl) return;
    previewEl.innerHTML = renderBlockPreview('about', data);
  }
}

// ── Hero — Custom Edit Panel ────────────────────────────────────

function renderHeroEditPanel(block, def) {
  const data = block.data || {};
  const overlayColor = data.overlayColor || 'rgba(15, 23, 42, 0.70)';
  const textColor = data.textColor || '#ffffff';
  const overlayEnabled = data.overlayEnabled !== false;
  const hasBg = !!(data.bgImage && data.bgImage.length > 0);

  // Parse RGBA overlay into hex + opacity for the color input
  const { hex: overlayHex, alpha: overlayAlpha } = rgbaToHexAlpha(overlayColor);

  return `
    <div class="vb-edit-panel__header">
      <button class="vb-edit-panel__back" id="edit-panel-back">${ICONS.back} Back</button>
    </div>
    <div class="vb-edit-panel__title">
      <span>🖥️</span>
      <h3>Edit ${def.label || 'Hero Section'}</h3>
    </div>
    <div class="he-panel" id="hero-edit-panel" data-block-id="${block.id}">

      <!-- Background Image -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          Background Image
        </h4>
        ${createImageUploadWidget({
          id: 'heroBgImage',
          slot: 'heroBanner',
          currentUrl: data.bgImage || '',
          label: 'Hero Background',
          compact: false,
        })}
      </div>

      <!-- Image Position Controls -->
      <div class="he-section" id="he-position-section" ${!hasBg ? 'style="display:none"' : ''}>
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M5 9l-3 3 3 3"/><path d="M9 5l3-3 3 3"/><path d="M15 19l-3 3-3-3"/><path d="M19 9l3 3-3 3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          Image Position
        </h4>
        <p class="form-help" style="margin-bottom:10px;">Pan and zoom to frame the part of your image you want visible.</p>
        <div class="he-pos-grid">
          <div class="he-pos-slider">
            <label class="form-label form-label--sm">Horizontal (X)</label>
            <div class="he-slider-wrap">
              <span class="he-slider-label-left">← Left</span>
              <input type="range" class="he-slider" id="he-bg-pos-x" min="0" max="100" value="${data.bgPositionX !== undefined ? data.bgPositionX : 50}" />
              <span class="he-slider-label-right">Right →</span>
            </div>
            <span class="he-slider-val he-slider-val--center" id="he-bg-pos-x-val">${data.bgPositionX !== undefined ? data.bgPositionX : 50}%</span>
          </div>
          <div class="he-pos-slider">
            <label class="form-label form-label--sm">Vertical (Y)</label>
            <div class="he-slider-wrap">
              <span class="he-slider-label-left">↑ Top</span>
              <input type="range" class="he-slider" id="he-bg-pos-y" min="0" max="100" value="${data.bgPositionY !== undefined ? data.bgPositionY : 50}" />
              <span class="he-slider-label-right">Bottom ↓</span>
            </div>
            <span class="he-slider-val he-slider-val--center" id="he-bg-pos-y-val">${data.bgPositionY !== undefined ? data.bgPositionY : 50}%</span>
          </div>
          <div class="he-pos-slider">
            <label class="form-label form-label--sm">Zoom (Z)</label>
            <div class="he-slider-wrap">
              <span class="he-slider-label-left">Fit</span>
              <input type="range" class="he-slider" id="he-bg-zoom" min="100" max="300" value="${data.bgZoom !== undefined ? data.bgZoom : 100}" />
              <span class="he-slider-label-right">Close</span>
            </div>
            <span class="he-slider-val he-slider-val--center" id="he-bg-zoom-val">${data.bgZoom !== undefined ? data.bgZoom : 100}%</span>
          </div>
          <button type="button" class="btn btn--ghost btn--xs" id="he-pos-reset" title="Reset to center">↻ Reset Position</button>
        </div>
      </div>

      <!-- Overlay & Text Colors -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 0 20"/></svg>
          Overlay & Colors
        </h4>

        <div class="he-color-row">
          <label class="he-toggle">
            <input type="checkbox" id="he-overlay-toggle" ${overlayEnabled ? 'checked' : ''} />
            <span class="he-toggle__slider"></span>
            <span class="he-toggle__label">Dark Overlay</span>
          </label>
        </div>

        <div class="he-color-row" id="he-overlay-controls" ${!overlayEnabled ? 'style="opacity:0.5;pointer-events:none"' : ''}>
          <div class="he-color-picker">
            <label class="form-label form-label--sm">Overlay Color</label>
            <div class="he-color-swatch-wrap">
              <input type="color" class="he-color-input" id="he-overlay-color" value="${overlayHex}" />
              <span class="he-color-hex" id="he-overlay-hex">${overlayHex}</span>
            </div>
          </div>
          <div class="he-color-picker">
            <label class="form-label form-label--sm">Opacity</label>
            <div class="he-slider-wrap">
              <input type="range" class="he-slider" id="he-overlay-opacity" min="0" max="100" value="${Math.round(overlayAlpha * 100)}" />
              <span class="he-slider-val" id="he-overlay-opacity-val">${Math.round(overlayAlpha * 100)}%</span>
            </div>
          </div>
        </div>

        <div class="he-color-row">
          <div class="he-color-picker">
            <label class="form-label form-label--sm">Text Color</label>
            <div class="he-color-swatch-wrap">
              <input type="color" class="he-color-input" id="he-text-color" value="${textColor}" />
              <span class="he-color-hex" id="he-text-hex">${textColor}</span>
            </div>
          </div>
          <div class="he-color-preview" id="he-color-preview">
            <div class="he-color-preview__bg" style="background:${hasBg ? `url(${esc(data.bgImage)})` : 'linear-gradient(135deg, #0f172a, #1e293b)'};background-size:cover;"></div>
            ${overlayEnabled ? `<div class="he-color-preview__overlay" style="background:${overlayColor}"></div>` : ''}
            <span class="he-color-preview__text" style="color:${textColor}">Preview</span>
          </div>
        </div>
      </div>

      <!-- Content Fields -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Content
        </h4>
        <div class="form-group">
          <label class="form-label">Eyebrow Text</label>
          <input type="text" class="form-input" id="he-eyebrow" value="${esc(data.eyebrow || '')}" placeholder="e.g. Welcome to Our Church" />
        </div>
        <div class="form-group">
          <label class="form-label">Headline</label>
          <input type="text" class="form-input" id="he-title" value="${esc(data.title || '')}" placeholder="Your Main Headline" />
        </div>
        <div class="form-group">
          <label class="form-label">Subtitle</label>
          <textarea class="form-input form-textarea" id="he-subtitle" rows="2" placeholder="Add a compelling subtitle...">${esc(data.subtitle || '')}</textarea>
        </div>
      </div>

      <!-- CTA Buttons -->
      <div class="he-section">
        <h4 class="he-section__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14"><rect x="3" y="8" width="18" height="8" rx="2"/></svg>
          Call-to-Action Buttons
        </h4>
        <div class="he-cta-group">
          <div class="he-cta-pair">
            <label class="he-cta-label">Primary Button</label>
            <div class="form-group">
              <input type="text" class="form-input" id="he-cta-primary" value="${esc(data.ctaPrimary || 'Get Started')}" placeholder="Button text" />
            </div>
            <div class="form-group">
              <input type="url" class="form-input form-input--sm" id="he-cta-primary-url" value="${esc(data.ctaPrimaryUrl || '')}" placeholder="https://link-url.com" />
            </div>
          </div>
          <div class="he-cta-pair">
            <label class="he-cta-label">Secondary Button</label>
            <div class="form-group">
              <input type="text" class="form-input" id="he-cta-secondary" value="${esc(data.ctaSecondary || 'Learn More')}" placeholder="Button text" />
            </div>
            <div class="form-group">
              <input type="url" class="form-input form-input--sm" id="he-cta-secondary-url" value="${esc(data.ctaSecondaryUrl || '')}" placeholder="https://link-url.com" />
            </div>
          </div>
        </div>
      </div>

      <div class="vb-edit-panel__actions">
        <button type="button" class="btn btn--primary btn--sm" id="he-save-btn">${ICONS.save} Save</button>
        <button type="button" class="btn btn--ghost btn--sm" id="edit-panel-done">Done</button>
      </div>
    </div>`;
}

/**
 * Wire up all interactivity for the Hero custom edit panel.
 */
function initHeroEditPanel(blockId) {
  const panel = document.getElementById('hero-edit-panel');
  if (!panel) return;

  const block = Store.getPageBlocks().find(b => b.id === blockId);
  if (!block) return;

  // Deep-clone data to work with
  let heroData = JSON.parse(JSON.stringify(block.data || {}));

  // ── Init background image upload widget ───────────────────
  initImageUploadWidget('heroBgImage', {
    onComplete: async (result) => {
      // Use the local preview URL immediately for live editing
      heroData.bgImage = result.previewUrl;
      livePreview();
      // Show position controls now that we have an image
      const posSection = document.getElementById('he-position-section');
      if (posSection) posSection.style.display = '';

      try {
        // Convert the processed blob into a File for StorageService.upload()
        const file = new File(
          [result.blob],
          `hero-bg-${Date.now()}.webp`,
          { type: result.blob.type || 'image/webp' }
        );
        const uploaded = await StorageService.upload(file, StorageService.CATEGORIES.SITE);
        heroData.bgImage = uploaded.url;
        showToast('Background image uploaded!', 'success');
        livePreview();
      } catch (err) {
        console.error('Hero bg upload failed:', err);
        showToast(`Upload failed: ${err.message}`, 'error');
        // Reset the widget so user can try again
        heroData.bgImage = '';
        livePreview();
        setWidgetImage('heroBgImage', '');
        // Hide position controls on failure
        const posSection2 = document.getElementById('he-position-section');
        if (posSection2) posSection2.style.display = 'none';
      }
    },
    onRemove: () => {
      heroData.bgImage = '';
      livePreview();
      // Hide position controls when image is removed
      const posSection = document.getElementById('he-position-section');
      if (posSection) posSection.style.display = 'none';
    },
  });

  // ── Image position controls ────────────────────────────────
  const posXSlider = document.getElementById('he-bg-pos-x');
  const posYSlider = document.getElementById('he-bg-pos-y');
  const zoomSlider = document.getElementById('he-bg-zoom');
  const posXVal = document.getElementById('he-bg-pos-x-val');
  const posYVal = document.getElementById('he-bg-pos-y-val');
  const zoomVal = document.getElementById('he-bg-zoom-val');

  function updateImagePosition() {
    heroData.bgPositionX = parseInt(posXSlider?.value || 50, 10);
    heroData.bgPositionY = parseInt(posYSlider?.value || 50, 10);
    heroData.bgZoom = parseInt(zoomSlider?.value || 100, 10);
    if (posXVal) posXVal.textContent = `${heroData.bgPositionX}%`;
    if (posYVal) posYVal.textContent = `${heroData.bgPositionY}%`;
    if (zoomVal) zoomVal.textContent = `${heroData.bgZoom}%`;
    debouncedPreview();
  }

  posXSlider?.addEventListener('input', updateImagePosition);
  posYSlider?.addEventListener('input', updateImagePosition);
  zoomSlider?.addEventListener('input', updateImagePosition);

  document.getElementById('he-pos-reset')?.addEventListener('click', () => {
    if (posXSlider) posXSlider.value = 50;
    if (posYSlider) posYSlider.value = 50;
    if (zoomSlider) zoomSlider.value = 100;
    updateImagePosition();
  });

  // ── Color pickers live sync ────────────────────────────────
  const overlayColorInput = document.getElementById('he-overlay-color');
  const overlayOpacity = document.getElementById('he-overlay-opacity');
  const overlayOpacityVal = document.getElementById('he-overlay-opacity-val');
  const overlayToggle = document.getElementById('he-overlay-toggle');
  const overlayControls = document.getElementById('he-overlay-controls');
  const textColorInput = document.getElementById('he-text-color');
  const overlayHexLabel = document.getElementById('he-overlay-hex');
  const textHexLabel = document.getElementById('he-text-hex');

  function updateOverlayColor() {
    const hex = overlayColorInput?.value || '#0f172a';
    const alpha = (overlayOpacity?.value || 70) / 100;
    heroData.overlayColor = hexAlphaToRgba(hex, alpha);
    if (overlayHexLabel) overlayHexLabel.textContent = hex;
    if (overlayOpacityVal) overlayOpacityVal.textContent = `${Math.round(alpha * 100)}%`;
    updateColorPreview();
    debouncedPreview();
  }

  overlayColorInput?.addEventListener('input', updateOverlayColor);
  overlayOpacity?.addEventListener('input', updateOverlayColor);

  overlayToggle?.addEventListener('change', () => {
    heroData.overlayEnabled = overlayToggle.checked;
    if (overlayControls) {
      overlayControls.style.opacity = overlayToggle.checked ? '1' : '0.5';
      overlayControls.style.pointerEvents = overlayToggle.checked ? 'auto' : 'none';
    }
    updateColorPreview();
    debouncedPreview();
  });

  textColorInput?.addEventListener('input', () => {
    heroData.textColor = textColorInput.value;
    if (textHexLabel) textHexLabel.textContent = textColorInput.value;
    updateColorPreview();
    debouncedPreview();
  });

  function updateColorPreview() {
    const previewEl = document.getElementById('he-color-preview');
    if (!previewEl) return;
    const overlayDiv = previewEl.querySelector('.he-color-preview__overlay');
    const textSpan = previewEl.querySelector('.he-color-preview__text');
    if (heroData.overlayEnabled) {
      if (overlayDiv) overlayDiv.style.background = heroData.overlayColor;
      else {
        const newOverlay = document.createElement('div');
        newOverlay.className = 'he-color-preview__overlay';
        newOverlay.style.background = heroData.overlayColor;
        previewEl.insertBefore(newOverlay, textSpan);
      }
    } else {
      overlayDiv?.remove();
    }
    if (textSpan) textSpan.style.color = heroData.textColor || '#ffffff';
  }

  // ── Text fields live sync ──────────────────────────────────
  const fieldMap = {
    'he-eyebrow': 'eyebrow',
    'he-title': 'title',
    'he-subtitle': 'subtitle',
    'he-cta-primary': 'ctaPrimary',
    'he-cta-secondary': 'ctaSecondary',
    'he-cta-primary-url': 'ctaPrimaryUrl',
    'he-cta-secondary-url': 'ctaSecondaryUrl',
  };

  Object.entries(fieldMap).forEach(([domId, dataKey]) => {
    const el = document.getElementById(domId);
    el?.addEventListener('input', () => {
      heroData[dataKey] = el.value;
      debouncedPreview();
    });
  });

  // ── Save ───────────────────────────────────────────────────
  document.getElementById('he-save-btn')?.addEventListener('click', async () => {
    // Collect all current values
    Object.entries(fieldMap).forEach(([domId, dataKey]) => {
      const el = document.getElementById(domId);
      if (el) heroData[dataKey] = el.value;
    });
    await Store.updatePageBlock(blockId, heroData);
    showToast('Hero block saved!', 'success');
    updatePreviewFromData(blockId, heroData);
  });

  // ── Helpers ────────────────────────────────────────────────
  let _debounce = null;
  function debouncedPreview() {
    clearTimeout(_debounce);
    _debounce = setTimeout(livePreview, 300);
  }

  function livePreview() {
    _registerPendingEdit(blockId, 'hero', heroData);
    updatePreviewFromData(blockId, heroData);
  }

  function updatePreviewFromData(bid, data) {
    const previewEl = document.querySelector(`[data-block-id="${bid}"] .vb-block__preview`);
    if (!previewEl) return;
    previewEl.innerHTML = renderBlockPreview('hero', data);
  }
}

// ── Color Conversion Helpers ────────────────────────────────────

function rgbaToHexAlpha(rgba) {
  if (!rgba || typeof rgba !== 'string') return { hex: '#0f172a', alpha: 0.7 };
  const match = rgba.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)/);
  if (!match) {
    // Maybe it's already hex
    if (rgba.startsWith('#')) return { hex: rgba, alpha: 1 };
    return { hex: '#0f172a', alpha: 0.7 };
  }
  const r = Math.round(parseFloat(match[1]));
  const g = Math.round(parseFloat(match[2]));
  const b = Math.round(parseFloat(match[3]));
  const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
  const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
  return { hex, alpha: a };
}

function hexAlphaToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

// ── Event Binding ───────────────────────────────────────────────

export function initPagesEditor() {
  // ── Preview Toolbar Events ──────────────────────────────────
  document.querySelectorAll('[data-preview-device]').forEach(btn => {
    btn.addEventListener('click', () => setPreviewDevice(btn.dataset.previewDevice));
  });
  document.getElementById('pvt-preview-toggle')?.addEventListener('click', togglePreviewMode);
  document.getElementById('pvt-fullscreen-toggle')?.addEventListener('click', toggleFullscreen);

  // ESC key to exit fullscreen or preview
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (_isFullscreen) { toggleFullscreen(); e.preventDefault(); }
      else if (_isPreviewActive) { togglePreviewMode(); e.preventDefault(); }
    }
  });

  // If in preview mode, skip edit-mode event binding
  if (_isPreviewActive) return;

  // Library toggles
  document.querySelectorAll('[data-lib-toggle]').forEach(h => {
    h.addEventListener('click', () => h.closest('.vb-library__cat').classList.toggle('vb-library__cat--open'));
  });
  document.querySelectorAll('.vb-library__cat').forEach(c => c.classList.add('vb-library__cat--open'));

  // Add block (click)
  document.querySelectorAll('[data-add-block]').forEach(el => {
    el.addEventListener('click', () => handleAddBlock(el.dataset.addBlock));
  });

  // Reorder
  document.querySelectorAll('[data-reorder]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await Store.reorderPageBlock(btn.dataset.reorder, btn.dataset.direction);
      refresh();
    });
  });

  // Delete
  document.querySelectorAll('[data-delete-block]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showModal({
        title: 'Remove Block', message: 'Remove this block from your page?',
        confirmText: 'Remove', confirmClass: 'btn--danger',
        onConfirm: async () => { await Store.removePageBlock(btn.dataset.deleteBlock); showToast('Block removed', 'info'); _editingBlockId = null; refresh(); },
      });
    });
  });

  // Edit block
  document.querySelectorAll('[data-edit-block]').forEach(btn => {
    btn.addEventListener('click', (e) => { e.stopPropagation(); openEditPanel(btn.dataset.editBlock); });
  });

  // Also open edit on double-click on preview
  document.querySelectorAll('.vb-block__preview').forEach(preview => {
    preview.addEventListener('dblclick', () => {
      const blockId = preview.closest('.vb-block').dataset.blockId;
      openEditPanel(blockId);
    });
  });

  initDragDrop();

  // If we were editing, re-open the panel
  if (_editingBlockId) openEditPanel(_editingBlockId);
}

// ── Edit Panel Logic ────────────────────────────────────────────

function openEditPanel(blockId) {
  _editingBlockId = blockId;
  const lib = document.getElementById('vb-sidebar-library');
  const editor = document.getElementById('vb-sidebar-editor');
  if (!lib || !editor) return;

  lib.style.display = 'none';
  editor.style.display = 'block';
  editor.innerHTML = renderEditPanel(blockId);

  // Highlight editing block
  document.querySelectorAll('.vb-block').forEach(b => b.classList.remove('vb-block--editing'));
  const target = document.querySelector(`[data-block-id="${blockId}"]`);
  if (target) { target.classList.add('vb-block--editing'); target.scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  // Back button
  document.getElementById('edit-panel-back')?.addEventListener('click', closeEditPanel);
  document.getElementById('edit-panel-done')?.addEventListener('click', closeEditPanel);

  // ── Custom panel routing ─────────────────────────────────
  const block = Store.getPageBlocks().find(b => b.id === blockId);
  if (block && block.type === 'leadership') {
    initLeadershipEditPanel(blockId);
    return; // Custom panel handles its own events
  }
  if (block && block.type === 'hero') {
    initHeroEditPanel(blockId);
    return; // Custom panel handles its own events
  }
  if (block && block.type === 'imageBanner') {
    initImageBannerEditPanel(blockId);
    return;
  }
  if (block && block.type === 'about') {
    initAboutEditPanel(blockId);
    return;
  }

  // ── Generic field-based panel ────────────────────────────
  const form = document.getElementById('edit-panel-form');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updates = {};
    form.querySelectorAll('[data-field]').forEach(f => {
      updates[f.dataset.field] = f.type === 'number' ? parseInt(f.value, 10) : f.value;
    });
    await Store.updatePageBlock(blockId, updates);
    showToast('Block saved!', 'success');
    updatePreview(blockId);
  });

  // Live preview on input (debounced)
  let debounce = null;
  form?.querySelectorAll('[data-field]').forEach(field => {
    field.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => updatePreview(blockId), 300);
    });
  });
}

function closeEditPanel() {
  _editingBlockId = null;
  const lib = document.getElementById('vb-sidebar-library');
  const editor = document.getElementById('vb-sidebar-editor');
  if (lib) lib.style.display = 'block';
  if (editor) editor.style.display = 'none';
  document.querySelectorAll('.vb-block').forEach(b => b.classList.remove('vb-block--editing'));
}

function updatePreview(blockId) {
  const form = document.getElementById('edit-panel-form');
  const previewEl = document.querySelector(`[data-block-id="${blockId}"] .vb-block__preview`);
  if (!form || !previewEl) return;
  const block = Store.getPageBlocks().find(b => b.id === blockId);
  if (!block) return;
  const liveData = { ...block.data };
  form.querySelectorAll('[data-field]').forEach(f => {
    liveData[f.dataset.field] = f.type === 'number' ? parseInt(f.value, 10) : f.value;
  });
  previewEl.innerHTML = renderBlockPreview(block.type, liveData);
}

// ── Drag & Drop ─────────────────────────────────────────────────

function initDragDrop() {
  const canvas = document.getElementById('vb-canvas');
  if (!canvas) return;

  // Canvas blocks — drag to reorder
  document.querySelectorAll('.vb-block[draggable="true"]').forEach(block => {
    block.addEventListener('dragstart', (e) => {
      _dragBlockId = block.dataset.blockId;
      e.dataTransfer.setData('text/plain', block.dataset.blockId);
      e.dataTransfer.effectAllowed = 'move';
      block.classList.add('vb-block--dragging');
      setTimeout(() => canvas.classList.add('vb-canvas--dragging'), 0);
    });
    block.addEventListener('dragend', () => {
      _dragBlockId = null;
      block.classList.remove('vb-block--dragging');
      canvas.classList.remove('vb-canvas--dragging');
      document.querySelectorAll('.vb-drop-zone--active').forEach(z => z.classList.remove('vb-drop-zone--active'));
    });
  });

  // Library items — drag to add
  document.querySelectorAll('.vb-lib__item[draggable="true"]').forEach(item => {
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('application/block-type', item.dataset.addBlock);
      e.dataTransfer.effectAllowed = 'copy';
      setTimeout(() => canvas.classList.add('vb-canvas--dragging'), 0);
    });
    item.addEventListener('dragend', () => {
      canvas.classList.remove('vb-canvas--dragging');
      document.querySelectorAll('.vb-drop-zone--active').forEach(z => z.classList.remove('vb-drop-zone--active'));
    });
  });

  // Drop zones
  document.querySelectorAll('.vb-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); e.dataTransfer.dropEffect = _dragBlockId ? 'move' : 'copy'; zone.classList.add('vb-drop-zone--active'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('vb-drop-zone--active'));
    zone.addEventListener('drop', async (e) => {
      e.preventDefault();
      zone.classList.remove('vb-drop-zone--active');
      const pos = parseInt(zone.dataset.dropPos, 10);

      // From library
      const newType = e.dataTransfer.getData('application/block-type');
      if (newType) {
        const capacity = Store.canAddPageBlock();
        if (!capacity.allowed) { showBlockLimitModal(capacity); return; }
        const check = Store.canUseBlockType(newType);
        if (!check.available) {
          if (check.reason === 'tier_locked') showTierUpgradeModal(newType);
          else if (check.reason === 'module_inactive') showModuleActivationModal(newType, () => handleAddBlock(newType));
          return;
        }
        await Store.addPageBlock(newType, pos);
        showToast(`${BLOCK_REGISTRY[newType]?.label || 'Block'} added!`, 'success');
        refresh();
        return;
      }

      // Reorder existing
      const draggedId = e.dataTransfer.getData('text/plain');
      if (draggedId) {
        const blocks = Store.getPageBlocks();
        const fromIdx = blocks.findIndex(b => b.id === draggedId);
        if (fromIdx === -1) return;
        const toIdx = pos > fromIdx ? pos - 1 : pos;
        if (fromIdx === toIdx) return;
        // Move block
        const moved = blocks.splice(fromIdx, 1)[0];
        blocks.splice(toIdx, 0, moved);
        blocks.forEach((b, i) => b.order = i);
        await Store.updatePage('blocks', blocks);
        refresh();
      }
    });
  });
}

// ── Helpers ──────────────────────────────────────────────────────

async function handleAddBlock(blockType) {
  const capacity = Store.canAddPageBlock();
  if (!capacity.allowed) { showBlockLimitModal(capacity); return; }
  const check = Store.canUseBlockType(blockType);
  if (!check.available) {
    if (check.reason === 'tier_locked') showTierUpgradeModal(blockType);
    else if (check.reason === 'module_inactive') showModuleActivationModal(blockType, () => handleAddBlock(blockType));
    return;
  }
  await Store.addPageBlock(blockType);
  showToast(`${BLOCK_REGISTRY[blockType]?.label || 'Block'} added!`, 'success');
  refresh();
}

function refresh() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  const inner = mc.querySelector('.main-content__inner');
  if (inner) {
    inner.innerHTML = renderPagesEditor();
  } else {
    mc.innerHTML = `<div class="main-content__inner">${renderPagesEditor()}</div>`;
  }
  initPagesEditor();
}

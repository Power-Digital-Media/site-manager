/**
 * Blog Page — Post list, editor, and management
 */

import { Store, CHAR_LIMITS } from '../store.js';
import { TIER_CONFIG } from '../constants.js';
import { showToast } from '../components/toast.js';
import { showModal, closeModal } from '../components/modal.js';
import { renderContextualAiPanel, initContextualAiPanel, renderCreditsBanner } from '../components/contextual-ai-panel.js';
import { createImageUploadWidget, initImageUploadWidget, setWidgetImage } from '../components/image-upload-widget.js';

let currentView = 'list'; // 'list' | 'editor'
let editingPostId = null;
let currentFilter = 'all';
let pendingFeaturedImage = null; // Holds the processed blob from the widget

function getStatusBadge(status) {
  const map = {
    published: '<span class="status-badge status-badge--live">✅ Published</span>',
    draft: '<span class="status-badge status-badge--draft">📝 Draft</span>',
    scheduled: '<span class="status-badge status-badge--scheduled">📅 Scheduled</span>',
  };
  return map[status] || '';
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function charCounter(current, max, id) {
  const pct = (current / max) * 100;
  const cls = pct > 90 ? 'char-counter--danger' : pct > 75 ? 'char-counter--warn' : '';
  return `<span class="char-counter ${cls}" id="${id}">${current}/${max}</span>`;
}

function renderBlogList() {
  const posts = Store.getBlogPosts(currentFilter);
  const blog = Store.getBlog();
  const stats = Store.getStats();
  const integration = Store.getIntegrationSettings();
  const hasLiveConnection = !!(integration.deployHookUrl && integration.lastDeployAt);

  const filterBtns = ['all', 'published', 'draft', 'scheduled'].map(f => 
    `<button class="filter-btn ${currentFilter === f ? 'filter-btn--active' : ''}" data-filter="${f}">
      ${f === 'all' ? `All (${stats.blogPosts})` : 
        f === 'published' ? `Published (${stats.blogPostsPublished})` : 
        f === 'draft' ? `Drafts (${stats.blogPostsDraft})` : 
        'Scheduled'}
    </button>`
  ).join('');

  const postRows = posts.length === 0 
    ? `<div class="empty-state">
        <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></div>
        <h3>No posts yet</h3>
        <p>Create your first blog post to get started.</p>
       </div>`
    : posts.map(post => `
      <div class="blog-row" data-id="${post.id}">
        <div class="blog-row__image">
          ${post.featuredImage 
            ? `<img src="${post.featuredImage}" alt="" />`
            : `<div class="blog-row__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`
          }
        </div>
        <div class="blog-row__info">
          <h3 class="blog-row__title">${post.title}</h3>
          <p class="blog-row__meta">${post.category} · ${post.wordCount} words</p>
        </div>
        <div class="blog-row__status">
          ${getStatusBadge(post.status)}
          ${post.status === 'published' && hasLiveConnection ? '<span class="status-badge status-badge--synced" title="Live on site">🌐 Live</span>' : ''}
        </div>
        <div class="blog-row__date">${formatDate(post.publishDate || post.createdAt)}</div>
        <div class="blog-row__actions">
          <button class="btn-icon" data-action="edit-post" data-id="${post.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon--danger" data-action="delete-post" data-id="${post.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

  const cap = Store.canAddToModule('blog');
  const limitLabel = cap.limit === Infinity ? '' : ` · ${cap.current}/${cap.limit} on ${cap.tierLabel}`;

  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>Blog</h2>
        <p class="page-header__subtitle">${stats.blogPostsPublished} published · ${stats.blogPostsDraft} drafts${limitLabel}</p>
      </div>
      <button class="btn btn--primary" id="newPostBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Post
      </button>
    </div>

    <div class="filter-bar">${filterBtns}</div>

    <div class="blog-list">${postRows}</div>
  `;
}

function renderPostEditor(post = null) {
  const blog = Store.getBlog();
  const team = Store.getTeam();
  const tier = Store.getTier();
  const isNew = !post;
  
  const title = post?.title || '';
  const excerpt = post?.excerpt || '';
  const body = post?.body || '';
  const category = post?.category || blog.categories[0] || '';
  const status = post?.status || 'draft';
  const author = post?.author || Store.getAuth().name;
  const publishDate = post?.publishDate || new Date().toISOString().split('T')[0];

  return `
    <div class="editor-page">
      <div class="editor-topbar">
        <button class="btn btn--ghost" id="backToListBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Blog
        </button>
        <div class="editor-topbar__actions">
          <button class="btn btn--outline" id="previewPostBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Preview
          </button>
        </div>
      </div>

      <h2 class="editor-page__title">${isNew ? '📝 New Blog Post' : '✏️ Edit Post'}</h2>

      ${renderContextualAiPanel(['blogDraft', 'blogFull', 'seo', 'schema', 'llmsTxt', 'socialPosts'])}

      <div class="editor-form">
        <div class="form-group">
          <label class="form-label">Title <span class="required">*</span></label>
          <div class="form-input-wrap">
            <input type="text" id="postTitle" class="form-input" value="${title}" maxlength="${CHAR_LIMITS.postTitle}" placeholder="Enter your post title..." />
            ${charCounter(title.length, CHAR_LIMITS.postTitle, 'titleCounter')}
          </div>
          <p class="form-hint" id="postSlug">Slug: /blog/${post?.slug || 'auto-generated-from-title'}</p>
        </div>

        <div class="form-group">
          <label class="form-label">Excerpt <span class="required">*</span></label>
          <div class="form-input-wrap">
            <textarea id="postExcerpt" class="form-input form-input--textarea" maxlength="${CHAR_LIMITS.postExcerpt}" rows="3" placeholder="Brief description for post cards and SEO...">${excerpt}</textarea>
            ${charCounter(excerpt.length, CHAR_LIMITS.postExcerpt, 'excerptCounter')}
          </div>
          <p class="form-hint">Appears in post cards, search results, and social previews.</p>
        </div>

        ${createImageUploadWidget({ id: 'blogFeatured', slot: 'blogFeatured', currentUrl: post?.featuredImage || '', label: 'Featured Image', required: true })}

        <div class="form-row">
          <div class="form-group form-group--half">
            <label class="form-label">Category <span class="required">*</span></label>
            <select id="postCategory" class="form-select">
              ${blog.categories.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group form-group--half">
            <label class="form-label">Author</label>
            <select id="postAuthor" class="form-select">
              <option value="${Store.getAuth().name}">${Store.getAuth().name}</option>
              ${team.map(t => `<option value="${t.name}" ${t.name === author ? 'selected' : ''}>${t.name} — ${t.title}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Post Body <span class="required">*</span></label>
          <div class="editor-toolbar">
            <button class="toolbar-btn" data-format="bold" title="Bold"><strong>B</strong></button>
            <button class="toolbar-btn" data-format="italic" title="Italic"><em>I</em></button>
            <span class="toolbar-sep"></span>
            <button class="toolbar-btn" data-format="h2" title="Heading 2">H2</button>
            <button class="toolbar-btn" data-format="h3" title="Heading 3">H3</button>
            <span class="toolbar-sep"></span>
            <button class="toolbar-btn" data-format="ul" title="Bullet List">•</button>
            <button class="toolbar-btn" data-format="ol" title="Numbered List">1.</button>
            <button class="toolbar-btn" data-format="quote" title="Block Quote">"</button>
            <button class="toolbar-btn" data-format="link" title="Link">🔗</button>
          </div>
          <div class="form-input-wrap">
            <textarea id="postBody" class="form-input form-input--textarea form-input--body" maxlength="${CHAR_LIMITS.postBody}" rows="14" placeholder="Start writing your post...">${body}</textarea>
            ${charCounter(body.length, CHAR_LIMITS.postBody, 'bodyCounter')}
          </div>
          <p class="form-hint" id="wordCount">${post?.wordCount || 0} words</p>
        </div>

        <div class="form-divider"></div>

        <h3 class="form-section-title">Publish Settings</h3>

        <div class="form-group">
          <label class="form-label">Status</label>
          <div class="radio-group">
            <label class="radio-option">
              <input type="radio" name="postStatus" value="draft" ${status === 'draft' ? 'checked' : ''} />
              <span class="radio-label">📝 Draft — save but don't publish</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="postStatus" value="published" ${status === 'published' ? 'checked' : ''} />
              <span class="radio-label">✅ Published — live immediately</span>
            </label>
            <label class="radio-option">
              <input type="radio" name="postStatus" value="scheduled" ${status === 'scheduled' ? 'checked' : ''} />
              <span class="radio-label">📅 Scheduled — set publish date</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Publish Date</label>
          <input type="date" id="postPublishDate" class="form-input form-input--date" value="${publishDate}" />
        </div>

        <div class="form-actions">
          ${!isNew ? `<button class="btn btn--danger" id="deletePostEditorBtn">🗑️ Delete</button>` : '<div></div>'}
          <div class="form-actions__right">
            <button class="btn btn--outline" id="saveDraftBtn">Save Draft</button>
            <button class="btn btn--primary" id="publishPostBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              ${isNew ? 'Publish Post' : 'Update Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderBlog() {
  if (currentView === 'editor') {
    const post = editingPostId ? Store.getBlogPost(editingPostId) : null;
    return renderPostEditor(post);
  }
  return renderBlogList();
}

export function initBlog(rerender) {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      rerender();
    });
  });

  // New post button
  const newPostBtn = document.getElementById('newPostBtn');
  if (newPostBtn) {
    newPostBtn.addEventListener('click', () => {
      const cap = Store.canAddToModule('blog');

      // Hard block — at capacity → send to upgrade page
      if (!cap.allowed) {
        showToast(`You've reached your ${cap.tierLabel} plan limit of ${cap.limit} blog posts.`, 'error');
        window.location.hash = '#/ai-tools';
        return;
      }

      // Soft nudge — approaching limit (last slot)
      if (cap.limit !== Infinity && cap.current >= cap.limit - 1 && cap.nextTier) {
        showModal({
          title: '⚡ Almost at Your Limit',
          message: `You're using ${cap.current}/${cap.limit} blog posts on the ${cap.tierLabel} plan. Upgrade to ${cap.nextTier.label} ($${cap.nextTier.price}/mo) for ${cap.nextTier.limit === Infinity ? 'unlimited' : cap.nextTier.limit} posts.`,
          confirmText: `Upgrade to ${cap.nextTier.label}`,
          confirmClass: 'btn--accent',
          onConfirm: () => {
            window.location.hash = '#/ai-tools';
          }
        });
        // Still allow them to proceed — they can dismiss the modal
      }

      editingPostId = null;
      currentView = 'editor';
      rerender();
    });
  }

  // Edit post
  document.querySelectorAll('[data-action="edit-post"]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingPostId = btn.dataset.id;
      currentView = 'editor';
      rerender();
    });
  });

  // Delete post from list
  document.querySelectorAll('[data-action="delete-post"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const post = Store.getBlogPost(btn.dataset.id);
      showModal({
        title: 'Delete Post',
        message: `Are you sure you want to delete "${post.title}"? This action cannot be undone.`,
        confirmText: 'Delete',
        confirmClass: 'btn--danger',
        onConfirm: () => {
          Store.deleteBlogPost(btn.dataset.id);
          showToast('Post deleted', 'success');
          closeModal();
          rerender();
        }
      });
    });
  });

  // Back to list
  const backBtn = document.getElementById('backToListBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentView = 'list';
      editingPostId = null;
      rerender();
    });
  }

  // ── Featured Image Widget ─────────────────────────────────────
  pendingFeaturedImage = null;
  initImageUploadWidget('blogFeatured', {
    onComplete: (result) => {
      pendingFeaturedImage = result;
    },
    onRemove: () => {
      pendingFeaturedImage = null;
    },
    onError: (err) => {
      showToast(err.message, 'error');
    },
  });
  // If editing an existing post, load its featured image into the widget
  if (editingPostId) {
    const post = Store.getBlogPost(editingPostId);
    if (post?.featuredImage) {
      setWidgetImage('blogFeatured', post.featuredImage);
    }
  }

  // Contextual AI panel event wiring — with blog-specific context + result injection
  initContextualAiPanel(rerender, {
    contextGatherer: () => ({
      title:    document.getElementById('postTitle')?.value?.trim() || '',
      excerpt:  document.getElementById('postExcerpt')?.value?.trim() || '',
      body:     document.getElementById('postBody')?.value?.trim() || '',
      category: document.getElementById('postCategory')?.value || '',
      author:   document.getElementById('postAuthor')?.value || '',
    }),
    resultHandler: (actionKey, result) => {
      // For blog draft / full blog — inject directly into editor fields
      if (actionKey === 'blogDraft' || actionKey === 'blogFull') {
        if (result.title) {
          const el = document.getElementById('postTitle');
          if (el) { el.value = result.title; el.dispatchEvent(new Event('input')); }
        }
        if (result.excerpt) {
          const el = document.getElementById('postExcerpt');
          if (el) { el.value = result.excerpt; el.dispatchEvent(new Event('input')); }
        }
        if (result.body) {
          const el = document.getElementById('postBody');
          if (el) { el.value = result.body; el.dispatchEvent(new Event('input')); }
        }
        // Still show the modal so they can see SEO / schema / llmsTxt if present
        return false;
      }
      // For SEO — inject the meta description into the excerpt if it's empty
      if (actionKey === 'seo' && result.metaDescription) {
        const excerptEl = document.getElementById('postExcerpt');
        if (excerptEl && !excerptEl.value.trim()) {
          excerptEl.value = result.metaDescription;
          excerptEl.dispatchEvent(new Event('input'));
        }
        return false; // also show the modal
      }
      // Everything else (schema, llmsTxt, socialPosts, keywords) → show modal
      return false;
    },
  });

  // Character counters
  initCharCounter('postTitle', 'titleCounter', CHAR_LIMITS.postTitle);
  initCharCounter('postExcerpt', 'excerptCounter', CHAR_LIMITS.postExcerpt);

  const bodyEl = document.getElementById('postBody');
  const bodyCounter = document.getElementById('bodyCounter');
  const wordCountEl = document.getElementById('wordCount');
  if (bodyEl && bodyCounter) {
    bodyEl.addEventListener('input', () => {
      updateCharCounter(bodyEl, bodyCounter, CHAR_LIMITS.postBody);
      if (wordCountEl) {
        const wc = bodyEl.value.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCountEl.textContent = `${wc} words`;
      }
    });
  }

  // Slug auto-gen
  const titleEl = document.getElementById('postTitle');
  const slugEl = document.getElementById('postSlug');
  if (titleEl && slugEl) {
    titleEl.addEventListener('input', () => {
      const slug = titleEl.value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').slice(0, 80);
      slugEl.textContent = `Slug: /blog/${slug || 'auto-generated-from-title'}`;
    });
  }

  // Save / Publish
  const saveDraftBtn = document.getElementById('saveDraftBtn');
  if (saveDraftBtn) {
    saveDraftBtn.addEventListener('click', () => savePost('draft', rerender));
  }

  const publishBtn = document.getElementById('publishPostBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      const status = document.querySelector('input[name="postStatus"]:checked')?.value || 'published';
      savePost(status, rerender);
    });
  }

  // Delete from editor
  const deleteEditorBtn = document.getElementById('deletePostEditorBtn');
  if (deleteEditorBtn && editingPostId) {
    deleteEditorBtn.addEventListener('click', () => {
      showModal({
        title: 'Delete Post',
        message: 'Are you sure? This cannot be undone.',
        confirmText: 'Delete',
        confirmClass: 'btn--danger',
        onConfirm: () => {
          Store.deleteBlogPost(editingPostId);
          showToast('Post deleted', 'success');
          closeModal();
          currentView = 'list';
          editingPostId = null;
          rerender();
        }
      });
    });
  }
}

async function savePost(statusOverride, rerender) {
  const title = document.getElementById('postTitle')?.value?.trim();
  const excerpt = document.getElementById('postExcerpt')?.value?.trim();
  const body = document.getElementById('postBody')?.value?.trim();
  const category = document.getElementById('postCategory')?.value;
  const author = document.getElementById('postAuthor')?.value;
  const publishDate = document.getElementById('postPublishDate')?.value;
  const status = statusOverride || 'draft';

  if (!title) { showToast('Title is required', 'error'); return; }
  if (!excerpt && status === 'published') { showToast('Excerpt is required to publish', 'error'); return; }
  if (!body) { showToast('Post body is required', 'error'); return; }

  const postData = { title, excerpt, body, category, author, publishDate, status };

  try {
    if (editingPostId) {
      await Store.updateBlogPost(editingPostId, postData);
      showToast(status === 'published' ? 'Post updated & published! 🚀' : 'Draft saved', 'success');
    } else {
      const newPost = await Store.addBlogPost(postData);
      editingPostId = newPost.id;
      showToast(status === 'published' ? 'Post published! 🚀' : 'Draft saved', 'success');
    }
  } catch (err) {
    console.error('Blog: failed to save post', err);
    showToast('Failed to save post. Check console for details.', 'error');
    return;
  }

  // Auto-deploy: trigger the live site build hook if enabled and post is published
  if (status === 'published') {
    const integration = Store.getIntegrationSettings();
    if (integration.autoDeploy && integration.deployHookUrl) {
      // Fire-and-forget — don't block the UI on deploy success/failure
      Store.triggerDeployHook().then(result => {
        showToast(result.message, result.success ? 'success' : 'warning');
      });
    }
  }

  currentView = 'list';
  editingPostId = null;
  rerender();
}

function initCharCounter(inputId, counterId, max) {
  const el = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (el && counter) {
    el.addEventListener('input', () => updateCharCounter(el, counter, max));
  }
}

function updateCharCounter(el, counter, max) {
  const len = el.value.length;
  counter.textContent = `${len}/${max}`;
  counter.className = 'char-counter';
  const pct = (len / max) * 100;
  if (pct > 90) counter.classList.add('char-counter--danger');
  else if (pct > 75) counter.classList.add('char-counter--warn');
}

export function resetBlogView() {
  currentView = 'list';
  editingPostId = null;
  currentFilter = 'all';
}

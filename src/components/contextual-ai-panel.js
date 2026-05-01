/**
 * Contextual AI Panel — Reusable in-editor AI action component
 *
 * Renders relevant AI actions inline on Blog, Product, and other editor pages.
 * Shows two options for each action:
 *   1. "Use 1 Credit" (if the user has remaining credits on a paid tier)
 *   2. "Buy One-Time ($X.XX)" (always visible, triggers Stripe one-time checkout)
 *
 * Features:
 *   - Calls the runAiAction Cloud Function, shows loading state
 *   - Injects results back into the editor via registered callbacks
 *   - Shows a prominent "Buy Credits" banner when credits = 0
 *   - Saves pending action to sessionStorage before Stripe checkout
 *   - Auto-runs the pending action after returning from successful payment
 *
 * Usage:
 *   import { renderContextualAiPanel, initContextualAiPanel } from '../components/contextual-ai-panel.js';
 *   // In render: renderContextualAiPanel(['seo', 'blogDraft', 'schema'])
 *   // In init:   initContextualAiPanel(rerender, { contextGatherer, resultHandler })
 */

import { Store } from '../store.js';
import { AI_ACTION_PRICING, TIER_CONFIG } from '../constants.js';
import { startCheckout } from '../stripe.js';
import { runAiAction, AiCreditError } from '../lib/ai-service.js';
import { showToast } from './toast.js';
import { openModal, closeModal } from './modal.js';

// ─── Icon Map ───────────────────────────────────────────────────
const ACTION_ICONS = {
  seo:         '🔍',
  blogDraft:   '✍️',
  blogFull:    '🚀',
  productDesc: '📦',
  schema:      '{ }',
  llmsTxt:     '🤖',
  socialPosts: '📱',
  keywords:    '🔑',
};

// SessionStorage key for pending AI action after Stripe checkout
const PENDING_ACTION_KEY = 'pdm_pending_ai_action';

// Track which action is currently loading (only one at a time)
let _loadingAction = null;

// Track panel collapse state
let _panelCollapsed = false;

/**
 * Render the zero-credits banner (exported for use in other pages).
 * @returns {string} HTML string
 */
export function renderCreditsBanner() {
  const auth = Store.getAuth();
  const tier = Store.getTier();
  const remaining = auth.aiActionsRemaining ?? 0;

  if (remaining > 0) return '';

  return `
    <div class="ctx-ai-no-credits">
      <div class="ctx-ai-no-credits__info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span><strong>0 AI Credits</strong> — Purchase credits to generate content</span>
      </div>
      <div class="ctx-ai-no-credits__actions">
        <button class="btn btn--accent btn--sm ctx-ai-buy-pack">⚡ Buy 5 Credits — $9.99</button>
        ${tier === 'free' ? '<button class="btn btn--outline btn--sm ctx-ai-upgrade">Upgrade to Pro — $29/mo</button>' : ''}
      </div>
    </div>
  `;
}

/**
 * Render the contextual AI panel HTML.
 *
 * @param {string[]} actionKeys — which AI_ACTION_PRICING keys to show
 * @returns {string} HTML string
 */
export function renderContextualAiPanel(actionKeys = []) {
  const tier = Store.getTier();
  const auth = Store.getAuth();
  const remaining = auth.aiActionsRemaining ?? 0;

  const actionCards = actionKeys
    .filter(key => AI_ACTION_PRICING[key])
    .map(key => {
      const action = AI_ACTION_PRICING[key];
      const icon = ACTION_ICONS[key] || '⚡';
      const hasCreditAccess = remaining > 0;
      const isLoading = _loadingAction === key;

      return `
        <div class="ctx-ai-card ${isLoading ? 'ctx-ai-card--loading' : ''}" data-action-key="${key}">
          <div class="ctx-ai-card__top">
            <span class="ctx-ai-card__icon">${icon}</span>
            <span class="ctx-ai-card__label">${action.label}</span>
          </div>
          <p class="ctx-ai-card__desc">${action.desc}</p>
          <div class="ctx-ai-card__actions">
            ${isLoading ? `
              <div class="ctx-ai-loading">
                <div class="ctx-ai-spinner"></div>
                <span>Generating...</span>
              </div>
            ` : `
              ${hasCreditAccess ? `
                <button class="btn btn--accent btn--xs ctx-ai-use-credit" data-key="${key}">
                  ⚡ Use 1 Credit
                </button>
              ` : ''}
              <button class="btn btn--outline btn--xs ctx-ai-buy" data-key="${key}" data-price="${action.price}">
                💳 Buy — $${action.price.toFixed(2)}
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');

  const creditBadge = remaining > 0
    ? `<span class="ctx-ai-credits">${remaining} credit${remaining !== 1 ? 's' : ''} left</span>`
    : `<span class="ctx-ai-credits ctx-ai-credits--empty">0 credits</span>`;

  const collapseIcon = _panelCollapsed
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>';

  // Zero credits banner (shown prominently above the action grid)
  const zeroCreditsBanner = remaining === 0 ? `
    <div class="ctx-ai-no-credits">
      <div class="ctx-ai-no-credits__info">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        <span><strong>0 AI Credits</strong> — Purchase credits to unlock AI-powered content generation</span>
      </div>
      <div class="ctx-ai-no-credits__actions">
        <button class="btn btn--accent btn--sm ctx-ai-buy-pack">⚡ Buy 5 Credits — $9.99</button>
        ${tier === 'free' ? '<button class="btn btn--outline btn--sm ctx-ai-upgrade">Upgrade to Pro — $29/mo</button>' : ''}
      </div>
    </div>
  ` : '';

  const upgradeHint = tier === 'free' && remaining > 0
    ? `<div class="ctx-ai-upgrade-hint">
         <span>💡 Save up to 80% with</span>
         <button class="btn btn--accent btn--xs ctx-ai-upgrade">AI Pro — $29/mo</button>
       </div>`
    : '';

  return `
    <div class="ctx-ai-panel ctx-ai-panel--prominent">
      <div class="ctx-ai-panel__header" id="ctxAiToggle">
        <div class="ctx-ai-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>AI Content Tools</span>
          ${creditBadge}
        </div>
        <button class="ctx-ai-panel__collapse" title="Toggle panel">
          ${collapseIcon}
        </button>
      </div>
      <div class="ctx-ai-panel__content ${_panelCollapsed ? 'ctx-ai-panel__content--collapsed' : ''}">
        ${zeroCreditsBanner}
        <div class="ctx-ai-panel__body">
          ${actionCards}
        </div>
        ${upgradeHint}
      </div>
    </div>
  `;
}

/**
 * Attach event listeners for the contextual AI panel buttons.
 * Call this inside the page's init function AFTER rerender.
 *
 * @param {Function} rerender — page rerender callback
 * @param {Object} options
 * @param {Function} options.contextGatherer — returns an Object of form context for the AI prompt
 * @param {Function} options.resultHandler — receives (actionKey, resultData) to inject AI output into the editor
 */
export function initContextualAiPanel(rerender, { contextGatherer, resultHandler } = {}) {
  // ── Check for pending AI action after Stripe return ──────────
  checkPendingAction(rerender, contextGatherer, resultHandler);

  // ── Panel collapse toggle ────────────────────────────────────
  const toggleBtn = document.getElementById('ctxAiToggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      _panelCollapsed = !_panelCollapsed;
      if (rerender) rerender();
    });
  }

  // ── "Use 1 Credit" buttons → actually run AI ─────────────────
  document.querySelectorAll('.ctx-ai-use-credit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      await executeAiAction(key, rerender, contextGatherer, resultHandler);
    });
  });

  // ── "Buy One-Time" buttons → save pending action + Stripe ────
  document.querySelectorAll('.ctx-ai-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const action = AI_ACTION_PRICING[key];
      if (!action) return;

      // Save the pending action so we can auto-run it after payment
      savePendingAction(key);

      startCheckout('oneTime', {
        actionKey: key,
        actionLabel: action.label,
        price: action.price,
      });
    });
  });

  // ── "Buy 5 Credits" pack button ──────────────────────────────
  document.querySelectorAll('.ctx-ai-buy-pack').forEach(btn => {
    btn.addEventListener('click', () => {
      startCheckout('creditPack', {
        credits: 5,
        price: 9.99,
      });
    });
  });

  // ── "Upgrade to Pro" nudge ───────────────────────────────────
  document.querySelectorAll('.ctx-ai-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      startCheckout('subscription', { plan: 'pro' });
    });
  });
}

// ─── Pending Action Queue ─────────────────────────────────────

/**
 * Save a pending AI action to sessionStorage before Stripe redirect.
 */
function savePendingAction(actionKey) {
  try {
    sessionStorage.setItem(PENDING_ACTION_KEY, JSON.stringify({
      actionKey,
      timestamp: Date.now(),
      page: window.location.hash,
    }));
  } catch (e) {
    // sessionStorage not available — action won't auto-run, that's OK
    console.warn('Could not save pending AI action:', e);
  }
}

/**
 * Check for a pending AI action after Stripe redirect.
 * If found and URL has ?stripe=success, auto-run the action.
 */
function checkPendingAction(rerender, contextGatherer, resultHandler) {
  try {
    const params = new URLSearchParams(window.location.search);
    const stripeResult = params.get('stripe');

    if (stripeResult !== 'success') return;

    const raw = sessionStorage.getItem(PENDING_ACTION_KEY);
    if (!raw) return;

    const pending = JSON.parse(raw);
    sessionStorage.removeItem(PENDING_ACTION_KEY);

    // Only auto-run if the pending action is less than 30 minutes old
    if (Date.now() - pending.timestamp > 30 * 60 * 1000) return;

    const action = AI_ACTION_PRICING[pending.actionKey];
    if (!action) return;

    // Give Firestore a moment to catch up with webhook credit update
    showToast(`💳 Payment received! Auto-generating ${action.label}...`, 'success', 5000);

    setTimeout(async () => {
      await executeAiAction(pending.actionKey, rerender, contextGatherer, resultHandler);
    }, 2500);

  } catch (e) {
    console.warn('Pending action check failed:', e);
  }
}

/**
 * Execute an AI action: show loading, call the API, handle results.
 */
async function executeAiAction(actionKey, rerender, contextGatherer, resultHandler) {
  const action = AI_ACTION_PRICING[actionKey];
  if (!action) return;

  // Gather context from the current editor
  const context = contextGatherer ? contextGatherer() : {};

  // Show loading state
  _loadingAction = actionKey;
  if (rerender) rerender();

  try {
    showToast(`🧠 Generating ${action.label}...`, 'info', 10000);
    const response = await runAiAction(actionKey, context);

    if (!response.success || !response.result) {
      throw new Error('AI returned an empty result. Please try again.');
    }

    // Handle the result — either inject into the editor or show a modal
    if (resultHandler) {
      const handled = resultHandler(actionKey, response.result);
      // If the handler returns false, it didn't handle it — show the modal
      if (handled === false) {
        showResultModal(actionKey, response.result);
      }
    } else {
      // No handler registered — always show modal
      showResultModal(actionKey, response.result);
    }

    showToast(`✅ ${action.label} complete! (${response.creditsUsed} credit${response.creditsUsed !== 1 ? 's' : ''} used, ${response.creditsRemaining} remaining)`, 'success');

  } catch (err) {
    console.error(`AI action ${actionKey} failed:`, err);

    if (err instanceof AiCreditError) {
      showToast(`Not enough credits. You have ${err.remaining}, but this costs ${err.cost}.`, 'error');
    } else {
      showToast(err.message || 'AI generation failed. Please try again.', 'error');
    }
  } finally {
    _loadingAction = null;
    if (rerender) rerender();
  }
}

// ─── Result Modal ───────────────────────────────────────────────

/**
 * Show AI results in a copyable modal.
 * Used for actions that don't directly inject into a single form field
 * (e.g. socialPosts, schema, llmsTxt, keywords).
 */
function showResultModal(actionKey, result) {
  const action = AI_ACTION_PRICING[actionKey] || { label: actionKey };

  let bodyHtml = '';

  switch (actionKey) {
    case 'seo':
      bodyHtml = renderSeoResult(result);
      break;
    case 'socialPosts':
      bodyHtml = renderSocialPostsResult(result);
      break;
    case 'schema':
      bodyHtml = renderCodeResult('JSON-LD Schema', result.jsonLd);
      break;
    case 'llmsTxt':
      bodyHtml = renderCodeResult('llms.txt', result.llmsTxt);
      break;
    case 'keywords':
      bodyHtml = renderKeywordsResult(result);
      break;
    case 'productDesc':
      bodyHtml = renderCodeResult('Product Description', result.description);
      break;
    case 'blogDraft':
    case 'blogFull':
      bodyHtml = renderBlogResult(result);
      break;
    default:
      bodyHtml = `<pre class="ai-result-code">${JSON.stringify(result, null, 2)}</pre>`;
  }

  openModal({
    title: `✨ ${action.label} — Result`,
    content: `
      <div class="ai-result-modal">
        ${bodyHtml}
        <p class="ai-result-hint">Click any field to copy it to your clipboard.</p>
      </div>
    `,
    size: 'large',
  });

  // Attach copy handlers
  requestAnimationFrame(() => {
    document.querySelectorAll('.ai-result-copyable').forEach(el => {
      el.addEventListener('click', () => {
        const text = el.dataset.copy || el.textContent;
        navigator.clipboard.writeText(text).then(() => {
          showToast('📋 Copied to clipboard!', 'success', 1500);
          el.classList.add('ai-result-copyable--copied');
          setTimeout(() => el.classList.remove('ai-result-copyable--copied'), 1200);
        });
      });
    });
  });
}

function renderSeoResult(result) {
  return `
    <div class="ai-result-field">
      <label>SEO Title</label>
      <div class="ai-result-copyable" data-copy="${escapeHtml(result.seoTitle || '')}">${escapeHtml(result.seoTitle || '—')}</div>
    </div>
    <div class="ai-result-field">
      <label>Meta Description</label>
      <div class="ai-result-copyable" data-copy="${escapeHtml(result.metaDescription || '')}">${escapeHtml(result.metaDescription || '—')}</div>
    </div>
  `;
}

function renderSocialPostsResult(result) {
  const platforms = ['twitter', 'facebook', 'instagram', 'linkedin'];
  const icons = { twitter: '🐦', facebook: '📘', instagram: '📷', linkedin: '💼' };
  return platforms
    .filter(p => result[p])
    .map(p => `
      <div class="ai-result-field">
        <label>${icons[p]} ${p.charAt(0).toUpperCase() + p.slice(1)}</label>
        <div class="ai-result-copyable" data-copy="${escapeHtml(result[p])}">${escapeHtml(result[p])}</div>
      </div>
    `).join('');
}

function renderCodeResult(label, code) {
  const text = typeof code === 'string' ? code : JSON.stringify(code, null, 2);
  return `
    <div class="ai-result-field">
      <label>${label}</label>
      <pre class="ai-result-copyable ai-result-code" data-copy="${escapeHtml(text)}">${escapeHtml(text)}</pre>
    </div>
  `;
}

function renderKeywordsResult(result) {
  const sections = [
    { key: 'primary', label: '🎯 Primary Keywords' },
    { key: 'secondary', label: '📊 Secondary Keywords' },
    { key: 'longTail', label: '🔎 Long-Tail Keywords' },
  ];
  return sections.map(s => {
    const items = result[s.key] || [];
    return `
      <div class="ai-result-field">
        <label>${s.label}</label>
        <div class="ai-result-keywords">
          ${items.map(k => `
            <span class="ai-result-keyword ai-result-copyable" data-copy="${escapeHtml(k.keyword)}">
              ${escapeHtml(k.keyword)} <small>(${k.intent})</small>
            </span>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function renderBlogResult(result) {
  return `
    <div class="ai-result-field">
      <label>Title</label>
      <div class="ai-result-copyable" data-copy="${escapeHtml(result.title || '')}">${escapeHtml(result.title || '—')}</div>
    </div>
    <div class="ai-result-field">
      <label>Excerpt</label>
      <div class="ai-result-copyable" data-copy="${escapeHtml(result.excerpt || '')}">${escapeHtml(result.excerpt || '—')}</div>
    </div>
    <div class="ai-result-field">
      <label>Slug</label>
      <div class="ai-result-copyable" data-copy="${escapeHtml(result.slug || '')}">${escapeHtml(result.slug || '—')}</div>
    </div>
    <div class="ai-result-field">
      <label>Body (Markdown)</label>
      <pre class="ai-result-copyable ai-result-code" data-copy="${escapeHtml(result.body || '')}" style="max-height:300px;overflow:auto">${escapeHtml((result.body || '').slice(0, 2000))}${(result.body || '').length > 2000 ? '\n...(click to copy full text)' : ''}</pre>
    </div>
    ${result.seoTitle ? renderSeoResult(result) : ''}
    ${result.schema ? renderCodeResult('JSON-LD Schema', result.schema) : ''}
    ${result.llmsTxt ? renderCodeResult('llms.txt', result.llmsTxt) : ''}
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Contextual AI Panel — Reusable in-editor AI action component
 *
 * Renders relevant AI actions inline on Blog, Product, and other editor pages.
 * Shows two options for each action:
 *   1. "Use 1 Credit" (if the user has remaining credits on a paid tier)
 *   2. "Buy One-Time ($X.XX)" (always visible, triggers Stripe one-time checkout)
 *
 * Usage:
 *   import { renderContextualAiPanel, initContextualAiPanel } from '../components/contextual-ai-panel.js';
 *   // In render: renderContextualAiPanel(['seo', 'blogDraft', 'schema'])
 *   // In init:   initContextualAiPanel(rerender)
 */

import { Store } from '../store.js';
import { AI_ACTION_PRICING, TIER_CONFIG } from '../constants.js';
import { startCheckout } from '../stripe.js';
import { showToast } from './toast.js';

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
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.free;

  const actionCards = actionKeys
    .filter(key => AI_ACTION_PRICING[key])
    .map(key => {
      const action = AI_ACTION_PRICING[key];
      const icon = ACTION_ICONS[key] || '⚡';
      const hasCreditAccess = tier !== 'free' && remaining > 0;

      return `
        <div class="ctx-ai-card" data-action-key="${key}">
          <div class="ctx-ai-card__top">
            <span class="ctx-ai-card__icon">${icon}</span>
            <span class="ctx-ai-card__label">${action.label}</span>
          </div>
          <p class="ctx-ai-card__desc">${action.desc}</p>
          <div class="ctx-ai-card__actions">
            ${hasCreditAccess ? `
              <button class="btn btn--accent btn--xs ctx-ai-use-credit" data-key="${key}">
                ⚡ Use 1 Credit
              </button>
            ` : ''}
            <button class="btn btn--outline btn--xs ctx-ai-buy" data-key="${key}" data-price="${action.price}">
              💳 Buy — $${action.price.toFixed(2)}
            </button>
          </div>
        </div>
      `;
    }).join('');

  const creditBadge = tier !== 'free'
    ? `<span class="ctx-ai-credits">${remaining} credit${remaining !== 1 ? 's' : ''} left</span>`
    : '';

  const upgradeHint = tier === 'free'
    ? `<div class="ctx-ai-upgrade-hint">
         <span>💡 Save up to 80% with</span>
         <button class="btn btn--accent btn--xs ctx-ai-upgrade">AI Pro — $29/mo</button>
       </div>`
    : '';

  return `
    <div class="ctx-ai-panel">
      <div class="ctx-ai-panel__header">
        <div class="ctx-ai-panel__title">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          <span>AI Tools</span>
          ${creditBadge}
        </div>
      </div>
      <div class="ctx-ai-panel__body">
        ${actionCards}
      </div>
      ${upgradeHint}
    </div>
  `;
}

/**
 * Attach event listeners for the contextual AI panel buttons.
 * Call this inside the page's init function AFTER rerender.
 *
 * @param {Function} rerender — page rerender callback
 */
export function initContextualAiPanel(rerender) {
  // "Use 1 Credit" buttons
  document.querySelectorAll('.ctx-ai-use-credit').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const action = AI_ACTION_PRICING[key];
      if (!action) return;

      try {
        await Store.deductAiCredits(1);
        showToast(`✅ ${action.label} — credit used! Running action...`, 'success');
        // TODO: hook into actual AI pipeline when ready
        if (rerender) rerender();
      } catch (err) {
        showToast(err.message || 'Not enough credits.', 'error');
      }
    });
  });

  // "Buy One-Time" buttons → Stripe checkout
  document.querySelectorAll('.ctx-ai-buy').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      const action = AI_ACTION_PRICING[key];
      if (!action) return;

      startCheckout('oneTime', {
        actionKey: key,
        actionLabel: action.label,
        price: action.price,
      });
    });
  });

  // "AI Pro — $29/mo" upgrade nudge
  document.querySelectorAll('.ctx-ai-upgrade').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.hash = '#/ai-tools';
    });
  });
}

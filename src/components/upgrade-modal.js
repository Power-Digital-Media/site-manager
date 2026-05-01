/**
 * Upgrade Modal — Cross-Sell & Upsell Prompt Component
 * 
 * Three variants:
 * 1. tier_upgrade  — User clicked a premium block locked behind a higher tier
 * 2. block_limit   — User hit the max block count for their plan
 * 3. module_inactive — User clicked a module block whose module isn't activated
 */

import { openModal, closeModal } from './modal.js';
import { Store } from '../store.js';
import { TIER_CONFIG, BLOCK_LIMITS, BLOCK_REGISTRY, MODULE_DEFINITIONS } from '../constants.js';

// ── SVG Icons ────────────────────────────────────────────────
const icons = {
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><path d="M12 22v-5"/><path d="M9 8V1h6v7"/><path d="M7 8h10a2 2 0 0 1 2 2v2a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4v-2a2 2 0 0 1 2-2z"/></svg>',
  blocks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="48" height="48"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
};

/**
 * Show a tier upgrade modal.
 * @param {string} blockType — The premium block the user tried to add.
 */
export function showTierUpgradeModal(blockType) {
  const blockDef = BLOCK_REGISTRY[blockType];
  const currentTier = Store.getTier();
  const requiredTier = blockDef?.minTier || 'pro';
  const requiredConfig = TIER_CONFIG[requiredTier] || TIER_CONFIG.pro;
  const currentConfig = TIER_CONFIG[currentTier] || TIER_CONFIG.free;

  openModal({
    title: 'Upgrade to Unlock',
    size: 'small',
    content: `
      <div class="upgrade-modal">
        <div class="upgrade-modal__icon upgrade-modal__icon--tier">
          ${icons.lock}
        </div>
        <h3 class="upgrade-modal__headline">Unlock ${blockDef?.label || 'Premium Block'}</h3>
        <p class="upgrade-modal__subtext">
          The <strong>${blockDef?.label}</strong> block requires the <strong>${requiredConfig.label}</strong> plan or higher.
        </p>
        <div class="upgrade-modal__comparison">
          <div class="upgrade-modal__plan upgrade-modal__plan--current">
            <span class="upgrade-modal__plan-badge">Current</span>
            <strong>${currentConfig.label}</strong>
            <span class="upgrade-modal__plan-price">$${currentConfig.price || 0}/mo</span>
          </div>
          <div class="upgrade-modal__arrow">→</div>
          <div class="upgrade-modal__plan upgrade-modal__plan--target">
            <span class="upgrade-modal__plan-badge upgrade-modal__plan-badge--glow">Recommended</span>
            <strong>${requiredConfig.label}</strong>
            <span class="upgrade-modal__plan-price">$${requiredConfig.price || 0}/mo</span>
          </div>
        </div>
        <button class="btn btn--upgrade" id="upgrade-cta">
          ${icons.rocket}
          Upgrade to ${requiredConfig.label}
        </button>
        <button class="btn btn--ghost btn--sm" id="upgrade-dismiss">Maybe Later</button>
      </div>
    `,
  });

  _bindDismiss();
  _bindUpgradeCTA();
}

/**
 * Show a block limit modal.
 * @param {{ current, limit, nextTier }} capacity — from Store.canAddPageBlock()
 */
export function showBlockLimitModal(capacity) {
  const nextLabel = capacity.nextTier?.label || 'a higher plan';
  const nextLimit = capacity.nextTier?.limit;
  const nextPrice = capacity.nextTier?.price;

  openModal({
    title: 'Block Limit Reached',
    size: 'small',
    content: `
      <div class="upgrade-modal">
        <div class="upgrade-modal__icon upgrade-modal__icon--limit">
          ${icons.blocks}
        </div>
        <h3 class="upgrade-modal__headline">You've used all your blocks</h3>
        <p class="upgrade-modal__subtext">
          Your <strong>${capacity.tierLabel}</strong> plan includes <strong>${capacity.limit}</strong> blocks per page.
          You've used <strong>${capacity.current}/${capacity.limit}</strong>.
        </p>
        <div class="upgrade-modal__meter">
          <div class="upgrade-modal__meter-fill" style="width: 100%"></div>
        </div>
        ${capacity.nextTier ? `
          <p class="upgrade-modal__upsell">
            Upgrade to <strong>${nextLabel}</strong> for up to <strong>${nextLimit === Infinity ? 'unlimited' : nextLimit}</strong> blocks
            ${nextPrice ? `— just <strong>$${nextPrice}/mo</strong>` : ''}
          </p>
          <button class="btn btn--upgrade" id="upgrade-cta">
            ${icons.rocket}
            Upgrade to ${nextLabel}
          </button>
        ` : `
          <p class="upgrade-modal__upsell">You're on the highest plan! Remove a block to add a new one.</p>
        `}
        <button class="btn btn--ghost btn--sm" id="upgrade-dismiss">Got It</button>
      </div>
    `,
  });

  _bindDismiss();
  if (capacity.nextTier) _bindUpgradeCTA();
}

/**
 * Show a module activation prompt.
 * @param {string} blockType — The module block the user tried to add.
 * @param {Function} onActivate — Callback to activate the module and refresh UI.
 */
export function showModuleActivationModal(blockType, onActivate) {
  const blockDef = BLOCK_REGISTRY[blockType];
  const moduleDef = MODULE_DEFINITIONS[blockDef?.linkedModule] || {};

  openModal({
    title: 'Activate Module',
    size: 'small',
    content: `
      <div class="upgrade-modal">
        <div class="upgrade-modal__icon upgrade-modal__icon--module">
          ${icons.plug}
        </div>
        <h3 class="upgrade-modal__headline">Enable ${moduleDef.label || blockDef?.linkedModule}</h3>
        <p class="upgrade-modal__subtext">
          The <strong>${blockDef?.label}</strong> block pulls live data from your <strong>${moduleDef.label || blockDef?.linkedModule}</strong> module.
          Activate it first to start using this block.
        </p>
        <p class="upgrade-modal__benefit">
          ${moduleDef.description || 'This module adds a new content section to your site.'}
        </p>
        <button class="btn btn--primary" id="activate-module-cta">
          ${icons.plug}
          Activate ${moduleDef.label || 'Module'}
        </button>
        <button class="btn btn--ghost btn--sm" id="upgrade-dismiss">Not Now</button>
      </div>
    `,
  });

  _bindDismiss();
  
  const activateBtn = document.getElementById('activate-module-cta');
  if (activateBtn) {
    activateBtn.addEventListener('click', async () => {
      activateBtn.disabled = true;
      activateBtn.textContent = 'Activating...';
      try {
        await Store.activateModule(blockDef.linkedModule);
        closeModal();
        if (onActivate) onActivate(blockDef.linkedModule);
      } catch (err) {
        activateBtn.disabled = false;
        activateBtn.textContent = 'Try Again';
        console.error('Module activation failed:', err);
      }
    });
  }
}

// ── Private Helpers ─────────────────────────────────────────────

function _bindDismiss() {
  const dismissBtn = document.getElementById('upgrade-dismiss');
  if (dismissBtn) dismissBtn.addEventListener('click', closeModal);
}

function _bindUpgradeCTA() {
  const ctaBtn = document.getElementById('upgrade-cta');
  if (ctaBtn) {
    ctaBtn.addEventListener('click', () => {
      // TODO: Hook into Stripe checkout or plan management page
      closeModal();
      // For now, navigate to settings where billing will eventually live
      window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'settings' } }));
    });
  }
}

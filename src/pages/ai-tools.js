/**
 * AI Tools Page — Freemium model with 3 tiers
 * Free: 5 actions/mo (flash model), Pro: 30 actions/mo, Business: 200 actions/mo
 * 
 * Wired to Stripe Checkout for:
 * - Subscription upgrades (Pro/Business)
 * - One-time AI action purchases
 * - Premium image generation purchases
 */

import { Store } from '../store.js';
import { TIER_CONFIG, IMAGE_GEN_PRICING, AI_ACTION_PRICING } from '../constants.js';
import { showToast } from '../components/toast.js';
import { startCheckout, openPortal } from '../stripe.js';

export function renderAiTools() {
  const tier = Store.getTier();
  const auth = Store.getAuth();
  return renderAiDashboard(tier, auth);
}

// ── Shared: Usage Bar ───────────────────────────────────────────
function usageBar(remaining, total) {
  const used = total - remaining;
  const pct = total > 0 ? Math.round((remaining / total) * 100) : 0;
  const color = pct <= 20 ? 'var(--color-danger)' : pct <= 50 ? 'var(--color-warning, #f59e0b)' : 'var(--color-accent)';

  return `
    <div class="ai-status-bar">
      <div class="ai-status-bar__label">
        <span>Actions This Month</span>
        <span>${remaining} / ${total} remaining</span>
      </div>
      <div class="ai-status-bar__track">
        <div class="ai-status-bar__fill" style="width: ${pct}%; background: ${color}"></div>
      </div>
      ${pct <= 20 ? `<p class="ai-status-bar__warn">⚠️ Running low — <a href="#" class="ai-upgrade-link">Upgrade for more actions</a></p>` : ''}
    </div>
  `;
}

// ── Shared: Tool Card ───────────────────────────────────────────
// Every tool is available to every tier. The difference:
// - Has credits → "Use 1 Credit" button
// - No credits  → "Pay $X.XX" one-time button + upgrade nudge
function toolCard(icon, title, desc, creditBtnLabel, creditBtnId, opts = {}) {
  const { disabled = false, pricingKey = null, hasCredits = true } = opts;
  const pricing = pricingKey ? AI_ACTION_PRICING[pricingKey] : null;

  // Primary action: use a plan credit (if they have any)
  const creditBtn = hasCredits && !disabled
    ? `<button class="btn btn--accent btn--sm" id="${creditBtnId}">✨ ${creditBtnLabel}</button>`
    : '';

  // Secondary action: pay one-time (always available)
  const oneTimeBtn = pricing
    ? `<button class="btn btn--outline btn--sm ai-buy-btn" data-action="${pricingKey}" data-price="${pricing.price}" data-label="${pricing.label}">
        💳 One-time · $${pricing.price.toFixed(2)}
      </button>`
    : '';

  // Nudge text when they're out of credits
  const outOfCredits = !hasCredits && pricing
    ? `<p class="ai-tool-card__nudge">Out of credits? <a href="#" class="ai-upgrade-link">Upgrade your plan</a> or pay per use below.</p>`
    : '';

  return `
    <div class="ai-tool-card">
      <div class="ai-tool-card__icon">${icon}</div>
      <h3>${title}</h3>
      <p>${desc}</p>
      ${outOfCredits}
      <div class="ai-tool-card__actions">
        ${creditBtn}
        ${oneTimeBtn}
      </div>
    </div>
  `;
}

// ── Image Generation Card (all tiers) ───────────────────────────
function imageGenCard(tier, noCredits) {
  const hasPremium = tier === 'pro' || tier === 'business';
  const basicModels = IMAGE_GEN_PRICING.basic.models;
  const premiumModels = IMAGE_GEN_PRICING.premium.models;

  return `
    <div class="ai-tool-card ai-tool-card--wide">
      <div class="ai-tool-card__icon">🎨</div>
      <h3>Image Generation</h3>
      <p>Generate thumbnails, hero images, and social graphics with AI.</p>

      <div class="ai-imggen">
        <div class="ai-imggen__section">
          <h4 class="ai-imggen__tier-label">Free Models</h4>
          ${Object.entries(basicModels).map(([key, m]) => `
            <label class="ai-imggen__model">
              <input type="radio" name="imgModel" value="${key}" checked />
              <span class="ai-imggen__model-info">
                <strong>${m.label}</strong>
                <small>${m.desc}</small>
              </span>
              <span class="ai-imggen__price ai-imggen__price--free">Free</span>
            </label>
          `).join('')}
        </div>

        ${hasPremium ? `
          <div class="ai-imggen__section ai-imggen__section--premium">
            <h4 class="ai-imggen__tier-label">Premium Models <span class="ai-imggen__badge">Pay Per Generation</span></h4>
            ${Object.entries(premiumModels).map(([key, m]) => `
              <label class="ai-imggen__model">
                <input type="radio" name="imgModel" value="${key}" />
                <span class="ai-imggen__model-info">
                  <strong>${m.label}</strong>
                  <small>${m.desc}</small>
                </span>
                <span class="ai-imggen__price">$${m.price.toFixed(2)}</span>
              </label>
            `).join('')}
          </div>
        ` : `
          <div class="ai-imggen__section ai-imggen__section--locked">
            <h4 class="ai-imggen__tier-label">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              Premium Models
            </h4>
            <p class="ai-imggen__locked-msg">Upgrade to Pro to access <strong>Nano Banana Pro</strong> and <strong>DALL-E 2.0</strong> for stunning, photorealistic image generation.</p>
          </div>
        `}
      </div>

      <button class="btn btn--accent btn--sm" id="aiImageGenBtn" ${noCredits ? 'disabled' : ''}>
        ${noCredits ? 'No Credits' : 'Generate Image'}
      </button>
    </div>
  `;
}

// ── Main Dashboard (all tiers) ──────────────────────────────────
function renderAiDashboard(tier, auth) {
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.free;
  const total = cfg.aiActions;
  const remaining = auth.aiActionsRemaining ?? total;
  const hasCredits = remaining > 0;

  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>AI Tools</h2>
        <p class="page-header__subtitle">${cfg.label} plan · ${remaining} action${remaining !== 1 ? 's' : ''} remaining this month</p>
      </div>
      <div class="page-header__right">
        ${tier !== 'business' ? `
          <button class="btn btn--primary btn--sm" id="aiUpgradeHeaderBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            Upgrade Plan
          </button>
        ` : ''}
        ${tier !== 'free' ? `
          <button class="btn btn--outline btn--sm" id="aiManageBillingBtn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
            Manage Billing
          </button>
        ` : ''}
      </div>
    </div>

    ${usageBar(remaining, total)}

    <div class="ai-grid">
      ${toolCard('⚡', 'SEO Optimizer',
        'AI-optimized titles and meta descriptions for any page or blog post.',
        'Use 1 Credit', 'aiSeoBtn',
        { hasCredits, pricingKey: 'seo' }
      )}

      ${toolCard('✨', 'Blog Writer',
        'Generate a complete SEO-optimized blog post draft from a topic or outline.',
        'Use 1 Credit', 'aiBlogBtn',
        { hasCredits, pricingKey: 'blogDraft' }
      )}

      ${toolCard('🚀', 'Full Blog Suite',
        'Complete blog with SEO, AEO, GEO, JSON-LD schema, breadcrumbs, and llms.txt — the works.',
        'Use 3 Credits', 'aiBlogFullBtn',
        { hasCredits, pricingKey: 'blogFull' }
      )}

      ${toolCard('🏷️', 'Product Descriptions',
        'Conversion-optimized product copy with structured data.',
        'Use 1 Credit', 'aiProductBtn',
        { hasCredits, pricingKey: 'productDesc' }
      )}

      ${toolCard('📊', 'JSON-LD Schema',
        'Auto-generate structured data for any page on your site.',
        'Use 1 Credit', 'aiSchemaBtn',
        { hasCredits, pricingKey: 'schema' }
      )}

      ${toolCard('📄', 'llms.txt',
        'Generate an AI-readable site summary so LLMs can discover your content.',
        'Use 1 Credit', 'aiLlmsBtn',
        { hasCredits, pricingKey: 'llmsTxt' }
      )}

      ${toolCard('📱', 'Social Posts',
        'Generate Facebook, Instagram, and Twitter posts from your blog content.',
        'Use 1 Credit', 'aiSocialBtn',
        { hasCredits, pricingKey: 'socialPosts' }
      )}

      ${toolCard('🔍', 'Keyword Research',
        'Discover high-impact keywords for your industry and location.',
        'Use 1 Credit', 'aiKeywordBtn',
        { hasCredits, pricingKey: 'keywords' }
      )}

      ${imageGenCard(tier, !hasCredits)}
    </div>

    ${tier !== 'business' ? renderUpgradeTeaser(tier) : ''}
  `;
}

// ── Upgrade Teaser (shown below tools for Free & Pro) ───────────
function renderUpgradeTeaser(currentTier) {
  const isFree = currentTier === 'free';

  return `
    <div class="ai-upgrade-teaser">
      <div class="ai-upgrade-teaser__glow"></div>
      <div class="ai-upgrade-teaser__content">
        <h3>${isFree ? 'Unlock the full AI toolkit' : 'Need more power?'}</h3>
        <p>${isFree
          ? 'Upgrade to AI Pro for blog drafting, product descriptions, full SEO optimization, and 30 AI actions per month.'
          : 'Upgrade to AI Business for social media generation, competitor keywords, and 200 AI actions per month.'
        }</p>

        <div class="ai-plans ai-plans--inline">
          ${isFree ? `
            <div class="ai-plan ai-plan--compact">
              <div class="ai-plan__badge">Most Popular</div>
              <h4>AI Pro</h4>
              <div class="ai-plan__price"><span class="ai-plan__amount">$29</span>/month</div>
              <ul class="ai-plan__features">
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 30 AI actions/month</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Blog post drafts</li>
                <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Auto JSON-LD + llms.txt</li>
              </ul>
              <button class="btn btn--primary btn--sm" id="teaserProBtn">Upgrade to Pro</button>
            </div>
          ` : ''}

          <div class="ai-plan ai-plan--compact ai-plan--business">
            <div class="ai-plan__badge ai-plan__badge--business">Best Value</div>
            <h4>AI Business</h4>
            <div class="ai-plan__price"><span class="ai-plan__amount">$99</span>/month</div>
            <ul class="ai-plan__features">
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> 200 AI actions/month</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Social media generator</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Competitor keyword analysis</li>
            </ul>
            <button class="btn btn--accent btn--sm" id="teaserBusinessBtn">Upgrade to Business</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Event Bindings ──────────────────────────────────────────────
export function initAiTools(rerender) {

  // ── Upgrade buttons → Stripe subscription checkout ────────────
  ['aiUpgradeHeaderBtn', 'teaserProBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => {
      startCheckout('subscription', { plan: 'pro' });
    });
  });

  ['teaserBusinessBtn'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', () => {
      startCheckout('subscription', { plan: 'business' });
    });
  });

  // ── Manage Billing → Stripe Customer Portal ───────────────────
  const billingBtn = document.getElementById('aiManageBillingBtn');
  if (billingBtn) {
    billingBtn.addEventListener('click', () => openPortal());
  }

  // ── Upgrade links inside usage bar / nudges ───────────────────
  document.querySelectorAll('.ai-upgrade-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      // Default to Pro upgrade
      startCheckout('subscription', { plan: 'pro' });
    });
  });

  // ── AI tool buttons — credit-based (use plan credits) ─────────
  const toolBtns = {
    aiSeoBtn: { name: 'SEO Optimizer', credits: 1 },
    aiBlogBtn: { name: 'Blog Writer', credits: 1 },
    aiBlogFullBtn: { name: 'Full Blog Suite', credits: 3 },
    aiProductBtn: { name: 'Product Descriptions', credits: 1 },
    aiSchemaBtn: { name: 'JSON-LD Schema', credits: 1 },
    aiLlmsBtn: { name: 'llms.txt Generator', credits: 1 },
    aiSocialBtn: { name: 'Social Posts', credits: 1 },
    aiKeywordBtn: { name: 'Keyword Research', credits: 1 },
  };

  Object.entries(toolBtns).forEach(([id, tool]) => {
    const el = document.getElementById(id);
    if (el && !el.disabled) {
      el.addEventListener('click', async () => {
        try {
          // Deduct credits from Firestore
          await Store.deductAiCredits(tool.credits);
          showToast(`${tool.name} — used ${tool.credits} credit${tool.credits > 1 ? 's' : ''}. AI processing coming soon!`, 'success');
          // Re-render to update the usage bar
          if (rerender) rerender();
        } catch (err) {
          showToast(err.message || 'Failed to use credits.', 'error');
        }
      });
    }
  });

  // ── One-time purchase buttons → Stripe one-time checkout ──────
  document.querySelectorAll('.ai-buy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const actionKey = btn.dataset.action;
      const price = btn.dataset.price;
      const label = btn.dataset.label || actionKey;
      startCheckout('oneTime', { actionKey, actionLabel: label, price });
    });
  });

  // ── Image generation button ───────────────────────────────────
  const imgGenBtn = document.getElementById('aiImageGenBtn');
  if (imgGenBtn && !imgGenBtn.disabled) {
    imgGenBtn.addEventListener('click', async () => {
      const selected = document.querySelector('input[name="imgModel"]:checked');
      const modelKey = selected ? selected.value : 'gemini';

      // Check if premium model is selected
      const premiumKeys = Object.keys(IMAGE_GEN_PRICING.premium.models);
      if (premiumKeys.includes(modelKey)) {
        const model = IMAGE_GEN_PRICING.premium.models[modelKey];
        // Premium → Stripe one-time payment
        startCheckout('imageGen', {
          model: model.label,
          price: model.price,
        });
      } else {
        // Free model → deduct 1 credit
        try {
          await Store.deductAiCredits(1);
          const model = IMAGE_GEN_PRICING.basic.models[modelKey];
          showToast(`${model ? model.label : 'Image Gen'} — generating... (AI pipeline coming soon!)`, 'success');
          if (rerender) rerender();
        } catch (err) {
          showToast(err.message || 'Failed to use credits.', 'error');
        }
      }
    });
  }
}

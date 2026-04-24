/**
 * AI Tools Page — Pro/Business tier gated features
 */

import { Store } from '../store.js';
import { showToast } from '../components/toast.js';

export function renderAiTools() {
  const tier = Store.getTier();
  const auth = Store.getAuth();
  
  if (tier === 'free') {
    return renderUpgradePage();
  }
  return renderAiDashboard(tier, auth);
}

function renderUpgradePage() {
  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>AI Tools</h2>
        <p class="page-header__subtitle">Supercharge your content with AI</p>
      </div>
    </div>

    <div class="ai-upgrade">
      <div class="ai-upgrade__hero">
        <div class="ai-upgrade__glow"></div>
        <div class="ai-upgrade__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
        </div>
        <h2>Unlock AI-Powered Content Tools</h2>
        <p>Get SEO optimization, content drafting, and social media generation — all powered by AI and tailored to your site.</p>
      </div>

      <div class="ai-plans">
        <div class="ai-plan">
          <div class="ai-plan__badge">Most Popular</div>
          <h3>AI Pro</h3>
          <div class="ai-plan__price"><span class="ai-plan__amount">$49</span>/month</div>
          <ul class="ai-plan__features">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              50 AI actions/month
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              SEO title & meta optimization
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Blog post draft assistance
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Product description generator
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Auto JSON-LD schema
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Auto llms.txt generation
            </li>
          </ul>
          <button class="btn btn--primary btn--lg" id="selectProBtn">Get AI Pro</button>
        </div>

        <div class="ai-plan ai-plan--business">
          <div class="ai-plan__badge ai-plan__badge--business">Best Value</div>
          <h3>AI Business</h3>
          <div class="ai-plan__price"><span class="ai-plan__amount">$99</span>/month</div>
          <ul class="ai-plan__features">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              200 AI actions/month
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Everything in AI Pro
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Full blog post generation
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Social media post generator
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Competitor keyword analysis
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              Priority support
            </li>
          </ul>
          <button class="btn btn--accent btn--lg" id="selectBusinessBtn">Get AI Business</button>
        </div>
      </div>

      <p class="ai-upgrade__secure">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Secure payment via Stripe · Cancel anytime
      </p>
    </div>
  `;
}

function renderAiDashboard(tier, auth) {
  const remaining = auth.aiActionsRemaining || (tier === 'pro' ? 50 : 200);
  const total = tier === 'pro' ? 50 : 200;
  const pct = Math.round((remaining / total) * 100);

  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>AI Tools</h2>
        <p class="page-header__subtitle">${tier.toUpperCase()} plan · ${remaining} actions remaining</p>
      </div>
    </div>

    <div class="ai-status-bar">
      <div class="ai-status-bar__label">
        <span>Actions This Month</span>
        <span>${remaining}/${total}</span>
      </div>
      <div class="ai-status-bar__track">
        <div class="ai-status-bar__fill" style="width: ${pct}%"></div>
      </div>
    </div>

    <div class="ai-grid">
      <div class="ai-tool-card">
        <div class="ai-tool-card__icon">⚡</div>
        <h3>SEO Optimizer</h3>
        <p>Get AI-optimized titles, meta descriptions, and keywords for any page or blog post.</p>
        <button class="btn btn--accent btn--sm" id="aiSeoBtn">Optimize SEO</button>
      </div>

      <div class="ai-tool-card">
        <div class="ai-tool-card__icon">✨</div>
        <h3>Blog Writer</h3>
        <p>Generate a complete blog post draft from a topic or outline. Edit and refine before publishing.</p>
        <button class="btn btn--accent btn--sm">Draft Blog Post</button>
      </div>

      <div class="ai-tool-card">
        <div class="ai-tool-card__icon">📱</div>
        <h3>Social Posts</h3>
        <p>Generate Facebook, Instagram, and Twitter posts from your blog content.</p>
        ${tier === 'business' 
          ? '<button class="btn btn--accent btn--sm">Generate Social</button>'
          : '<button class="btn btn--outline btn--sm" disabled>Business Plan Only</button>'
        }
      </div>

      <div class="ai-tool-card">
        <div class="ai-tool-card__icon">🏷️</div>
        <h3>Product Descriptions</h3>
        <p>Generate compelling product descriptions optimized for conversion and SEO.</p>
        <button class="btn btn--accent btn--sm">Generate Description</button>
      </div>

      <div class="ai-tool-card">
        <div class="ai-tool-card__icon">🔍</div>
        <h3>Keyword Research</h3>
        <p>Discover high-impact keywords for your industry and location.</p>
        ${tier === 'business'
          ? '<button class="btn btn--accent btn--sm">Research Keywords</button>'
          : '<button class="btn btn--outline btn--sm" disabled>Business Plan Only</button>'
        }
      </div>

      <div class="ai-tool-card">
        <div class="ai-tool-card__icon">📊</div>
        <h3>Schema & llms.txt</h3>
        <p>Automatically generate JSON-LD schema and llms.txt for all your content.</p>
        <button class="btn btn--accent btn--sm">Auto-Generate</button>
      </div>
    </div>
  `;
}

export function initAiTools(rerender) {
  // Tier selection stubs (will wire to Stripe later)
  const proBtn = document.getElementById('selectProBtn');
  if (proBtn) {
    proBtn.addEventListener('click', () => {
      showToast('Stripe checkout will open — coming soon!', 'info');
    });
  }

  const bizBtn = document.getElementById('selectBusinessBtn');
  if (bizBtn) {
    bizBtn.addEventListener('click', () => {
      showToast('Stripe checkout will open — coming soon!', 'info');
    });
  }
}

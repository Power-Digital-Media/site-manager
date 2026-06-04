/**
 * Menu Manager — T'Beaux's Cajun Seafood
 * Lets restaurant clients view and update their live menu prices
 * directly from the portal. Changes write to Firestore instantly
 * and appear on the public website within minutes.
 */

import { Store } from '../store.js';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getApp } from 'firebase/app';
import { showToast } from '../components/toast.js';

let _menuData = null;
let _saving = false;

// ─── Category display config ──────────────────────────────────────
const CATEGORY_META = {
  boils:    { label: 'Seafood Boils & Clusters', emoji: '🦞', color: 'var(--accent-orange)' },
  platters: { label: 'Fried Platters & Baskets', emoji: '🐟', color: 'var(--accent-blue)' },
  classics: { label: 'Signature Cajun Meals',    emoji: '🍲', color: 'var(--accent-green)' },
  sides:    { label: "Boil Fixin's & Sides",     emoji: '🌽', color: 'var(--accent-purple)' },
};

// ─── Render ──────────────────────────────────────────────────────
export function renderMenuManager() {
  const site = Store.getSite();

  if (_menuData) {
    return renderMenuEditor(site);
  }

  return `
    <div class="menu-manager">
      <div class="page-header">
        <div>
          <h2 class="page-header__title">🌶️ Live Menu Manager</h2>
          <p class="page-header__sub">Edit prices and items — changes appear on <strong>${site.domain || 'your website'}</strong> within minutes</p>
        </div>
      </div>
      <div class="menu-manager__loading">
        <div class="spinner spinner--lg"></div>
        <p>Loading live menu data...</p>
      </div>
    </div>
  `;
}

function renderMenuEditor(site) {
  const { menuData, drinksAndCondiments, unavailableItems, lastUpdated } = _menuData;
  const lastUpdatedStr = lastUpdated
    ? new Date(lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Never';

  return `
    <div class="menu-manager">
      <div class="page-header">
        <div>
          <h2 class="page-header__title">🌶️ Live Menu Manager</h2>
          <p class="page-header__sub">Changes appear on <strong>${site.domain || 'your website'}</strong> within minutes · Last updated: <span class="menu-manager__last-updated">${lastUpdatedStr}</span></p>
        </div>
        <div class="page-header__actions">
          <a href="https://${site.domain || 'tbeauxs.com'}/#/menu" target="_blank" class="btn btn--ghost btn--sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            View Live Menu
          </a>
          <button class="btn btn--primary btn--sm" id="saveMenuBtn" ${_saving ? 'disabled' : ''}>
            ${_saving ? '<div class="spinner"></div> Saving...' : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
              Save All Changes
            `}
          </button>
        </div>
      </div>

      <div class="menu-manager__notice">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        <span>Edit any price below, then click <strong>Save All Changes</strong>. Your website will reflect the new prices automatically.</span>
      </div>

      ${Object.entries(menuData).map(([catKey, items]) => {
        const meta = CATEGORY_META[catKey] || { label: catKey, emoji: '🍽️', color: 'var(--accent-blue)' };
        return `
          <div class="menu-manager__category">
            <div class="menu-manager__category-header">
              <span class="menu-manager__category-emoji">${meta.emoji}</span>
              <h3 class="menu-manager__category-title" style="color: ${meta.color}">${meta.label}</h3>
              <div class="menu-manager__category-line"></div>
            </div>
            <div class="menu-manager__items">
              ${items.map((item, itemIdx) => `
                <div class="menu-manager__item" data-cat="${catKey}" data-idx="${itemIdx}">
                  <div class="menu-manager__item-header">
                    <span class="menu-manager__item-emoji">${item.imageEmoji || '🍽️'}</span>
                    <div class="menu-manager__item-info">
                      <span class="menu-manager__item-name">${item.name}</span>
                      ${item.variants ? `<span class="menu-manager__item-variants">${item.variants.length} variants</span>` : ''}
                    </div>
                  </div>
                  ${item.variants ? `
                    <div class="menu-manager__variants">
                      ${item.variants.map((v, vIdx) => `
                        <div class="menu-manager__variant">
                          <div class="menu-manager__variant-left">
                            <span class="menu-manager__variant-name">${v.name}</span>
                            ${v.badge ? `<span class="menu-manager__variant-badge">${v.badge}</span>` : ''}
                          </div>
                          <div class="menu-manager__price-field">
                            <span class="menu-manager__price-prefix">$</span>
                            <input
                              type="text"
                              class="menu-manager__price-input"
                              value="${v.price.replace(/^\$/, '')}"
                              data-cat="${catKey}"
                              data-item="${itemIdx}"
                              data-variant="${vIdx}"
                              data-field="price"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                      `).join('')}
                    </div>
                  ` : `
                    <div class="menu-manager__single-price">
                      <span class="menu-manager__variant-name">Price</span>
                      <div class="menu-manager__price-field">
                        <span class="menu-manager__price-prefix">$</span>
                        <input
                          type="text"
                          class="menu-manager__price-input"
                          value="${(item.price || '').replace(/^\$/, '')}"
                          data-cat="${catKey}"
                          data-item="${itemIdx}"
                          data-field="item-price"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  `}
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }).join('')}

      <!-- Drinks & Condiments -->
      <div class="menu-manager__category">
        <div class="menu-manager__category-header">
          <span class="menu-manager__category-emoji">🥤</span>
          <h3 class="menu-manager__category-title" style="color: var(--accent-blue)">Drinks, Sauces & Extras</h3>
          <div class="menu-manager__category-line"></div>
        </div>
        <div class="menu-manager__items">
          <div class="menu-manager__item">
            <div class="menu-manager__variants">
              ${(drinksAndCondiments || []).map((item, idx) => `
                <div class="menu-manager__variant">
                  <div class="menu-manager__variant-left">
                    <span class="menu-manager__variant-name">${item.name}</span>
                  </div>
                  <div class="menu-manager__price-field">
                    <span class="menu-manager__price-prefix">$</span>
                    <input
                      type="text"
                      class="menu-manager__price-input"
                      value="${item.price.replace(/^\$/, '')}"
                      data-drinks="${idx}"
                      data-field="drink-price"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <div class="menu-manager__save-footer">
        <button class="btn btn--primary" id="saveMenuBtnBottom" ${_saving ? 'disabled' : ''}>
          ${_saving ? '<div class="spinner"></div> Saving...' : `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            Save All Menu Changes
          `}
        </button>
        <p class="menu-manager__save-note">Changes are saved to Firestore and update your live website automatically</p>
      </div>

      <style>
        .menu-manager { display: flex; flex-direction: column; gap: 2rem; }
        .menu-manager__loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: 4rem; color: var(--text-muted); }
        .menu-manager__notice { display: flex; align-items: center; gap: 0.75rem; padding: 0.875rem 1.25rem; background: rgba(59,130,246,0.08); border: 1px solid rgba(59,130,246,0.2); border-radius: 8px; font-size: 0.875rem; color: var(--text-secondary); }
        .menu-manager__last-updated { color: var(--accent-green); font-weight: 600; }
        .menu-manager__category { background: var(--surface-secondary); border: 1px solid var(--border-primary); border-radius: 12px; overflow: hidden; }
        .menu-manager__category-header { display: flex; align-items: center; gap: 1rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-primary); background: var(--surface-primary); }
        .menu-manager__category-emoji { font-size: 1.5rem; }
        .menu-manager__category-title { font-size: 1rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0; }
        .menu-manager__category-line { flex: 1; height: 1px; background: var(--border-primary); }
        .menu-manager__items { display: flex; flex-direction: column; gap: 0; }
        .menu-manager__item { padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-primary); }
        .menu-manager__item:last-child { border-bottom: none; }
        .menu-manager__item-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .menu-manager__item-emoji { font-size: 1.25rem; }
        .menu-manager__item-name { font-weight: 600; font-size: 0.95rem; color: var(--text-primary); display: block; }
        .menu-manager__item-variants { font-size: 0.75rem; color: var(--text-muted); }
        .menu-manager__variants { display: flex; flex-direction: column; gap: 0.5rem; }
        .menu-manager__variant { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--surface-tertiary); border-radius: 8px; gap: 1rem; }
        .menu-manager__variant-left { display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 0; }
        .menu-manager__variant-name { font-size: 0.875rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .menu-manager__variant-badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; background: rgba(212,175,55,0.15); color: #d4af37; border-radius: 4px; white-space: nowrap; }
        .menu-manager__price-field { display: flex; align-items: center; gap: 0.25rem; background: var(--surface-primary); border: 1px solid var(--border-primary); border-radius: 6px; padding: 0.4rem 0.6rem; min-width: 120px; }
        .menu-manager__price-field:focus-within { border-color: var(--accent-blue); box-shadow: 0 0 0 2px rgba(59,130,246,0.15); }
        .menu-manager__price-prefix { font-size: 0.875rem; color: var(--accent-green); font-weight: 600; }
        .menu-manager__price-input { background: transparent; border: none; outline: none; font-size: 0.875rem; color: var(--text-primary); font-weight: 600; width: 90px; text-align: right; font-family: var(--font-mono, monospace); }
        .menu-manager__single-price { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.75rem; background: var(--surface-tertiary); border-radius: 8px; }
        .menu-manager__save-footer { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 2rem 0; border-top: 1px solid var(--border-primary); }
        .menu-manager__save-note { font-size: 0.8rem; color: var(--text-muted); margin: 0; }
        @media (max-width: 640px) {
          .menu-manager__variant { flex-direction: column; align-items: flex-start; }
          .menu-manager__price-field { width: 100%; }
          .menu-manager__price-input { width: 100%; }
        }
      </style>
    </div>
  `;
}

// ─── Init ─────────────────────────────────────────────────────────
export async function initMenuManager(rerender) {
  const site = Store.getSite();
  const siteId = site?.id;

  if (!siteId) {
    showToast('Could not load site data.', 'error');
    return;
  }

  // Fetch menu from Firestore if not cached
  if (!_menuData) {
    try {
      const db = getFirestore(getApp());
      const menuRef = doc(db, 'sites', siteId, 'menuConfig', 'main');
      const snap = await getDoc(menuRef);
      if (snap.exists()) {
        _menuData = snap.data();
      } else {
        showToast('No menu data found. Please contact Power Digital Media.', 'error');
        return;
      }
    } catch (err) {
      console.error('[MenuManager] fetch error:', err);
      showToast('Failed to load menu data.', 'error');
      return;
    }
    // Re-render with data
    rerender();
    return;
  }

  // Wire up price input listeners
  document.querySelectorAll('.menu-manager__price-input').forEach(input => {
    input.addEventListener('change', () => {
      applyInputToData(input);
    });
  });

  // Save buttons
  ['saveMenuBtn', 'saveMenuBtnBottom'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.addEventListener('click', () => saveMenu(site, rerender));
    }
  });
}

function applyInputToData(input) {
  const cat = input.dataset.cat;
  const itemIdx = parseInt(input.dataset.item);
  const variantIdx = parseInt(input.dataset.variant);
  const field = input.dataset.field;
  const drinkIdx = parseInt(input.dataset.drinks);
  const val = '$' + input.value.replace(/^\$/, '');

  if (field === 'price' && !isNaN(variantIdx)) {
    _menuData.menuData[cat][itemIdx].variants[variantIdx].price = val;
  } else if (field === 'item-price') {
    _menuData.menuData[cat][itemIdx].price = val;
  } else if (field === 'drink-price' && !isNaN(drinkIdx)) {
    _menuData.drinksAndCondiments[drinkIdx].price = val;
  }
}

async function saveMenu(site, rerender) {
  if (_saving) return;
  _saving = true;
  rerender();

  try {
    const db = getFirestore(getApp());
    const menuRef = doc(db, 'sites', site.id, 'menuConfig', 'main');
    await setDoc(menuRef, {
      ..._menuData,
      lastUpdated: new Date().toISOString(),
    });
    _menuData.lastUpdated = new Date().toISOString();
    showToast('✅ Menu updated! Changes are live on your website.', 'success');
  } catch (err) {
    console.error('[MenuManager] save error:', err);
    showToast('Failed to save. Please try again.', 'error');
  }

  _saving = false;
  rerender();
}

/** Reset cached data when switching sites */
export function resetMenuManager() {
  _menuData = null;
  _saving = false;
}

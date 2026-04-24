/**
 * Products Page — Product list and editor
 */

import { Store, CHAR_LIMITS } from '../store.js';
import { showToast } from '../components/toast.js';
import { showModal, closeModal } from '../components/modal.js';
import { renderContextualAiPanel, initContextualAiPanel } from '../components/contextual-ai-panel.js';

let currentView = 'list';
let editingProductId = null;
let currentFilter = 'all';

function formatPrice(price) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
}

function getAvailabilityBadge(avail) {
  const map = {
    in_stock: '<span class="status-badge status-badge--live">✅ In Stock</span>',
    out_of_stock: '<span class="status-badge status-badge--draft">❌ Out of Stock</span>',
    coming_soon: '<span class="status-badge status-badge--scheduled">🔜 Coming Soon</span>',
  };
  return map[avail] || '';
}

function charCounter(current, max, id) {
  const pct = (current / max) * 100;
  const cls = pct > 90 ? 'char-counter--danger' : pct > 75 ? 'char-counter--warn' : '';
  return `<span class="char-counter ${cls}" id="${id}">${current}/${max}</span>`;
}

function renderProductList() {
  const products = Store.getProducts(currentFilter);
  const stats = Store.getStats();

  const filterBtns = ['all', 'in_stock', 'out_of_stock', 'featured'].map(f =>
    `<button class="filter-btn ${currentFilter === f ? 'filter-btn--active' : ''}" data-filter="${f}">
      ${f === 'all' ? `All (${stats.products})` :
        f === 'in_stock' ? `In Stock (${stats.productsInStock})` :
        f === 'out_of_stock' ? 'Out of Stock' :
        'Featured'}
    </button>`
  ).join('');

  const rows = products.length === 0
    ? `<div class="empty-state">
        <div class="empty-state__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
        <h3>No products yet</h3>
        <p>Add your first product to get started.</p>
       </div>`
    : products.map(p => `
      <div class="product-row" data-id="${p.id}">
        <div class="product-row__image">
          <div class="blog-row__placeholder"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg></div>
        </div>
        <div class="product-row__info">
          <h3 class="product-row__name">${p.name} ${p.featured ? '⭐' : ''}</h3>
          <p class="product-row__meta">${p.category}</p>
        </div>
        <div class="product-row__price">${p.showPrice ? formatPrice(p.price) : 'Contact'}</div>
        <div class="product-row__status">${getAvailabilityBadge(p.availability)}</div>
        <div class="product-row__actions">
          <button class="btn-icon" data-action="edit-product" data-id="${p.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button class="btn-icon btn-icon--danger" data-action="delete-product" data-id="${p.id}" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    `).join('');

  return `
    <div class="page-header">
      <div class="page-header__left">
        <h2>Products</h2>
        <p class="page-header__subtitle">${stats.products} products · ${stats.productsInStock} in stock</p>
      </div>
      <button class="btn btn--primary" id="newProductBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        New Product
      </button>
    </div>
    <div class="filter-bar">${filterBtns}</div>
    <div class="blog-list">${rows}</div>
  `;
}

function renderProductEditor(product = null) {
  const config = Store.getProductsConfig();
  const tier = Store.getTier();
  const isNew = !product;

  const name = product?.name || '';
  const desc = product?.description || '';
  const price = product?.price || '';
  const category = product?.category || config.categories[0] || '';
  const availability = product?.availability || 'in_stock';
  const featured = product?.featured || false;
  const showPrice = product?.showPrice !== false;
  const extLink = product?.externalLink || '';

  return `
    <div class="editor-page">
      <div class="editor-topbar">
        <button class="btn btn--ghost" id="backToProductListBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Products
        </button>
      </div>

      <h2 class="editor-page__title">${isNew ? '🛍️ New Product' : '✏️ Edit Product'}</h2>

      <div class="editor-form">
        <div class="form-group">
          <label class="form-label">Product Name <span class="required">*</span></label>
          <div class="form-input-wrap">
            <input type="text" id="productName" class="form-input" value="${name}" maxlength="${CHAR_LIMITS.productName}" placeholder="Enter product name..." />
            ${charCounter(name.length, CHAR_LIMITS.productName, 'prodNameCounter')}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-group--half">
            <label class="form-label">Price <span class="required">*</span></label>
            <div class="form-input-wrap form-input-wrap--price">
              <span class="price-prefix">$</span>
              <input type="number" id="productPrice" class="form-input form-input--price" value="${price}" min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <div class="form-group form-group--half">
            <label class="form-label">&nbsp;</label>
            <label class="checkbox-option">
              <input type="checkbox" id="productShowPrice" ${showPrice ? 'checked' : ''} />
              <span>Show price on site</span>
            </label>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Description <span class="required">*</span></label>
          <div class="form-input-wrap">
            <textarea id="productDesc" class="form-input form-input--textarea" maxlength="${CHAR_LIMITS.productDescription}" rows="5" placeholder="Describe your product...">${desc}</textarea>
            ${charCounter(desc.length, CHAR_LIMITS.productDescription, 'prodDescCounter')}
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Product Images (up to 5)</label>
          <div class="image-upload-grid">
            <div class="image-upload-slot image-upload-slot--add">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Add Image</span>
              <span class="image-upload__hint">Min 400px · 1:1 square</span>
            </div>
          </div>
        </div>

        <div class="form-row">
          <div class="form-group form-group--half">
            <label class="form-label">Category <span class="required">*</span></label>
            <select id="productCategory" class="form-select">
              ${config.categories.map(c => `<option value="${c}" ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div class="form-group form-group--half">
            <label class="form-label">Availability</label>
            <select id="productAvailability" class="form-select">
              <option value="in_stock" ${availability === 'in_stock' ? 'selected' : ''}>In Stock</option>
              <option value="out_of_stock" ${availability === 'out_of_stock' ? 'selected' : ''}>Out of Stock</option>
              <option value="coming_soon" ${availability === 'coming_soon' ? 'selected' : ''}>Coming Soon</option>
            </select>
          </div>
        </div>

        <label class="checkbox-option">
          <input type="checkbox" id="productFeatured" ${featured ? 'checked' : ''} />
          <span>⭐ Mark as Featured (highlighted on your site)</span>
        </label>

        <div class="form-group" style="margin-top: 1rem;">
          <label class="form-label">External Link <span class="form-hint-inline">(optional — Amazon, Shopify, etc.)</span></label>
          <input type="url" id="productExtLink" class="form-input" value="${extLink}" placeholder="https://" />
          <p class="form-hint">If set, "Buy Now" links to this URL instead of a contact form.</p>
        </div>

        ${renderContextualAiPanel(['productDesc', 'seo', 'schema'])}

        <div class="form-actions">
          ${!isNew ? `<button class="btn btn--danger" id="deleteProductEditorBtn">🗑️ Delete</button>` : '<div></div>'}
          <div class="form-actions__right">
            <button class="btn btn--outline" id="saveProductDraftBtn">Save</button>
            <button class="btn btn--primary" id="publishProductBtn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
              ${isNew ? 'Add Product' : 'Update Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

export function renderProducts() {
  if (currentView === 'editor') {
    const product = editingProductId ? Store.getProduct(editingProductId) : null;
    return renderProductEditor(product);
  }
  return renderProductList();
}

export function initProducts(rerender) {
  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      currentFilter = btn.dataset.filter;
      rerender();
    });
  });

  // New product
  const newBtn = document.getElementById('newProductBtn');
  if (newBtn) {
    newBtn.addEventListener('click', () => {
      editingProductId = null;
      currentView = 'editor';
      rerender();
    });
  }

  // Edit
  document.querySelectorAll('[data-action="edit-product"]').forEach(btn => {
    btn.addEventListener('click', () => {
      editingProductId = btn.dataset.id;
      currentView = 'editor';
      rerender();
    });
  });

  // Delete from list
  document.querySelectorAll('[data-action="delete-product"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const product = Store.getProduct(btn.dataset.id);
      showModal({
        title: 'Delete Product',
        message: `Delete "${product.name}"? This cannot be undone.`,
        confirmText: 'Delete',
        confirmClass: 'btn--danger',
        onConfirm: () => {
          Store.deleteProduct(btn.dataset.id);
          showToast('Product deleted', 'success');
          closeModal();
          rerender();
        }
      });
    });
  });

  // Back to list
  const backBtn = document.getElementById('backToProductListBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentView = 'list';
      editingProductId = null;
      rerender();
    });
  }

  // Char counters
  initCharCounter('productName', 'prodNameCounter', CHAR_LIMITS.productName);
  initCharCounter('productDesc', 'prodDescCounter', CHAR_LIMITS.productDescription);

  // Save / Publish
  const saveBtn = document.getElementById('saveProductDraftBtn');
  const publishBtn = document.getElementById('publishProductBtn');
  
  const saveProduct = () => {
    const name = document.getElementById('productName')?.value?.trim();
    const description = document.getElementById('productDesc')?.value?.trim();
    const price = parseFloat(document.getElementById('productPrice')?.value) || 0;
    const showPrice = document.getElementById('productShowPrice')?.checked;
    const category = document.getElementById('productCategory')?.value;
    const availability = document.getElementById('productAvailability')?.value;
    const featured = document.getElementById('productFeatured')?.checked;
    const externalLink = document.getElementById('productExtLink')?.value?.trim();

    if (!name) { showToast('Product name is required', 'error'); return; }
    if (!description) { showToast('Description is required', 'error'); return; }

    const data = { name, description, price, showPrice, category, availability, featured, externalLink, images: [] };

    if (editingProductId) {
      Store.updateProduct(editingProductId, data);
      showToast('Product updated! ✅', 'success');
    } else {
      Store.addProduct(data);
      showToast('Product added! 🛍️', 'success');
    }
    currentView = 'list';
    editingProductId = null;
    rerender();
  };

  if (saveBtn) saveBtn.addEventListener('click', saveProduct);
  if (publishBtn) publishBtn.addEventListener('click', saveProduct);

  // Contextual AI panel event wiring
  initContextualAiPanel(rerender);

  // Delete from editor
  const deleteBtn = document.getElementById('deleteProductEditorBtn');
  if (deleteBtn && editingProductId) {
    deleteBtn.addEventListener('click', () => {
      showModal({
        title: 'Delete Product',
        message: 'Are you sure? This cannot be undone.',
        confirmText: 'Delete',
        confirmClass: 'btn--danger',
        onConfirm: () => {
          Store.deleteProduct(editingProductId);
          showToast('Product deleted', 'success');
          closeModal();
          currentView = 'list';
          editingProductId = null;
          rerender();
        }
      });
    });
  }
}

function initCharCounter(inputId, counterId, max) {
  const el = document.getElementById(inputId);
  const counter = document.getElementById(counterId);
  if (el && counter) {
    el.addEventListener('input', () => {
      const len = el.value.length;
      counter.textContent = `${len}/${max}`;
      counter.className = 'char-counter';
      const pct = (len / max) * 100;
      if (pct > 90) counter.classList.add('char-counter--danger');
      else if (pct > 75) counter.classList.add('char-counter--warn');
    });
  }
}

export function resetProductsView() {
  currentView = 'list';
  editingProductId = null;
  currentFilter = 'all';
}

/**
 * Power Digital Media — Site Manager
 * Main Application Entry Point — v3.0
 * 
 * Now powered by Firebase Auth with multi-tenant support.
 * Routes are gated by authentication state and role (admin vs client).
 */

import './style.css';
import './vb-styles.css';
import { Store } from './store.js';
import { onAuthChange, signOut, isAdmin, getUserSiteId, getDisplayName, getCurrentUser } from './auth.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderLogin, initLogin } from './pages/login.js';
import { renderDashboard, initDashboard } from './pages/dashboard.js';
import { renderPagesEditor, initPagesEditor } from './pages/pages-editor.js';
import { renderEvents, initEvents } from './pages/events.js';
import { renderAnnouncements, initAnnouncements } from './pages/announcements.js';
import { renderTeam, initTeam } from './pages/team.js';
import { renderSettings, initSettings } from './pages/settings.js';
import { renderBlog, initBlog, resetBlogView } from './pages/blog.js';
import { renderProducts, initProducts, resetProductsView } from './pages/products.js';
import { renderGallery, initGallery, resetGalleryView } from './pages/gallery.js';
import { renderSubmissions, initSubmissions, resetSubmissionsView } from './pages/submissions.js';
import { renderAiTools, initAiTools } from './pages/ai-tools.js';
import { renderAdmin, initAdmin, resetAdminView } from './pages/admin.js';
import { renderModuleActivationPage, initModuleActivation } from './components/module-activation-card.js';
import { showToast } from './components/toast.js';
import { handleStripeRedirect } from './stripe.js';

// ─── App State ──────────────────────────────────────────────────
let isAuthenticated = false;
let isStoreReady = false;
let currentSiteId = null;

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  pages: 'Page Content',
  blog: 'Blog',
  products: 'Products',
  events: 'Events',
  gallery: 'Gallery',
  announcements: 'Announcements',
  team: 'Team Members',
  submissions: 'Submissions',
  'ai-tools': 'AI Tools',
  settings: 'Settings',
  admin: 'Admin CRM',
};

function getCurrentPage() {
  const hash = window.location.hash.replace('#/', '') || 'dashboard';
  // Allow admin route only for admin users
  if (hash === 'admin' && !isAdmin()) return 'dashboard';
  return PAGE_TITLES[hash] ? hash : 'dashboard';
}

// ─── App Shell ──────────────────────────────────────────────────

function renderApp() {
  const app = document.getElementById('app');
  
  if (!isAuthenticated) {
    app.className = 'app app--login';
    app.innerHTML = renderLogin();
    initLogin();
    return;
  }

  if (!isStoreReady) {
    app.className = 'app app--loading';
    app.innerHTML = `
      <div class="app-loading">
        <div class="app-loading__brand">
          <img src="/images/power-logo.webp" alt="Power Digital Media" />
          <h2>Power Digital Media</h2>
          <p>Loading your dashboard...</p>
        </div>
        <div class="spinner spinner--lg"></div>
      </div>
    `;
    return;
  }

  const page = getCurrentPage();
  const pageTitle = PAGE_TITLES[page];

  app.className = 'app app--dashboard';
  app.innerHTML = `
    ${renderSidebar(page)}
    <div class="main-wrapper">
      ${renderHeader(pageTitle)}
      <main class="main-content" id="mainContent">
        <div class="main-content__inner">
          ${getPageContent(page)}
        </div>
      </main>
    </div>
  `;

  initPageInteractions(page);
  initGlobalInteractions();
}

function getPageContent(page) {
  // For modules that can be toggled, check if they're active
  const toggleableModules = ['blog', 'products', 'events', 'gallery', 'announcements', 'team', 'submissions'];
  
  if (toggleableModules.includes(page) && !Store.isModuleActive(page)) {
    // Module is not active — show activation card
    return renderModuleActivationPage(page);
  }

  switch (page) {
    case 'dashboard': return renderDashboard();
    case 'pages': return renderPagesEditor();
    case 'blog': return renderBlog();
    case 'products': return renderProducts();
    case 'events': return renderEvents();
    case 'gallery': return renderGallery();
    case 'announcements': return renderAnnouncements();
    case 'team': return renderTeam();
    case 'submissions': return renderSubmissions();
    case 'ai-tools': return renderAiTools();
    case 'settings': return renderSettings();
    case 'admin': return renderAdmin();
    default: return renderDashboard();
  }
}

// Admin page rendering is now handled by './pages/admin.js'

function initPageInteractions(page) {
  const rerender = () => renderApp();

  // If this is an inactive module, wire up the activation button
  const toggleableModules = ['blog', 'products', 'events', 'gallery', 'announcements', 'team', 'submissions'];
  if (toggleableModules.includes(page) && !Store.isModuleActive(page)) {
    initModuleActivation(async (moduleId) => {
      try {
        await Store.activateModule(moduleId);
        showToast(`${moduleId.charAt(0).toUpperCase() + moduleId.slice(1)} activated! 🎉`, 'success');
        renderApp();
      } catch (err) {
        showToast('Failed to activate module. Please try again.', 'error');
      }
    });
    return;
  }

  switch (page) {
    case 'dashboard': initDashboard(rerender); break;
    case 'pages': initPagesEditor(); break;
    case 'blog': initBlog(rerender); break;
    case 'products': initProducts(rerender); break;
    case 'events': initEvents(rerender); break;
    case 'gallery': initGallery(rerender); break;
    case 'announcements': initAnnouncements(rerender); break;
    case 'team': initTeam(rerender); break;
    case 'submissions': initSubmissions(rerender); break;
    case 'ai-tools': initAiTools(rerender); break;
    case 'settings': initSettings(rerender); break;
    case 'admin': initAdmin(rerender); break;
  }
}

function initGlobalInteractions() {
  // Publish button
  const publishBtn = document.getElementById('publishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', async () => {
      publishBtn.classList.add('sidebar__publish-btn--loading');
      publishBtn.innerHTML = '<div class="spinner"></div>Publishing...';
      try {
        await Store.publish();
        showToast('Changes published successfully! 🚀', 'success');
      } catch (err) {
        showToast('Publish failed. Please try again.', 'error');
      }
      publishBtn.classList.remove('sidebar__publish-btn--loading');
      publishBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        Publish Changes
      `;
      const lastPub = document.querySelector('.header__last-published');
      if (lastPub) lastPub.textContent = 'Last published just now';
    });
  }

  // Mobile menu
  const mobileMenuBtn = document.getElementById('mobileMenuBtn');
  const sidebar = document.getElementById('sidebar');
  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('sidebar--open');
    });
  }

  // Close sidebar on link click (mobile)
  document.querySelectorAll('.sidebar__link').forEach(link => {
    link.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('sidebar--open');
    });
  });

  // Sign out button
  const signOutBtn = document.getElementById('signOutBtn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
      await signOut();
      // Auth state listener will handle the rest
    });
  }

  // PWA Install button
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn && deferredInstallPrompt) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      const { outcome } = await deferredInstallPrompt.userChoice;
      if (outcome === 'accepted') {
        showToast('Installing app... 📱', 'success');
      }
      deferredInstallPrompt = null;
      installBtn.style.display = 'none';
    });
  }
}

// ─── PWA Install Prompt ───
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.style.display = 'none';
  showToast('App installed successfully! 📱', 'success');
});

// ─── Hash change handler ───
let previousPage = '';

// ─── Initialize ─────────────────────────────────────────────────
function init() {
  // Listen for Firebase Auth state changes
  onAuthChange(async (authData) => {
    if (authData) {
      // User is signed in
      isAuthenticated = true;
      isStoreReady = false;
      renderApp(); // Show loading state
      
      // Determine which site to load
      let siteId = getUserSiteId();
      
      if (!siteId && isAdmin()) {
        // Admin with no assigned site — auto-load the first available site
        try {
          const allSites = await Store.getAllSites();
          if (allSites.length > 0) {
            siteId = allSites[0].id;
          }
        } catch (err) {
          console.warn('Failed to load sites for admin:', err);
        }
      }
      
      if (siteId) {
        // Load the site's data
        Store.setSiteId(siteId);
        Store.setUserDisplayName(getDisplayName());
        currentSiteId = siteId;
        
        try {
          await Store.init();
          Store.startRealtimeSync(); // Activate live Firestore listeners
          isStoreReady = true;
        } catch (err) {
          console.error('Failed to initialize store:', err);
          showToast('Error loading site data. Please refresh.', 'error');
          isStoreReady = true; // Allow rendering even on error
        }
      } else {
        // No sites exist yet — admin mode only
        isStoreReady = true;
      }
      
      window.location.hash = window.location.hash || '#/dashboard';
      renderApp();
      showToast(`Welcome back, ${getDisplayName()}!`, 'success');

      // Handle Stripe checkout redirects (success/cancel)
      handleStripeRedirect();
    } else {
      // User is signed out
      isAuthenticated = false;
      isStoreReady = false;
      currentSiteId = null;
      Store.stopRealtimeSync(); // Clean up Firestore listeners
      Store.reset();
      window.location.hash = '';
      renderApp();
    }
  });

  // Hash change routing
  window.addEventListener('hashchange', () => {
    if (isAuthenticated && isStoreReady) {
      const newPage = getCurrentPage();
      // Reset sub-views when navigating away
      if (previousPage !== newPage) {
        if (previousPage === 'blog') resetBlogView();
        if (previousPage === 'products') resetProductsView();
        if (previousPage === 'gallery') resetGalleryView();
        if (previousPage === 'submissions') resetSubmissionsView();
        if (previousPage === 'admin') resetAdminView();
      }
      previousPage = newPage;
      renderApp();
    }
  });

  previousPage = getCurrentPage();
  renderApp();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

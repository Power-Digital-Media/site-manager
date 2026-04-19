/**
 * Power Digital Media — Site Manager
 * Main Application Entry Point
 */

import './style.css';
import { Store } from './store.js';
import { renderSidebar } from './components/sidebar.js';
import { renderHeader } from './components/header.js';
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderPagesEditor, initPagesEditor } from './pages/pages-editor.js';
import { renderEvents, initEvents } from './pages/events.js';
import { renderAnnouncements, initAnnouncements } from './pages/announcements.js';
import { renderTeam, initTeam } from './pages/team.js';
import { renderSettings, initSettings } from './pages/settings.js';
import { showToast } from './components/toast.js';

let isLoggedIn = false;

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  pages: 'Page Content',
  events: 'Events',
  announcements: 'Announcements',
  team: 'Team Members',
  settings: 'Settings',
};

function getCurrentPage() {
  const hash = window.location.hash.replace('#/', '') || 'dashboard';
  return PAGE_TITLES[hash] ? hash : 'dashboard';
}

function renderApp() {
  const app = document.getElementById('app');
  
  if (!isLoggedIn) {
    app.className = 'app app--login';
    app.innerHTML = renderLogin();
    initLoginPage();
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
  switch (page) {
    case 'dashboard': return renderDashboard();
    case 'pages': return renderPagesEditor();
    case 'events': return renderEvents();
    case 'announcements': return renderAnnouncements();
    case 'team': return renderTeam();
    case 'settings': return renderSettings();
    default: return renderDashboard();
  }
}

function initPageInteractions(page) {
  const rerender = () => renderApp();

  switch (page) {
    case 'pages': initPagesEditor(); break;
    case 'events': initEvents(rerender); break;
    case 'announcements': initAnnouncements(rerender); break;
    case 'team': initTeam(rerender); break;
    case 'settings': initSettings(rerender); break;
  }
}

function initGlobalInteractions() {
  // Publish button
  const publishBtn = document.getElementById('publishBtn');
  if (publishBtn) {
    publishBtn.addEventListener('click', () => {
      publishBtn.classList.add('sidebar__publish-btn--loading');
      publishBtn.innerHTML = `
        <div class="spinner"></div>
        Publishing...
      `;
      setTimeout(() => {
        Store.publish();
        showToast('Changes published successfully! 🚀', 'success');
        publishBtn.classList.remove('sidebar__publish-btn--loading');
        publishBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
          Publish Changes
        `;
        // Update last published in header
        const lastPub = document.querySelector('.header__last-published');
        if (lastPub) lastPub.textContent = 'Last published just now';
      }, 1500);
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

function initLoginPage() {
  const form = document.getElementById('loginForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const btn = document.getElementById('loginBtn');
      btn.classList.add('btn--loading');
      btn.innerHTML = '<div class="spinner"></div><span>Signing in...</span>';
      
      setTimeout(() => {
        isLoggedIn = true;
        window.location.hash = '#/dashboard';
        renderApp();
        showToast(`Welcome back, ${Store.getAuth().name.split(' ')[0]}!`, 'success');
      }, 800);
    });
  }
}

// ─── PWA Install Prompt ───
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show the install button if it exists
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const installBtn = document.getElementById('installAppBtn');
  if (installBtn) installBtn.style.display = 'none';
  showToast('App installed successfully! 📱', 'success');
});

// ─── Initialize ───
function init() {
  Store.init();
  
  window.addEventListener('hashchange', () => {
    if (isLoggedIn) renderApp();
  });

  renderApp();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

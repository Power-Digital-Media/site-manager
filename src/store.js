/**
 * Power Digital Media — Site Manager
 * Data Store v3.0 — Firestore-backed, multi-tenant
 * 
 * This module replaces the localStorage-based v2 store with a
 * Firestore-backed service layer. All data is scoped to a siteId.
 * 
 * The public API is preserved (Store.getEvents(), Store.addBlogPost(), etc.)
 * so page modules require minimal changes.
 * 
 * Constants (CHAR_LIMITS, presets) have been moved to constants.js.
 */

import { db } from './firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit as firestoreLimit,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  where,
} from 'firebase/firestore';
import { CHAR_LIMITS, BLOG_CATEGORY_PRESETS, PRODUCT_CATEGORY_PRESETS, MODULE_DEFINITIONS } from './constants.js';

// Re-export constants for backward compatibility
export { CHAR_LIMITS, BLOG_CATEGORY_PRESETS, PRODUCT_CATEGORY_PRESETS };

// ─── Current Site Context ───────────────────────────────────────
let _siteId = null;
let _siteConfig = null;
let _userDisplayName = 'User';
let _listeners = []; // Active Firestore listeners (for cleanup)

// ─── In-Memory Cache ────────────────────────────────────────────
// We cache data in memory after fetching from Firestore to keep 
// the synchronous API that the page modules expect.
let _cache = {
  pages: {},
  events: [],
  announcements: [],
  team: [],
  blog: null,
  blogPosts: [],
  productsConfig: null,
  products: [],
  gallery: [],
  submissions: [],
  settings: null,
  activity: [],
};

// ─── Helpers ────────────────────────────────────────────────────

function generateId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

function countWords(text) {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/** Get a Firestore path for the current site */
function sitePath(subpath) {
  if (!_siteId) throw new Error('Store: siteId not set. Call Store.setSiteId() first.');
  return `sites/${_siteId}/${subpath}`;
}

/** Get a Firestore collection ref for the current site */
function siteCollection(collectionName) {
  return collection(db, 'sites', _siteId, collectionName);
}

/** Get a Firestore doc ref for the current site */
function siteDoc(subpath) {
  return doc(db, 'sites', _siteId, subpath);
}

// ─── Store ──────────────────────────────────────────────────────

export const Store = {

  // ═════════════════════════════════════════════════════════════
  // INITIALIZATION & SITE CONTEXT
  // ═════════════════════════════════════════════════════════════

  /**
   * Set the active site. Must be called before any data operations.
   * This is called by main.js after auth determines the user's siteId.
   */
  setSiteId(siteId) {
    // Clean up previous listeners
    this._cleanupListeners();
    _siteId = siteId;
    _cache = {
      pages: {},
      events: [],
      announcements: [],
      team: [],
      blog: null,
      blogPosts: [],
      productsConfig: null,
      products: [],
      gallery: [],
      submissions: [],
      settings: null,
      activity: [],
    };
  },

  getSiteId() { return _siteId; },

  setUserDisplayName(name) { _userDisplayName = name; },

  /**
   * Initialize the store by loading all data for the current site.
   * Returns the site config.
   */
  async init() {
    if (!_siteId) throw new Error('Store: siteId not set.');
    
    // Load site config (stored directly on the site document)
    const siteDocRef = doc(db, 'sites', _siteId);
    const siteSnap = await getDoc(siteDocRef);
    _siteConfig = siteSnap.exists() ? siteSnap.data() : null;
    
    // Load all module data in parallel
    // All collections are direct subcollections of sites/{siteId}/
    const [pages, events, announcements, team, blogConfig, blogPosts, productsConfig, products, gallery, submissions, settings, activity] = await Promise.all([
      this._loadDoc('pages'),
      this._loadCollection('events'),
      this._loadCollection('announcements'),
      this._loadCollection('team'),
      this._loadDoc('blogConfig'),
      this._loadCollection('blogPosts'),
      this._loadDoc('productsConfig'),
      this._loadCollection('products'),
      this._loadCollection('gallery'),
      this._loadCollection('submissions'),
      this._loadDoc('settings'),
      this._loadCollection('activity'),
    ]);

    _cache.pages = pages || {};
    _cache.events = events || [];
    _cache.announcements = announcements || [];
    _cache.team = team || [];
    _cache.blog = blogConfig || null;
    _cache.blogPosts = blogPosts || [];
    _cache.productsConfig = productsConfig || null;
    _cache.products = products || [];
    _cache.gallery = gallery || [];
    _cache.submissions = submissions || [];
    _cache.settings = settings || { serviceTimes: [], contact: {}, social: {}, meta: {} };
    _cache.activity = activity || [];

    return _siteConfig;
  },

  /**
   * Reset store — for development/testing only
   */
  reset() {
    _cache = {
      pages: {},
      events: [],
      announcements: [],
      team: [],
      blog: null,
      blogPosts: [],
      productsConfig: null,
      products: [],
      gallery: [],
      submissions: [],
      settings: { serviceTimes: [], contact: {}, social: {}, meta: {} },
      activity: [],
    };
    _siteConfig = null;
  },

  // ═════════════════════════════════════════════════════════════
  // SITE CONFIG & MODULE ACTIVATION
  // ═════════════════════════════════════════════════════════════

  /** Get the full site config */
  getSiteConfig() { return _siteConfig; },

  /** Get the site name */
  getSite() {
    return _siteConfig || { name: 'Loading...', domain: '', status: 'loading', industry: 'general' };
  },

  /** Check if a module is active for this site */
  isModuleActive(moduleId) {
    // Core modules are always active
    const modDef = MODULE_DEFINITIONS[moduleId];
    if (modDef?.alwaysActive) return true;
    // Check site config
    return _siteConfig?.activeModules?.includes(moduleId) || false;
  },

  /** Get list of inactive modules (for "Grow Your Site" cards) */
  getInactiveModules() {
    return Object.keys(MODULE_DEFINITIONS).filter(
      id => !MODULE_DEFINITIONS[id].alwaysActive && !this.isModuleActive(id)
    );
  },

  /** Get list of active modules */
  getActiveModules() {
    return Object.keys(MODULE_DEFINITIONS).filter(id => this.isModuleActive(id));
  },

  /** Activate a module for the current site */
  async activateModule(moduleId) {
    if (!_siteConfig) return;
    const activeModules = [...(_siteConfig.activeModules || [])];
    if (!activeModules.includes(moduleId)) {
      activeModules.push(moduleId);
    }
    // Remove from available
    const availableModules = (_siteConfig.availableModules || []).filter(m => m !== moduleId);
    
    await updateDoc(doc(db, 'sites', _siteId), { activeModules, availableModules });
    _siteConfig.activeModules = activeModules;
    _siteConfig.availableModules = availableModules;
    
    this._logActivity(`Activated ${MODULE_DEFINITIONS[moduleId]?.label || moduleId} module`, 'settings');
  },

  /** Deactivate a module */
  async deactivateModule(moduleId) {
    if (!_siteConfig) return;
    const activeModules = (_siteConfig.activeModules || []).filter(m => m !== moduleId);
    const availableModules = [...(_siteConfig.availableModules || [])];
    if (!availableModules.includes(moduleId)) {
      availableModules.push(moduleId);
    }
    
    await updateDoc(doc(db, 'sites', _siteId), { activeModules, availableModules });
    _siteConfig.activeModules = activeModules;
    _siteConfig.availableModules = availableModules;
  },

  // ═════════════════════════════════════════════════════════════
  // AUTH (backward compat — reads from site config)
  // ═════════════════════════════════════════════════════════════

  getAuth() {
    return {
      email: _siteConfig?.ownerEmail || '',
      name: _siteConfig?.ownerName || _userDisplayName,
      role: 'Site Administrator',
      tier: _siteConfig?.tier || 'free',
      aiActionsRemaining: _siteConfig?.aiActionsRemaining || 0,
      aiActionsResetDate: _siteConfig?.aiActionsResetDate || null,
    };
  },
  getTier() { return _siteConfig?.tier || 'free'; },
  getAiActions() { return _siteConfig?.aiActionsRemaining || 0; },

  // ═════════════════════════════════════════════════════════════
  // PAGES
  // ═════════════════════════════════════════════════════════════

  getPages() { return _cache.pages; },
  getPage(key) { return _cache.pages[key]; },
  async updatePage(key, updates) {
    _cache.pages[key] = { ...(_cache.pages[key] || {}), ...updates };
    await this._setDoc('pages', _cache.pages);
    this._logActivity(`Updated ${key} section`, 'edit');
  },

  // ═════════════════════════════════════════════════════════════
  // EVENTS
  // ═════════════════════════════════════════════════════════════

  getEvents() { return _cache.events; },
  getEvent(id) { return _cache.events.find(e => e.id === id); },
  async addEvent(event) {
    const newEvent = { ...event, id: generateId('evt'), createdAt: new Date().toISOString() };
    await this._addToCollection('events', newEvent.id, newEvent);
    _cache.events.unshift(newEvent);
    this._logActivity(`Added event: ${newEvent.title}`, 'calendar');
    return newEvent;
  },
  async updateEvent(id, updates) {
    const idx = _cache.events.findIndex(e => e.id === id);
    if (idx !== -1) {
      _cache.events[idx] = { ..._cache.events[idx], ...updates };
      await this._addToCollection('events', id, _cache.events[idx]);
      this._logActivity(`Updated event: ${_cache.events[idx].title}`, 'calendar');
    }
  },
  async deleteEvent(id) {
    const event = _cache.events.find(e => e.id === id);
    _cache.events = _cache.events.filter(e => e.id !== id);
    await this._deleteFromCollection('events', id);
    if (event) this._logActivity(`Deleted event: ${event.title}`, 'trash');
  },

  // ═════════════════════════════════════════════════════════════
  // ANNOUNCEMENTS
  // ═════════════════════════════════════════════════════════════

  getAnnouncements() { return _cache.announcements; },
  getAnnouncement(id) { return _cache.announcements.find(a => a.id === id); },
  async addAnnouncement(ann) {
    const newAnn = { ...ann, id: generateId('ann'), createdAt: new Date().toISOString() };
    await this._addToCollection('announcements', newAnn.id, newAnn);
    _cache.announcements.unshift(newAnn);
    this._logActivity(`Added announcement: ${newAnn.title}`, 'megaphone');
    return newAnn;
  },
  async updateAnnouncement(id, updates) {
    const idx = _cache.announcements.findIndex(a => a.id === id);
    if (idx !== -1) {
      _cache.announcements[idx] = { ..._cache.announcements[idx], ...updates };
      await this._addToCollection('announcements', id, _cache.announcements[idx]);
      this._logActivity(`Updated announcement: ${_cache.announcements[idx].title}`, 'megaphone');
    }
  },
  async deleteAnnouncement(id) {
    const ann = _cache.announcements.find(a => a.id === id);
    _cache.announcements = _cache.announcements.filter(a => a.id !== id);
    await this._deleteFromCollection('announcements', id);
    if (ann) this._logActivity(`Deleted announcement: ${ann.title}`, 'trash');
  },

  // ═════════════════════════════════════════════════════════════
  // TEAM
  // ═════════════════════════════════════════════════════════════

  getTeam() { return [..._cache.team].sort((a, b) => a.order - b.order); },
  getTeamMember(id) { return _cache.team.find(t => t.id === id); },
  async addTeamMember(member) {
    const newMember = { ...member, id: generateId('tm'), order: _cache.team.length };
    await this._addToCollection('team', newMember.id, newMember);
    _cache.team.push(newMember);
    this._logActivity(`Added team member: ${newMember.name}`, 'user');
    return newMember;
  },
  async updateTeamMember(id, updates) {
    const idx = _cache.team.findIndex(t => t.id === id);
    if (idx !== -1) {
      _cache.team[idx] = { ..._cache.team[idx], ...updates };
      await this._addToCollection('team', id, _cache.team[idx]);
      this._logActivity(`Updated team member: ${_cache.team[idx].name}`, 'user');
    }
  },
  async deleteTeamMember(id) {
    const member = _cache.team.find(t => t.id === id);
    _cache.team = _cache.team.filter(t => t.id !== id);
    await this._deleteFromCollection('team', id);
    if (member) this._logActivity(`Removed team member: ${member.name}`, 'trash');
  },

  // ═════════════════════════════════════════════════════════════
  // BLOG
  // ═════════════════════════════════════════════════════════════

  getBlog() { return _cache.blog || { activated: false, name: '', tagline: '', categories: [], postsPerPage: 9 }; },
  isBlogActivated() { return this.isModuleActive('blog'); },
  async activateBlog(config) {
    _cache.blog = { ...(_cache.blog || {}), ...config, activated: true };
    await this._setDoc('blogConfig', _cache.blog);
    await this.activateModule('blog');
    this._logActivity('Activated blog', 'blog');
  },
  async updateBlogConfig(updates) {
    _cache.blog = { ...(_cache.blog || {}), ...updates };
    await this._setDoc('blogConfig', _cache.blog);
  },

  // Blog Posts
  getBlogPosts(filter = 'all') {
    let posts = [..._cache.blogPosts];
    if (filter === 'published') posts = posts.filter(p => p.status === 'published');
    if (filter === 'draft') posts = posts.filter(p => p.status === 'draft');
    if (filter === 'scheduled') posts = posts.filter(p => p.status === 'scheduled');
    return posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getBlogPost(id) { return _cache.blogPosts.find(p => p.id === id); },
  async addBlogPost(post) {
    const newPost = {
      ...post,
      id: generateId('bp'),
      slug: generateSlug(post.title),
      wordCount: countWords(post.body || ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this._addToCollection('blogPosts', newPost.id, newPost);
    _cache.blogPosts.unshift(newPost);
    if (newPost.status === 'published') {
      this._logActivity(`Published blog post: ${newPost.title}`, 'blog');
    } else {
      this._logActivity(`Created draft: ${newPost.title}`, 'blog');
    }
    return newPost;
  },
  async updateBlogPost(id, updates) {
    const idx = _cache.blogPosts.findIndex(p => p.id === id);
    if (idx !== -1) {
      if (updates.body) updates.wordCount = countWords(updates.body);
      if (updates.title) updates.slug = generateSlug(updates.title);
      _cache.blogPosts[idx] = { ..._cache.blogPosts[idx], ...updates, updatedAt: new Date().toISOString() };
      await this._addToCollection('blogPosts', id, _cache.blogPosts[idx]);
      this._logActivity(`Updated blog post: ${_cache.blogPosts[idx].title}`, 'blog');
    }
  },
  async deleteBlogPost(id) {
    const post = _cache.blogPosts.find(p => p.id === id);
    _cache.blogPosts = _cache.blogPosts.filter(p => p.id !== id);
    await this._deleteFromCollection('blogPosts', id);
    if (post) this._logActivity(`Deleted blog post: ${post.title}`, 'trash');
  },

  // ═════════════════════════════════════════════════════════════
  // PRODUCTS
  // ═════════════════════════════════════════════════════════════

  getProductsConfig() { return _cache.productsConfig || { categories: [] }; },
  async activateProducts(config) {
    _cache.productsConfig = { ...(_cache.productsConfig || {}), ...config, activated: true };
    await this._setDoc('productsConfig', _cache.productsConfig);
    await this.activateModule('products');
    this._logActivity('Activated products', 'product');
  },
  async updateProductsConfig(updates) {
    _cache.productsConfig = { ...(_cache.productsConfig || {}), ...updates };
    await this._setDoc('productsConfig', _cache.productsConfig);
  },
  getProducts(filter = 'all') {
    let items = [..._cache.products];
    if (filter === 'in_stock') items = items.filter(p => p.availability === 'in_stock');
    if (filter === 'out_of_stock') items = items.filter(p => p.availability === 'out_of_stock');
    if (filter === 'featured') items = items.filter(p => p.featured);
    return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  },
  getProduct(id) { return _cache.products.find(p => p.id === id); },
  async addProduct(product) {
    const newProduct = {
      ...product,
      id: generateId('prod'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await this._addToCollection('products', newProduct.id, newProduct);
    _cache.products.unshift(newProduct);
    this._logActivity(`Added product: ${newProduct.name}`, 'product');
    return newProduct;
  },
  async updateProduct(id, updates) {
    const idx = _cache.products.findIndex(p => p.id === id);
    if (idx !== -1) {
      _cache.products[idx] = { ..._cache.products[idx], ...updates, updatedAt: new Date().toISOString() };
      await this._addToCollection('products', id, _cache.products[idx]);
      this._logActivity(`Updated product: ${_cache.products[idx].name}`, 'product');
    }
  },
  async deleteProduct(id) {
    const product = _cache.products.find(p => p.id === id);
    _cache.products = _cache.products.filter(p => p.id !== id);
    await this._deleteFromCollection('products', id);
    if (product) this._logActivity(`Deleted product: ${product.name}`, 'trash');
  },

  // ═════════════════════════════════════════════════════════════
  // GALLERY
  // ═════════════════════════════════════════════════════════════

  getGallery() { return _cache.gallery; },
  getAlbum(id) { return _cache.gallery.find(a => a.id === id); },
  async addAlbum(album) {
    const newAlbum = {
      ...album,
      id: generateId('alb'),
      photos: [],
      coverIndex: 0,
      createdAt: new Date().toISOString(),
    };
    await this._addToCollection('gallery', newAlbum.id, newAlbum);
    _cache.gallery.unshift(newAlbum);
    this._logActivity(`Created album: ${newAlbum.name}`, 'gallery');
    return newAlbum;
  },
  async updateAlbum(id, updates) {
    const idx = _cache.gallery.findIndex(a => a.id === id);
    if (idx !== -1) {
      _cache.gallery[idx] = { ..._cache.gallery[idx], ...updates };
      await this._addToCollection('gallery', id, _cache.gallery[idx]);
      this._logActivity(`Updated album: ${_cache.gallery[idx].name}`, 'gallery');
    }
  },
  async deleteAlbum(id) {
    const album = _cache.gallery.find(a => a.id === id);
    _cache.gallery = _cache.gallery.filter(a => a.id !== id);
    await this._deleteFromCollection('gallery', id);
    if (album) this._logActivity(`Deleted album: ${album.name}`, 'trash');
  },
  addPhotoToAlbum(albumId, photo) {
    const album = _cache.gallery.find(a => a.id === albumId);
    if (album) {
      const newPhoto = { ...photo, id: generateId('ph') };
      album.photos.push(newPhoto);
      this._addToCollection('gallery', albumId, album);
      return newPhoto;
    }
  },
  removePhotoFromAlbum(albumId, photoId) {
    const album = _cache.gallery.find(a => a.id === albumId);
    if (album) {
      album.photos = album.photos.filter(p => p.id !== photoId);
      this._addToCollection('gallery', albumId, album);
    }
  },

  // ═════════════════════════════════════════════════════════════
  // SUBMISSIONS
  // ═════════════════════════════════════════════════════════════

  getSubmissions() { return [..._cache.submissions].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); },
  getSubmission(id) { return _cache.submissions.find(s => s.id === id); },
  getUnreadCount() { return _cache.submissions.filter(s => !s.read).length; },
  async markSubmissionRead(id) {
    const sub = _cache.submissions.find(s => s.id === id);
    if (sub) {
      sub.read = true;
      await this._addToCollection('submissions', id, sub);
    }
  },
  async markAllSubmissionsRead() {
    const batch = writeBatch(db);
    _cache.submissions.forEach(s => {
      s.read = true;
      // Use proper segmented path: sites/{siteId}/submissions/{id}
      batch.set(doc(db, 'sites', _siteId, 'submissions', s.id), s);
    });
    await batch.commit();
  },
  async deleteSubmission(id) {
    _cache.submissions = _cache.submissions.filter(s => s.id !== id);
    await this._deleteFromCollection('submissions', id);
  },

  // ═════════════════════════════════════════════════════════════
  // SETTINGS
  // ═════════════════════════════════════════════════════════════

  getSettings() { return _cache.settings || { serviceTimes: [], contact: {}, social: {}, meta: {} }; },
  async updateSettings(section, updates) {
    if (_cache.settings) {
      if (Array.isArray(_cache.settings[section])) {
        _cache.settings[section] = updates;
      } else {
        _cache.settings[section] = { ...(_cache.settings[section] || {}), ...updates };
      }
      await this._setDoc('settings', _cache.settings);
      this._logActivity(`Updated ${section} settings`, 'settings');
    }
  },
  async addServiceTime(st) {
    const newSt = { ...st, id: generateId('st') };
    if (!_cache.settings.serviceTimes) _cache.settings.serviceTimes = [];
    _cache.settings.serviceTimes.push(newSt);
    await this._setDoc('settings', _cache.settings);
    this._logActivity(`Added service time: ${newSt.day} ${newSt.time}`, 'clock');
    return newSt;
  },
  async updateServiceTime(id, updates) {
    const idx = _cache.settings.serviceTimes.findIndex(s => s.id === id);
    if (idx !== -1) {
      _cache.settings.serviceTimes[idx] = { ..._cache.settings.serviceTimes[idx], ...updates };
      await this._setDoc('settings', _cache.settings);
    }
  },
  async deleteServiceTime(id) {
    _cache.settings.serviceTimes = _cache.settings.serviceTimes.filter(s => s.id !== id);
    await this._setDoc('settings', _cache.settings);
  },

  // ═════════════════════════════════════════════════════════════
  // LIVE SITE INTEGRATION
  // ═════════════════════════════════════════════════════════════

  /**
   * Get integration settings (deploy hook, live URL, auto-deploy toggle).
   * Stored inside the settings doc under the 'integration' key.
   */
  getIntegrationSettings() {
    const s = this.getSettings();
    return s.integration || { liveSiteUrl: '', deployHookUrl: '', autoDeploy: false, lastDeployAt: null };
  },

  /**
   * Update integration settings.
   */
  async updateIntegrationSettings(updates) {
    const current = this.getIntegrationSettings();
    const merged = { ...current, ...updates };
    await this.updateSettings('integration', merged);
  },

  /**
   * Trigger a deploy of the live site via the saved webhook URL.
   * Called automatically after publishing content (if auto-deploy is enabled).
   * Returns { success: boolean, message: string }
   */
  async triggerDeployHook() {
    const integration = this.getIntegrationSettings();
    if (!integration.deployHookUrl) {
      return { success: false, message: 'No deploy hook URL configured. Go to Settings → Live Site Integration.' };
    }

    try {
      const res = await fetch(integration.deployHookUrl, { method: 'POST' });
      if (res.ok) {
        // Record the deploy timestamp
        await this.updateIntegrationSettings({ lastDeployAt: new Date().toISOString() });
        this._logActivity('Triggered live site deploy', 'rocket');
        return { success: true, message: 'Deploy triggered successfully! Your live site will update in 1-2 minutes.' };
      } else {
        return { success: false, message: `Deploy hook returned HTTP ${res.status}. Check your webhook URL.` };
      }
    } catch (err) {
      console.error('Store: deploy hook failed', err);
      return { success: false, message: 'Deploy hook failed — check your network connection and webhook URL.' };
    }
  },

  // ═════════════════════════════════════════════════════════════
  // ACTIVITY
  // ═════════════════════════════════════════════════════════════

  getActivity(limit = 10) { return _cache.activity.slice(0, limit); },
  async _logActivity(action, icon = 'edit') {
    const entry = {
      id: generateId('act'),
      action,
      user: _userDisplayName,
      timestamp: new Date().toISOString(),
      icon,
    };
    _cache.activity.unshift(entry);
    if (_cache.activity.length > 50) _cache.activity = _cache.activity.slice(0, 50);
    // Fire-and-forget write to Firestore
    try {
      await this._addToCollection('activity', entry.id, entry);
    } catch (err) {
      console.warn('Store: failed to log activity to Firestore', err);
    }
  },

  // ═════════════════════════════════════════════════════════════
  // STATS
  // ═════════════════════════════════════════════════════════════

  getStats() {
    const stats = {};
    
    // Always-active modules
    stats.pages = Object.keys(_cache.pages).length;
    
    // Conditional stats — only include active modules
    if (this.isModuleActive('events')) {
      stats.events = _cache.events.length;
      stats.eventsPublished = _cache.events.filter(e => e.published).length;
    }
    if (this.isModuleActive('announcements')) {
      stats.announcements = _cache.announcements.length;
      stats.announcementsActive = _cache.announcements.filter(a => a.active).length;
    }
    if (this.isModuleActive('team')) {
      stats.team = _cache.team.length;
    }
    if (this.isModuleActive('blog')) {
      stats.blogPosts = _cache.blogPosts.length;
      stats.blogPostsPublished = _cache.blogPosts.filter(p => p.status === 'published').length;
      stats.blogPostsDraft = _cache.blogPosts.filter(p => p.status === 'draft').length;
    }
    if (this.isModuleActive('products')) {
      stats.products = _cache.products.length;
      stats.productsInStock = _cache.products.filter(p => p.availability === 'in_stock').length;
    }
    if (this.isModuleActive('gallery')) {
      stats.albums = _cache.gallery.length;
      stats.totalPhotos = _cache.gallery.reduce((sum, a) => sum + (a.photos?.length || 0), 0);
    }
    if (this.isModuleActive('submissions')) {
      stats.submissions = _cache.submissions.length;
      stats.submissionsUnread = _cache.submissions.filter(s => !s.read).length;
    }
    
    return stats;
  },

  // ═════════════════════════════════════════════════════════════
  // PUBLISH
  // ═════════════════════════════════════════════════════════════

  async publish() {
    if (_siteConfig) {
      _siteConfig.lastPublished = new Date().toISOString();
      await updateDoc(doc(db, 'sites', _siteId), { lastPublished: _siteConfig.lastPublished });
    }
    this._logActivity('Published site changes', 'rocket');
  },

  // ═════════════════════════════════════════════════════════════
  // ADMIN — Client Management
  // ═════════════════════════════════════════════════════════════

  /**
   * Get all client sites (admin only)
   * @returns {Promise<Array>}
   */
  async getAllSites() {
    const sitesRef = collection(db, 'sites');
    const snapshot = await getDocs(sitesRef);
    const sites = [];
    for (const siteDoc of snapshot.docs) {
      sites.push({ id: siteDoc.id, ...siteDoc.data() });
    }
    return sites;
  },

  /**
   * Create a new client site (admin only)
   */
  async createSite(siteData) {
    const siteId = siteData.id || generateId('site');
    const config = {
      name: siteData.name,
      domain: siteData.domain || '',
      industry: siteData.industry || 'general',
      status: siteData.status || 'setup',
      tier: siteData.tier || 'free',
      aiActionsRemaining: 0,
      activeModules: siteData.activeModules || ['pages', 'settings'],
      availableModules: siteData.availableModules || ['blog', 'products', 'events', 'gallery', 'announcements', 'team', 'submissions'],
      createdAt: new Date().toISOString(),
      lastPublished: null,
      ownerEmail: siteData.ownerEmail || '',
      ownerName: siteData.ownerName || '',
      ownerUid: siteData.ownerUid || null,
    };

    // Create site config document at sites/{siteId}
    await setDoc(doc(db, 'sites', siteId), config);
    
    // Create default pages document at sites/{siteId}/docs/pages
    // Must match the path used by _loadDoc('pages') and _setDoc('pages')
    await setDoc(doc(db, 'sites', siteId, 'docs', 'pages'), {
      home: {
        title: 'Home',
        slug: 'home',
        createdAt: new Date().toISOString(),
      }
    });
    
    // Create default settings document at sites/{siteId}/docs/settings
    // Must match the path used by _loadDoc('settings') and _setDoc('settings')
    await setDoc(doc(db, 'sites', siteId, 'docs', 'settings'), {
      serviceTimes: [],
      contact: { address: '', city: '', state: '', zip: '', phone: '', email: '' },
      social: { facebook: '', youtube: '', tiktok: '', instagram: '' },
      meta: { siteTitle: `${siteData.name} | Powered by PDM`, siteDescription: '' },
    });

    return { id: siteId, ...config };
  },

  /**
   * Update a client's site config (admin only)
   */
  async updateSiteConfig(siteId, updates) {
    await updateDoc(doc(db, 'sites', siteId), updates);
    // If updating the currently loaded site, update local config too
    if (siteId === _siteId) {
      _siteConfig = { ..._siteConfig, ...updates };
    }
  },

  // ═════════════════════════════════════════════════════════════
  // REAL-TIME LISTENERS
  // ═════════════════════════════════════════════════════════════

  /** Subscribers for reactive UI updates */
  _subscribers: {},

  /**
   * Subscribe to changes in a specific data key.
   * Returns an unsubscribe function.
   * 
   * @param {string}   key      - e.g. 'blogPosts', 'submissions', 'activity'
   * @param {Function} callback - Called with the new data array/object
   * @returns {Function} unsubscribe
   */
  subscribe(key, callback) {
    if (!this._subscribers[key]) this._subscribers[key] = [];
    this._subscribers[key].push(callback);
    return () => {
      this._subscribers[key] = this._subscribers[key].filter(cb => cb !== callback);
    };
  },

  /** Notify all subscribers of a key with updated data */
  _notify(key, data) {
    if (this._subscribers[key]) {
      this._subscribers[key].forEach(cb => {
        try { cb(data); } catch (e) { console.warn('Store: subscriber error', e); }
      });
    }
  },

  /**
   * Start a real-time listener on a Firestore subcollection.
   * Automatically updates the in-memory cache and notifies subscribers.
   * 
   * @param {string} collectionName - e.g. 'blogPosts', 'submissions'
   * @param {Object} [opts]
   * @param {string} [opts.orderField]     - Field to order by (default: 'createdAt')
   * @param {string} [opts.orderDirection] - 'asc' or 'desc' (default: 'desc')
   * @param {number} [opts.limitCount]     - Max docs to listen for
   */
  watchCollection(collectionName, opts = {}) {
    if (!_siteId) return;

    const colRef = collection(db, 'sites', _siteId, collectionName);
    const constraints = [];

    if (opts.orderField) {
      constraints.push(orderBy(opts.orderField, opts.orderDirection || 'desc'));
    }
    if (opts.limitCount) {
      constraints.push(firestoreLimit(opts.limitCount));
    }

    const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      _cache[collectionName] = data;
      this._notify(collectionName, data);
    }, (err) => {
      console.warn(`Store: realtime listener error on ${collectionName}`, err);
    });

    _listeners.push(unsub);
    return unsub;
  },

  /**
   * Start a real-time listener on a Firestore document (in docs/ subcollection).
   * 
   * @param {string} docName - e.g. 'settings', 'blogConfig'
   */
  watchDoc(docName) {
    if (!_siteId) return;

    const docRef = doc(db, 'sites', _siteId, 'docs', docName);
    const unsub = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        _cache[docName] = snap.data();
        this._notify(docName, snap.data());
      }
    }, (err) => {
      console.warn(`Store: realtime doc listener error on ${docName}`, err);
    });

    _listeners.push(unsub);
    return unsub;
  },

  /**
   * Start all critical real-time listeners.
   * Call this after init() to keep the dashboard live.
   */
  startRealtimeSync() {
    if (!_siteId) return;

    // Watch submissions for unread badge updates
    this.watchCollection('submissions', { orderField: 'createdAt', orderDirection: 'desc' });

    // Watch activity for live feed
    this.watchCollection('activity', { orderField: 'timestamp', orderDirection: 'desc', limitCount: 50 });

    // Watch blog posts for live status changes
    this.watchCollection('blogPosts', { orderField: 'createdAt', orderDirection: 'desc' });

    // Watch settings for config changes (e.g. if admin updates from another tab)
    this.watchDoc('settings');
  },

  /**
   * Stop all real-time listeners.
   * Call this when logging out or switching sites.
   */
  stopRealtimeSync() {
    this._cleanupListeners();
  },

  // ═════════════════════════════════════════════════════════════
  // FIRESTORE HELPERS (private)
  // ═════════════════════════════════════════════════════════════

  async _loadDoc(docName) {
    try {
      // Documents stored at: sites/{siteId}/docs/{docName} (4 segments = valid doc ref)
      const docRef = doc(db, 'sites', _siteId, 'docs', docName);
      const snap = await getDoc(docRef);
      return snap.exists() ? snap.data() : null;
    } catch (err) {
      console.warn(`Store: failed to load doc ${docName}`, err);
      return null;
    }
  },

  async _loadCollection(collectionName) {
    try {
      // Collections at: sites/{siteId}/{collectionName} (3 segments = valid collection ref)
      const colRef = collection(db, 'sites', _siteId, collectionName);
      const snap = await getDocs(colRef);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (err) {
      console.warn(`Store: failed to load collection ${collectionName}`, err);
      return [];
    }
  },

  async _setDoc(docName, data) {
    try {
      await setDoc(doc(db, 'sites', _siteId, 'docs', docName), data);
    } catch (err) {
      console.error(`Store: failed to set doc ${docName}`, err);
    }
  },

  async _updateDoc(docName, updates) {
    try {
      await updateDoc(doc(db, 'sites', _siteId, 'docs', docName), updates);
    } catch (err) {
      console.error(`Store: failed to update doc ${docName}`, err);
    }
  },

  async _addToCollection(collectionName, docId, data) {
    try {
      // Path: sites/{siteId}/{collectionName}/{docId} (4 segments = valid doc ref)
      await setDoc(doc(db, 'sites', _siteId, collectionName, docId), data);
    } catch (err) {
      console.error(`Store: failed to add to ${collectionName}`, err);
    }
  },

  async _deleteFromCollection(collectionName, docId) {
    try {
      await deleteDoc(doc(db, 'sites', _siteId, collectionName, docId));
    } catch (err) {
      console.error(`Store: failed to delete from ${collectionName}`, err);
    }
  },

  _cleanupListeners() {
    _listeners.forEach(unsub => unsub());
    _listeners = [];
  },
};


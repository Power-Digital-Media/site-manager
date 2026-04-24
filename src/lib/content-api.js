/**
 * PDM Site Manager — Public Content API
 * 
 * This module exposes a lightweight HTTP API (via Firebase Cloud Functions
 * or as a standalone Express server) that serves published content from
 * Firestore. Non-Next.js sites (Vite, vanilla) can fetch from this API.
 * 
 * Endpoints:
 *   GET /api/content/:siteId/blog          → Published blog posts
 *   GET /api/content/:siteId/blog/:slug    → Single blog post by slug
 *   GET /api/content/:siteId/products      → Published products
 *   GET /api/content/:siteId/team          → Team members
 *   GET /api/content/:siteId/events        → Events
 *   GET /api/content/:siteId/gallery       → Gallery items
 *   GET /api/content/:siteId/settings      → Site settings
 * 
 * All responses include CORS headers and cache-control for CDN edge caching.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// ─── Firebase Admin Init ────────────────────────────────────────

let db;

function initDb() {
  if (db) return db;
  
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (serviceAccountJson) {
      initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
    } else {
      // Falls back to Application Default Credentials (works in GCP/Firebase hosting)
      initializeApp();
    }
  }
  
  db = getFirestore();
  return db;
}

// ─── CORS + Cache Headers ───────────────────────────────────────

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function jsonResponse(data, status = 200, cacheSeconds = 300) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`,
      ...CORS_HEADERS,
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ error: message }, status, 0);
}

// ─── Route Handler ──────────────────────────────────────────────

/**
 * Handle a content API request.
 * Can be used as a Next.js API route handler, Express middleware,
 * or Firebase Cloud Function.
 * 
 * @param {string} siteId - The site ID
 * @param {string} contentType - 'blog' | 'products' | 'team' | 'events' | 'gallery' | 'settings'
 * @param {string} [slug] - Optional slug for single-item lookup
 * @returns {Response}
 */
export async function handleContentRequest(siteId, contentType, slug = null) {
  const firestore = initDb();
  
  // Validate site exists
  const siteDoc = await firestore.collection('sites').doc(siteId).get();
  if (!siteDoc.exists) {
    return errorResponse('Site not found', 404);
  }
  
  const siteRef = firestore.collection('sites').doc(siteId);
  
  switch (contentType) {
    case 'blog': {
      if (slug) {
        // Single post by slug
        const snap = await siteRef
          .collection('blogPosts')
          .where('slug', '==', slug)
          .where('status', '==', 'published')
          .limit(1)
          .get();
        
        if (snap.empty) return errorResponse('Post not found', 404);
        const doc = snap.docs[0];
        return jsonResponse({ id: doc.id, ...doc.data() });
      }
      
      // All published posts
      const snap = await siteRef
        .collection('blogPosts')
        .where('status', '==', 'published')
        .orderBy('createdAt', 'desc')
        .get();
      
      const posts = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // Strip full body from list view for performance
        body: undefined,
        excerpt: doc.data().excerpt || (doc.data().body || '').slice(0, 200) + '...',
      }));
      
      return jsonResponse({ posts, total: posts.length }, 200, 600);
    }
    
    case 'products': {
      const snap = await siteRef
        .collection('products')
        .orderBy('createdAt', 'desc')
        .get();
      
      const products = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return jsonResponse({ products, total: products.length });
    }
    
    case 'team': {
      const snap = await siteRef
        .collection('team')
        .orderBy('order', 'asc')
        .get();
      
      const team = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return jsonResponse({ team });
    }
    
    case 'events': {
      const snap = await siteRef
        .collection('events')
        .orderBy('date', 'desc')
        .get();
      
      const events = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return jsonResponse({ events });
    }
    
    case 'gallery': {
      const snap = await siteRef
        .collection('gallery')
        .orderBy('order', 'asc')
        .get();
      
      const gallery = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return jsonResponse({ gallery });
    }
    
    case 'settings': {
      const settingsDoc = await siteRef.collection('settings').doc('general').get();
      if (!settingsDoc.exists) return jsonResponse({});
      return jsonResponse(settingsDoc.data(), 200, 3600);
    }
    
    default:
      return errorResponse(`Unknown content type: ${contentType}`, 400);
  }
}

// ─── Export for different runtimes ──────────────────────────────

export default handleContentRequest;

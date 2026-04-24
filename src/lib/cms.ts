/**
 * PDM Site Manager — Server-Side CMS Client
 * 
 * This module reads content from the shared Firestore database
 * using Firebase Admin SDK. It runs ONLY on the server (Next.js 
 * API routes, generateStaticParams, Server Components).
 * 
 * SETUP:
 * 1. Copy this file to your Next.js project: src/lib/cms.ts
 * 2. Copy cms-types.ts to: src/lib/cms-types.ts
 * 3. npm install firebase-admin
 * 4. Set environment variables:
 *    - FIREBASE_SERVICE_ACCOUNT: JSON string of the service account key
 *    - CMS_SITE_ID: The site ID from the Site Manager (e.g., "site_mo6ppoga_ttmnu")
 *    - CMS_DEPLOY_HOOK: (optional) Netlify/Vercel deploy hook URL
 * 
 * No Firebase credentials are exposed to the browser.
 */

import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import type {
  CMSBlogPost,
  CMSProduct,
  CMSTeamMember,
  CMSEvent,
  CMSSiteSettings,
  CMSGalleryItem,
  BlogPostView,
} from './cms-types';

// ─── Initialization ─────────────────────────────────────────────

let _app: App | null = null;
let _db: Firestore | null = null;

function getDb(): Firestore {
  if (_db) return _db;

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccount) {
    throw new Error(
      'CMS: FIREBASE_SERVICE_ACCOUNT environment variable is required. ' +
      'Set it to the JSON string of your Firebase service account key.'
    );
  }

  if (!getApps().length) {
    _app = initializeApp({
      credential: cert(JSON.parse(serviceAccount)),
    }, 'cms-reader');
  } else {
    _app = getApps().find(a => a.name === 'cms-reader') || getApps()[0];
  }

  _db = getFirestore(_app);
  return _db;
}

function getSiteId(): string {
  const siteId = process.env.CMS_SITE_ID;
  if (!siteId) {
    throw new Error(
      'CMS: CMS_SITE_ID environment variable is required. ' +
      'Set it to your site ID from the Site Manager (e.g., "site_mo6ppoga_ttmnu").'
    );
  }
  return siteId;
}

// ─── Helper ─────────────────────────────────────────────────────

function sitePath(subpath: string): string {
  return `sites/${getSiteId()}/${subpath}`;
}

// ─── Blog ───────────────────────────────────────────────────────

/**
 * Fetch all published blog posts from Firestore CMS.
 * Returns posts sorted by publish date (newest first).
 */
export async function getCMSBlogPosts(
  status: 'published' | 'draft' | 'all' = 'published'
): Promise<CMSBlogPost[]> {
  const db = getDb();
  const siteId = getSiteId();
  const colRef = db.collection('sites').doc(siteId).collection('blogPosts');
  
  let q;
  if (status === 'all') {
    q = colRef.orderBy('createdAt', 'desc');
  } else {
    q = colRef.where('status', '==', status).orderBy('createdAt', 'desc');
  }

  const snap = await q.get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSBlogPost));
}

/**
 * Fetch a single blog post by slug.
 */
export async function getCMSBlogPostBySlug(slug: string): Promise<CMSBlogPost | null> {
  const db = getDb();
  const siteId = getSiteId();
  const colRef = db.collection('sites').doc(siteId).collection('blogPosts');
  const snap = await colRef.where('slug', '==', slug).limit(1).get();
  
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as CMSBlogPost;
}

/**
 * Convert a CMS blog post to the BlogPostView format used by
 * the existing PDM site components. This lets you drop CMS posts
 * into the existing rendering pipeline with zero component changes.
 */
export function cmsBlogPostToView(post: CMSBlogPost): BlogPostView {
  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt || post.body?.slice(0, 160) + '...',
    date: formatCMSDate(post.publishDate || post.createdAt),
    category: post.category || 'General',
    image: post.featuredImage || '/blog-images/default-cover.png',
    content: post.body || '',
    author: {
      name: post.author || 'Power Digital Media',
      role: post.authorRole || 'Team',
    },
    seoTitle: post.seoTitle || undefined,
    metaDescription: post.metaDescription || undefined,
    keywords: post.keywords ? post.keywords.split(',').map(k => k.trim()) : undefined,
    _fromCMS: true,
  };
}

function formatCMSDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return isoDate;
  }
}

// ─── Products ───────────────────────────────────────────────────

export async function getCMSProducts(): Promise<CMSProduct[]> {
  const db = getDb();
  const siteId = getSiteId();
  const colRef = db.collection('sites').doc(siteId).collection('products');
  const snap = await colRef.orderBy('createdAt', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSProduct));
}

export async function getCMSProduct(id: string): Promise<CMSProduct | null> {
  const db = getDb();
  const siteId = getSiteId();
  const docRef = db.collection('sites').doc(siteId).collection('products').doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as CMSProduct;
}

// ─── Team ───────────────────────────────────────────────────────

export async function getCMSTeam(): Promise<CMSTeamMember[]> {
  const db = getDb();
  const siteId = getSiteId();
  const colRef = db.collection('sites').doc(siteId).collection('team');
  const snap = await colRef.orderBy('order', 'asc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSTeamMember));
}

// ─── Events ─────────────────────────────────────────────────────

export async function getCMSEvents(): Promise<CMSEvent[]> {
  const db = getDb();
  const siteId = getSiteId();
  const colRef = db.collection('sites').doc(siteId).collection('events');
  const snap = await colRef.orderBy('date', 'desc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSEvent));
}

// ─── Gallery ────────────────────────────────────────────────────

export async function getCMSGallery(): Promise<CMSGalleryItem[]> {
  const db = getDb();
  const siteId = getSiteId();
  const colRef = db.collection('sites').doc(siteId).collection('gallery');
  const snap = await colRef.orderBy('order', 'asc').get();
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CMSGalleryItem));
}

// ─── Site Settings ──────────────────────────────────────────────

export async function getCMSSiteSettings(): Promise<CMSSiteSettings | null> {
  const db = getDb();
  const siteId = getSiteId();
  const docRef = db.collection('sites').doc(siteId).collection('settings').doc('general');
  const snap = await docRef.get();
  if (!snap.exists) return null;
  return snap.data() as CMSSiteSettings;
}

// ─── Deploy Trigger ─────────────────────────────────────────────

/**
 * Trigger a rebuild of the live site via deploy hook.
 * Call this after publishing content that should go live immediately.
 */
export async function triggerDeploy(): Promise<boolean> {
  const hookUrl = process.env.CMS_DEPLOY_HOOK;
  if (!hookUrl) {
    console.warn('CMS: CMS_DEPLOY_HOOK not set, skipping deploy trigger.');
    return false;
  }

  try {
    const res = await fetch(hookUrl, { method: 'POST' });
    return res.ok;
  } catch (err) {
    console.error('CMS: Deploy trigger failed:', err);
    return false;
  }
}

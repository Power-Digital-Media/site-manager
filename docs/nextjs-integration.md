# Next.js Integration Guide — PDM Site Manager

> Pull blog content from your PDM CMS into a Next.js site with automatic rebuilds on publish.

---

## Overview

This guide connects a **Next.js 13+ App Router** site to the PDM Site Manager CMS. When you publish or update content in the CMS, your live site rebuilds automatically via a Netlify/Vercel deploy hook.

### Architecture

```
┌─────────────────┐       ┌───────────────────┐       ┌────────────────┐
│  PDM CMS Admin  │──▶    │  Firestore DB     │──▶    │  Next.js Site  │
│  (Site Manager) │       │  (content store)  │       │  (SSG / ISR)   │
└─────────────────┘       └───────────────────┘       └────────────────┘
        │                                                      ▲
        └── Deploy Hook (POST) ────────────────────────────────┘
```

---

## 1. Firebase Setup

### Install the Firebase Admin SDK

```bash
npm install firebase-admin
```

### Create a service account key

1. Go to [Firebase Console](https://console.firebase.google.com) → your project → **Project Settings → Service Accounts**
2. Click **Generate New Private Key** → download the JSON file
3. Add it to your project root as `firebase-service-account.json`
4. Add `firebase-service-account.json` to your `.gitignore`

### Set the environment variable

```bash
# .env.local
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
CMS_SITE_ID="your-site-id"
```

> **Tip:** You can find your `CMS_SITE_ID` in the Site Manager → Settings page.

---

## 2. Create the CMS Library

Create `lib/cms.ts` in your Next.js project:

```ts
// lib/cms.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin (singleton)
if (!getApps().length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
  initializeApp({ credential: cert(serviceAccount) });
}

const db = getFirestore();
const SITE_ID = process.env.CMS_SITE_ID!;

// ─── Types ────────────────────────────────────────────────

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  status: 'published' | 'draft' | 'scheduled';
  publishDate: string;
  featuredImage?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Queries ──────────────────────────────────────────────

/**
 * Get all published blog posts, newest first.
 */
export async function getPublishedPosts(): Promise<BlogPost[]> {
  const snap = await db
    .collection(`sites/${SITE_ID}/blogPosts`)
    .where('status', '==', 'published')
    .orderBy('publishDate', 'desc')
    .get();

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as BlogPost));
}

/**
 * Get a single post by its slug.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const snap = await db
    .collection(`sites/${SITE_ID}/blogPosts`)
    .where('slug', '==', slug)
    .where('status', '==', 'published')
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() } as BlogPost;
}

/**
 * Get all published post slugs (for generateStaticParams).
 */
export async function getAllPostSlugs(): Promise<string[]> {
  const snap = await db
    .collection(`sites/${SITE_ID}/blogPosts`)
    .where('status', '==', 'published')
    .select('slug')
    .get();

  return snap.docs.map(doc => doc.data().slug);
}

/**
 * Get site settings (name, logo, socials, etc.)
 */
export async function getSiteSettings() {
  const doc = await db.doc(`sites/${SITE_ID}/config/settings`).get();
  return doc.data() || {};
}
```

---

## 3. Build Your Pages

### Blog index — `app/blog/page.tsx`

```tsx
import { getPublishedPosts } from '@/lib/cms';

// Revalidate every 60s (ISR) or on-demand via deploy hook
export const revalidate = 60;

export default async function BlogPage() {
  const posts = await getPublishedPosts();

  return (
    <main>
      <h1>Blog</h1>
      <div className="grid">
        {posts.map(post => (
          <article key={post.id}>
            {post.featuredImage && <img src={post.featuredImage} alt="" />}
            <h2><a href={`/blog/${post.slug}`}>{post.title}</a></h2>
            <p>{post.excerpt}</p>
            <time>{new Date(post.publishDate).toLocaleDateString()}</time>
          </article>
        ))}
      </div>
    </main>
  );
}
```

### Blog detail — `app/blog/[slug]/page.tsx`

```tsx
import { getPostBySlug, getAllPostSlugs } from '@/lib/cms';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map(slug => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) return {};
  return {
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
  };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getPostBySlug(params.slug);
  if (!post) notFound();

  return (
    <article>
      <h1>{post.title}</h1>
      <p className="meta">{post.author} · {new Date(post.publishDate).toLocaleDateString()}</p>
      {post.featuredImage && <img src={post.featuredImage} alt="" />}
      <div dangerouslySetInnerHTML={{ __html: post.body }} />
    </article>
  );
}
```

---

## 4. Set Up the Deploy Hook

### Netlify

1. Go to **Site Settings → Build & Deploy → Build Hooks**
2. Click **Add build hook** → name it `PDM CMS Publish`
3. Copy the URL (e.g. `https://api.netlify.com/build_hooks/abc123...`)

### Vercel

1. Go to **Project Settings → Git → Deploy Hooks**
2. Create a hook for your `main` branch
3. Copy the URL

### Connect it to the CMS

1. Open **Site Manager → Settings → Live Site Integration**
2. Paste the deploy hook URL
3. Enter your live site URL
4. Toggle **Auto-deploy** on
5. Click **Save Integration**

Now every time you publish a blog post, your live site automatically rebuilds with the new content! 🚀

---

## 5. Testing

1. Create a test post in the CMS and set it to **Published**
2. Click **🚀 Deploy Now** in Settings to trigger a manual build
3. Wait 1-2 minutes for the build to complete
4. Visit your live site and confirm the post appears

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Posts don't appear on live site | Check your `CMS_SITE_ID` matches the ID in Site Manager |
| Deploy hook returns 403 | Regenerate the hook URL in Netlify/Vercel |
| `FIREBASE_SERVICE_ACCOUNT` error | Ensure the JSON is valid and the env var is set |
| Stale content after publish | Lower `revalidate` or check ISR is working |

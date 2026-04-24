# Vite / Static Site Integration Guide — PDM Site Manager

> Pull CMS content into a Vite-powered static site with automatic rebuilds.

---

## Overview

This guide connects a **Vite + vanilla JS/React/Vue** site (or any static build) to the PDM Site Manager CMS. Content is fetched at build time from Firestore using a Node.js script, and the site is rebuilt automatically when content is published.

### Architecture

```
┌─────────────────┐       ┌───────────────────┐       ┌──────────────────┐
│  PDM CMS Admin  │──▶    │  Firestore DB     │──▶    │  Vite Static     │
│  (Site Manager) │       │  (content store)  │       │  Build (SSG)     │
└─────────────────┘       └───────────────────┘       └──────────────────┘
        │                                                       ▲
        └── Deploy Hook (POST) ─────────────────────────────────┘
```

---

## 1. Firebase Setup

### Install dependencies

```bash
npm install firebase-admin
```

### Create a `.env` file

```bash
# .env
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}'
CMS_SITE_ID="your-site-id"
```

> Find your `CMS_SITE_ID` in Site Manager → Settings.

---

## 2. Create a Content Fetcher Script

Create `scripts/fetch-content.mjs`:

```js
// scripts/fetch-content.mjs
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import 'dotenv/config';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();
const SITE_ID = process.env.CMS_SITE_ID;

async function fetchContent() {
  console.log('📡 Fetching content from CMS...');

  // Fetch published blog posts
  const postsSnap = await db
    .collection(`sites/${SITE_ID}/blogPosts`)
    .where('status', '==', 'published')
    .orderBy('publishDate', 'desc')
    .get();

  const posts = postsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  console.log(`  ✅ ${posts.length} blog posts`);

  // Fetch site settings
  const settingsDoc = await db.doc(`sites/${SITE_ID}/config/settings`).get();
  const settings = settingsDoc.data() || {};
  console.log(`  ✅ Site settings loaded`);

  // Write to JSON files for the build to consume
  const outDir = resolve('src/data');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(resolve(outDir, 'posts.json'), JSON.stringify(posts, null, 2));
  writeFileSync(resolve(outDir, 'settings.json'), JSON.stringify(settings, null, 2));

  console.log('✨ Content written to src/data/');
}

fetchContent().catch(err => {
  console.error('❌ Failed to fetch content:', err.message);
  process.exit(1);
});
```

### Update your `package.json` scripts

```json
{
  "scripts": {
    "fetch": "node scripts/fetch-content.mjs",
    "prebuild": "npm run fetch",
    "build": "vite build",
    "dev": "vite"
  }
}
```

Now every time you run `npm run build`, it automatically fetches the latest CMS content first.

---

## 3. Use the Content in Your Site

### Import the generated JSON

```js
// In any component or page
import posts from './data/posts.json';
import settings from './data/settings.json';
```

### Example: Render a blog listing

```html
<!-- index.html -->
<div id="blog-list"></div>

<script type="module">
  import posts from './data/posts.json';

  const container = document.getElementById('blog-list');
  container.innerHTML = posts.map(post => `
    <article>
      ${post.featuredImage ? `<img src="${post.featuredImage}" alt="" />` : ''}
      <h2><a href="/blog/${post.slug}.html">${post.title}</a></h2>
      <p>${post.excerpt}</p>
      <time>${new Date(post.publishDate).toLocaleDateString()}</time>
    </article>
  `).join('');
</script>
```

### Example: Generate individual post pages (SSG plugin)

For full SSG with individual pages, use a Vite plugin like `vite-plugin-pages` or create a simple build script:

```js
// scripts/generate-pages.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const posts = JSON.parse(readFileSync('src/data/posts.json', 'utf-8'));
const template = readFileSync('src/templates/post.html', 'utf-8');

for (const post of posts) {
  const html = template
    .replace('{{title}}', post.title)
    .replace('{{author}}', post.author)
    .replace('{{date}}', new Date(post.publishDate).toLocaleDateString())
    .replace('{{body}}', post.body)
    .replace('{{image}}', post.featuredImage || '')
    .replace('{{excerpt}}', post.excerpt);

  const dir = resolve(`dist/blog`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, `${post.slug}.html`), html);
  console.log(`  📄 /blog/${post.slug}.html`);
}
```

---

## 4. Set Up the Deploy Hook

### Netlify

1. **Site Settings → Build & Deploy → Build Hooks**
2. Click **Add build hook** → name it `PDM CMS Publish`
3. Copy the URL

### Vercel

1. **Project Settings → Git → Deploy Hooks**
2. Create a hook for your `main` branch
3. Copy the URL

### Connect to the CMS

1. Open **Site Manager → Settings → Live Site Integration**
2. Paste the deploy hook URL
3. Enter your live site URL
4. Toggle **Auto-deploy** on
5. Click **Save Integration**

---

## 5. Testing

```bash
# Test the content fetch locally
npm run fetch

# Verify the JSON files
cat src/data/posts.json | head -20

# Build the site
npm run build
```

Then publish a test post from the CMS and verify the deploy hook triggers your hosting provider.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `fetch-content.mjs` fails | Check `.env` values, ensure service account has Firestore access |
| Empty `posts.json` | Verify `CMS_SITE_ID` and that posts are set to "published" |
| Deploy hook doesn't fire | Check the URL in Settings → Live Site Integration |
| Build succeeds but content is stale | Clear your CDN cache or check `prebuild` script is running |

---

## Alternative: Client-Side Fetching (SPA)

If your Vite app is a SPA and you want to fetch content at runtime instead of build time:

```js
// Use the Firebase client SDK instead of Admin SDK
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, where, orderBy, getDocs } from 'firebase/firestore';

const app = initializeApp({ /* your config */ });
const db = getFirestore(app);

export async function getPublishedPosts() {
  const q = query(
    collection(db, `sites/YOUR_SITE_ID/blogPosts`),
    where('status', '==', 'published'),
    orderBy('publishDate', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
```

> **Note:** For client-side fetching, ensure your Firestore security rules allow read access for published content.

/**
 * PDM Site Manager — CMS Content Types
 * 
 * Shared type definitions for content read from Firestore.
 * These types match the schema used by the Site Manager CMS store.
 * 
 * Copy this file into any client site that consumes CMS content:
 *   client-site/src/lib/cms-types.ts
 */

// ─── Blog ───────────────────────────────────────────────────────

export interface CMSBlogPost {
  id: string;
  title: string;
  slug: string;
  body: string;
  excerpt: string;
  status: 'published' | 'draft' | 'scheduled';
  category: string;
  featuredImage: string;
  author: string;
  authorRole?: string;
  seoTitle: string;
  metaDescription: string;
  keywords: string;
  publishDate: string;
  createdAt: string;
  updatedAt: string;
  wordCount: number;
}

/** Mapped to the existing BlogPost interface used by the PDM site */
export interface BlogPostView {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  category: string;
  image: string;
  content: string;
  author: {
    name: string;
    role: string;
    avatar?: string;
  };
  audioUrl?: string;
  relatedGearIds?: string[];
  seoTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  structuredData?: any;
  ogImage?: string;
  /** Flag indicating this post came from Firestore CMS */
  _fromCMS?: boolean;
}

// ─── Products ───────────────────────────────────────────────────

export interface CMSProduct {
  id: string;
  name: string;
  slug?: string;
  description: string;
  price: number;
  compareAtPrice?: number;
  category: string;
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  featured: boolean;
  images: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Team ───────────────────────────────────────────────────────

export interface CMSTeamMember {
  id: string;
  name: string;
  role: string;
  bio: string;
  image: string;
  email?: string;
  order: number;
}

// ─── Events ─────────────────────────────────────────────────────

export interface CMSEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  type: string;
  status: string;
  createdAt: string;
}

// ─── Site Settings ──────────────────────────────────────────────

export interface CMSSiteSettings {
  siteName?: string;
  tagline?: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  socialLinks?: Record<string, string>;
}

// ─── Gallery ────────────────────────────────────────────────────

export interface CMSGalleryItem {
  id: string;
  title: string;
  description?: string;
  imageUrl: string;
  category?: string;
  order: number;
  createdAt: string;
}

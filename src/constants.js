/**
 * Power Digital Media — Site Manager
 * Shared Constants
 * 
 * Extracted from store.js — these are app-level constants,
 * not client data. They belong in their own module.
 */

// ─── Character Limits ───────────────────────────────────────────
export const CHAR_LIMITS = {
  // Page fields
  heroHeadline: 60,
  heroSubtext: 120,
  buttonText: 25,
  sectionHeading: 80,
  sectionParagraph: 300,
  serviceCardTitle: 40,
  serviceCardDescription: 150,
  
  // Team
  teamName: 40,
  teamTitle: 50,
  teamBio: 250,
  
  // Events
  eventTitle: 80,
  eventDescription: 500,
  
  // Blog
  blogName: 60,
  blogTagline: 80,
  postTitle: 100,
  postExcerpt: 160,
  postBody: 10000,
  
  // Products
  productName: 80,
  productDescription: 500,
  productPrice: 10,
  
  // Gallery
  albumName: 60,
  albumDescription: 200,
  photoCaption: 100,
  
  // Announcements
  announcementTitle: 80,
  announcementMessage: 200,
  
  // Settings
  metaDescription: 160,
  holidayMessage: 120,
};

// ─── Blog Categories (default sets per industry) ────────────────
export const BLOG_CATEGORY_PRESETS = {
  church: ['Community', 'Faith', 'Events', 'Announcements', 'Youth'],
  business: ['News', 'Tips', 'Behind the Scenes', 'Press', 'Updates'],
  retail: ['New Arrivals', 'Sales', 'How-To', 'Reviews', 'News'],
  restaurant: ['Menu Updates', 'Events', 'Behind the Kitchen', 'News'],
  general: ['News', 'Updates', 'Tips', 'Events', 'Community'],
};

// ─── Product Category Presets ───────────────────────────────────
export const PRODUCT_CATEGORY_PRESETS = {
  church: ['Apparel', 'Books', 'Events', 'Donations', 'Media'],
  business: ['Services', 'Packages', 'Add-ons', 'Memberships'],
  retail: ['Clothing', 'Accessories', 'Home', 'Gifts', 'Sale'],
  general: ['Products', 'Services', 'Packages', 'Digital'],
};

// ─── Module Definitions ─────────────────────────────────────────
// Defines all available modules, their display info, and whether
// they are "always on" or can be toggled by admin/client.
export const MODULE_DEFINITIONS = {
  pages: {
    id: 'pages',
    label: 'Pages',
    description: 'Edit your website page content — headlines, about sections, and calls to action.',
    icon: 'document',
    alwaysActive: true, // Every site has pages
    category: 'core',
  },
  settings: {
    id: 'settings',
    label: 'Settings',
    description: 'Manage contact info, service times, social links, and SEO metadata.',
    icon: 'settings',
    alwaysActive: true,
    category: 'core',
  },
  blog: {
    id: 'blog',
    label: 'Blog',
    description: 'Create and publish blog posts to keep your audience engaged and boost your SEO.',
    icon: 'blog',
    alwaysActive: false,
    category: 'content',
  },
  products: {
    id: 'products',
    label: 'Products',
    description: 'Add a product catalog or store to showcase items, services, or registrations.',
    icon: 'product',
    alwaysActive: false,
    category: 'content',
  },
  events: {
    id: 'events',
    label: 'Events',
    description: 'Create and manage upcoming events with dates, times, and locations.',
    icon: 'calendar',
    alwaysActive: false,
    category: 'content',
  },
  gallery: {
    id: 'gallery',
    label: 'Gallery',
    description: 'Create photo albums to showcase your work, space, or community.',
    icon: 'gallery',
    alwaysActive: false,
    category: 'content',
  },
  announcements: {
    id: 'announcements',
    label: 'Announcements',
    description: 'Post site-wide announcements and urgent banners for your visitors.',
    icon: 'megaphone',
    alwaysActive: false,
    category: 'content',
  },
  team: {
    id: 'team',
    label: 'Team',
    description: 'Add team member profiles with photos, titles, and bios.',
    icon: 'team',
    alwaysActive: false,
    category: 'content',
  },
  submissions: {
    id: 'submissions',
    label: 'Submissions',
    description: 'View and manage form submissions, prayer requests, and contact messages from your website.',
    icon: 'mail',
    alwaysActive: false,
    category: 'engagement',
  },
};

// ─── Admin Config ───────────────────────────────────────────────
// Emails with PDM admin access. These users see the admin CRM
// and can access any client's dashboard.
export const ADMIN_EMAILS = [
  'dameindonald.cor@gmail.com',
  'damein@powerdigitalmedia.org',
];

// ─── Image Slot Requirements ────────────────────────────────────
export const IMAGE_SLOTS = {
  heroBanner: { width: 1920, height: 1080, minWidth: 1200, aspect: '16:9', maxSize: 10 * 1024 * 1024 },
  blogFeatured: { width: 1200, height: 630, minWidth: 800, aspect: '1.9:1', maxSize: 10 * 1024 * 1024 },
  galleryPhoto: { width: 1200, height: null, minWidth: 600, aspect: 'any', maxSize: 10 * 1024 * 1024 },
  teamMember: { width: 400, height: 400, minWidth: 200, aspect: '1:1', maxSize: 5 * 1024 * 1024 },
  productImage: { width: 800, height: 800, minWidth: 400, aspect: '1:1', maxSize: 10 * 1024 * 1024 },
};

// ─── Tier Config ────────────────────────────────────────────────
export const TIER_CONFIG = {
  free: { label: 'Free', aiActions: 0, price: 0 },
  pro: { label: 'AI Pro', aiActions: 50, price: 49 },
  business: { label: 'AI Business', aiActions: 200, price: 99 },
};

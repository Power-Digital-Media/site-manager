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
// NOTE: Modules are NO LONGER tier-gated. All modules are available
// on all tiers. Access is controlled by QUANTITY LIMITS per tier
// (see MODULE_LIMITS below). Pages editing is admin-only.
export const MODULE_DEFINITIONS = {
  pages: {
    id: 'pages',
    label: 'Pages',
    description: 'Edit your website page content — headlines, about sections, and calls to action.',
    icon: 'document',
    alwaysActive: true, // Every site has pages
    category: 'core',
    adminOnly: true,    // Only PDM admin can edit designed pages
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

// ─── Module Quantity Limits Per Tier ─────────────────────────────
// Controls how many records a client can create in each module.
// Infinity = unlimited. These limits are enforced in the Store
// before allowing new record creation.
//
// Strategy: "Soft Limits" — every tier can access every module.
// Free gets a taste, paid gets capacity. This builds stickiness
// and creates natural upsell friction ("I need a 4th product").
export const MODULE_LIMITS = {
  free: {
    blog: 3,
    products: 3,
    events: 1,
    gallery: 1,           // 1 album
    galleryPhotos: 5,     // 5 photos total
    team: 3,
    announcements: 1,     // 1 active announcement
    publishMode: 'approval', // requires PDM admin approval
  },
  pro: {
    blog: Infinity,
    products: 25,
    events: 10,
    gallery: 5,
    galleryPhotos: 30,
    team: 10,
    announcements: 3,
    publishMode: 'self',  // self-publish
  },
  plus: {
    blog: Infinity,
    products: 100,
    events: Infinity,
    gallery: Infinity,
    galleryPhotos: 100,
    team: Infinity,
    announcements: Infinity,
    publishMode: 'self',
  },
  business: {
    blog: Infinity,
    products: Infinity,
    events: Infinity,
    gallery: Infinity,
    galleryPhotos: Infinity,
    team: Infinity,
    announcements: Infinity,
    publishMode: 'self',
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
  imageBanner: { width: 1920, height: 800, minWidth: 1200, aspect: '12:5', maxSize: 10 * 1024 * 1024 },
  aboutImage: { width: 800, height: 600, minWidth: 600, aspect: '4:3', maxSize: 10 * 1024 * 1024 },
  blogFeatured: { width: 1200, height: 630, minWidth: 800, aspect: '1.9:1', maxSize: 10 * 1024 * 1024 },
  galleryPhoto: { width: 1200, height: null, minWidth: 600, aspect: 'any', maxSize: 10 * 1024 * 1024 },
  teamMember: { width: 400, height: 400, minWidth: 200, aspect: '1:1', maxSize: 5 * 1024 * 1024 },
  productImage: { width: 800, height: 800, minWidth: 400, aspect: '1:1', maxSize: 10 * 1024 * 1024 },
};

// ─── Tier Config ────────────────────────────────────────────────
// Free tier uses lightweight models (Gemini Flash) to keep costs ~$0.01/action.
// Pro/Plus/Business use full models for richer output.
// All tiers get access to ALL modules — gated by quantity limits, not access.
export const TIER_CONFIG = {
  free: {
    label: 'Free',
    aiActions: 5,
    price: 0,
    model: 'flash',          // lightweight — keeps cost per free user < $0.05/mo
    imageGen: 'basic',       // basic Gemini / OpenAI gen (free/cheap)
    features: [
      'All modules — 3 blog, 3 products, 1 event',
      '5 AI actions/mo (SEO titles & metas)',
      '1 gallery album (5 photos)',
      '3 team members, 1 announcement',
      'Basic image generation',
      'Admin-approved publishing',
    ],
  },
  pro: {
    label: 'AI Pro',
    aiActions: 30,
    price: 29,
    model: 'pro',
    imageGen: 'premium',     // basic free + premium pay-per-gen
    features: [
      'Unlimited blog posts',
      '25 products, 10 events',
      '5 albums (30 photos), 10 team members',
      '30 AI actions/mo',
      'AI blog drafts & product descriptions',
      'Auto JSON-LD schema & llms.txt',
      'Self-publishing',
      'Premium image generation (pay-per-gen)',
    ],
  },
  plus: {
    label: 'AI Plus',
    aiActions: 100,
    price: 49,
    model: 'pro',
    imageGen: 'premium',
    features: [
      'Everything in AI Pro',
      '100 products, unlimited events & gallery',
      'Unlimited team members & announcements',
      '100 AI actions/mo',
      'Full blog post generation',
      'Social media post generator',
      'Premium image generation (pay-per-gen)',
    ],
  },
  business: {
    label: 'AI Business',
    aiActions: 200,
    price: 99,
    model: 'pro',
    imageGen: 'premium',     // basic free + premium pay-per-gen
    features: [
      'Everything in AI Plus',
      'Unlimited everything',
      '200 AI actions/mo',
      'Competitor keyword analysis',
      'Priority support',
      'Premium image generation (pay-per-gen)',
    ],
  },
};

// ─── Image Generation Pricing ───────────────────────────────────
// Basic gen (Gemini Flash / standard OpenAI) is free for all tiers.
// Premium models are pay-per-generation for Pro and Business users.
export const IMAGE_GEN_PRICING = {
  basic: {
    label: 'Standard',
    models: {
      gemini:  { label: 'Gemini Image Gen',   price: 0, desc: 'Good quality, fast generation' },
      openai:  { label: 'OpenAI Standard',    price: 0, desc: 'Reliable, versatile output' },
    },
  },
  premium: {
    label: 'Premium',
    models: {
      nanoBanana: { label: 'Nano Banana Pro',  price: 0.50, desc: 'Google\'s top-tier — subject consistency, text-in-image, photorealistic' },
      dalle:      { label: 'DALL-E 2.0',       price: 0.75, desc: 'OpenAI\'s best — stunning thumbnails, creative compositions' },
    },
  },
};

// ─── One-Time AI Action Pricing ─────────────────────────────────
// For users who don't want a monthly plan. Priced at ~100x API cost
// so the monthly plan is obviously the better deal. This captures
// revenue from commitment-averse users while making Pro/Business
// look like a steal.
export const AI_ACTION_PRICING = {
  seo:         { label: 'SEO Title + Meta',       price: 0.99, desc: 'AI-optimized title tag and meta description' },
  blogDraft:   { label: 'Blog Post Draft',        price: 2.99, desc: 'Full SEO-optimized blog post with heading structure' },
  blogFull:    { label: 'Full Blog (SEO+AEO+GEO)', price: 4.99, desc: 'Complete blog with schema, breadcrumbs, llms.txt, GEO optimization' },
  productDesc: { label: 'Product Description',    price: 1.99, desc: 'Conversion-optimized product copy with schema' },
  schema:      { label: 'JSON-LD Schema',         price: 0.99, desc: 'Auto-generated structured data for any page' },
  llmsTxt:     { label: 'llms.txt Generation',    price: 0.99, desc: 'AI-readable site summary for LLM discoverability' },
  socialPosts: { label: 'Social Media Posts',      price: 1.99, desc: 'Platform-optimized posts from your content' },
  keywords:    { label: 'Keyword Research',        price: 2.99, desc: 'High-impact keywords for your industry and location' },
};

// ─── Block Registry ─────────────────────────────────────────────
// Defines every block type available in the Page Composer.
// Categories: core (always available), module (requires active module),
// premium (tier-gated integrations that create upsell pressure).
export const BLOCK_REGISTRY = {
  // ── Core Blocks ── Always available on every tier ──
  hero: {
    id: 'hero',
    label: 'Hero Section',
    description: 'Bold headline, subtitle, and call-to-action buttons.',
    icon: 'hero',
    category: 'core',
    linkedModule: null,
    minTier: null,
    fields: 'custom',
    defaultData: {
      eyebrow: '',
      title: '',
      subtitle: '',
      ctaPrimary: 'Get Started',
      ctaSecondary: 'Learn More',
      ctaPrimaryUrl: '',
      ctaSecondaryUrl: '',
      bgImage: '',
      overlayColor: 'rgba(15, 23, 42, 0.70)',
      textColor: '#ffffff',
      overlayEnabled: true,
    },
  },
  about: {
    id: 'about',
    label: 'About Section',
    description: 'Tell visitors who you are and what you believe.',
    icon: 'about',
    category: 'core',
    linkedModule: null,
    minTier: null,
    fields: 'custom',
    defaultData: { eyebrow: '', title: '', description: '', aboutImage: '' },
  },
  leadership: {
    id: 'leadership',
    label: 'Leadership / Team',
    description: 'Showcase your leadership team with photos, bios, and roles.',
    icon: 'leadership',
    category: 'core',
    linkedModule: null,
    minTier: null,
    fields: 'custom',
    memberFields: [
      { key: 'name',  label: 'Name',  type: 'text' },
      { key: 'role',  label: 'Title / Role', type: 'text' },
      { key: 'bio',   label: 'Bio',   type: 'textarea' },
      { key: 'photo', label: 'Headshot', type: 'image', slot: 'teamMember' },
    ],
    defaultData: {
      sectionTitle: 'Our Leadership',
      members: [
        { id: 'm1', name: '', role: '', bio: '', photo: '' },
      ],
    },
  },
  cta: {
    id: 'cta',
    label: 'Call to Action',
    description: 'Closing banner that encourages visitors to take action.',
    icon: 'cta',
    category: 'core',
    linkedModule: null,
    minTier: null,
    fields: [
      { key: 'title', label: 'Headline', type: 'text' },
      { key: 'description', label: 'Subtext', type: 'textarea' },
    ],
    defaultData: { title: '', description: '' },
  },
  textBlock: {
    id: 'textBlock',
    label: 'Text Block',
    description: 'Free-form rich text section for any content.',
    icon: 'text',
    category: 'core',
    linkedModule: null,
    minTier: null,
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'body', label: 'Body Content', type: 'textarea' },
    ],
    defaultData: { title: '', body: '' },
  },
  imageBanner: {
    id: 'imageBanner',
    label: 'Image Banner',
    description: 'Full-width image with optional overlay text.',
    icon: 'image',
    category: 'core',
    linkedModule: null,
    minTier: null,
    fields: 'custom',
    defaultData: { imageUrl: '', overlayText: '', altText: '', overlayEnabled: true, overlayColor: 'rgba(15, 23, 42, 0.50)' },
  },

  // ── Module Blocks ── Requires linked module to be active ──
  blogPreview: {
    id: 'blogPreview',
    label: 'Blog Preview',
    description: 'Show your latest blog posts with thumbnails and excerpts.',
    icon: 'blog',
    category: 'module',
    linkedModule: 'blog',
    minTier: null,
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxPosts', label: 'Posts to Show', type: 'number' },
    ],
    defaultData: { title: 'Latest from the Blog', maxPosts: 3 },
  },
  productShowcase: {
    id: 'productShowcase',
    label: 'Product Showcase',
    description: 'Display featured products or services from your catalog.',
    icon: 'product',
    category: 'module',
    linkedModule: 'products',
    minTier: null,
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxItems', label: 'Products to Show', type: 'number' },
    ],
    defaultData: { title: 'Featured Products', maxItems: 4 },
  },
  eventsFeed: {
    id: 'eventsFeed',
    label: 'Events Feed',
    description: 'Upcoming events with dates, times, and locations.',
    icon: 'calendar',
    category: 'module',
    linkedModule: 'events',
    minTier: null,
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxEvents', label: 'Events to Show', type: 'number' },
    ],
    defaultData: { title: 'Upcoming Events', maxEvents: 3 },
  },
  galleryStrip: {
    id: 'galleryStrip',
    label: 'Gallery Strip',
    description: 'Photo showcase strip from your gallery albums.',
    icon: 'gallery',
    category: 'module',
    linkedModule: 'gallery',
    minTier: null,
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxPhotos', label: 'Photos to Show', type: 'number' },
    ],
    defaultData: { title: 'Photo Gallery', maxPhotos: 6 },
  },
  teamGrid: {
    id: 'teamGrid',
    label: 'Team Grid',
    description: 'Grid of team member cards with photos and titles.',
    icon: 'team',
    category: 'module',
    linkedModule: 'team',
    minTier: null,
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxMembers', label: 'Members to Show', type: 'number' },
    ],
    defaultData: { title: 'Our Team', maxMembers: 6 },
  },

  // ── Premium Integration Blocks ── Tier-gated, locked for Free ──
  youtubeChannel: {
    id: 'youtubeChannel',
    label: 'YouTube Feed',
    description: 'Display video thumbnails from your YouTube channel.',
    icon: 'youtube',
    category: 'premium',
    linkedModule: null,
    minTier: 'pro',
    fields: [
      { key: 'channelUrl', label: 'YouTube Channel URL', type: 'text' },
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxVideos', label: 'Videos to Show', type: 'number' },
    ],
    defaultData: { channelUrl: '', title: 'Watch Our Videos', maxVideos: 4 },
  },
  googleReviews: {
    id: 'googleReviews',
    label: 'Google Reviews',
    description: 'Showcase your Google Business reviews to build trust.',
    icon: 'reviews',
    category: 'premium',
    linkedModule: null,
    minTier: 'pro',
    fields: [
      { key: 'placeId', label: 'Google Place ID', type: 'text' },
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'maxReviews', label: 'Reviews to Show', type: 'number' },
    ],
    defaultData: { placeId: '', title: 'What People Say', maxReviews: 5 },
  },
  donationWidget: {
    id: 'donationWidget',
    label: 'Donation Widget',
    description: 'Accept donations or offerings with preset amounts.',
    icon: 'donation',
    category: 'premium',
    linkedModule: null,
    minTier: 'plus',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'amounts', label: 'Preset Amounts (comma-separated)', type: 'text' },
    ],
    defaultData: { title: 'Give Online', description: '', amounts: '10, 25, 50, 100' },
  },
  socialFeed: {
    id: 'socialFeed',
    label: 'Social Feed',
    description: 'Embed your latest social media posts.',
    icon: 'social',
    category: 'premium',
    linkedModule: null,
    minTier: 'plus',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'platform', label: 'Platform', type: 'text' },
      { key: 'profileUrl', label: 'Profile URL', type: 'text' },
    ],
    defaultData: { title: 'Follow Us', platform: 'instagram', profileUrl: '' },
  },
  podcastPlayer: {
    id: 'podcastPlayer',
    label: 'Podcast Player',
    description: 'Embedded podcast player with your latest episodes.',
    icon: 'podcast',
    category: 'premium',
    linkedModule: null,
    minTier: 'business',
    fields: [
      { key: 'title', label: 'Section Title', type: 'text' },
      { key: 'rssFeed', label: 'Podcast RSS Feed URL', type: 'text' },
      { key: 'maxEpisodes', label: 'Episodes to Show', type: 'number' },
    ],
    defaultData: { title: 'Listen to Our Podcast', rssFeed: '', maxEpisodes: 5 },
  },
};

// ─── Block Limits Per Tier ──────────────────────────────────────
// Controls how many blocks a client can place on a single page.
// Free users get a taste, paid users get capacity.
export const BLOCK_LIMITS = {
  free: 4,
  pro: 8,
  plus: 15,
  business: Infinity,
};

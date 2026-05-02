/**
 * Block Preview Renderers — Visual WYSIWYG Templates
 * Each function returns HTML that visually represents the block
 * as it would appear on the live site.
 */

function esc(text) {
  if (typeof text !== 'string') return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML.replace(/"/g, '&quot;');
}

// ── Core Block Previews ─────────────────────────────────────────

function heroPreview(data) {
  const hasBg = data.bgImage && data.bgImage.length > 0;
  const overlayColor = data.overlayColor || 'rgba(15, 23, 42, 0.70)';
  const textColor = data.textColor || '#ffffff';
  const overlayEnabled = data.overlayEnabled !== false;

  const posX = data.bgPositionX !== undefined ? data.bgPositionX : 50;
  const posY = data.bgPositionY !== undefined ? data.bgPositionY : 50;
  const zoom = data.bgZoom !== undefined ? data.bgZoom : 100;

  const bgStyle = hasBg
    ? `background-image:url(${esc(data.bgImage)});background-size:${zoom}%;background-position:${posX}% ${posY}%;`
    : '';
  const overlayStyle = hasBg && overlayEnabled
    ? `background:${overlayColor};`
    : '';
  const txtStyle = hasBg ? `color:${textColor};` : '';

  return `
    <div class="bp bp--hero ${hasBg ? 'bp--hero-has-bg' : ''}" style="${bgStyle}">
      ${hasBg && overlayEnabled ? `<div class="bp__hero-overlay" style="${overlayStyle}"></div>` : ''}
      <div class="bp__hero-content" style="${txtStyle}">
        ${data.eyebrow ? `<span class="bp__eyebrow" style="${txtStyle}">${esc(data.eyebrow)}</span>` : '<span class="bp__eyebrow bp__placeholder">Your tagline here</span>'}
        <h1 class="bp__hero-title" style="${txtStyle}">${esc(data.title) || '<span class="bp__placeholder">Your Main Headline</span>'}</h1>
        <p class="bp__hero-sub" style="${txtStyle ? `${txtStyle}opacity:0.85;` : ''}">${esc(data.subtitle) || '<span class="bp__placeholder">Add a compelling subtitle that tells visitors what you\'re about</span>'}</p>
        <div class="bp__hero-ctas">
          <span class="bp__btn bp__btn--primary">${esc(data.ctaPrimary) || 'Get Started'}</span>
          <span class="bp__btn bp__btn--secondary" ${hasBg ? `style="border-color:${textColor};color:${textColor};"` : ''}>${esc(data.ctaSecondary) || 'Learn More'}</span>
        </div>
      </div>
      ${!hasBg ? `
        <div class="bp__media-zone bp__media-zone--inline">
          <div class="bp__media-zone-glow"></div>
          <div class="bp__media-zone-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <span class="bp__media-zone-label">Add a background image via the edit panel</span>
          <span class="bp__media-zone-sub">Click the pencil icon above to upload your hero image</span>
        </div>` : ''}
    </div>`;
}

function aboutPreview(data) {
  const hasImage = data.aboutImage && data.aboutImage.length > 0;
  return `
    <div class="bp bp--about">
      <div class="bp__about-content">
        ${data.eyebrow ? `<span class="bp__eyebrow">${esc(data.eyebrow)}</span>` : ''}
        <h2 class="bp__section-title">${esc(data.title) || '<span class="bp__placeholder">About Us</span>'}</h2>
        <p class="bp__text">${esc(data.description) || '<span class="bp__placeholder">Tell your visitors who you are, what you believe, and why they should care...</span>'}</p>
      </div>
      <div class="bp__about-visual">
        ${hasImage
          ? `<img src="${esc(data.aboutImage)}" alt="About section" class="bp__about-img" />`
          : `<div class="bp__media-zone bp__media-zone--square">
              <div class="bp__media-zone-glow"></div>
              <div class="bp__media-zone-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="28">
                  <rect x="3" y="3" width="18" height="18" rx="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
              </div>
              <span class="bp__media-zone-label">Section Image</span>
              <span class="bp__media-zone-sub">Edit to upload a photo</span>
            </div>`
        }
      </div>
    </div>`;
}

function leadershipPreview(data) {
  const title = data.sectionTitle || data.eyebrow || 'Our Leadership';
  const members = data.members;
  const avatarSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="36"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;

  // ── Backwards compat: old flat format (name/quote/bio) ──
  if (!members || !Array.isArray(members)) {
    return `
      <div class="bp bp--leadership">
        <div class="bp__leadership-header">
          <span class="bp__eyebrow">Meet the Team</span>
          <h2 class="bp__section-title">${esc(title)}</h2>
        </div>
        <div class="bp__leader-grid">
          <div class="bp__leader-member">
            <div class="bp__leader-photo-wrap"><div class="bp__avatar bp__avatar--lg">${avatarSvg}</div></div>
            <div class="bp__leader-info">
              <h4 class="bp__leader-name">${esc(data.name) || '<span class="bp__placeholder">Leader Name</span>'}</h4>
              ${data.quote ? `<span class="bp__leader-role">${esc(data.quote)}</span>` : '<span class="bp__leader-role bp__placeholder">Title / Role</span>'}
              ${data.bio ? `<p class="bp__leader-bio">${esc(data.bio)}</p>` : ''}
            </div>
          </div>
        </div>
      </div>`;
  }

  // ── New multi-member format ──
  const cards = members.map(m => {
    const hasPhoto = m.photo && m.photo.length > 0;
    return `
      <div class="bp__leader-member">
        <div class="bp__leader-photo-wrap">
          ${hasPhoto
            ? `<img src="${esc(m.photo)}" alt="${esc(m.name)}" class="bp__leader-photo" />`
            : `<div class="bp__avatar bp__avatar--lg">${avatarSvg}</div>`
          }
        </div>
        <div class="bp__leader-info">
          <h4 class="bp__leader-name">${esc(m.name) || '<span class="bp__placeholder">Name</span>'}</h4>
          ${m.role ? `<span class="bp__leader-role">${esc(m.role)}</span>` : '<span class="bp__leader-role bp__placeholder">Role</span>'}
          ${m.bio ? `<p class="bp__leader-bio">${esc(m.bio)}</p>` : ''}
        </div>
      </div>`;
  }).join('');

  return `
    <div class="bp bp--leadership">
      <div class="bp__leadership-header">
        <span class="bp__eyebrow">Meet the Team</span>
        <h2 class="bp__section-title">${esc(title)}</h2>
      </div>
      <div class="bp__leader-grid">${cards}</div>
    </div>`;
}

function ctaPreview(data) {
  return `
    <div class="bp bp--cta">
      <h2 class="bp__cta-title">${esc(data.title) || '<span class="bp__placeholder">Ready to Get Started?</span>'}</h2>
      <p class="bp__cta-desc">${esc(data.description) || '<span class="bp__placeholder">Add a compelling call to action</span>'}</p>
      <span class="bp__btn bp__btn--primary">Take Action</span>
    </div>`;
}

function textBlockPreview(data) {
  return `
    <div class="bp bp--text">
      <h2 class="bp__section-title">${esc(data.title) || '<span class="bp__placeholder">Section Title</span>'}</h2>
      <p class="bp__text">${esc(data.body) || '<span class="bp__placeholder">Add your content here. This free-form text block can hold any information you want to share with visitors...</span>'}</p>
    </div>`;
}

function imageBannerPreview(data) {
  const hasImage = data.imageUrl && data.imageUrl.length > 0;
  const overlayColor = data.overlayColor || 'rgba(15, 23, 42, 0.50)';
  const overlayEnabled = data.overlayEnabled !== false;

  const posX = data.bgPositionX !== undefined ? data.bgPositionX : 50;
  const posY = data.bgPositionY !== undefined ? data.bgPositionY : 50;
  const zoom = data.bgZoom !== undefined ? data.bgZoom : 100;

  return `
    <div class="bp bp--image-banner ${hasImage ? 'bp--banner-has-bg' : ''}" ${hasImage ? `style="background-image:url(${esc(data.imageUrl)});background-size:${zoom}%;background-position:${posX}% ${posY}%;"` : ''}>
      ${hasImage && overlayEnabled ? `<div class="bp__banner-overlay-layer" style="background:${overlayColor};"></div>` : ''}
      <div class="bp__banner-overlay">
        ${data.overlayText ? `<h2 class="bp__banner-text">${esc(data.overlayText)}</h2>` : '<span class="bp__placeholder">Full-Width Image Banner</span>'}
      </div>
      ${!hasImage ? `
        <div class="bp__media-zone bp__media-zone--banner">
          <div class="bp__media-zone-glow"></div>
          <div class="bp__media-zone-icon bp__media-zone-icon--lg">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
          <span class="bp__media-zone-label">Add a Banner Image</span>
          <span class="bp__media-zone-sub">Click the pencil icon to upload a full-width background</span>
        </div>` : ''}
    </div>`;
}

// ── Module Block Previews ───────────────────────────────────────

function blogPreviewBlock(data) {
  const count = data.maxPosts || 3;
  const cards = Array.from({ length: Math.min(count, 3) }, (_, i) => `
    <div class="bp__card">
      <div class="bp__card-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg></div>
      <div class="bp__card-body">
        <span class="bp__card-date">Blog Post ${i + 1}</span>
        <span class="bp__card-title">Post Title Here</span>
      </div>
    </div>`).join('');
  return `
    <div class="bp bp--blog">
      <h2 class="bp__section-title">${esc(data.title) || 'Latest from the Blog'}</h2>
      <div class="bp__card-grid bp__card-grid--3">${cards}</div>
      <span class="bp__module-badge">📚 Blog Module</span>
    </div>`;
}

function productShowcasePreview(data) {
  const count = data.maxItems || 4;
  const cards = Array.from({ length: Math.min(count, 4) }, (_, i) => `
    <div class="bp__card">
      <div class="bp__card-img"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="24"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg></div>
      <div class="bp__card-body">
        <span class="bp__card-title">Product ${i + 1}</span>
        <span class="bp__card-price">$XX.XX</span>
      </div>
    </div>`).join('');
  return `
    <div class="bp bp--products">
      <h2 class="bp__section-title">${esc(data.title) || 'Featured Products'}</h2>
      <div class="bp__card-grid bp__card-grid--4">${cards}</div>
      <span class="bp__module-badge">🛍️ Products Module</span>
    </div>`;
}

function eventsFeedPreview(data) {
  const count = data.maxEvents || 3;
  const items = Array.from({ length: Math.min(count, 3) }, (_, i) => `
    <div class="bp__event-item">
      <div class="bp__event-date"><span class="bp__event-month">JAN</span><span class="bp__event-day">${15 + i}</span></div>
      <div class="bp__event-info"><span class="bp__event-title">Upcoming Event ${i + 1}</span><span class="bp__event-meta">10:00 AM · Location</span></div>
    </div>`).join('');
  return `
    <div class="bp bp--events">
      <h2 class="bp__section-title">${esc(data.title) || 'Upcoming Events'}</h2>
      <div class="bp__event-list">${items}</div>
      <span class="bp__module-badge">📅 Events Module</span>
    </div>`;
}

function galleryStripPreview(data) {
  const count = data.maxPhotos || 6;
  const photos = Array.from({ length: Math.min(count, 6) }, () =>
    '<div class="bp__gallery-thumb"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>'
  ).join('');
  return `
    <div class="bp bp--gallery">
      <h2 class="bp__section-title">${esc(data.title) || 'Photo Gallery'}</h2>
      <div class="bp__gallery-grid">${photos}</div>
      <span class="bp__module-badge">📸 Gallery Module</span>
    </div>`;
}

function teamGridPreview(data) {
  const count = data.maxMembers || 6;
  const members = Array.from({ length: Math.min(count, 6) }, (_, i) => `
    <div class="bp__team-member">
      <div class="bp__avatar bp__avatar--sm"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="20"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>
      <span class="bp__team-name">Member ${i + 1}</span>
      <span class="bp__team-role">Role</span>
    </div>`).join('');
  return `
    <div class="bp bp--team">
      <h2 class="bp__section-title">${esc(data.title) || 'Our Team'}</h2>
      <div class="bp__team-grid">${members}</div>
      <span class="bp__module-badge">👥 Team Module</span>
    </div>`;
}

// ── Premium Block Previews ──────────────────────────────────────

function youtubePreview(data) {
  const count = data.maxVideos || 4;
  const vids = Array.from({ length: Math.min(count, 4) }, () =>
    '<div class="bp__video-thumb"><div class="bp__play-btn">▶</div></div>'
  ).join('');
  return `
    <div class="bp bp--youtube">
      <h2 class="bp__section-title">${esc(data.title) || 'Watch Our Videos'}</h2>
      ${data.channelUrl ? `<p class="bp__text bp__text--sm">${esc(data.channelUrl)}</p>` : ''}
      <div class="bp__card-grid bp__card-grid--4">${vids}</div>
      <span class="bp__premium-badge">⭐ Pro</span>
    </div>`;
}

function googleReviewsPreview(data) {
  const cards = Array.from({ length: Math.min(data.maxReviews || 3, 3) }, (_, i) => `
    <div class="bp__review-card">
      <div class="bp__review-stars">★★★★★</div>
      <p class="bp__review-text">"Great experience! Highly recommended."</p>
      <span class="bp__review-author">Reviewer ${i + 1}</span>
    </div>`).join('');
  return `
    <div class="bp bp--reviews">
      <h2 class="bp__section-title">${esc(data.title) || 'What People Say'}</h2>
      <div class="bp__review-row">${cards}</div>
      <span class="bp__premium-badge">⭐ Pro</span>
    </div>`;
}

function donationPreview(data) {
  const amounts = (data.amounts || '10, 25, 50, 100').split(',').map(a => a.trim());
  return `
    <div class="bp bp--donation">
      <h2 class="bp__section-title">${esc(data.title) || 'Give Online'}</h2>
      <p class="bp__text">${esc(data.description) || '<span class="bp__placeholder">Support our mission</span>'}</p>
      <div class="bp__donation-amounts">${amounts.map(a => `<span class="bp__donation-amt">$${a}</span>`).join('')}</div>
      <span class="bp__btn bp__btn--primary">Donate Now</span>
      <span class="bp__premium-badge">⭐ Plus</span>
    </div>`;
}

function socialFeedPreview(data) {
  const posts = Array.from({ length: 3 }, () =>
    '<div class="bp__social-post"><div class="bp__social-img"></div><div class="bp__social-caption">Social post preview</div></div>'
  ).join('');
  return `
    <div class="bp bp--social">
      <h2 class="bp__section-title">${esc(data.title) || 'Follow Us'}</h2>
      ${data.platform ? `<p class="bp__text bp__text--sm">Platform: ${esc(data.platform)}</p>` : ''}
      <div class="bp__social-grid">${posts}</div>
      <span class="bp__premium-badge">⭐ Plus</span>
    </div>`;
}

function podcastPreview(data) {
  const eps = Array.from({ length: Math.min(data.maxEpisodes || 3, 3) }, (_, i) => `
    <div class="bp__podcast-ep">
      <span class="bp__podcast-play">▶</span>
      <div class="bp__podcast-info"><span class="bp__podcast-title">Episode ${i + 1}</span><span class="bp__podcast-dur">45:00</span></div>
      <div class="bp__podcast-bar"><div class="bp__podcast-progress"></div></div>
    </div>`).join('');
  return `
    <div class="bp bp--podcast">
      <h2 class="bp__section-title">${esc(data.title) || 'Listen to Our Podcast'}</h2>
      <div class="bp__podcast-list">${eps}</div>
      <span class="bp__premium-badge">⭐ Business</span>
    </div>`;
}

// ── Export Map ───────────────────────────────────────────────────

export const BLOCK_PREVIEW_MAP = {
  hero: heroPreview,
  about: aboutPreview,
  leadership: leadershipPreview,
  cta: ctaPreview,
  textBlock: textBlockPreview,
  imageBanner: imageBannerPreview,
  blogPreview: blogPreviewBlock,
  productShowcase: productShowcasePreview,
  eventsFeed: eventsFeedPreview,
  galleryStrip: galleryStripPreview,
  teamGrid: teamGridPreview,
  youtubeChannel: youtubePreview,
  googleReviews: googleReviewsPreview,
  donationWidget: donationPreview,
  socialFeed: socialFeedPreview,
  podcastPlayer: podcastPreview,
};

export function renderBlockPreview(blockType, data) {
  const renderer = BLOCK_PREVIEW_MAP[blockType];
  if (!renderer) return `<div class="bp bp--unknown"><p>Unknown block type: ${blockType}</p></div>`;
  return renderer(data || {});
}

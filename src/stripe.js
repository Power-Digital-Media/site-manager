/**
 * Power Digital Media — Stripe Client
 * 
 * Thin wrapper around Stripe.js for checkout sessions and portal access.
 * Stripe.js is loaded via CDN in index.html (recommended by Stripe).
 * 
 * Cloud Functions handle all sensitive operations — this module
 * only redirects users to Stripe-hosted pages.
 */

import { Store } from './store.js';
import { auth } from './firebase.js';
import { showToast } from './components/toast.js';

// ─── Config ─────────────────────────────────────────────────────
// Cloud Function URLs — auto-detected from Firebase project
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'power-digital-media';
const REGION = 'us-central1';
const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL 
  || `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

const ENDPOINTS = {
  checkout: `${FUNCTIONS_BASE}/createCheckoutSession`,
  portal:   `${FUNCTIONS_BASE}/createPortalSession`,
};

// ─── Helpers ────────────────────────────────────────────────────

/** Get the current user's auth token for server verification */
async function getUserToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.getIdToken();
}

/** POST to a Cloud Function endpoint */
async function callFunction(endpoint, body) {
  const token = await getUserToken();
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Public API ─────────────────────────────────────────────────

/**
 * Start a Stripe Checkout session and redirect the user.
 * 
 * @param {'subscription'|'oneTime'|'creditPack'|'imageGen'} sessionType
 * @param {Object} params - Session-specific parameters
 * @param {string} params.plan       - 'pro'|'business' (for subscription)
 * @param {string} params.actionKey  - e.g. 'seo', 'blogDraft' (for oneTime)
 * @param {string} params.actionLabel - Human label for the action
 * @param {number} params.price      - Dollar amount (for oneTime/imageGen/creditPack)
 * @param {number} params.credits    - Number of credits (for creditPack)
 * @param {string} params.model      - Image model key (for imageGen)
 */
export async function startCheckout(sessionType, params = {}) {
  const siteId = Store.getSiteId();
  const user = auth.currentUser;

  if (!siteId || !user) {
    showToast('Please log in to make a purchase.', 'error');
    return;
  }

  showToast('Opening checkout...', 'info');

  try {
    const response = await callFunction(ENDPOINTS.checkout, {
      sessionType,
      siteId,
      uid: user.uid,
      email: user.email,
      ...params,
    });

    if (response.url) {
      // Redirect to Stripe Checkout
      window.location.href = response.url;
    } else {
      showToast('Failed to create checkout session.', 'error');
    }
  } catch (err) {
    console.error('Stripe checkout error:', err);
    showToast(err.message || 'Payment system error. Please try again.', 'error');
  }
}

/**
 * Open Stripe Customer Portal (manage subscription, payment methods, cancel).
 */
export async function openPortal() {
  const siteId = Store.getSiteId();

  if (!siteId) {
    showToast('Please log in first.', 'error');
    return;
  }

  showToast('Opening billing portal...', 'info');

  try {
    const response = await callFunction(ENDPOINTS.portal, { siteId });

    if (response.url) {
      window.location.href = response.url;
    } else {
      showToast('Failed to open billing portal.', 'error');
    }
  } catch (err) {
    console.error('Portal error:', err);
    showToast(err.message || 'Could not open billing portal.', 'error');
  }
}

/**
 * Handle Stripe redirect results (called on page load).
 * Checks URL params for stripe=success|cancel after checkout redirect.
 */
export function handleStripeRedirect() {
  const params = new URLSearchParams(window.location.search);
  const stripeResult = params.get('stripe');

  if (stripeResult === 'success') {
    showToast('🎉 Payment successful! Your account is being updated...', 'success');
    // Clean the URL
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  } else if (stripeResult === 'cancel') {
    showToast('Payment cancelled. No charge was made.', 'info');
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
  }
}

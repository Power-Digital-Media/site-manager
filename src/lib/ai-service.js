/**
 * Power Digital Media — AI Service
 * 
 * Client-side module for calling the runAiAction Cloud Function.
 * Handles authentication, request formatting, and error handling.
 * 
 * Usage:
 *   import { runAiAction } from '../lib/ai-service.js';
 *   const result = await runAiAction('blogDraft', { title: 'My Post', ... });
 */

import { auth } from '../firebase.js';
import { Store } from '../store.js';

// ─── Config ─────────────────────────────────────────────────────
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'power-digital-media';
const REGION = 'us-central1';
const FUNCTIONS_BASE = import.meta.env.VITE_FUNCTIONS_URL
  || `https://${REGION}-${PROJECT_ID}.cloudfunctions.net`;

const AI_ENDPOINT = `${FUNCTIONS_BASE}/runAiAction`;

// ─── Public API ─────────────────────────────────────────────────

/**
 * Run an AI content generation action.
 * 
 * @param {string} actionKey - One of: seo, blogDraft, blogFull, productDesc, schema, llmsTxt, socialPosts, keywords
 * @param {Object} context - Action-specific context (title, excerpt, body, etc.)
 * @returns {Promise<{success: boolean, actionKey: string, result: Object, creditsUsed: number, creditsRemaining: number}>}
 * @throws {Error} with a user-friendly message on failure
 */
export async function runAiAction(actionKey, context = {}) {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Please log in to use AI tools.');
  }

  const siteId = Store.getSiteId();
  if (!siteId) {
    throw new Error('No site loaded. Please select a site first.');
  }

  // Add site-level context automatically
  const site = Store.getSite();
  const enrichedContext = {
    siteName: site.name || '',
    industry: site.industry || 'general business',
    ...context,
  };

  const token = await user.getIdToken();

  const res = await fetch(AI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      actionKey,
      context: enrichedContext,
      siteId,
      uid: user.uid,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

    // Specific handling for payment-required (no credits)
    if (res.status === 402) {
      throw new AiCreditError(err.error || 'Not enough credits.', err.remaining, err.cost);
    }

    throw new Error(err.error || `AI generation failed (${res.status}).`);
  }

  const data = await res.json();

  // Update the local credit cache so the UI reflects immediately
  if (data.creditsRemaining != null) {
    Store._updateCreditsCache(data.creditsRemaining);
  }

  return data;
}

/**
 * Custom error class for credit-related failures.
 * Lets the UI distinguish "buy more credits" from generic errors.
 */
export class AiCreditError extends Error {
  constructor(message, remaining, cost) {
    super(message);
    this.name = 'AiCreditError';
    this.remaining = remaining;
    this.cost = cost;
  }
}

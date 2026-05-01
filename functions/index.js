/**
 * Power Digital Media — Cloud Functions
 * 
 * syncUserClaims:        Sync Firestore user role → Auth custom claims
 * createCheckoutSession: Create a Stripe Checkout session (subscriptions + one-time)
 * stripeWebhook:         Handle Stripe webhook events (payment success, subscription changes)
 * createPortalSession:   Open Stripe Customer Portal for subscription management
 * runAiAction:           Generate AI content (SEO, blog drafts, schema, etc.) via Gemini
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { logger } = require('firebase-functions');
const { defineSecret } = require('firebase-functions/params');

initializeApp();
const db = getFirestore();

// ─── Secrets (set via: firebase functions:secrets:set SECRET_NAME) ───────────
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const geminiApiKey = defineSecret('GEMINI_API_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// ─── Tier → Stripe Price ID mapping ─────────────────────────────
// Set these after creating products in Stripe Dashboard.
// For now, use placeholders — replace with real price IDs.
const PLAN_PRICE_IDS = {
  pro:      process.env.STRIPE_PRICE_PRO      || 'price_1TPbZzII04nd8gjIAd96UdLH',
  plus:     process.env.STRIPE_PRICE_PLUS     || 'price_PLUS_PLACEHOLDER',  // TODO: Create in Stripe Dashboard
  business: process.env.STRIPE_PRICE_BUSINESS  || 'price_1TPbbBII04nd8gjIgRKuj1Wn',
};

// ─── Tier config (mirror of frontend constants.js) ──────────────
const TIER_ACTIONS = {
  free: 5,
  pro: 30,
  plus: 100,
  business: 200,
};

// ═════════════════════════════════════════════════════════════════
// 1. SYNC USER CLAIMS (existing)
// ═════════════════════════════════════════════════════════════════

exports.syncUserClaims = onDocumentWritten('users/{uid}', async (event) => {
  const uid = event.params.uid;
  const afterData = event.data?.after?.data();

  // If the document was deleted, clear claims
  if (!afterData) {
    logger.info(`User doc deleted for ${uid}, clearing custom claims`);
    await getAuth().setCustomUserClaims(uid, {});
    return;
  }

  const newClaims = {
    role: afterData.role || 'client',
    siteId: afterData.siteId || null,
  };

  // Check if claims actually changed to avoid unnecessary writes
  try {
    const user = await getAuth().getUser(uid);
    const currentClaims = user.customClaims || {};

    if (currentClaims.role === newClaims.role && currentClaims.siteId === newClaims.siteId) {
      logger.info(`Claims unchanged for ${uid}, skipping`);
      return;
    }
  } catch (err) {
    logger.warn(`Could not fetch current user ${uid}:`, err.message);
  }

  // Set the custom claims
  await getAuth().setCustomUserClaims(uid, newClaims);
  logger.info(`✅ Custom claims set for ${uid}:`, newClaims);
});

// ═════════════════════════════════════════════════════════════════
// 2. CREATE CHECKOUT SESSION
// ═════════════════════════════════════════════════════════════════

exports.createCheckoutSession = onRequest(
  { cors: true, secrets: [stripeSecretKey] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = require('stripe')(stripeSecretKey.value());
    const { sessionType, siteId, plan, actionKey, actionLabel, price, model, uid, email } = req.body;

    if (!siteId || !uid) {
      return res.status(400).json({ error: 'Missing siteId or uid' });
    }

    const origin = req.headers.origin || 'https://manage.powerdigitalmedia.com';
    const successUrl = `${origin}/?stripe=success&session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${origin}/?stripe=cancel`;

    try {
      // Get or create Stripe customer
      const siteRef = db.doc(`sites/${siteId}`);
      const siteSnap = await siteRef.get();
      const siteData = siteSnap.data() || {};
      let customerId = siteData.stripeCustomerId;

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: email || siteData.ownerEmail || '',
          metadata: { siteId, uid, siteName: siteData.name || '' },
        });
        customerId = customer.id;
        await siteRef.update({ stripeCustomerId: customerId });
      }

      let sessionConfig = {
        customer: customerId,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: { siteId, uid, sessionType },
      };

      // ── Subscription checkout ──────────────────────────────────
      if (sessionType === 'subscription') {
        const priceId = PLAN_PRICE_IDS[plan];
        if (!priceId || priceId.includes('placeholder')) {
          return res.status(400).json({ 
            error: 'Stripe products not configured yet. Set STRIPE_PRICE_PRO and STRIPE_PRICE_BUSINESS.' 
          });
        }

        sessionConfig = {
          ...sessionConfig,
          mode: 'subscription',
          line_items: [{ price: priceId, quantity: 1 }],
          metadata: { ...sessionConfig.metadata, plan },
        };
      }

      // ── One-time AI action purchase ────────────────────────────
      else if (sessionType === 'oneTime') {
        const unitAmount = Math.round(parseFloat(price) * 100); // cents
        sessionConfig = {
          ...sessionConfig,
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: actionLabel || `AI Action: ${actionKey}`,
                description: `One-time AI action purchase for ${siteData.name || 'your site'}`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }],
          metadata: { ...sessionConfig.metadata, actionKey, creditsToAdd: '1' },
        };

        // Full Blog Suite = 3 credits worth, give 3
        if (actionKey === 'blogFull') {
          sessionConfig.metadata.creditsToAdd = '3';
        }
      }

      // ── Credit pack purchase (e.g. 5 credits for $9.99) ───────
      else if (sessionType === 'creditPack') {
        const credits = parseInt(req.body.credits || '5', 10);
        const packPrice = parseFloat(price || '9.99');
        const unitAmount = Math.round(packPrice * 100);
        sessionConfig = {
          ...sessionConfig,
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `AI Credit Pack (${credits} Credits)`,
                description: `${credits} AI action credits for ${siteData.name || 'your site'}`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }],
          metadata: { ...sessionConfig.metadata, creditsToAdd: String(credits) },
        };
      }

      // ── Premium image generation purchase ──────────────────────
      else if (sessionType === 'imageGen') {
        const unitAmount = Math.round(parseFloat(price) * 100);
        sessionConfig = {
          ...sessionConfig,
          mode: 'payment',
          line_items: [{
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Premium Image: ${model || 'AI Model'}`,
                description: `Premium AI image generation`,
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }],
          metadata: { ...sessionConfig.metadata, actionKey: 'imageGen', model },
        };
      }

      else {
        return res.status(400).json({ error: `Unknown session type: ${sessionType}` });
      }

      const session = await stripe.checkout.sessions.create(sessionConfig);
      logger.info(`✅ Checkout session created: ${session.id} (${sessionType})`);
      return res.json({ url: session.url, sessionId: session.id });

    } catch (err) {
      logger.error('Checkout session error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════
// 3. STRIPE WEBHOOK
// ═════════════════════════════════════════════════════════════════

exports.stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).send('Method not allowed');
    }

    const stripe = require('stripe')(stripeSecretKey.value());
    const sig = req.headers['stripe-signature'];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err) {
      logger.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    logger.info(`Stripe event received: ${event.type}`);

    try {
      switch (event.type) {
        // ── Payment completed (one-time or first subscription) ───
        case 'checkout.session.completed': {
          const session = event.data.object;
          const { siteId, sessionType, plan, actionKey, creditsToAdd, model } = session.metadata || {};

          if (!siteId) {
            logger.warn('No siteId in session metadata, skipping');
            break;
          }

          const siteRef = db.doc(`sites/${siteId}`);

          if (sessionType === 'subscription' && plan) {
            // Upgrade tier + reset credits
            const tierActions = TIER_ACTIONS[plan] || 30;
            await siteRef.update({
              tier: plan,
              aiActionsRemaining: tierActions,
              aiActionsResetDate: new Date().toISOString(),
              stripeSubscriptionId: session.subscription || null,
            });
            logger.info(`✅ Site ${siteId} upgraded to ${plan} (${tierActions} credits)`);
          }

          else if (sessionType === 'oneTime' || sessionType === 'imageGen' || sessionType === 'creditPack') {
            // Add purchased credits (or just mark as paid for image gen)
            const credits = parseInt(creditsToAdd || '0', 10);
            if (credits > 0) {
              await siteRef.update({
                aiActionsRemaining: FieldValue.increment(credits),
              });
              logger.info(`✅ Added ${credits} credits to site ${siteId}`);
            }

            // Log the purchase
            const purchaseRef = db.collection(`sites/${siteId}/purchases`).doc();
            await purchaseRef.set({
              type: sessionType,
              actionKey: actionKey || null,
              model: model || null,
              amount: session.amount_total / 100,
              currency: session.currency,
              stripeSessionId: session.id,
              createdAt: new Date().toISOString(),
            });
          }
          break;
        }

        // ── Subscription cancelled ───────────────────────────────
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          // Find site by stripeSubscriptionId
          const sitesSnap = await db.collection('sites')
            .where('stripeSubscriptionId', '==', sub.id)
            .get();

          for (const siteDoc of sitesSnap.docs) {
            await siteDoc.ref.update({
              tier: 'free',
              aiActionsRemaining: TIER_ACTIONS.free,
              stripeSubscriptionId: null,
            });
            logger.info(`✅ Site ${siteDoc.id} downgraded to free (subscription cancelled)`);
          }
          break;
        }

        // ── Payment failed on subscription renewal ───────────────
        case 'invoice.payment_failed': {
          const invoice = event.data.object;
          logger.warn(`⚠️ Payment failed for customer ${invoice.customer}, invoice ${invoice.id}`);
          // Don't immediately downgrade — Stripe retries. 
          // The subscription.deleted event handles actual cancellation.
          break;
        }

        default:
          logger.info(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      logger.error('Webhook handler error:', err);
      return res.status(500).send('Webhook handler error');
    }

    return res.json({ received: true });
  }
);

// ═════════════════════════════════════════════════════════════════
// 4. CREATE CUSTOMER PORTAL SESSION
// ═════════════════════════════════════════════════════════════════

exports.createPortalSession = onRequest(
  { cors: true, secrets: [stripeSecretKey] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const stripe = require('stripe')(stripeSecretKey.value());
    const { siteId } = req.body;

    if (!siteId) {
      return res.status(400).json({ error: 'Missing siteId' });
    }

    try {
      const siteRef = db.doc(`sites/${siteId}`);
      const siteSnap = await siteRef.get();
      const siteData = siteSnap.data() || {};
      const customerId = siteData.stripeCustomerId;

      if (!customerId) {
        return res.status(400).json({ error: 'No Stripe customer found. Make a purchase first.' });
      }

      const origin = req.headers.origin || 'https://manage.powerdigitalmedia.com';
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/`,
      });

      return res.json({ url: portalSession.url });
    } catch (err) {
      logger.error('Portal session error:', err);
      return res.status(500).json({ error: err.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════
// 5. RUN AI ACTION (Gemini-powered content generation)
// ═════════════════════════════════════════════════════════════════

/**
 * Build an action-specific prompt from context.
 * Each prompt is crafted for a specific output shape.
 */
function buildPrompt(actionKey, context) {
  const { siteName, industry, title, excerpt, body, category, productName, productDescription, productPrice, url } = context || {};
  const site = siteName || 'the website';
  const ind = industry || 'general business';

  const prompts = {
    seo: `You are an SEO expert. Generate an optimized SEO title tag and meta description for the following content.

Business: ${site} (${ind})
Page title: ${title || 'Untitled'}
Content excerpt: ${excerpt || body?.slice(0, 300) || 'No content provided'}

Rules:
- Title tag: 50-60 characters, include primary keyword near the front
- Meta description: 140-155 characters, include a call to action
- Use natural language, not keyword stuffing

Respond in this exact JSON format:
{"seoTitle": "...", "metaDescription": "..."}`,

    blogDraft: `You are a professional blog writer for ${site}, a ${ind} business.

Write a complete SEO-optimized blog post about: ${title || 'a topic relevant to our audience'}
${category ? `Category: ${category}` : ''}
${excerpt ? `Brief/direction: ${excerpt}` : ''}

Rules:
- 800-1200 words
- Use markdown formatting (## for h2, ### for h3, **bold**, *italic*, bullet lists)
- Include an engaging introduction and conclusion
- Natural keyword placement throughout
- Write in a professional but approachable tone
- Include 3-5 subheadings

Respond in this exact JSON format:
{"title": "...", "excerpt": "A 1-2 sentence summary for post cards and SEO (under 160 chars)", "body": "...full markdown body...", "slug": "url-friendly-slug"}`,

    blogFull: `You are a full-stack content strategist for ${site}, a ${ind} business.

Create a complete content package for a blog post about: ${title || 'a topic relevant to our audience'}
${category ? `Category: ${category}` : ''}
${excerpt ? `Brief/direction: ${excerpt}` : ''}

Generate ALL of the following:
1. SEO-optimized blog post (800-1200 words, markdown formatted)
2. SEO title tag (50-60 chars) and meta description (140-155 chars)
3. JSON-LD BlogPosting schema
4. An llms.txt entry summarizing this content for AI discoverability

Respond in this exact JSON format:
{
  "title": "...",
  "excerpt": "1-2 sentence summary under 160 chars",
  "body": "...full markdown body...",
  "slug": "url-friendly-slug",
  "seoTitle": "...",
  "metaDescription": "...",
  "schema": "...valid JSON-LD BlogPosting schema as a string...",
  "llmsTxt": "...3-5 line summary for llms.txt..."
}`,

    productDesc: `You are a conversion-focused copywriter for ${site}, a ${ind} business.

Write a compelling product description for:
Product: ${productName || title || 'Untitled Product'}
${category ? `Category: ${category}` : ''}
${productPrice ? `Price: $${productPrice}` : ''}
${productDescription ? `Current description: ${productDescription}` : ''}

Rules:
- 150-300 words
- Lead with the primary benefit
- Include 3-5 key features
- End with a subtle call to action
- Use sensory and emotional language
- Professional but engaging tone

Respond in this exact JSON format:
{"description": "..."}`,

    schema: `You are a structured data specialist.

Generate valid JSON-LD schema for the following content:

Business: ${site} (${ind})
Content type: ${context.pageType || 'WebPage'}
Title: ${title || 'Untitled'}
${excerpt ? `Description: ${excerpt}` : ''}
${url ? `URL: ${url}` : ''}
${productName ? `Product: ${productName}` : ''}
${productPrice ? `Price: $${productPrice}` : ''}

Rules:
- Use Schema.org vocabulary
- Include @context, @type, and all relevant properties
- For blog posts use BlogPosting, for products use Product
- Include breadcrumb if applicable
- Valid JSON only

Respond in this exact JSON format:
{"jsonLd": "...valid JSON-LD as a string..."}`,

    llmsTxt: `You are an AI discoverability specialist for ${site}, a ${ind} business.

Generate an llms.txt file that helps AI systems understand this website.
${title ? `Current page: ${title}` : ''}
${excerpt ? `About: ${excerpt}` : ''}
${body ? `Content preview: ${body.slice(0, 500)}` : ''}

Rules:
- Follow the llms.txt standard format
- Include: site name, description, key topics, content types
- Keep it concise (10-20 lines)
- Focus on what makes this business unique
- Include relevant keywords naturally

Respond in this exact JSON format:
{"llmsTxt": "...full llms.txt content..."}`,

    socialPosts: `You are a social media manager for ${site}, a ${ind} business.

Create platform-optimized social media posts promoting this content:
Title: ${title || 'Untitled'}
${excerpt ? `Summary: ${excerpt}` : ''}
${body ? `Content preview: ${body.slice(0, 500)}` : ''}

Generate posts for each platform:
- Twitter/X: 240 chars max, punchy, include 2-3 hashtags
- Facebook: 2-3 sentences, conversational, include CTA
- Instagram: Caption style, 3-5 relevant hashtags at the end
- LinkedIn: Professional tone, 2-3 sentences, thought leadership angle

Respond in this exact JSON format:
{"twitter": "...", "facebook": "...", "instagram": "...", "linkedin": "..."}`,

    keywords: `You are a keyword research specialist for ${site}, a ${ind} business.
${context.location ? `Location: ${context.location}` : ''}
${context.services ? `Services: ${context.services}` : ''}

Generate a keyword research report with:
- 5 primary keywords (high volume, direct relevance)
- 5 secondary keywords (medium volume, related topics)
- 5 long-tail keywords (low competition, high intent)

For each keyword include an estimated search intent (informational, commercial, transactional, navigational).

Respond in this exact JSON format:
{
  "primary": [{"keyword": "...", "intent": "..."}],
  "secondary": [{"keyword": "...", "intent": "..."}],
  "longTail": [{"keyword": "...", "intent": "..."}]
}`,
  };

  return prompts[actionKey] || null;
}

/** How many credits each action costs */
const ACTION_CREDIT_COST = {
  seo: 1,
  blogDraft: 1,
  blogFull: 3,
  productDesc: 1,
  schema: 1,
  llmsTxt: 1,
  socialPosts: 1,
  keywords: 1,
};

exports.runAiAction = onRequest(
  { cors: true, secrets: [geminiApiKey] },
  async (req, res) => {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { actionKey, context, siteId, uid } = req.body;

    // ── Validate inputs ──────────────────────────────────────────
    if (!actionKey || !siteId || !uid) {
      return res.status(400).json({ error: 'Missing actionKey, siteId, or uid' });
    }

    const prompt = buildPrompt(actionKey, context || {});
    if (!prompt) {
      return res.status(400).json({ error: `Unknown action: ${actionKey}` });
    }

    const creditCost = ACTION_CREDIT_COST[actionKey] || 1;

    try {
      // ── Verify site access & check credits ─────────────────────
      const siteRef = db.doc(`sites/${siteId}`);
      const siteSnap = await siteRef.get();

      if (!siteSnap.exists) {
        return res.status(404).json({ error: 'Site not found' });
      }

      const siteData = siteSnap.data();
      const tier = siteData.tier || 'free';
      const remaining = siteData.aiActionsRemaining ?? 0;

      if (remaining < creditCost) {
        return res.status(402).json({
          error: `Not enough credits. You have ${remaining}, but ${actionKey} costs ${creditCost}.`,
          remaining,
          cost: creditCost,
        });
      }

      // ── Select model based on tier ─────────────────────────────
      const modelName = tier === 'free' ? 'gemini-2.0-flash' : 'gemini-2.0-flash';
      // Note: both use flash for now (fast + cheap). Upgrade paid tiers to
      // gemini-2.0-pro when cost margins justify it.

      // ── Call Gemini ────────────────────────────────────────────
      const { GoogleGenAI } = require('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() });

      logger.info(`Running AI action: ${actionKey} for site ${siteId} (model: ${modelName})`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.7,
        },
      });

      // ── Parse the response ─────────────────────────────────────
      let result;
      try {
        const text = response.text || '';
        result = JSON.parse(text);
      } catch (parseErr) {
        logger.error('Failed to parse Gemini response:', parseErr.message);
        // Try to extract JSON from the response text
        const text = response.text || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        } else {
          return res.status(500).json({ error: 'AI returned invalid format. Please try again.' });
        }
      }

      // ── Deduct credits ─────────────────────────────────────────
      await siteRef.update({
        aiActionsRemaining: FieldValue.increment(-creditCost),
      });

      // ── Log usage ──────────────────────────────────────────────
      const usageRef = db.collection(`sites/${siteId}/aiUsage`).doc();
      await usageRef.set({
        actionKey,
        creditCost,
        model: modelName,
        uid,
        createdAt: new Date().toISOString(),
      });

      logger.info(`✅ AI action ${actionKey} completed for site ${siteId} (${creditCost} credits deducted)`);

      return res.json({
        success: true,
        actionKey,
        result,
        creditsUsed: creditCost,
        creditsRemaining: remaining - creditCost,
      });

    } catch (err) {
      logger.error('AI action error:', err);
      return res.status(500).json({ error: err.message || 'AI generation failed. Please try again.' });
    }
  }
);

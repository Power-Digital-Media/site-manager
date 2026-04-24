/**
 * Power Digital Media — Cloud Functions
 * 
 * syncUserClaims:        Sync Firestore user role → Auth custom claims
 * createCheckoutSession: Create a Stripe Checkout session (subscriptions + one-time)
 * stripeWebhook:         Handle Stripe webhook events (payment success, subscription changes)
 * createPortalSession:   Open Stripe Customer Portal for subscription management
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

// ─── Secrets (set via: firebase functions:secrets:set STRIPE_SECRET_KEY) ─────
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// ─── Tier → Stripe Price ID mapping ─────────────────────────────
// Set these after creating products in Stripe Dashboard.
// For now, use placeholders — replace with real price IDs.
const PLAN_PRICE_IDS = {
  pro:      process.env.STRIPE_PRICE_PRO      || 'price_1TPbZzII04nd8gjIAd96UdLH',
  business: process.env.STRIPE_PRICE_BUSINESS  || 'price_1TPbbBII04nd8gjIgRKuj1Wn',
};

// ─── Tier config (mirror of frontend constants.js) ──────────────
const TIER_ACTIONS = {
  free: 5,
  pro: 30,
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

          else if (sessionType === 'oneTime' || sessionType === 'imageGen') {
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

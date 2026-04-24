/**
 * Power Digital Media — Cloud Functions
 * 
 * syncUserClaims: When a user document is created or updated in Firestore,
 * automatically sync their `role` and `siteId` to Firebase Auth custom claims.
 * This allows Storage rules (and any future rules) to check permissions
 * via `request.auth.token.role` without cross-service Firestore lookups.
 */

const { onDocumentWritten } = require('firebase-functions/v2/firestore');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { logger } = require('firebase-functions');

initializeApp();

/**
 * Triggered whenever /users/{uid} is created or updated.
 * Syncs role + siteId from the Firestore doc → Auth custom claims.
 */
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

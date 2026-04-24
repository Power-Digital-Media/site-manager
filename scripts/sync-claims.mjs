/**
 * One-time script to sync existing Firestore user docs → Auth custom claims.
 * 
 * Uses the Firebase CLI credentials (no service account needed).
 * 
 * Run with:
 *   node scripts/sync-claims.mjs
 * 
 * After running this, all existing users will have their role/siteId
 * available on their Auth token. New users will be handled automatically
 * by the syncUserClaims Cloud Function.
 */

import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { execSync } from 'child_process';

// Get access token from Firebase CLI (which is already authenticated)
function getFirebaseToken() {
  try {
    const result = execSync('npx firebase-tools login:list --json', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    // Parse the JSON output to get the token
    const data = JSON.parse(result);
    if (data.result && data.result.length > 0) {
      return data.result[0].tokens?.access_token;
    }
  } catch (e) {
    // Fallback: try to get token directly
  }
  return null;
}

// Initialize with Google Application Default Credentials
// This works if you've run: gcloud auth application-default login
// OR if GOOGLE_APPLICATION_CREDENTIALS is set to a service account key
try {
  initializeApp({
    projectId: 'power-digital-media',
    credential: applicationDefault(),
  });
} catch (err) {
  console.error('❌ Could not initialize Firebase Admin.');
  console.error('');
  console.error('Please run ONE of these first:');
  console.error('  1. gcloud auth application-default login');
  console.error('  2. set GOOGLE_APPLICATION_CREDENTIALS=path\\to\\serviceAccountKey.json');
  console.error('');
  console.error('To get a service account key:');
  console.error('  → Firebase Console → Project Settings → Service Accounts → Generate new private key');
  process.exit(1);
}

const auth = getAuth();
const db = getFirestore();

async function syncAllClaims() {
  console.log('🔄 Syncing custom claims for all users...\n');

  const usersSnapshot = await db.collection('users').get();

  if (usersSnapshot.empty) {
    console.log('⚠️  No user documents found in Firestore.');
    process.exit(0);
  }

  let synced = 0;
  let errors = 0;

  for (const userDoc of usersSnapshot.docs) {
    const uid = userDoc.id;
    const data = userDoc.data();

    const claims = {
      role: data.role || 'client',
      siteId: data.siteId || null,
    };

    try {
      await auth.setCustomUserClaims(uid, claims);
      console.log(`  ✅ ${data.email || uid} → role: ${claims.role}, siteId: ${claims.siteId}`);
      synced++;
    } catch (err) {
      console.error(`  ❌ ${data.email || uid}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n── Done ──`);
  console.log(`  Synced: ${synced}`);
  console.log(`  Errors: ${errors}`);
  console.log(`\n⚠️  Users must sign out and back in to pick up new claims.`);
}

syncAllClaims().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

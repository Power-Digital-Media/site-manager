/**
 * Power Digital Media — Site Manager
 * Authentication Service
 * 
 * Handles Firebase Auth + role detection (admin vs client)
 * + user-to-site mapping via Firestore /users/{uid}
 */

import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  createUserWithEmailAndPassword,
  getAuth,
} from 'firebase/auth';
import { initializeApp, deleteApp } from 'firebase/app';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase.js';
import { ADMIN_EMAILS } from './constants.js';

// ─── Current session state ──────────────────────────────────────
let _currentUser = null;
let _userProfile = null; // Firestore user doc

// ─── Auth Actions ───────────────────────────────────────────────

/**
 * Sign in with email and password
 * @returns {Promise<{user, profile}>}
 */
export async function signIn(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  _currentUser = credential.user;
  _userProfile = await loadUserProfile(credential.user.uid);
  return { user: _currentUser, profile: _userProfile };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  await firebaseSignOut(auth);
  _currentUser = null;
  _userProfile = null;
}

/**
 * Send a password reset email
 */
export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Listen for auth state changes
 * @param {function} callback - called with ({user, profile}) or null
 * @returns {function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      _currentUser = user;
      _userProfile = await loadUserProfile(user.uid);
      callback({ user, profile: _userProfile });
    } else {
      _currentUser = null;
      _userProfile = null;
      callback(null);
    }
  });
}

// ─── User Profile (Firestore) ───────────────────────────────────

/**
 * Load user profile from Firestore /users/{uid}
 */
async function loadUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    // No profile doc yet — will be created during onboarding
    return null;
  } catch (err) {
    console.warn('Auth: failed to load user profile', err);
    return null;
  }
}

/**
 * Create or update a user profile in Firestore
 * Called by admin during client onboarding
 */
export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    email: data.email,
    displayName: data.displayName || '',
    role: data.role || 'client', // 'client' | 'admin'
    siteId: data.siteId || null, // maps client to their site
    createdAt: data.createdAt || new Date().toISOString(),
  }, { merge: true });
}

/**
 * Create a new client account and send them an invitation email.
 * Uses a secondary Firebase App instance so the admin stays signed in.
 * 
 * Flow:
 *   1. Create a temporary second Firebase app
 *   2. Create the user with a random password (they'll never use it)
 *   3. Create their Firestore profile (users/{uid} → { siteId })
 *   4. Send a password reset email (this IS their invitation)
 *   5. Delete the temporary app
 * 
 * @param {object} opts
 * @param {string} opts.email - Client's email address
 * @param {string} opts.displayName - Client's display name
 * @param {string} opts.siteId - The siteId to assign to this client
 * @returns {Promise<{uid: string, email: string}>}
 */
export async function createClientAccount({ email, displayName, siteId }) {
  // Get the config from the primary app so the secondary connects to the same project
  const config = auth.app.options;
  
  // Create a temporary secondary app (so we don't sign out the admin)
  const tempApp = initializeApp(config, '__temp_account_creation__');
  const tempAuth = getAuth(tempApp);
  
  try {
    // Generate a strong random password (client will never see this)
    const tempPassword = crypto.randomUUID() + '!Aa1' + Date.now();
    
    // Create the Firebase Auth account
    const credential = await createUserWithEmailAndPassword(tempAuth, email, tempPassword);
    const uid = credential.user.uid;
    
    // Create the Firestore user profile (maps them to their site)
    await createUserProfile(uid, {
      email,
      displayName: displayName || email.split('@')[0],
      role: 'client',
      siteId,
      createdAt: new Date().toISOString(),
    });
    
    // Send password reset email via the PRIMARY auth (so it uses the right config)
    // This is the "invitation" — the client clicks the link to set their own password
    await sendPasswordResetEmail(auth, email);
    
    return { uid, email };
  } finally {
    // Always clean up the temporary app
    try {
      await deleteApp(tempApp);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}

/**
 * Check if current user is a PDM admin
 */
export function isAdmin() {
  if (!_currentUser) return false;
  // Check admin emails list
  if (ADMIN_EMAILS.includes(_currentUser.email)) return true;
  // Check Firestore profile role
  if (_userProfile?.role === 'admin') return true;
  return false;
}

/**
 * Check if a specific email is an admin
 */
export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes(email);
}

/**
 * Get the siteId for the current user
 * Admins can switch sites; clients are locked to their assigned site.
 */
export function getUserSiteId() {
  if (!_userProfile) return null;
  return _userProfile.siteId || null;
}

/**
 * Get current user info
 */
export function getCurrentUser() {
  return _currentUser;
}

/**
 * Get current user profile (Firestore data)
 */
export function getUserProfile() {
  return _userProfile;
}

/**
 * Get display name for the current user
 */
export function getDisplayName() {
  if (_userProfile?.displayName) return _userProfile.displayName;
  if (_currentUser?.displayName) return _currentUser.displayName;
  if (_currentUser?.email) return _currentUser.email.split('@')[0];
  return 'User';
}

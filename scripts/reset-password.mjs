/**
 * Send a password reset email for the admin account.
 * Run with: node scripts/reset-password.mjs
 */

import { initializeApp } from 'firebase/app';
import { getAuth, sendPasswordResetEmail } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyBN96jGM2KfX5GfwjdFVqP1EmlMzmxX93E',
  authDomain: 'power-digital-media.firebaseapp.com',
  projectId: 'power-digital-media',
  storageBucket: 'power-digital-media.firebasestorage.app',
  messagingSenderId: '978634389841',
  appId: '1:978634389841:web:62c87ab1fa1d94ced3bb70',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const EMAIL = 'damein@powerdigitalmedia.org';

try {
  await sendPasswordResetEmail(auth, EMAIL);
  console.log(`✅ Password reset email sent to: ${EMAIL}`);
  console.log('Check your inbox (and spam folder) for the reset link.');
  process.exit(0);
} catch (err) {
  console.error('❌ Error:', err.code, err.message);
  process.exit(1);
}

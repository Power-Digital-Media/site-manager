/**
 * Quick one-time script to create the admin Firebase Auth account.
 * Run with: node scripts/create-admin.mjs
 * Delete after use.
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const db = getFirestore(app);

const EMAIL = 'damein@powerdigitalmedia.org';
const PASSWORD = 'PDM@dmin2026!';  // Change this after first login via "forgot password"

try {
  console.log(`Creating account for: ${EMAIL}`);
  const credential = await createUserWithEmailAndPassword(auth, EMAIL, PASSWORD);
  const uid = credential.user.uid;
  console.log(`✅ Auth account created! UID: ${uid}`);

  // Create the Firestore user profile
  await setDoc(doc(db, 'users', uid), {
    email: EMAIL,
    displayName: 'Damein Donald',
    role: 'admin',
    siteId: 'site_mo6ppoga_ttmnu',  // Your primary site
    createdAt: new Date().toISOString(),
  });
  console.log('✅ Firestore user profile created!');
  console.log('');
  console.log('=== LOGIN CREDENTIALS ===');
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log('========================');
  console.log('');
  console.log('⚠️  Change your password after logging in!');
  
  process.exit(0);
} catch (err) {
  if (err.code === 'auth/email-already-in-use') {
    console.log('ℹ️  Account already exists for this email. Try logging in.');
  } else {
    console.error('❌ Error:', err.code, err.message);
  }
  process.exit(1);
}

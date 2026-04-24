/**
 * Power Digital Media — Site Manager
 * Firebase Configuration & Initialization
 */

import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Firebase config — uses the existing power-digital-media project
const firebaseConfig = {
  apiKey: 'AIzaSyBN96jGM2KfX5GfwjdFVqP1EmlMzmxX93E',
  authDomain: 'power-digital-media.firebaseapp.com',
  projectId: 'power-digital-media',
  storageBucket: 'power-digital-media.firebasestorage.app',
  messagingSenderId: '978634389841',
  appId: '1:978634389841:web:62c87ab1fa1d94ced3bb70',
  measurementId: 'G-W2FD5N0QNR',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Use emulators in development (uncomment when running firebase emulators)
// if (window.location.hostname === 'localhost') {
//   connectAuthEmulator(auth, 'http://localhost:9099');
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectStorageEmulator(storage, 'localhost', 9199);
// }

export default app;

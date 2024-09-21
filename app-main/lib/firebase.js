// lib/firebase.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase only if it hasn't been initialized already (to avoid multiple app instances)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
let firebaseApp;
if (!firebaseApp) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = initializeApp.apps[0]; // Use existing instance
}

const db = getFirestore(firebaseApp);

export { db };

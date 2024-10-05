// lib/firebaseAdmin.js

import * as admin from 'firebase-admin';

let privatekey; // Declare privatekey
let db;         // Declare db

if (!admin.apps.length) {
  if (!process.env.FIREBASE_ADMIN_KEY) {
    throw new Error('FIREBASE_ADMIN_KEY is not defined in environment variables');
  }

  let serviceAccount;

  try {
    // Parse FIREBASE_ADMIN_KEY and handle newlines in the private key
    serviceAccount = JSON.parse(
      process.env.FIREBASE_ADMIN_KEY.replace(/\\n/g, '\n')
    );
  } catch (error) {
    console.error('Error parsing FIREBASE_ADMIN_KEY:', error);
    throw error; // Re-throw the error after logging
  }

  // Extract private key if needed elsewhere
  privatekey = serviceAccount.private_key;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Initialize Firestore
db = admin.firestore();

// Export admin, db, and privatekey (if needed)
export { admin, db, privatekey };

// lib/firebaseAdmin.js

import * as admin from 'firebase-admin';

let privatekey; // Declare privatekey outside the if block for scope accessibility

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
  
  // Extract private key
  privatekey = serviceAccount.private_key;

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Initialize Firestore
const db = admin.firestore();

// Export admin, db, and privatekey
export { admin, db, privatekey };

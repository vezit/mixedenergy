// /lib/firebaseAdmin.js

import admin from 'firebase-admin';

interface ServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const serviceAccountString = process.env.FIREBASE_ADMIN_KEY;

if (!serviceAccountString) {
  throw new Error('Missing FIREBASE_ADMIN_KEY in environment variables.');
}

const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    }),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
}

const db = admin.firestore();

export { admin, db };

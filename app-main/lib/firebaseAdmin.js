// /lib/firebaseAdmin.js

import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      // Your service account credentials
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\\\n/g, '\\n'),
    }),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
  });
}

const db = admin.firestore();

export { admin, db };



// // /lib/firebaseAdmin.js

// import * as admin from 'firebase-admin';

// let privatekey; // Declare privatekey

// if (!admin.apps.length) {
//   if (!process.env.FIREBASE_ADMIN_KEY) {
//     throw new Error('FIREBASE_ADMIN_KEY is not defined in environment variables');
//   }

//   // Parse FIREBASE_ADMIN_KEY and handle newlines in the private key
//   const serviceAccount = JSON.parse(
//     process.env.FIREBASE_ADMIN_KEY.replace(/\\\\n/g, '\\n')
//   );

//   privatekey = serviceAccount.private_key;

//   admin.initializeApp({
//     credential: admin.credential.cert(serviceAccount),
//   });
// }

// const db = admin.firestore();

// export { db };

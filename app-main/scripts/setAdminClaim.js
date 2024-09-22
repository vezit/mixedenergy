// scripts/setAdminClaim.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';
// Initialize the admin SDK if not already initialized

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// console.log('FIREBASE_ADMIN_KEY:', process.env.FIREBASE_ADMIN_KEY);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

async function setAdmin(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`Admin claim set for user ${email}`);
  } catch (error) {
    console.error('Error setting admin claim:', error);
  }
}

// Replace with your admin user's email
const email = 'admin@mixedenergy.dk';
setAdmin(email);

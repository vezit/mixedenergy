// /scripts/createCollections.js
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.local' });

// Parse the FIREBASE_ADMIN_KEY from environment variables
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Function to delete a collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    return;
  }
  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted all documents in "${collectionName}" collection.`);
}

// Function to create a new session
async function createSession() {
  const sessionId = `session-${Date.now()}`;
  await db.collection('sessions').doc(sessionId).set({
    consentId: sessionId,
    loggedIn: false,
    createdAt: new Date(),
    basketItems: [],
    customerDetails: {},
  });
  console.log(`Created session with ID: ${sessionId}`);
}

// Function to initialize collections
async function createCollections() {
  try {
    // Delete existing collections
    await deleteCollection('drinks');
    await deleteCollection('packages');
    await deleteCollection('sessions'); // Be cautious with this in production

    // Create a new session
    await createSession();

    console.log('All collections are cleared and a new session is created.');
  } catch (error) {
    console.error('Error creating collections:', error);
  }
}

// Run the script
(async () => {
  await createCollections();
  process.exit(0);
})();

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
    createdAt: new Date(),
    basketItems: [],
    customerDetails: {},
  });
  console.log(`Created session with ID: ${sessionId}`);
}

// Function to create sample collections and documents
async function createCollections() {
  try {
    // Delete existing collections
    await deleteCollection('drinks');
    await deleteCollection('packages');
    await deleteCollection('sessions'); // Be cautious with this in production

    // Create "drinks" collection with a sample document
    await db.collection('drinks').doc('sample-drink').set({
      id: 'sample-drink',
      name: 'Sample Energy Drink',
      price: 1000, // Example price in cents
      currency: 'dkk',
      brand: 'Sample Brand',
      size: '0.5 l',
      nutrition: {
        per100ml: {
          energy: '50 kcal',
          fat: '0 g',
          carbohydrates: '13 g',
          sugar: '13 g',
          protein: '0 g',
          salt: '0.1 g',
        },
      },
    });
    console.log('Created "drinks" collection with a sample document.');

    // Create "packages" collection with a sample document
    await db.collection('packages').doc('sample-package').set({
      id: 'sample-package',
      name: 'Sample Package',
      price: 5000,
      currency: 'dkk',
      drinks: ['sample-drink'], // Reference to a drink
      description: 'Sample package including a variety of drinks.',
    });
    console.log('Created "packages" collection with a sample document.');

    // Create "sessions" collection with a sample document
    await db.collection('sessions').doc('sample-session').set({
      consentId: 'sample-session',
      createdAt: new Date(),
      basketItems: [],
      customerDetails: {},
    });
    console.log('Created "sessions" collection with a sample document.');

    // Create a new session
    await createSession();

    console.log('All collections and documents are ready.');
  } catch (error) {
    console.error('Error creating collections:', error);
  }
}

// Run the script
(async () => {
  await createCollections();
  process.exit(0);
})();

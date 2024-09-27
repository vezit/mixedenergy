import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Helper function to delete an entire collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  if (snapshot.empty) {
    console.log(`No documents to delete in "${collectionName}" collection.`);
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted all documents in "${collectionName}" collection.`);
}

// Function to populate drinks collection
async function populateDrinks() {
  const drinksPath = path.join(__dirname, '../data/drinks.json');
  const drinksData = JSON.parse(fs.readFileSync(drinksPath, 'utf-8'));

  for (const [id, drink] of Object.entries(drinksData)) {
    const sanitizedId = id.replace(/[^a-zA-Z0-9]/g, '-');
    await db.collection('drinks').doc(sanitizedId).set(drink);
  }

  console.log('Drinks collection has been populated.');
}

// Function to populate packages collection
async function populatePackages() {
  const packagesPath = path.join(__dirname, '../data/packages.json');
  const packagesData = JSON.parse(fs.readFileSync(packagesPath, 'utf-8'));

  for (const [slug, pkg] of Object.entries(packagesData)) {
    const sanitizedSlug = slug.replace(/[^a-zA-Z0-9]/g, '-');
    await db.collection('packages').doc(sanitizedSlug).set(pkg);
  }

  console.log('Packages collection has been populated.');
}

// Main function to delete and recreate collections
async function deleteAndCreateCollections() {
  try {
    // Delete existing collections
    await deleteCollection('drinks');
    await deleteCollection('packages');

    // Populate collections from JSON files
    await populateDrinks();
    await populatePackages();

    console.log('Drinks and Packages collections have been recreated.');
  } catch (error) {
    console.error('Error deleting or creating collections:', error);
  }
}

// Run the script
(async () => {
  await deleteAndCreateCollections();
  process.exit(0);
})();

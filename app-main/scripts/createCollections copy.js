// scripts/createCollections.js

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import readline from 'readline';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const argv = minimist(process.argv.slice(2), {
  boolean: ['force'],
  alias: { f: 'force' },
});

const forceFlag = argv.force;

// Initialize Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Helper function to delete an entire collection
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const batchSize = 500;
  let numDeleted = 0;

  const deleteQueryBatch = async () => {
    const querySnapshot = await collectionRef.limit(batchSize).get();
    if (querySnapshot.size === 0) {
      return;
    }

    const batch = db.batch();
    querySnapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    numDeleted += querySnapshot.size;
    console.log(
      `Deleted ${querySnapshot.size} documents from "${collectionName}" collection.`
    );

    if (querySnapshot.size === batchSize) {
      // Delete next batch
      await deleteQueryBatch();
    }
  };

  await deleteQueryBatch();
  console.log(`Total documents deleted from "${collectionName}": ${numDeleted}`);
}

// Function to check if a collection exists
async function collectionExists(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.limit(1).get();
  return !snapshot.empty;
}

// Function to populate collections based on the JSON data
async function populateCollections() {
  const dataFilePath = path.join(
    __dirname,
    '../data/privat_public_drinks_and_collections (6).json'
  );
  const jsonData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

  // Validate data structure
  const validationError = validateDataStructure(jsonData);
  if (validationError) {
    console.error(validationError);
    process.exit(1);
  }

  // Populate drinks_public and drinks_private collections
  const drinksPublicData = jsonData.drinks_public;
  const drinksPrivateData = jsonData.drinks_private;

  for (const docId of new Set([
    ...Object.keys(drinksPublicData),
    ...Object.keys(drinksPrivateData),
  ])) {
    const publicData = drinksPublicData[docId] || {};
    const privateData = {};

    const privateDataRaw = drinksPrivateData[docId] || {};
    // Remove underscores from private field keys
    Object.keys(privateDataRaw).forEach((key) => {
      if (key.startsWith('_')) {
        privateData[key.substring(1)] = privateDataRaw[key];
      } else {
        privateData[key] = privateDataRaw[key];
      }
    });

    // Save public data to drinks_public collection
    const drinkPublicRef = db.collection('drinks_public').doc(docId);
    await drinkPublicRef.set(publicData);

    // Save private data to drinks_private collection
    const drinkPrivateRef = db.collection('drinks_private').doc(docId);
    await drinkPrivateRef.set(privateData);
  }

  console.log('Drinks collections have been populated.');

  // Populate packages_public collection
  const packagesPublicData = jsonData.packages_public;

  for (const [docId, packageData] of Object.entries(packagesPublicData)) {
    const packageRef = db.collection('packages_public').doc(docId);
    await packageRef.set(packageData);
  }

  console.log('Packages collection has been populated.');

  // Populate sessions_public collection
  if (jsonData.sessions_public && typeof jsonData.sessions_public === 'object') {
    const sessionsPublicData = jsonData.sessions_public;
    for (const [docId, sessionData] of Object.entries(sessionsPublicData)) {
      const sessionRef = db.collection('sessions_public').doc(docId);
      await sessionRef.set(sessionData);
    }
    console.log('Sessions collection has been populated.');
  }

  // Populate orders_private collection
  if (jsonData.orders_private && typeof jsonData.orders_private === 'object') {
    const ordersPrivateData = jsonData.orders_private;
    for (const [docId, orderData] of Object.entries(ordersPrivateData)) {
      const orderRef = db.collection('orders_private').doc(docId);
      await orderRef.set(orderData);
    }
    console.log('Orders collection has been populated.');
  }
}

// Function to validate data structure
function validateDataStructure(data) {
  if (!data || typeof data !== 'object') {
    return 'Invalid data format. Expected an object.';
  }

  if (!data.drinks_public || typeof data.drinks_public !== 'object') {
    return 'Data must contain a "drinks_public" object.';
  }

  if (!data.drinks_private || typeof data.drinks_private !== 'object') {
    return 'Data must contain a "drinks_private" object.';
  }

  if (!data.packages_public || typeof data.packages_public !== 'object') {
    return 'Data must contain a "packages_public" object.';
  }

  // Optionally validate sessions_public
  if (data.sessions_public && typeof data.sessions_public !== 'object') {
    return 'If provided, "sessions_public" must be an object.';
  }

  // Optionally validate orders_private
  if (data.orders_private && typeof data.orders_private !== 'object') {
    return 'If provided, "orders_private" must be an object.';
  }

  // Validate that drinks_public and drinks_private have matching keys
  const publicDrinkKeys = Object.keys(data.drinks_public);
  const privateDrinkKeys = Object.keys(data.drinks_private);

  const allDrinkKeys = new Set([...publicDrinkKeys, ...privateDrinkKeys]);

  // Validate docIDs format in drinks
  for (const docId of allDrinkKeys) {
    // Check that docId is in correct format
    const docIdPattern = /^[a-z0-9-]+$/;
    if (!docIdPattern.test(docId)) {
      return `Invalid docID format in drinks: "${docId}". Expected lowercase letters, numbers, and hyphens only.`;
    }
  }

  // Similar validation for packages_public
  const packageDocIds = Object.keys(data.packages_public);

  for (const docId of packageDocIds) {
    const docIdPattern = /^[a-z0-9-]+$/;
    if (!docIdPattern.test(docId)) {
      return `Invalid docID format in packages: "${docId}". Expected lowercase letters, numbers, and hyphens only.`;
    }
  }

  // Optionally validate sessions_public doc IDs
  if (data.sessions_public) {
    const sessionDocIds = Object.keys(data.sessions_public);
    for (const docId of sessionDocIds) {
      const docIdPattern = /^[a-zA-Z0-9-]+$/; // Sessions might have uppercase letters or numbers
      if (!docIdPattern.test(docId)) {
        return `Invalid docID format in sessions_public: "${docId}". Expected letters, numbers, and hyphens only.`;
      }
    }
  }

  // Optionally validate orders_private doc IDs
  if (data.orders_private) {
    const orderDocIds = Object.keys(data.orders_private);
    for (const docId of orderDocIds) {
      const docIdPattern = /^[a-zA-Z0-9-]+$/; // Orders might have uppercase letters or numbers
      if (!docIdPattern.test(docId)) {
        return `Invalid docID format in orders_private: "${docId}". Expected letters, numbers, and hyphens only.`;
      }
    }
  }

  return null; // No error
}

// Function to prompt the user
function promptUser(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

// Main function to delete and recreate collections
async function deleteAndCreateCollections() {
  try {
    const collections = ['drinks_public', 'drinks_private', 'packages_public', 'sessions_public', 'orders_private'];
    let shouldProceed = forceFlag;

    if (!forceFlag) {
      let existingCollections = [];
      for (const collectionName of collections) {
        const exists = await collectionExists(collectionName);
        if (exists) {
          existingCollections.push(collectionName);
        }
      }

      if (existingCollections.length > 0) {
        console.log(
          `The following collections already exist: ${existingCollections.join(
            ', '
          )}`
        );
        const answer = await promptUser(
          'Do you want to delete and replace them? (yes/no): '
        );
        if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
          shouldProceed = true;
        } else {
          console.log('Operation cancelled.');
          process.exit(0);
        }
      } else {
        shouldProceed = true;
      }
    }

    if (shouldProceed) {
      // Delete existing collections
      for (const collectionName of collections) {
        await deleteCollection(collectionName);
      }

      // Populate collections from JSON file
      await populateCollections();

      console.log('All collections have been recreated.');
    } else {
      console.log('Operation cancelled.');
    }
  } catch (error) {
    console.error('Error deleting or creating collections:', error);
  }
}

// Run the script
(async () => {
  await deleteAndCreateCollections();
  process.exit(0);
})();

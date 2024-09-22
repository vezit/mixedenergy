// scripts/createCollections.js

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

// Function to create sample collections and indexes
async function createCollections() {
  try {
    // Create "drinks" collection with a sample document if it doesn't exist
    const drinksRef = db.collection('drinks').doc('sample-drink');
    const drinksDoc = await drinksRef.get();
    
    if (!drinksDoc.exists) {
      await drinksRef.set({
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
    } else {
      console.log('"drinks" collection already exists.');
    }

    // Create "packages" collection with a sample document if it doesn't exist
    const packagesRef = db.collection('packages').doc('sample-package');
    const packagesDoc = await packagesRef.get();
    
    if (!packagesDoc.exists) {
      await packagesRef.set({
        id: 'sample-package',
        name: 'Sample Package',
        price: 5000,
        currency: 'dkk',
        drinks: ['sample-drink'], // Reference to a drink
        description: 'Sample package including a variety of drinks.',
      });
      console.log('Created "packages" collection with a sample document.');
    } else {
      console.log('"packages" collection already exists.');
    }

    console.log('Collections and documents are ready.');
  } catch (error) {
    console.error('Error creating collections:', error);
  }
}

// Run the script
(async () => {
  await createCollections();
  process.exit(0);
})();

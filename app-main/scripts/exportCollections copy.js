// scripts/exportCollections.js

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

// Function to export all collections
async function exportAllCollections() {
  try {
    const collections = await db.listCollections();
    const data = {};

    for (const collectionRef of collections) {
      const collectionName = collectionRef.id;
      const snapshot = await collectionRef.get();
      const docsData = {};

      snapshot.forEach((doc) => {
        docsData[doc.id] = doc.data();
      });

      data[collectionName] = docsData;
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(
      __dirname,
      `../data/firebase_collections_structure_${timestamp}.json`
    );

    // Write data to file
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`All collections have been exported to ${filePath}`);
  } catch (error) {
    console.error('Error exporting collections:', error);
  }
}

// Run the script
(async () => {
  await exportAllCollections();
  process.exit(0);
})();

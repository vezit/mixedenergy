// scripts/downloadImages.js

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

// Initialize Firebase Admin SDK using service account credentials
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'mixedenergy-dk.appspot.com' // Replace with your Firebase project bucket if different
});

const bucket = admin.storage().bucket();

// Define directories for exporting images
const exportsDir = path.join(__dirname, '../data/exports');
const drinksImagesDir = path.join(exportsDir, 'drinks_public');
const packagesImagesDir = path.join(exportsDir, 'packages_public');

// Ensure the output directories exist
if (!fs.existsSync(drinksImagesDir)) {
  fs.mkdirSync(drinksImagesDir, { recursive: true });
}

if (!fs.existsSync(packagesImagesDir)) {
  fs.mkdirSync(packagesImagesDir, { recursive: true });
}

// Function to download images from a Firebase Storage folder
async function downloadImagesFromFolder(folder, localDir) {
  const [files] = await bucket.getFiles({ prefix: `${folder}/` });
  for (const file of files) {
    const fileName = path.basename(file.name);
    const destination = path.join(localDir, fileName);

    if (!fs.existsSync(destination)) {
      console.log(`Downloading ${fileName} from ${folder}...`);
      await file.download({ destination });
      console.log(`Saved to ${destination}`);
    } else {
      console.log(`File already exists: ${destination}`);
    }
  }
}

// Download images from drinks_public and packages_public folders
(async () => {
  try {
    await downloadImagesFromFolder('drinks_public', drinksImagesDir);
    await downloadImagesFromFolder('packages_public', packagesImagesDir);
    console.log('Download completed!');
  } catch (error) {
    console.error('Error downloading images:', error);
  }
})();

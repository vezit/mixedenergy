// scripts/uploadImages.js

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

// Initialize Firebase Admin SDK
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'mixedenergy-dk.appspot.com' // Replace with your Firebase project bucket if different
});

const bucket = admin.storage().bucket();

// Define directories for local images
const drinksImagesDir = path.join(__dirname, '../data/exports/drinks_public');
const packagesImagesDir = path.join(__dirname, '../data/exports/packages_public');

// Function to upload images to Firebase Storage
async function uploadImagesToFolder(localDir, storageDir) {
  const files = fs.readdirSync(localDir);
  
  for (const file of files) {
    const localFilePath = path.join(localDir, file);
    const storageFilePath = `${storageDir}/${file}`;
    
    if (fs.lstatSync(localFilePath).isFile()) {
      console.log(`Uploading ${file} to ${storageFilePath}...`);
      await bucket.upload(localFilePath, { destination: storageFilePath });
      console.log(`Uploaded to ${storageFilePath}`);
    }
  }
}

// Upload images to new paths in Firebase Storage
(async () => {
  try {
    await uploadImagesToFolder(drinksImagesDir, 'public/images/drinks');
    await uploadImagesToFolder(packagesImagesDir, 'public/images/packages');
    console.log('Upload completed!');
  } catch (error) {
    console.error('Error uploading images:', error);
  }
})();

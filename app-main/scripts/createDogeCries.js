// scripts/createDogeCries.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __dirname and __filename for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const basePath = path.join(__dirname, '../data/base');
const collectionsFilePath = path.join(basePath, 'firebase_collections_structure.json');
const dogeCryImagePath = path.join(basePath, 'doge_cry.png');

// Output directories
const drinksImagesDir = path.join(basePath, 'images/drinks_public');
const packagesImagesDir = path.join(basePath, 'images/packages_public');

// Ensure the output directories exist
if (!fs.existsSync(drinksImagesDir)) {
  fs.mkdirSync(drinksImagesDir, { recursive: true });
}

if (!fs.existsSync(packagesImagesDir)) {
  fs.mkdirSync(packagesImagesDir, { recursive: true });
}

// Read the collections data
const collectionsData = JSON.parse(fs.readFileSync(collectionsFilePath, 'utf-8'));

// Function to copy doge_cry.png if the image does not exist
function copyDogeCryImages(collectionName, imagesDir) {
  const collectionData = collectionsData[collectionName];
  if (!collectionData) {
    console.error(`Collection "${collectionName}" not found in firebase_collections_structure.json`);
    return;
  }

  const docIds = Object.keys(collectionData);

  for (const docId of docIds) {
    const imagePath = path.join(imagesDir, `${docId}.png`);
    if (!fs.existsSync(imagePath)) {
      fs.copyFileSync(dogeCryImagePath, imagePath);
      console.log(`Copied doge_cry.png to ${imagePath}`);
    } else {
      console.log(`Image already exists: ${imagePath}`);
    }
  }
}

// Copy images for drinks_public collection
copyDogeCryImages('drinks_public', drinksImagesDir);

// Copy images for packages_public collection
copyDogeCryImages('packages_public', packagesImagesDir);

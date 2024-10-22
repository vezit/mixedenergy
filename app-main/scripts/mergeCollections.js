// scripts/createCollections.js

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Define __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to deep clone an object
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Function to merge public and private collections
function mergePublicPrivateCollections(data) {
  const mergedCollections = {};

  // Get all collection names
  const collectionNames = Object.keys(data);

  // Group collections by base name
  const collectionGroups = {};

  for (const collectionName of collectionNames) {
    const baseName = collectionName.replace(/_(public|private)$/, '');
    if (!collectionGroups[baseName]) {
      collectionGroups[baseName] = {};
    }
    if (collectionName.endsWith('_public')) {
      collectionGroups[baseName].public = data[collectionName];
    } else if (collectionName.endsWith('_private')) {
      collectionGroups[baseName].private = data[collectionName];
    } else {
      // Collections without _public or _private suffix
      collectionGroups[baseName].merged = data[collectionName];
    }
  }

  // Merge the collections
  for (const baseName in collectionGroups) {
    const group = collectionGroups[baseName];
    const mergedCollection = {};

    // Merge public and private data
    const publicData = group.public || {};
    const privateData = group.private || {};
    const existingMergedData = group.merged || {};

    // Merge documents
    const docIds = new Set([
      ...Object.keys(publicData),
      ...Object.keys(privateData),
      ...Object.keys(existingMergedData),
    ]);

    for (const docId of docIds) {
      mergedCollection[docId] = {
        ...(existingMergedData[docId] || {}),
        ...(publicData[docId] || {}),
        ...(privateData[docId] || {}),
      };
    }

    mergedCollections[baseName] = mergedCollection;
  }

  return mergedCollections;
}

// Main function to merge collections and output to a new JSON file
function mergeCollectionsAndWriteToFile() {
  try {
    const dataFilePath = path.join(
      __dirname,
      '../data/base/firebase_collections_structure.json'
    );
    const jsonData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

    // Merge public and private collections
    const mergedCollections = mergePublicPrivateCollections(jsonData);

    // Define the output file path
    const outputFilePath = path.join(
      path.dirname(dataFilePath),
      'firebase_collections_merged.json'
    );

    // Write the merged data to the new JSON file
    fs.writeFileSync(outputFilePath, JSON.stringify(mergedCollections, null, 2));

    console.log(`Merged collections have been written to ${outputFilePath}`);
  } catch (error) {
    console.error('Error merging collections:', error);
  }
}

// Run the script
mergeCollectionsAndWriteToFile();

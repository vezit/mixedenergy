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
    '../data/firebase_collections_structure.json'
  );
  const jsonData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

  // Validate data structure
  const validationError = validateDataStructure(jsonData);
  if (validationError) {
    console.error(validationError);
    process.exit(1);
  }

  // Get all collection names from the JSON data
  const collectionNames = Object.keys(jsonData);

  for (const collectionName of collectionNames) {
    const collectionData = jsonData[collectionName];

    // Skip if the data is not an object
    if (typeof collectionData !== 'object') {
      console.warn(
        `Skipping collection "${collectionName}" because its data is not an object.`
      );
      continue;
    }

    // Check for public/private counterpart
    const counterpartName = getCounterpartCollectionName(collectionName);
    if (counterpartName) {
      // Check for documents that exist in one but not the other
      const thisCollectionDocs = Object.keys(collectionData);
      const counterpartData = jsonData[counterpartName] || {};
      const counterpartDocs = Object.keys(counterpartData);

      const docsOnlyInThisCollection = thisCollectionDocs.filter(
        (docId) => !counterpartDocs.includes(docId)
      );
      const docsOnlyInCounterpart = counterpartDocs.filter(
        (docId) => !thisCollectionDocs.includes(docId)
      );

      // Warn and create empty documents
      for (const docId of docsOnlyInThisCollection) {
        console.warn(
          `Warning: Document "${docId}" exists in "${collectionName}" but not in "${counterpartName}". Creating empty document in "${counterpartName}".`
        );
        // Create empty document in counterpart collection
        if (!jsonData[counterpartName]) {
          jsonData[counterpartName] = {};
        }
        jsonData[counterpartName][docId] = {};
      }

      for (const docId of docsOnlyInCounterpart) {
        console.warn(
          `Warning: Document "${docId}" exists in "${counterpartName}" but not in "${collectionName}". Creating empty document in "${collectionName}".`
        );
        // Create empty document in this collection
        if (!jsonData[collectionName]) {
          jsonData[collectionName] = {};
        }
        jsonData[collectionName][docId] = {};
      }
    }

    // Data Type Consistency Check
    // Get the first document's field types
    const docIds = Object.keys(collectionData);
    if (docIds.length === 0) {
      console.warn(`Collection "${collectionName}" is empty.`);
      continue;
    }

    const firstDocId = docIds[0];
    const firstDocData = collectionData[firstDocId];
    const fieldTypes = {};

    // Record the data types of the first document's fields
    for (const [field, value] of Object.entries(firstDocData)) {
      fieldTypes[field] = typeof value;
    }

    // Process each document in the collection
    for (const docId of docIds) {
      const docData = collectionData[docId];

      // Remove underscores from private fields if it's a private collection
      const finalDocData = { ...docData };
      if (collectionName.endsWith('_private')) {
        Object.keys(docData).forEach((key) => {
          if (key.startsWith('_')) {
            finalDocData[key.substring(1)] = docData[key];
            delete finalDocData[key];
          }
        });
      }

      // Check and enforce data types
      for (const [field, value] of Object.entries(finalDocData)) {
        if (field in fieldTypes) {
          const expectedType = fieldTypes[field];
          const actualType = typeof value;

          if (actualType !== expectedType) {
            console.warn(
              `Warning: In collection "${collectionName}", field "${field}" in document "${docId}" has type "${actualType}" but expected "${expectedType}". Attempting to convert.`
            );
            // Attempt to convert the value to the expected type
            try {
              let convertedValue;
              switch (expectedType) {
                case 'number':
                  convertedValue = Number(value);
                  if (isNaN(convertedValue)) {
                    throw new Error(`Cannot convert "${value}" to Number.`);
                  }
                  break;
                case 'string':
                  convertedValue = String(value);
                  break;
                case 'boolean':
                  if (value === 'true' || value === true) {
                    convertedValue = true;
                  } else if (value === 'false' || value === false) {
                    convertedValue = false;
                  } else {
                    throw new Error(`Cannot convert "${value}" to Boolean.`);
                  }
                  break;
                case 'object':
                  if (typeof value === 'object' && value !== null) {
                    convertedValue = value;
                  } else {
                    throw new Error(`Cannot convert "${value}" to Object.`);
                  }
                  break;
                default:
                  throw new Error(`Unsupported type "${expectedType}".`);
              }
              finalDocData[field] = convertedValue;
              console.warn(
                `Converted field "${field}" in document "${docId}" to type "${expectedType}".`
              );
            } catch (err) {
              console.error(
                `Error: Cannot convert field "${field}" in document "${docId}" to type "${expectedType}": ${err.message}`
              );
              process.exit(1);
            }
          }
        } else {
          // Field does not exist in the first document
          console.warn(
            `Warning: Field "${field}" in document "${docId}" does not exist in the first document of collection "${collectionName}".`
          );
        }
      }

      // Save the document to Firestore
      const docRef = db.collection(collectionName).doc(docId);
      await docRef.set(finalDocData);
    }

    console.log(`Collection "${collectionName}" has been populated.`);
  }
}

// Function to get the counterpart collection name
function getCounterpartCollectionName(collectionName) {
  if (collectionName.endsWith('_public')) {
    return collectionName.replace('_public', '_private');
  } else if (collectionName.endsWith('_private')) {
    return collectionName.replace('_private', '_public');
  } else {
    return null;
  }
}

// Function to validate data structure
function validateDataStructure(data) {
  if (!data || typeof data !== 'object') {
    return 'Invalid data format. Expected an object.';
  }

  // Validate that for each *_public collection, there is a *_private collection, and vice versa
  const collectionNames = Object.keys(data);
  const publicCollections = collectionNames.filter((name) => name.endsWith('_public'));
  const privateCollections = collectionNames.filter((name) => name.endsWith('_private'));

  for (const pubCol of publicCollections) {
    const counterpart = pubCol.replace('_public', '_private');
    if (!collectionNames.includes(counterpart)) {
      console.warn(
        `Warning: Collection "${pubCol}" does not have a counterpart "${counterpart}". An empty counterpart will be created.`
      );
      data[counterpart] = {};
    }
  }

  for (const privCol of privateCollections) {
    const counterpart = privCol.replace('_private', '_public');
    if (!collectionNames.includes(counterpart)) {
      console.warn(
        `Warning: Collection "${privCol}" does not have a counterpart "${counterpart}". An empty counterpart will be created.`
      );
      data[counterpart] = {};
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
    const dataFilePath = path.join(
      __dirname,
      '../data/firebase_collections_structure.json'
    );
    const jsonData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));
    const collectionNames = Object.keys(jsonData);

    let shouldProceed = forceFlag;

    if (!forceFlag) {
      let existingCollections = [];
      for (const collectionName of collectionNames) {
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
      for (const collectionName of collectionNames) {
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

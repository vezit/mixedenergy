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
  storageBucket: 'mixedenergy-dk.appspot.com', // Use your storage bucket
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

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
    '../data/base/firebase_collections_merged.json'
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

    // Data Type Consistency and Field Consistency Check
    // Get the first document's field types
    const docIds = Object.keys(collectionData);
    if (docIds.length === 0) {
      console.warn(`Collection "${collectionName}" is empty.`);
      continue;
    }

    const firstDocId = docIds[0];
    const firstDocData = collectionData[firstDocId];
    const fieldTypes = {};

    // Record the data types and fields of the first document's fields
    for (const [field, value] of Object.entries(firstDocData)) {
      fieldTypes[field] = typeof value;
    }
    const firstDocFields = Object.keys(firstDocData);

    // Process each document in the collection
    for (const docId of docIds) {
      const docData = collectionData[docId];

      // Ensure field consistency based on the first document
      // Add missing fields
      for (const field of firstDocFields) {
        if (!(field in docData)) {
          console.warn(
            `Warning: Field "${field}" is missing in document "${docId}" in collection "${collectionName}". Adding it with default value.`
          );
          docData[field] = deepClone(firstDocData[field]);
        }
      }

      // Remove extra fields
      for (const field of Object.keys(docData)) {
        if (!firstDocFields.includes(field)) {
          console.warn(
            `Warning: Field "${field}" in document "${docId}" does not exist in the first document of collection "${collectionName}". Removing it.`
          );
          delete docData[field];
        }
      }

      // Check and enforce data types
      for (const [field, value] of Object.entries(docData)) {
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
            docData[field] = convertedValue;
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
      }

      // Validate collection references in 'collection_<collection>' fields
      const fieldNames = Object.keys(docData);

      for (const fieldName of fieldNames) {
        const match = fieldName.match(/^collection_(.+)$/);
        if (match) {
          const referencedCollectionName = match[1];
          const referencedCollectionData = jsonData[referencedCollectionName];

          if (!Array.isArray(docData[fieldName])) {
            console.error(
              `Error: In collection "${collectionName}", document "${docId}", field "${fieldName}" should be an array.`
            );
            process.exit(1);
          }

          if (!referencedCollectionData) {
            console.error(
              `Error: Referenced collection "${referencedCollectionName}" does not exist.`
            );
            process.exit(1);
          }

          const docIdsInReferencedCollection = Object.keys(
            referencedCollectionData
          );

          for (const docIdRef of docData[fieldName]) {
            if (!docIdsInReferencedCollection.includes(docIdRef)) {
              console.error(
                `Error: In collection "${collectionName}", document "${docId}", field "${fieldName}" references docID "${docIdRef}" which does not exist in collection "${referencedCollectionName}".`
              );
              process.exit(1);
            }
          }
        }
      }

      // Save the document to Firestore
      const docRef = db.collection(collectionName).doc(docId);
      await docRef.set(docData);
    }

    console.log(`Collection "${collectionName}" has been populated.`);
  }
}

// Function to deep clone an object
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Function to validate data structure
function validateDataStructure(data) {
  if (!data || typeof data !== 'object') {
    return 'Invalid data format. Expected an object.';
  }

  // No further validation needed as we no longer require counterparts
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
      '../data/base/firebase_collections_merged.json'
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

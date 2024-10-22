// scripts/createDatabaseStructureExample.js

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

// Function to populate the database
async function populateDatabase() {
  const dataFilePath = path.join(
    __dirname,
    '../data/base/firebase_collections_merged.json'
  );
  const jsonData = JSON.parse(fs.readFileSync(dataFilePath, 'utf-8'));

  // Process the data to ensure collection_<something> fields are arrays of docIDs
  const processedData = processData(jsonData);

  // Validate data structure
  const validationError = validateDataStructure(processedData);
  if (validationError) {
    console.error(validationError);
    process.exit(1);
  }

  // Get all collection names from the JSON data
  const collectionNames = Object.keys(processedData);

  for (const collectionName of collectionNames) {
    const collectionData = processedData[collectionName];

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

      // Validate collection references in 'collection_<collection>' and 'collections_<collection>' fields
      const fieldNames = Object.keys(docData);

      for (const fieldName of fieldNames) {
        const match = fieldName.match(/^collections?_(.+)$/); // Matches 'collection_' or 'collections_'
        if (match) {
          const referencedCollectionName = match[1];
          const referencedCollectionData = processedData[referencedCollectionName];

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

          const docIdsInReferencedCollection = Object.keys(referencedCollectionData);

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

  // Write the processed data to a result file
  const outputFilePath = path.join(
    __dirname,
    '../data/base/firebase_collections_merged_result.json'
  );
  fs.writeFileSync(outputFilePath, JSON.stringify(processedData, null, 2));
  console.log(`Processed data has been written to ${outputFilePath}`);
}

// Function to process data and ensure collection_<something> fields are arrays of docIDs
function processData(data) {
  const processedData = deepClone(data);
  const collectionNames = Object.keys(processedData);

  for (const collectionName of collectionNames) {
    const collectionData = processedData[collectionName];

    for (const docId of Object.keys(collectionData)) {
      const docData = collectionData[docId];

      for (const [fieldName, value] of Object.entries(docData)) {
        const match = fieldName.match(/^collections?_(.+)$/); // Matches 'collection_' or 'collections_'
        if (match) {
          // Ensure the field is an array
          if (!Array.isArray(value)) {
            if (typeof value === 'string') {
              docData[fieldName] = [value];
            } else {
              console.warn(
                `Warning: Field "${fieldName}" in document "${docId}" should be an array of docIDs. Removing invalid field.`
              );
              delete docData[fieldName];
              continue;
            }
          }

          // Ensure the array only contains docIDs (strings)
          docData[fieldName] = docData[fieldName].filter(
            (id) => typeof id === 'string'
          );
        }
      }
    }
  }

  return processedData;
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

// Run the script
populateDatabase()
  .then(() => {
    console.log('Database population completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error populating database:', error);
    process.exit(1);
  });


// it is important for me that 
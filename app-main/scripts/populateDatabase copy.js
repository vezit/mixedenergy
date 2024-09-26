import admin from 'firebase-admin';
import fs from 'fs';
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

// Function to populate drinks
async function populateDrinks() {
  const drinksFilePath = path.join(__dirname, '../data/drinks.json');
  const drinksData = JSON.parse(fs.readFileSync(drinksFilePath, 'utf8'));

  for (const drink of drinksData) {
    // Skip if the item is not an object (e.g., an array or invalid entry)
    if (typeof drink !== 'object' || Array.isArray(drink)) continue;

    // Add brand based on name
    let brand = '';
    if (drink.name.includes('Monster')) brand = 'Monster';
    else if (drink.name.includes('Red Bull')) brand = 'Red Bull';
    else if (
      drink.name.includes('Booster') ||
      drink.name.includes('Faxe Kondi')
    )
      brand = 'Booster';

    const drinkDoc = {
      ...drink,
      salePrice: drink.salePrice || 0, // Ensure salePrice is used instead of price
      purchasePrice: drink.purchasePrice || 0, // Ensure purchasePrice is populated
      packageQuantity: parseInt(drink.packageQuantity, 10), // Ensure packageQuantity is a number
      brand: brand,
    };

    // Use the drink name as the document ID
    const drinkNameSanitized = drink.name.replace(/[^a-zA-Z0-9]/g, '-'); // Sanitize the name for Firestore document ID
    await db.collection('drinks').doc(drinkNameSanitized).set(drinkDoc);
    console.log(`Added drink: ${drink.name}`);
  }
}

// Function to populate packages
async function populatePackages() {
  const productsModule = await import('../data/packages.js');
  const products = productsModule.default;

  for (const [key, product] of Object.entries(products)) {
    let drinks = [];

    // Determine associated drinks
    if (product.slug === 'mixed-any' || product.slug === 'mixed-any-mix') {
      // Include all drinks
      const drinksSnapshot = await db.collection('drinks').get();
      drinks = drinksSnapshot.docs.map((doc) => doc.id);
    } else if (product.slug.includes('monster')) {
      // Include Monster drinks
      const drinksSnapshot = await db
        .collection('drinks')
        .where('brand', '==', 'Monster')
        .get();
      drinks = drinksSnapshot.docs.map((doc) => doc.id);
    } else if (product.slug.includes('red-bull')) {
      // Include Red Bull drinks
      const drinksSnapshot = await db
        .collection('drinks')
        .where('brand', '==', 'Red Bull')
        .get();
      drinks = drinksSnapshot.docs.map((doc) => doc.id);
    } else if (product.slug.includes('booster')) {
      // Include Booster drinks
      const drinksSnapshot = await db
        .collection('drinks')
        .where('brand', '==', 'Booster')
        .get();
      drinks = drinksSnapshot.docs.map((doc) => doc.id);
    }

    const packageDoc = {
      ...product,
      price: parseFloat(product.price), // Ensure price is a number
      drinks: drinks,
    };

    await db.collection('packages').doc(product.slug).set(packageDoc);
    console.log(`Added package: ${product.title}`);
  }
}

// Run the scripts
(async () => {
  try {
    await populateDrinks();
    await populatePackages();
    console.log('Database population complete.');
    process.exit(0);
  } catch (error) {
    console.error('Error populating database:', error);
    process.exit(1);
  }
})();

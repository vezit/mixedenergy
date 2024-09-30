import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Define __filename and __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the input JSON file
const dataPath = path.resolve(__dirname, '../data/packages_and_drinks.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Create a collective object for public and private data
const collectiveData = {
  drinks_private: {},
  drinks_public: {},
  packages_public: {}
};

// Iterate through the drinks and separate public and private fields
Object.keys(data.drinks).forEach((drinkKey) => {
  const drink = data.drinks[drinkKey];

  // Public fields for each drink
  collectiveData.drinks_public[drinkKey] = {
    id: drink.id,
    name: drink.name,
    image: drink.image,
    stock: drink.stock,
    size: drink.size,
    isSugarFree: drink.isSugarFree,
    salePrice: drink.salePrice,
    nutrition: drink.nutrition
  };

  // Private fields for each drink (with underscores)
  collectiveData.drinks_private[drinkKey] = {
    _purchasePrice: drink.purchasePrice,
    _packageQuantity: drink.packageQuantity
  };
});

// Iterate through packages and remove 'price' field from each package's 'packages' array
collectiveData.packages_public = JSON.parse(JSON.stringify(data.packages));

Object.keys(collectiveData.packages_public).forEach((packageKey) => {
  const packageItem = collectiveData.packages_public[packageKey];

  // Remove the 'price' field from the 'packages' array
  packageItem.packages = packageItem.packages.map(pkg => {
    const { price, ...rest } = pkg; // Exclude 'price' field
    return rest;
  });
});

// Save the combined public and private data to a single JSON file
const outputPath = path.resolve(__dirname, '../data/privat_public_drinks_and_collections.json');
fs.writeFileSync(outputPath, JSON.stringify(collectiveData, null, 2));

console.log('Data successfully combined, modified, and saved to privat_public_drinks_and_collections.json');

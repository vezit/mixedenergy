/* 
  scripts/supabaseImport.js

  Usage:
    1) Install dependencies:
       npm install @supabase/supabase-js
  
    2) Make sure you have a .env or .env.local with:
       NEXT_PUBLIC_SUPABASE_URL="https://xyzcompany.supabase.co"
       SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"
    
    3) Adjust the mapping functions below to fit your actual Supabase schema.
    4) Run:
       node scripts/supabaseImport.js --file data/firebase_collections_structure.json
*/

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 1. Load environment variables
dotenv.config({ path: '.env.local' });

// 2. Resolve current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3. Parse command line arguments
const argv = minimist(process.argv.slice(2));
const filePathArg = argv.file || argv.f;
if (!filePathArg) {
  console.error('Please provide a --file argument pointing to the JSON file.');
  process.exit(1);
}

// 4. Supabase "admin" client using service role key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

// 5. Helper to safely get a key from an object
const get = (obj, key, fallback) => (obj && key in obj ? obj[key] : fallback);

// 6. Main import function
async function importData() {
  try {
    // Read the JSON file
    const absoluteFilePath = path.resolve(__dirname, filePathArg);
    if (!fs.existsSync(absoluteFilePath)) {
      console.error(`File not found: ${absoluteFilePath}`);
      process.exit(1);
    }
    const raw = fs.readFileSync(absoluteFilePath, 'utf-8');
    const jsonData = JSON.parse(raw);

    // Expect keys: "drinks", "orders", "packages", "sessions"
    const { drinks, orders, packages, sessions } = jsonData;

    // Import each collection:
    if (drinks) {
      await importDrinks(drinks);
    }
    if (packages) {
      await importPackages(packages);
    }
    if (orders) {
      await importOrders(orders);
    }
    if (sessions) {
      await importSessions(sessions);
    }

    console.log('✅ Finished import!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during import:', error.message);
    process.exit(1);
  }
}

// 7. Functions to transform and upsert data

async function importDrinks(drinksObj) {
  // drinksObj is something like:
  // {
  //   "faxe-kondi-booster-black-edition": { name, size, _salePrice, ... },
  //   "faxe-kondi-booster-energy": { ... },
  //   ...
  // }

  // Convert object to array of rows for upsert
  const rows = Object.entries(drinksObj).map(([slug, doc]) => {
    return {
      slug,
      name: doc.name,
      size: doc.size,
      is_sugar_free: get(doc, 'isSugarFree', false),
      sale_price: get(doc, '_salePrice', 0),
      purchase_price: get(doc, '_purchasePrice', 0),
      stock: get(doc, '_stock', 0),
      recycling_fee: get(doc, 'recyclingFee', 0),
      nutrition: get(doc, 'nutrition', {}), // store entire nutrition object as JSON
      image: get(doc, 'image', null),
    };
  });

  // Upsert into "drinks" table
  console.log(`Upserting ${rows.length} rows into "drinks" table...`);
  const { data, error } = await supabaseAdmin
    .from('drinks')
    .upsert(rows, { onConflict: 'slug' }); // use primary key or unique col

  if (error) {
    throw new Error(`importDrinks error: ${error.message}`);
  }
}

async function importPackages(packagesObj) {
  // Each key is a slug, value is an object with fields like:
  // { title, description, category, image, collectionsDrinks, packages, ... }

  const rows = Object.entries(packagesObj).map(([slug, doc]) => {
    return {
      slug,
      title: doc.title,
      description: doc.description,
      category: doc.category,
      image: doc.image,
      collections_drinks: get(doc, 'collectionsDrinks', []), // store in JSONB
      packages: get(doc, 'packages', []),                     // store in JSONB
    };
  });

  console.log(`Upserting ${rows.length} rows into "packages" table...`);
  const { data, error } = await supabaseAdmin
    .from('packages')
    .upsert(rows, { onConflict: 'slug' });

  if (error) {
    throw new Error(`importPackages error: ${error.message}`);
  }
}

async function importOrders(ordersObj) {
  // Each key is something like "order-example"
  // The doc might have: { sessionId, orderId, basketDetails, quickpayDetails, orderDetails, ... }
  // We'll store them as JSON in some columns.

  const rows = Object.entries(ordersObj).map(([id, doc]) => {
    return {
      id, // your table might store a direct PK as "id"
      session_id: get(doc, 'sessionId', null),
      order_id: get(doc, 'orderId', null),
      basket_details: get(doc, 'basketDetails', {}),
      quickpay_details: get(doc, 'quickpayDetails', {}),
      order_details: get(doc, 'orderDetails', {}),
    };
  });

  console.log(`Upserting ${rows.length} rows into "orders" table...`);
  const { data, error } = await supabaseAdmin
    .from('orders')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    throw new Error(`importOrders error: ${error.message}`);
  }
}

async function importSessions(sessionsObj) {
  // Each key is a sessionId like "48003cf0-0bc3-4919-94ae-e60b5f"
  // doc: { sessionId, allowCookies, basketDetails, _createdAt, _updatedAt, temporarySelections, ... }

  const rows = Object.entries(sessionsObj).map(([sessionId, doc]) => {
    return {
      session_id: sessionId,
      allow_cookies: get(doc, 'allowCookies', false),
      basket_details: get(doc, 'basketDetails', {}),
      temporary_selections: get(doc, 'temporarySelections', {}),
      // ignoring _createdAt / _updatedAt for this example,
      // but you could parse them into timestamps if you have such columns
    };
  });

  console.log(`Upserting ${rows.length} rows into "sessions" table...`);
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .upsert(rows, { onConflict: 'session_id' });

  if (error) {
    throw new Error(`importSessions error: ${error.message}`);
  }
}

// 8. Run main
importData();

/**
 * scripts/supabaseRelationalImport.js
 *
 * Usage:
 *   1) npm install @supabase/supabase-js
 *   2) Create your .env with:
 *       NEXT_PUBLIC_SUPABASE_URL="https://xyzcompany.supabase.co"
 *       SUPABASE_SERVICE_ROLE_KEY="SERVICE_ROLE_KEY_HERE"
 *   3) Adjust your table names & columns to match your schema.
 *   4) node scripts/supabaseRelationalImport.js --file data.json
 */

import fs from 'fs';
import path from 'path';
import url from 'url';
import dotenv from 'dotenv';
import minimist from 'minimist';
import { createClient } from '@supabase/supabase-js';

// 1) Load env
dotenv.config({ path: '.env.local' })

// 2) Resolve __dirname in ESM
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3) Parse command line args
const argv = minimist(process.argv.slice(2));
const filePathArg = argv.file || argv.f;
if (!filePathArg) {
  console.error('Please provide --file <path_to_json>');
  process.exit(1);
}

// 4) Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 5) Helper function to safely get a property
function get(obj, key, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  return key in obj ? obj[key] : fallback;
}

// 6) Main function
async function main() {
  try {
    // Read file
    const rawPath = path.resolve(__dirname, filePathArg);
    if (!fs.existsSync(rawPath)) {
      throw new Error(`File not found: ${rawPath}`);
    }
    const rawStr = fs.readFileSync(rawPath, 'utf-8');
    const jsonData = JSON.parse(rawStr);

    // We expect top-level keys: drinks, packages, orders, sessions
    const { drinks, packages, orders, sessions } = jsonData;

    // (A) Insert DRINKS
    if (drinks) {
      await importDrinks(drinks);
    }

    // (B) Insert PACKAGES
    // Then handle many-to-many packages_drinks
    if (packages) {
      await importPackages(packages);
      await importPackagesDrinks(packages);
    }

    // (C) Insert ORDERS
    if (orders) {
      await importOrders(orders);
    }

    // (D) Insert SESSIONS
    if (sessions) {
      await importSessions(sessions);
    }

    console.log('✅ All done!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

// 7) DRINKS
async function importDrinks(drinksObj) {
  const rows = Object.entries(drinksObj).map(([slug, doc]) => ({
    slug,
    name: doc.name,
    size: doc.size,
    is_sugar_free: get(doc, 'isSugarFree', false),
    sale_price: get(doc, '_salePrice', 0),
    purchase_price: get(doc, '_purchasePrice', 0),
    stock: get(doc, '_stock', 0),
    recycling_fee: get(doc, 'recyclingFee', 0),
    nutrition: get(doc, 'nutrition', {}),
    image: get(doc, 'image', null),
  }));

  console.log(`Inserting/Upserting ${rows.length} drinks ...`);
  const { data, error } = await supabase
    .from('drinks')
    .upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('importDrinks error object:', error);
    throw new Error(`importDrinks: ${JSON.stringify(error)}`);
  }
}

// 8) PACKAGES
async function importPackages(packagesObj) {
  const rows = Object.entries(packagesObj).map(([slug, doc]) => ({
    slug,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    image: doc.image,
    // We'll store the "packages" array (like size, discount, roundUpOrDown) in JSONB
    packages: get(doc, 'packages', []),
  }));

  console.log(`Inserting/Upserting ${rows.length} packages ...`);
  const { data, error } = await supabase
    .from('packages')
    .upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('importPackages error:', error);
    throw new Error(`importPackages: ${JSON.stringify(error)}`);
  }
}

// 8a) PACKAGES_DRINKS (many-to-many from "collectionsDrinks")
async function importPackagesDrinks(packagesObj) {
  // We'll gather an array of { package_slug, drink_slug }
  // from each package's "collectionsDrinks" array
  const linkRows = [];
  for (const [slug, doc] of Object.entries(packagesObj)) {
    const drinksArr = get(doc, 'collectionsDrinks', []);
    for (const drinkSlug of drinksArr) {
      linkRows.push({
        package_slug: slug,
        drink_slug: drinkSlug,
      });
    }
  }

  if (!linkRows.length) {
    console.log('No collectionsDrinks found, skipping packages_drinks insertion.');
    return;
  }

  console.log(`Inserting ${linkRows.length} package-drinks links ...`);
  // We can't do onConflict on bigserial pk easily,
  // so we'll do a simple insert, and rely on unique constraints
  // if you added one on (package_slug, drink_slug).
  const { data, error } = await supabase
    .from('packages_drinks')
    .insert(linkRows);

  if (error) {
    console.error('importPackagesDrinks error:', error);
    throw new Error(`importPackagesDrinks: ${JSON.stringify(error)}`);
  }
}

// 9) ORDERS
async function importOrders(ordersObj) {
  const rows = Object.entries(ordersObj).map(([id, doc]) => ({
    id,
    session_id: get(doc, 'sessionId', null),
    order_id: get(doc, 'orderId', null),
    basket_details: get(doc, 'basketDetails', {}),
    quickpay_details: get(doc, 'quickpayDetails', {}),
    order_details: get(doc, 'orderDetails', {}),
  }));

  console.log(`Inserting/Upserting ${rows.length} orders ...`);
  const { data, error } = await supabase
    .from('orders')
    .upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('importOrders error:', error);
    throw new Error(`importOrders: ${JSON.stringify(error)}`);
  }
}

// 10) SESSIONS
async function importSessions(sessionsObj) {
  const rows = Object.entries(sessionsObj).map(([sessionId, doc]) => ({
    session_id: sessionId,
    allow_cookies: get(doc, 'allowCookies', false),
    basket_details: get(doc, 'basketDetails', {}),
    temporary_selections: get(doc, 'temporarySelections', {}),
  }));

  console.log(`Inserting/Upserting ${rows.length} sessions ...`);
  const { data, error } = await supabase
    .from('sessions')
    .upsert(rows, { onConflict: 'session_id' });

  if (error) {
    console.error('importSessions error:', error);
    throw new Error(`importSessions: ${JSON.stringify(error)}`);
  }
}

// 11) Run
main();

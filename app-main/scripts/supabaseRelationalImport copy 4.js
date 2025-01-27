/**
 * scripts/supabaseRelationalImport.js
 *
 * Usage:
 *   node scripts/supabaseRelationalImport.js --file data.json [--deletetables]
 *
 *   If --deletetables is passed, we drop & recreate the tables before importing.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import minimist from 'minimist';
import readline from 'readline';
import { createClient } from '@supabase/supabase-js';

// 1) Load env
dotenv.config({ path: '.env.local' });

// 2) __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3) Parse CLI args
const argv = minimist(process.argv.slice(2));
const filePathArg = argv.file || argv.f;
const shouldDeleteTables = argv.deletetables === true;

if (!filePathArg) {
  console.error('Please provide --file <path_to_json>');
  process.exit(1);
}

// 4) Create Supabase client (admin)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/** Small helper to prompt user to press Enter to continue */
function promptToContinue(message) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`${message}\n(Press ENTER to continue) `, () => {
      rl.close();
      resolve();
    });
  });
}

/**
 * Helper to run actual SQL on Supabase using our custom RPC `execute_sql`.
 * MAKE SURE you have created that function in your DB (see instructions above).
 */
async function runSQL(sql) {
  console.log(`\nRunning SQL via execute_sql RPC:\n${sql}\n`);

  const { data, error } = await supabase.rpc('execute_sql', { statement: sql });

  if (error) {
    throw new Error(`runSQL error: ${error.message}`);
  }
  if (typeof data === 'string' && data.startsWith('Error:')) {
    throw new Error(`runSQL error from DB: ${data}`);
  }

  console.log('SQL execution result:', data);
  return data;
}

/** Drop all existing tables */
async function dropAllTables() {
  const dropSQL = `
    DROP TABLE IF EXISTS packages_drinks;
    DROP TABLE IF EXISTS packages;
    DROP TABLE IF EXISTS drinks;
    DROP TABLE IF EXISTS orders;
    DROP TABLE IF EXISTS sessions;
  `;
  await runSQL(dropSQL);
}

/** Create all tables from scratch */
async function createAllTables() {
  const createSQL = `
  CREATE TABLE IF NOT EXISTS public.drinks (
    slug text primary key,
    name text,
    size text,
    is_sugar_free boolean,
    sale_price int,
    purchase_price int,
    stock int,
    recycling_fee int,
    nutrition jsonb,
    image text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  CREATE TABLE IF NOT EXISTS public.packages (
    slug text primary key,
    title text,
    description text,
    category text,
    image text,
    packages jsonb,
    -- This is CRUCIAL for 4-generateRandomSelection to read "collectionsDrinks" directly
    collectionsDrinks jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  CREATE TABLE IF NOT EXISTS public.packages_drinks (
    id bigserial primary key,
    package_slug text not null references public.packages(slug) on delete cascade,
    drink_slug text not null references public.drinks(slug) on delete cascade
  );

  CREATE TABLE IF NOT EXISTS public.orders (
    id text primary key,
    session_id text,
    order_id text,
    basket_details jsonb,
    quickpay_details jsonb,
    order_details jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  CREATE TABLE IF NOT EXISTS public.sessions (
    session_id text primary key,
    allow_cookies boolean,
    basket_details jsonb,
    temporary_selections jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );
  `;
  await runSQL(createSQL);
}

/** Safely get a property from an object, else return fallback. */
function get(obj, key, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  return key in obj ? obj[key] : fallback;
}

/** Main entry point */
async function main() {
  try {
    if (shouldDeleteTables) {
      await promptToContinue('WARNING: This will delete the existing database tables!');
      console.log('Dropping tables...');
      await dropAllTables();

      await promptToContinue('About to create brand new tables in the database...');
      console.log('Creating tables...');
      await createAllTables();

      console.log('Tables recreated. Now importing data...');
    }

    const rawPath = path.resolve(__dirname, filePathArg);
    if (!fs.existsSync(rawPath)) {
      throw new Error(`File not found: ${rawPath}`);
    }
    const rawStr = fs.readFileSync(rawPath, 'utf-8');
    const jsonData = JSON.parse(rawStr);

    const { drinks, packages, orders, sessions } = jsonData;

    // 1) import drinks
    if (drinks) {
      await importDrinks(drinks);
    }

    // 2) import packages (including "collectionsDrinks")
    if (packages) {
      await importPackages(packages);
      await importPackagesDrinks(packages); // M2M pivot if you want it
    }

    // 3) import orders
    if (orders) {
      await importOrders(orders);
    }

    // 4) import sessions
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

// ------------------
// Insert or upsert DRINKS
// ------------------
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
  const { error } = await supabase.from('drinks').upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('importDrinks error object:', error);
    throw new Error(`importDrinks: ${error.message || JSON.stringify(error)}`);
  }
}

// ------------------
// Insert or upsert PACKAGES
// ------------------
async function importPackages(packagesObj) {
  // We store doc.collectionsDrinks in the new "collectionsDrinks" JSONB column
  const rows = Object.entries(packagesObj).map(([slug, doc]) => ({
    slug,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    image: doc.image,
    packages: get(doc, 'packages', []),
    collectionsDrinks: get(doc, 'collectionsDrinks', []),
  }));

  console.log(`Inserting/Upserting ${rows.length} packages ...`);
  const { error } = await supabase.from('packages').upsert(rows, { onConflict: 'slug' });

  if (error) {
    console.error('importPackages error:', error);
    throw new Error(`importPackages: ${error.message || JSON.stringify(error)}`);
  }
}

/**
 * Insert the many-to-many relationships in packages_drinks.
 * We'll SKIP any references to drinks that don't exist, to avoid foreign key errors.
 */
async function importPackagesDrinks(packagesObj) {
  const linkRows = [];
  for (const [slug, doc] of Object.entries(packagesObj)) {
    const arr = get(doc, 'collectionsDrinks', []);
    for (const drinkSlug of arr) {
      linkRows.push({
        package_slug: slug,
        drink_slug: drinkSlug,
      });
    }
  }
  if (!linkRows.length) {
    console.log('No package->drinks links found.');
    return;
  }
  console.log(`Inserting ${linkRows.length} package-drinks links ...`);

  const allDrinkSlugs = linkRows.map((row) => row.drink_slug);
  const uniqueSlugs = [...new Set(allDrinkSlugs)];

  // Check if these drinks exist
  const { data: existingDrinks, error: drinksErr } = await supabase
    .from('drinks')
    .select('slug')
    .in('slug', uniqueSlugs);

  if (drinksErr) {
    console.error('Error checking existing drinks:', drinksErr);
    throw new Error(
      `importPackagesDrinks can't fetch drinks: ${drinksErr.message || JSON.stringify(drinksErr)}`
    );
  }

  const existingSlugs = new Set((existingDrinks || []).map((d) => d.slug));
  const filteredRows = linkRows.filter((row) => existingSlugs.has(row.drink_slug));
  const missingRows = linkRows.filter((row) => !existingSlugs.has(row.drink_slug));

  if (missingRows.length > 0) {
    const missingSlugs = [...new Set(missingRows.map((r) => r.drink_slug))];
    console.warn(`Skipping ${missingRows.length} link(s). Missing drink slugs in 'drinks':`);
    console.warn(missingSlugs.join(', '));
  }

  if (!filteredRows.length) {
    console.log('No valid package->drinks references remain after filtering. Skipping insert.');
    return;
  }

  const { error } = await supabase.from('packages_drinks').insert(filteredRows);

  if (error) {
    console.error('importPackagesDrinks error:', error);
    throw new Error(`importPackagesDrinks: ${error.message || JSON.stringify(error)}`);
  }
}

// ------------------
// Insert or upsert ORDERS
// ------------------
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
  const { error } = await supabase.from('orders').upsert(rows, { onConflict: 'id' });

  if (error) {
    console.error('importOrders error:', error);
    throw new Error(`importOrders: ${error.message || JSON.stringify(error)}`);
  }
}

// ------------------
// Insert or upsert SESSIONS
// ------------------
async function importSessions(sessionsObj) {
  const rows = Object.entries(sessionsObj).map(([sessionId, doc]) => ({
    session_id: sessionId,
    allow_cookies: get(doc, 'allowCookies', false),
    basket_details: get(doc, 'basketDetails', {}),
    temporary_selections: get(doc, 'temporarySelections', {}),
  }));

  console.log(`Inserting/Upserting ${rows.length} sessions ...`);
  const { error } = await supabase.from('sessions').upsert(rows, { onConflict: 'session_id' });

  if (error) {
    console.error('importSessions error:', error);
    throw new Error(`importSessions: ${error.message || JSON.stringify(error)}`);
  }
}

// Go
main();

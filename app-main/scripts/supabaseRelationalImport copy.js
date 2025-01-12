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
import url from 'url';
import dotenv from 'dotenv';
import minimist from 'minimist';
import { createClient } from '@supabase/supabase-js';

// 1) Load env
dotenv.config({ path: '.env.local' })

// 2) __dirname in ESM
const __filename = url.fileURLToPath(import.meta.url);
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

/** Helper to run a SQL statement. We'll use Supabase "rpc" or the Postgres extension. */
async function runSQL(sql) {
  // We'll rely on the "query" endpoint if you have Postgres function access,
  // or you can do supabase.postgrest.rpc. Another approach is to create a custom
  // SQL function on the server. For simplicity, let's do multiple .raw calls if you
  // have the "pgrest" extension enabled. If not, you might need a separate approach.

  // As of 2023, there's no official .sql or .raw in supabase-js. 
  // We'll do a workaround using PostgREST custom function or we can do
  // the "supabaseAdmin.rpc()" with a custom function that runs arbitrary SQL.
  // 
  // For simplicity below we just show how you *might* do it if you've created
  // a "sql" function in your Postgres. Alternatively, skip dropping from script
  // and do it manually in the Supabase SQL editor.

  console.log(`(Simulated) Running SQL:\n${sql}\n`);
  // If you have a custom RPC function "execute_sql" that runs arbitrary SQL:
  //   const { data, error } = await supabase.rpc('execute_sql', { statement: sql });
  //   if (error) throw new Error(`runSQL error: ${error.message}`);

  // For now, let's just pretend we ran it. If you do want to drop & create from code,
  // create an RPC function in Supabase that can run arbitrary statements. Or do
  // your drop/create in the Supabase UI's SQL editor. 
  // 
  // We'll store the create statements in createAllTables() below as well,
  // so you can see it. Then you can copy/paste them into the Supabase UI if needed.
}

/** Create all tables from scratch */
async function createAllTables() {
  const createSQL = `
  drop table if exists packages_drinks;
  drop table if exists packages;
  drop table if exists drinks;
  drop table if exists orders;
  drop table if exists sessions;

  create table if not exists public.drinks (
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

  create table if not exists public.packages (
    slug text primary key,
    title text,
    description text,
    category text,
    image text,
    packages jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table if not exists public.packages_drinks (
    id bigserial primary key,
    package_slug text not null references packages(slug) on delete cascade,
    drink_slug text not null references drinks(slug) on delete cascade
    -- optionally unique (package_slug, drink_slug)
  );

  create table if not exists public.orders (
    id text primary key,
    session_id text,
    order_id text,
    basket_details jsonb,
    quickpay_details jsonb,
    order_details jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table if not exists public.sessions (
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

/** Safely get property from object */
function get(obj, key, fallback) {
  if (!obj || typeof obj !== 'object') return fallback;
  return key in obj ? obj[key] : fallback;
}

async function main() {
  try {
    // If user passed --deletetables, drop & recreate everything
    if (shouldDeleteTables) {
      console.log('Deleting (dropping) and recreating tables...');
      await createAllTables();
      console.log('Tables recreated. Now importing data...');
    }

    // Parse JSON
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

    // 2) import packages
    if (packages) {
      await importPackages(packages);
      await importPackagesDrinks(packages); // M2M pivot
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

// Insert or upsert DRINKS
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

// Insert or upsert PACKAGES
async function importPackages(packagesObj) {
  const rows = Object.entries(packagesObj).map(([slug, doc]) => ({
    slug,
    title: doc.title,
    description: doc.description,
    category: doc.category,
    image: doc.image,
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

  // We'll check which drink_slugs exist so we skip the bad ones
  const allDrinkSlugs = linkRows.map((row) => row.drink_slug);
  // Distinct them
  const uniqueSlugs = [...new Set(allDrinkSlugs)];

  // Query the drinks table
  const { data: existingDrinks, error: drinksErr } = await supabase
    .from('drinks')
    .select('slug')
    .in('slug', uniqueSlugs); // select all that exist

  if (drinksErr) {
    console.error('Error checking existing drinks:', drinksErr);
    throw new Error(`importPackagesDrinks can't fetch drinks: ${JSON.stringify(drinksErr)}`);
  }
  const existingSlugs = new Set((existingDrinks || []).map((d) => d.slug));

  // Filter out rows with missing drinks
  const filteredRows = linkRows.filter((row) => existingSlugs.has(row.drink_slug));
  const skippedRows = linkRows.length - filteredRows.length;
  if (skippedRows > 0) {
    console.warn(`Skipping ${skippedRows} link(s) because the drink_slug wasn't found in 'drinks'.`);
  }

  if (filteredRows.length === 0) {
    console.log('No valid package-drinks references remain after filtering. Skipping insert.');
    return;
  }

  const { data, error } = await supabase
    .from('packages_drinks')
    .insert(filteredRows);

  if (error) {
    console.error('importPackagesDrinks error:', error);
    throw new Error(`importPackagesDrinks: ${JSON.stringify(error)}`);
  }
}

// Insert or upsert ORDERS
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

// Insert or upsert SESSIONS
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

// Go
main();

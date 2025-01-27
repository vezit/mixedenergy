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

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key:', supabaseServiceKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

console.log('Initializing Supabase client...');
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
 */
async function runSQL(sql) {
  console.log(`\nRunning SQL via execute_sql RPC:\n${sql}\n`);

  const { data, error } = await supabase.rpc('execute_sql', { statement: sql });

  if (error) {
    console.error('runSQL error:', error.message);
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
  console.log('Dropping all tables...');
  await runSQL(dropSQL);
  console.log('All tables dropped.');
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
  console.log('Creating all tables...');
  await runSQL(createSQL);
  console.log('All tables created.');
}

/**
 * Insert drinks into the `drinks` table.
 * 
 * @param {Object} drinksObj The `drinks` object from the JSON file.
 */
async function importDrinks(drinksObj) {
  // We expect `drinksObj` to be an object where each key is a drink slug
  // and the value is the drink data.
  for (const [slug, drinkData] of Object.entries(drinksObj)) {
    // For clarity, let's destructure the fields we need:
    const {
      name,
      size,
      isSugarFree,
      _salePrice,
      _purchasePrice,
      _stock,
      recyclingFee,
      nutrition,
      image,
    } = drinkData;

    try {
      const { error } = await supabase
        .from('drinks')
        .insert([
          {
            slug,
            name,
            size,
            is_sugar_free: isSugarFree,
            sale_price: _salePrice,
            purchase_price: _purchasePrice,
            stock: _stock,
            recycling_fee: recyclingFee,
            nutrition,
            image,
          },
        ]);

      if (error) {
        throw error;
      } else {
        console.log(`Inserted drink: ${slug}`);
      }
    } catch (err) {
      console.error(`Error inserting drink ${slug}:`, err.message);
      throw err; // rethrow if you want to abort entire import
    }
  }
}

/**
 * Insert packages into the `packages` table.
 * 
 * @param {Object} packagesObj The `packages` object from the JSON file.
 */
async function importPackages(packagesObj) {
  for (const [slug, pkgData] of Object.entries(packagesObj)) {
    const {
      title,
      description,
      category,
      image,
      packages, // array of {size, discount, roundUpOrDown}
      collectionsDrinks, // array of drink slugs
    } = pkgData;

    try {
      const { error } = await supabase
        .from('packages')
        .insert([
          {
            slug,
            title,
            description,
            category,
            image,
            packages,
            collectionsDrinks, // We'll also store it in JSON
          },
        ]);
      if (error) {
        throw error;
      } else {
        console.log(`Inserted package: ${slug}`);
      }
    } catch (err) {
      console.error(`Error inserting package ${slug}:`, err.message);
      throw err;
    }
  }
}

/**
 * Create relationship rows for the packages_drinks table.
 * We will create a row for each (package_slug, drink_slug) combo.
 * 
 * @param {Object} packagesObj The `packages` object from the JSON file.
 */
async function importPackagesDrinks(packagesObj) {
  for (const [slug, pkgData] of Object.entries(packagesObj)) {
    const { collectionsDrinks } = pkgData;
    if (!collectionsDrinks || !Array.isArray(collectionsDrinks)) {
      continue; // skip if no drinks
    }

    for (const drinkSlug of collectionsDrinks) {
      try {
        const { error } = await supabase
          .from('packages_drinks')
          .insert([
            {
              package_slug: slug,
              drink_slug: drinkSlug,
            },
          ]);
        if (error) {
          throw error;
        } else {
          console.log(`Linked package '${slug}' to drink '${drinkSlug}'.`);
        }
      } catch (err) {
        console.error(
          `Error linking package ${slug} to drink ${drinkSlug}:`,
          err.message
        );
        throw err;
      }
    }
  }
}

/**
 * Insert orders into the `orders` table.
 * 
 * @param {Object} ordersObj The `orders` object from the JSON file.
 */
async function importOrders(ordersObj) {
  for (const [orderSlug, orderData] of Object.entries(ordersObj)) {
    const {
      sessionId,
      orderId,
      basketDetails,
      quickpayDetails,
      orderDetails,
    } = orderData;

    try {
      const { error } = await supabase.from('orders').insert([
        {
          id: orderSlug, // or generate a UUID yourself
          session_id: sessionId,
          order_id: orderId,
          basket_details: basketDetails,
          quickpay_details: quickpayDetails,
          order_details: orderDetails,
        },
      ]);

      if (error) {
        throw error;
      } else {
        console.log(`Inserted order: ${orderSlug}`);
      }
    } catch (err) {
      console.error(`Error inserting order ${orderSlug}:`, err.message);
      throw err;
    }
  }
}

/**
 * Insert sessions into the `sessions` table.
 * 
 * @param {Object} sessionsObj The `sessions` object from the JSON file.
 */
async function importSessions(sessionsObj) {
  for (const [sessionKey, sessionData] of Object.entries(sessionsObj)) {
    const {
      sessionId,
      allowCookies,
      basketDetails,
      temporarySelections,
    } = sessionData;

    try {
      const { error } = await supabase.from('sessions').insert([
        {
          session_id: sessionId || sessionKey,
          allow_cookies: allowCookies,
          basket_details: basketDetails,
          temporary_selections: temporarySelections,
        },
      ]);

      if (error) {
        throw error;
      } else {
        console.log(`Inserted session: ${sessionId || sessionKey}`);
      }
    } catch (err) {
      console.error(`Error inserting session ${sessionId || sessionKey}:`, err.message);
      throw err;
    }
  }
}

/** Main entry point */
async function main() {
  try {
    if (shouldDeleteTables) {
      console.log('Starting table reset process...');
      await promptToContinue('WARNING: This will delete the existing database tables!');
      console.log('Deleting existing tables...');
      await dropAllTables();
      console.log('Existing tables deleted.');

      await promptToContinue('About to create brand new tables in the database...');
      console.log('Creating tables...');
      await createAllTables();
      console.log('Tables recreated successfully.');
    }

    console.log('Reading data from file...');
    const rawPath = path.resolve(__dirname, filePathArg);
    console.log(`File path: ${rawPath}`);
    if (!fs.existsSync(rawPath)) {
      throw new Error(`File not found: ${rawPath}`);
    }
    const rawStr = fs.readFileSync(rawPath, 'utf-8');
    const jsonData = JSON.parse(rawStr);
    console.log('Data loaded successfully.');

    const { drinks, packages, orders, sessions } = jsonData;

    if (drinks) {
      console.log(`Importing ${Object.keys(drinks).length} drinks...`);
      await importDrinks(drinks);
    }
    if (packages) {
      console.log(`Importing ${Object.keys(packages).length} packages...`);
      await importPackages(packages);
      console.log('Importing package-drinks relationships...');
      await importPackagesDrinks(packages);
    }
    if (orders) {
      console.log(`Importing ${Object.keys(orders).length} orders...`);
      await importOrders(orders);
    }
    if (sessions) {
      console.log(`Importing ${Object.keys(sessions).length} sessions...`);
      await importSessions(sessions);
    }

    console.log('✅ All operations completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err.message);
    process.exit(1);
  }
}

// Run the script
main();

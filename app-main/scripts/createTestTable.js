/**
 * scripts/createTestTable.js
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'path';
import fetch from 'node-fetch'; // <-- Key addition
import { createClient } from '@supabase/supabase-js';

// 1) Load env
dotenv.config({ path: '.env.local' });

// 2) Emulate __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3) Get env vars (ensure they exist)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Service Key:', supabaseServiceKey ? 'Present' : 'Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// 4) Create a Supabase client with admin privileges.
//    Notice we explicitly pass fetch from 'node-fetch'.
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  global: { fetch: (...args) => fetch(...args) },
});

/**
 * Simple helper to run SQL using the custom Postgres RPC "execute_sql".
 */
async function runSQL(sql) {
  console.log('\nExecuting SQL:\n', sql);
  const { data, error } = await supabase.rpc('execute_sql', { statement: sql });
  if (error) {
    console.error('execute_sql RPC error:', error.message);
    throw new Error(error.message);
  }
  if (typeof data === 'string' && data.startsWith('Error:')) {
    throw new Error(`Database error: ${data}`);
  }
  console.log('SQL execution result:', data);
}

/** Main function to create a test table */
async function main() {
  try {
    // Simple SQL to create a test table
    const createTestTableSQL = `
      CREATE TABLE IF NOT EXISTS public.test_table (
        id SERIAL PRIMARY KEY,
        name TEXT
      );
    `;

    await runSQL(createTestTableSQL);
    console.log('✅ Test table created (or already exists).');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating test table:', err.message);
    process.exit(1);
  }
}

// Run the script
main();

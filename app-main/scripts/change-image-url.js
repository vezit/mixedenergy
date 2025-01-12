#!/usr/bin/env node

/**
 * scripts/migrate-all-image-urls.js
 *
 * Usage:
 *   node scripts/migrate-all-image-urls.js --input ../data/firebase.json > ../data/supabase.json
 *
 * This does a global text replacement of Firebase Storage references
 * with your new Supabase Storage URL. It visits all nested fields that are strings.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import minimist from 'minimist';

const OLD_BASE = 'https://firebasestorage.googleapis.com/v0/b/mixedenergy-dk.appspot.com/o/public%2Fimages%2F';
const NEW_BASE = 'https://gszfdujtygkwiitsodlx.supabase.co/storage/v1/object/public/public-images/';

// If you want to remove "?alt=media" or "?alt=media&token=..." afterward, you can do further cleanup

// 1) __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 2) Parse CLI args
const argv = minimist(process.argv.slice(2));
const inputPath = argv.input || argv.i;

if (!inputPath) {
  console.error('Usage: node migrate-all-image-urls.js --input <path_to_input_json>');
  process.exit(1);
}

// 3) Read & parse the input JSON
const fullInputPath = path.resolve(process.cwd(), inputPath);
if (!fs.existsSync(fullInputPath)) {
  console.error(`File not found: ${fullInputPath}`);
  process.exit(1);
}

const rawStr = fs.readFileSync(fullInputPath, 'utf-8');
const data = JSON.parse(rawStr);

// 4) Recursively walk the JSON object, replacing any strings that contain the OLD_BASE
function replaceAllUrls(obj) {
  if (Array.isArray(obj)) {
    // Recurse for each array element
    return obj.map((item) => replaceAllUrls(item));
  } else if (obj && typeof obj === 'object') {
    // Recurse for each field in the object
    for (const key of Object.keys(obj)) {
      obj[key] = replaceAllUrls(obj[key]);
    }
    return obj;
  } else if (typeof obj === 'string') {
    // If it contains the Firebase prefix, replace
    if (obj.includes(OLD_BASE)) {
      let replaced = obj.replace(OLD_BASE, NEW_BASE);
      // Optional: remove trailing ?alt=media or ?alt=media&token=...
      replaced = replaced.replace(/\?alt=media.*/, '');
      return replaced;
    }
    return obj;
  } else {
    // boolean, number, null, etc. - just return
    return obj;
  }
}

const updatedData = replaceAllUrls(data);

// 5) Print the updated JSON to stdout
console.log(JSON.stringify(updatedData, null, 2));

/**
 * scripts/uploadImages.js
 *
 * Uploads images from your local "data/exports" directory to a public Supabase bucket.
 *
 * Usage:
 *   node scripts/uploadImages.js
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 1) Load .env
dotenv.config({ path: '.env.local' });

// 2) __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 3) Create Supabase client (service role)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local'
  );
  process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 4) Define source folders and target bucket
const EXPORTS_DIR = path.join(__dirname, '../data/exports');
const DRINKS_SOURCE_DIR = path.join(EXPORTS_DIR, 'drinks_public');
const PACKAGES_SOURCE_DIR = path.join(EXPORTS_DIR, 'packages_public');
const BUCKET_NAME = 'public-images'; // <-- Adjust to your actual bucket name, if different

/**
 * Upload all files from a local directory to a Supabase Storage folder.
 *
 * @param {string} localDir  - Path to the local directory (e.g. DRINKS_SOURCE_DIR)
 * @param {string} remoteDir - Destination folder in the bucket (e.g. "drinks")
 */
async function uploadDirectory(localDir, remoteDir) {
  if (!fs.existsSync(localDir)) {
    console.warn(`Directory does not exist: ${localDir} — skipping.`);
    return;
  }

  const files = fs.readdirSync(localDir);
  if (!files.length) {
    console.log(`No files found in ${localDir}.`);
    return;
  }

  console.log(`\nUploading from ${localDir} to bucket "${BUCKET_NAME}", folder "${remoteDir}"...`);

  for (const fileName of files) {
    const filePath = path.join(localDir, fileName);
    if (fs.lstatSync(filePath).isFile()) {
      try {
        // Read file into buffer
        const fileBuffer = fs.readFileSync(filePath);

        // Construct remote path, e.g. "drinks/faxe-kondi-booster.png"
        const remotePath = `${remoteDir}/${fileName}`;

        console.log(`Uploading: ${remotePath} ...`);
        const { data, error } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(remotePath, fileBuffer, {
            // If you want to overwrite existing files, set upsert: true
            upsert: false,
          });

        if (error) {
          console.error(`❌ Failed to upload ${fileName}:`, error.message);
        } else {
          console.log(`✅ Uploaded ${fileName} => ${remotePath}`);
        }
      } catch (err) {
        console.error(`Error reading or uploading ${fileName}:`, err);
      }
    }
  }
}

/** Main entry point */
(async function main() {
  try {
    // Upload "drinks_public" => "drinks/" subfolder
    await uploadDirectory(DRINKS_SOURCE_DIR, 'drinks');

    // Upload "packages_public" => "packages/" subfolder
    await uploadDirectory(PACKAGES_SOURCE_DIR, 'packages');

    console.log('\nAll uploads completed!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Upload script error:', err);
    process.exit(1);
  }
})();

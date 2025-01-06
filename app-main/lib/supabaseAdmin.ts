// lib/supabaseAdmin.ts
import { createClient } from '@supabase/supabase-js';

// Points to your Supabase project URL
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

// Service role key (for admin-like privileges)
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

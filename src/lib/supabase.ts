import { createClient } from '@supabase/supabase-js';

// These environment variables must be set in .env.local
// Get them from your Supabase project dashboard: Settings > API
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Client-side Supabase client (singleton)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side Supabase client for API routes
export function createServerSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  );
}

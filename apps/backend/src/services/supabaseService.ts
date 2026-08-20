import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export function initializeSupabase() {
  console.log('=== SUPABASE STORAGE INITIALIZATION ===');
  console.log('SUPABASE_URL present:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_ANON_KEY present:', !!process.env.SUPABASE_ANON_KEY);
  console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 20) + '...' : 'not set');

  supabaseClient = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_ANON_KEY || ''
  );

  console.log('Supabase client initialized');
  console.log('=== END SUPABASE STORAGE INITIALIZATION ===');
}

export function getSupabaseClient() {
  return supabaseClient;
}

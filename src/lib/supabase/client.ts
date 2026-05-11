import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  Boolean(supabaseUrl) && Boolean(supabasePublishableKey);

export const getSupabaseBrowserClient = (): SupabaseClient | null => {
  if (!isSupabaseConfigured) return null;
  if (browserClient) return browserClient;

  browserClient = createClient(
    supabaseUrl as string,
    supabasePublishableKey as string,
  );
  return browserClient;
};

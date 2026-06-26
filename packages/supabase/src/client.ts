import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Browser-side Supabase client (singleton pattern).
 * Use this in Client Components and browser-side code.
 */
export function createBrowserClient() {
  return createClient<Database>(supabaseUrl, supabaseAnonKey);
}

/**
 * Server-side Supabase client with service role key.
 * Use this ONLY in Server Components, Route Handlers, or Server Actions.
 * NEVER expose service role key to the browser.
 */
export function createServerClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

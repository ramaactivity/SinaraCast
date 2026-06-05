"use client";
import { createClient } from "@supabase/supabase-js";

// Browser Supabase client. Uses the public anon key + URL (safe to expose).
// RLS protects rows; the user must be signed in (magic link) to read their data.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

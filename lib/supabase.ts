import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// No keys → the app runs in demo mode (data stays on the device).
export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } })
    : null;

export const LIVE = !!supabase;

// Google sign-in needs extra setup in Google Cloud + Supabase; show the button only once that's done.
export const GOOGLE_AUTH = process.env.NEXT_PUBLIC_AUTH_GOOGLE === "on";

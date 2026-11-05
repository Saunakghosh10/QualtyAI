import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** True when the app is built with Supabase keys. Without them it runs as a browser-only demo. */
export const isRemote = Boolean(url && key);

let client: SupabaseClient<Database> | null = null;

export function sb(): SupabaseClient<Database> {
  if (!isRemote) throw new Error("Supabase is not configured");
  if (!client) client = createClient<Database>(url!, key!, { auth: { persistSession: true, autoRefreshToken: true } });
  return client;
}

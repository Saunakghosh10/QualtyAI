// Makes an existing Qualty account a Qualty admin (can verify KYC, buyers and sellers, see all orders).
// The person must have signed up on qualty.ai first.
// Usage: SUPABASE_SECRET_KEY=... node scripts/make-admin.mjs someone@example.com
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://efluggnkkjlrjnsbicyq.supabase.co";
const key = process.env.SUPABASE_SECRET_KEY;
const email = process.argv[2]?.trim().toLowerCase();
if (!key || !email) {
  console.error("Usage: SUPABASE_SECRET_KEY=... node scripts/make-admin.mjs someone@example.com");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await db.from("profiles").update({ role: "admin" }).ilike("email", email).select("email, role");
if (error) throw error;
if (!data.length) {
  console.error(`No account for ${email}. Sign up on qualty.ai first, confirm the email, then run this again.`);
  process.exit(1);
}
console.log(`${data[0].email} is now a Qualty admin.`);

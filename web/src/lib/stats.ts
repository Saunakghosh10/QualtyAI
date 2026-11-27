// The Qualty team's stats page (/admin). With Supabase the numbers come from the
// admin_stats() database function; in demo mode they are counted from this browser's data.

import { invoicePaid, invoiceTotal, type DB } from "./local-store";

export interface Signup {
  name: string;
  email: string;
  role: string;
  company: string | null;
  confirmed: boolean;
  createdAt: string;
  lastSignIn: string | null;
}

export interface QualtyStats {
  /** Null in demo mode, which has no accounts. */
  users: { total: number; confirmed: number; last7: number; last30: number; activeLast7: number } | null;
  roles: Record<string, number>;
  signupsByDay: { day: string; count: number }[];
  companies: { total: number; kycVerified: number; withListings: number; activeListings: number };
  orders: { total: number; enquiry: number; booked: number; inProgress: number; completed: number; paid: number; last7: number };
  byService: { service: string; count: number }[];
  bids: number;
  certificates: number;
  money: { customerTotal: number; companyTotal: number; invoiced: number; collected: number };
  recentSignups: Signup[];
}

const DAY = 86_400_000;
const sum = (xs: number[]) => Math.round(xs.reduce((s, x) => s + x, 0) * 100) / 100;

/** The last `n` days, oldest first, as YYYY-MM-DD. */
export function lastDays(n: number, today = new Date()): string[] {
  return Array.from({ length: n }, (_, i) => new Date(today.getTime() - (n - 1 - i) * DAY).toISOString().slice(0, 10));
}

/** Counts the same numbers as admin_stats() from the browser-only store. */
export function statsFromDB(db: DB, today = new Date()): QualtyStats {
  const weekAgo = new Date(today.getTime() - 7 * DAY).toISOString();
  const placed = db.orders.filter((o) => o.status !== "enquiry");
  const services = new Map<string, number>();
  for (const o of db.orders) services.set(o.service, (services.get(o.service) ?? 0) + 1);
  const live = db.listings.filter((l) => l.active);

  return {
    users: null,
    roles: {},
    signupsByDay: lastDays(30, today).map((day) => ({ day, count: 0 })),
    companies: {
      total: db.companies.length,
      kycVerified: db.companies.filter((c) => c.kyc.length > 0 && c.kyc.every((d) => d.status === "verified")).length,
      withListings: new Set(live.map((l) => l.companyId)).size,
      activeListings: live.length,
    },
    orders: {
      total: db.orders.length,
      enquiry: db.orders.filter((o) => o.status === "enquiry").length,
      booked: db.orders.filter((o) => o.status === "booked").length,
      inProgress: db.orders.filter((o) => o.status === "in-progress").length,
      completed: db.orders.filter((o) => o.status === "completed").length,
      paid: db.orders.filter((o) => o.paidAt).length,
      last7: db.orders.filter((o) => o.createdAt > weekAgo).length,
    },
    byService: [...services]
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count || a.service.localeCompare(b.service)),
    bids: db.orders.reduce((s, o) => s + o.bids.length, 0),
    certificates: db.certificates.filter((c) => c.status === "issued").length,
    money: {
      customerTotal: sum(placed.map((o) => o.customerPriceUSD ?? 0)),
      companyTotal: sum(placed.map((o) => o.priceUSD ?? 0)),
      invoiced: sum(db.orders.map((o) => (o.invoice ? invoiceTotal(o.invoice) : 0))),
      collected: sum(db.orders.map((o) => (o.invoice ? invoicePaid(o.invoice) : 0))),
    },
    recentSignups: [],
  };
}

/** Makes the database's numbers safe to render: numeric columns arrive as strings or null. */
export function normaliseStats(raw: unknown): QualtyStats {
  const r = (raw ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (v == null || v === "" || Number.isNaN(Number(v)) ? 0 : Number(v));
  const obj = (v: unknown) => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const nums = <K extends string>(v: unknown, keys: readonly K[]) =>
    Object.fromEntries(keys.map((k) => [k, n(obj(v)[k])])) as Record<K, number>;
  const list = (v: unknown) => (Array.isArray(v) ? (v as Record<string, unknown>[]) : []);

  return {
    users: r.users ? nums(r.users, ["total", "confirmed", "last7", "last30", "activeLast7"] as const) : null,
    roles: Object.fromEntries(Object.entries(obj(r.roles)).map(([k, v]) => [k, n(v)])),
    signupsByDay: list(r.signupsByDay).map((d) => ({ day: String(d.day).slice(0, 10), count: n(d.count) })),
    companies: nums(r.companies, ["total", "kycVerified", "withListings", "activeListings"] as const),
    orders: nums(r.orders, ["total", "enquiry", "booked", "inProgress", "completed", "paid", "last7"] as const),
    byService: list(r.byService).map((s) => ({ service: String(s.service ?? ""), count: n(s.count) })),
    bids: n(r.bids),
    certificates: n(r.certificates),
    money: nums(r.money, ["customerTotal", "companyTotal", "invoiced", "collected"] as const),
    recentSignups: list(r.recentSignups).map((s) => ({
      name: String(s.name ?? ""),
      email: String(s.email ?? ""),
      role: String(s.role ?? "customer"),
      company: s.company ? String(s.company) : null,
      confirmed: Boolean(s.confirmed),
      createdAt: String(s.createdAt ?? ""),
      lastSignIn: s.lastSignIn ? String(s.lastSignIn) : null,
    })),
  };
}

/** Qualty's share: what customers pay minus what companies get. */
export const margin = (s: QualtyStats) => Math.round((s.money.customerTotal - s.money.companyTotal) * 100) / 100;

"use client";

// Who is looking at the screen, so each person lands on their own space:
// visitors and customers on the booking site, inspection companies and the Qualty team on /dashboard.

import { useDB, useSession, isRemote } from "./store";

export type ViewerKind = "loading" | "visitor" | "customer" | "company" | "admin" | "demo";

export interface Viewer {
  kind: ViewerKind;
  /** Companies the viewer works for (all companies for admins, the first one in demo mode). */
  companyIds: string[];
  name?: string;
}

/**
 * Demo mode (no Supabase keys) has no accounts: `demo` sees both the booking site and the
 * dashboard, acting as the first company and as the Qualty team.
 */
export function useViewer(): Viewer {
  const db = useDB();
  const { session, ready } = useSession();
  if (!isRemote) return { kind: "demo", companyIds: db.companies.slice(0, 1).map((c) => c.id) };
  if (!ready) return { kind: "loading", companyIds: [] };
  if (!session) return { kind: "visitor", companyIds: [] };
  if (session.appRole === "admin") return { kind: "admin", companyIds: db.companies.map((c) => c.id), name: session.name };
  const companyIds = db.team.filter((m) => m.userId === session.userId && m.status === "active").map((m) => m.companyId);
  if (companyIds.length || session.appRole === "company") return { kind: "company", companyIds, name: session.name };
  return { kind: "customer", companyIds: [], name: session.name };
}

/** Sees prices the way inspection companies do (company price, reduced budget). */
export const seesCompanyPrices = (v: Viewer) => v.kind === "company" || v.kind === "admin" || v.kind === "demo";
/** Can use the inspection-company dashboard. */
export const usesDashboard = (v: Viewer) => v.kind === "company" || v.kind === "admin" || v.kind === "demo";

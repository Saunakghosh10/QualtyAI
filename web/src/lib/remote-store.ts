"use client";

// Supabase-backed store. Same data shape as local-store.ts, so screens don't change.
// Reads load everything the signed-in user may see (row-level security filters it),
// writes go to tables or server functions, then the cache reloads.

import { useSyncExternalStore } from "react";
import type { CommodityParams } from "@/components/CommodityCalibrator";
import type { Database, Json } from "./database.types";
import { sb } from "./supabase";
import {
  type DB,
  type Order,
  type Bid,
  type BidRound,
  type ChatMessage,
  type DispatchEntry,
  type EvidenceRecord,
  type SavedSpec,
  type Company,
  type KycDoc,
  type KycDocType,
  type TeamMember,
  type TeamRole,
  type ServiceListing,
  type Invoice,
  type Payment,
  type Certificate,
  type CertType,
  type CertCheck,
  type ComplianceItem,
  type Role,
  type Party,
  bidNet,
  invoiceTotal,
  invoicePaid,
  listingProblems,
  inviteProblems,
  readingDeviations,
  buildSummary,
  REQUIRED_CHECKS,
  certPrefix,
  verifyCode,
  sha256Hex,
  getPosition,
  watermarkPhoto,
  describeSpec,
} from "./local-store";

type Tables = Database["public"]["Tables"];
type Row<T extends keyof Tables> = Tables[T]["Row"];

export interface Session {
  userId: string;
  email: string;
  name: string;
  appRole: Role;
}

interface Cache {
  db: DB;
  session: Session | null;
  /** True once the first auth check has finished. */
  ready: boolean;
}

const EMPTY: DB = {
  specs: [],
  orders: [],
  messages: [],
  evidence: [],
  companies: [],
  team: [],
  listings: [],
  certificates: [],
  compliance: [],
};

let cache: Cache = { db: EMPTY, session: null, ready: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const set = (patch: Partial<Cache>) => {
  cache = { ...cache, ...patch };
  emit();
};

// ---------- Mapping rows to the app's types ----------

const ref = (o: Row<"orders">) => `${o.mode === "quick" ? "QI" : "RI"}-${o.created_at.slice(0, 4)}-${o.id.slice(0, 6).toUpperCase()}`;

function mapAll(r: {
  orders: Row<"orders">[];
  bids: Row<"bids">[];
  rounds: Row<"bid_rounds">[];
  invoices: Row<"invoices">[];
  payments: Row<"payments">[];
  messages: Row<"messages">[];
  evidence: Row<"evidence">[];
  companies: Row<"companies">[];
  members: Row<"company_members">[];
  kyc: Row<"kyc_docs">[];
  listings: Row<"service_listings">[];
  certs: Row<"certificates">[];
  compliance: Row<"compliance_items">[];
  specs: Row<"saved_specs">[];
  session: Session | null;
}): DB {
  const companyName = new Map(r.companies.map((c) => [c.id, c.name]));
  const roundsByBid = new Map<string, BidRound[]>();
  for (const x of [...r.rounds].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const list = roundsByBid.get(x.bid_id) ?? [];
    list.push({ by: x.side as BidRound["by"], priceUSD: Number(x.price_usd), note: x.note, at: x.created_at });
    roundsByBid.set(x.bid_id, list);
  }
  const paymentsByInvoice = new Map<string, Payment[]>();
  for (const p of r.payments) {
    const list = paymentsByInvoice.get(p.invoice_id) ?? [];
    list.push({ id: p.id, amountUSD: Number(p.amount_usd), method: p.method, reference: p.reference, receivedOn: p.received_on });
    paymentsByInvoice.set(p.invoice_id, list);
  }
  const invoiceByOrder = new Map<string, Invoice>(
    r.invoices.map((i) => [
      i.order_id,
      {
        number: i.number,
        amountUSD: Number(i.amount_usd),
        discountPct: Number(i.discount_pct),
        issuedOn: i.issued_on,
        dueOn: i.due_on,
        payments: paymentsByInvoice.get(i.id) ?? [],
      },
    ]),
  );
  const party = (name: string, gstin: string | null, iec: string | null, v: Party["verification"]): Party => ({
    name,
    gstin: gstin ?? undefined,
    iec: iec ?? undefined,
    verification: v,
  });
  const me = r.session?.userId;

  const orders: Order[] = [...r.orders]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .map((o) => {
      const company = o.inspection_company_id ? (companyName.get(o.inspection_company_id) ?? "Inspection company") : null;
      const bids: Bid[] = r.bids
        .filter((b) => b.order_id === o.id)
        .map((b) => ({
          id: b.id,
          companyId: b.company_id,
          company: companyName.get(b.company_id) ?? "Inspection company",
          priceUSD: Number(b.price_usd),
          days: b.days,
          scope: b.scope,
          createdAt: b.created_at,
          status: b.status,
          discountPct: Number(b.discount_pct) || undefined,
          rounds: roundsByBid.get(b.id) ?? [],
          followUpOn: b.follow_up_on ?? undefined,
        }));
      return {
        id: o.id,
        ref: ref(o),
        customerId: o.customer_id,
        companyId: o.inspection_company_id,
        mode: o.mode,
        service: o.service,
        commodity: o.commodity,
        spec: (o.spec as unknown as CommodityParams | null) ?? null,
        specLabel: o.spec_label,
        buyer: party(o.buyer_name, o.buyer_gstin, o.buyer_iec, o.buyer_verification),
        seller: party(o.seller_name, o.seller_gstin, o.seller_iec, o.seller_verification),
        location: o.location,
        inspectionDate: o.inspection_date,
        volumeTons: Number(o.volume_tons),
        status: o.status,
        inspectionCompany: company,
        members: [
          { role: "customer" as Role, name: o.customer_id === me ? `${r.session?.name || "You"}` : "Customer" },
          ...(company ? [{ role: "company" as Role, name: company }] : []),
          { role: "admin" as Role, name: "Qualty admin team" },
        ],
        bids,
        createdAt: o.created_at,
        completedAt: o.completed_at ?? undefined,
        priceUSD: o.price_usd === null ? undefined : Number(o.price_usd),
        listingId: o.listing_id ?? undefined,
        invoice: invoiceByOrder.get(o.id),
      };
    });

  const evidence: EvidenceRecord[] = r.evidence.map((e) => ({
    id: e.id,
    filePath: e.file_path,
    orderId: e.order_id,
    kind: e.kind,
    fileName: e.file_name,
    mime: e.mime,
    capturedAt: e.captured_at,
    gps: e.gps_lat !== null && e.gps_lng !== null ? { lat: e.gps_lat, lng: e.gps_lng, accuracy: e.gps_accuracy ?? 0 } : null,
    sha256: e.sha256,
    author: e.author_name,
    role: (e.author_role === "system" ? "admin" : e.author_role) as Role,
    caption: e.caption,
  }));
  const reports = new Set(evidence.filter((e) => e.kind === "report").map((e) => e.id));

  const messages: ChatMessage[] = [...r.messages]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => {
      // Clients can't post the "summary" kind; a text message carrying the report file is the summary.
      const isSummary = m.kind === "text" && m.evidence_id !== null && reports.has(m.evidence_id);
      return {
        id: m.id,
        orderId: m.order_id,
        kind: isSummary ? "summary" : m.kind,
        role: m.author_role,
        author: m.kind === "flag" ? "Inspection Copilot" : m.author_name,
        text: m.text,
        createdAt: m.created_at,
        dispatch: (m.dispatch as unknown as DispatchEntry | null) ?? undefined,
        readings: (m.readings as unknown as ChatMessage["readings"] | null) ?? undefined,
        evidenceId: m.evidence_id ?? undefined,
        severity: (m.severity as ChatMessage["severity"] | null) ?? undefined,
      };
    });

  const latestKyc = new Map<string, KycDoc>();
  for (const d of [...r.kyc].sort((a, b) => a.uploaded_at.localeCompare(b.uploaded_at))) {
    latestKyc.set(`${d.company_id}|${d.type}`, {
      id: d.id,
      type: d.type as KycDocType,
      fileName: d.file_name,
      blobId: d.id,
      filePath: d.file_path,
      sha256: d.sha256,
      uploadedAt: d.uploaded_at,
      status: d.status,
      note: d.note ?? undefined,
    });
  }
  const companies: Company[] = r.companies.map((c) => ({
    id: c.id,
    name: c.name,
    gstin: c.gstin ?? undefined,
    pan: c.pan ?? undefined,
    address: c.address,
    email: c.email,
    phone: c.phone,
    kyc: [...latestKyc.entries()].filter(([k]) => k.startsWith(`${c.id}|`)).map(([, v]) => v),
    createdAt: c.created_at,
  }));

  return {
    specs: r.specs.map(
      (s): SavedSpec => ({
        id: s.id,
        buyerName: s.buyer_name,
        reference: s.reference,
        params: s.params as unknown as CommodityParams,
        createdAt: s.created_at,
      }),
    ),
    orders,
    messages,
    evidence,
    companies,
    team: r.members.map(
      (m): TeamMember => ({
        id: m.id,
        userId: m.user_id,
        companyId: m.company_id,
        name: m.name,
        email: m.email ?? undefined,
        phone: m.phone ?? undefined,
        role: m.role,
        status: m.status,
        invitedAt: m.invited_at,
      }),
    ),
    listings: r.listings.map(
      (l): ServiceListing => ({
        id: l.id,
        companyId: l.company_id,
        companyName: companyName.get(l.company_id) ?? "Inspection company",
        service: l.service,
        commodities: l.commodities,
        location: l.location,
        priceUSD: Number(l.price_usd),
        discountPct: Number(l.discount_pct),
        turnaroundDays: l.turnaround_days,
        surveyors: l.surveyors,
        availableFrom: l.available_from,
        availableTo: l.available_to,
        active: l.active,
        createdAt: l.created_at,
      }),
    ),
    certificates: r.certs.map(
      (c): Certificate => ({
        id: c.id,
        companyId: c.company_id,
        orderId: c.order_id ?? undefined,
        type: c.type as CertType,
        number: c.number,
        issuedTo: c.issued_to,
        issuedOn: c.issued_on,
        validUntil: c.valid_until ?? undefined,
        verifyCode: c.verify_code,
        status: c.status,
        revokedReason: c.revoked_reason ?? undefined,
        blobId: c.file_path ?? undefined,
        fileName: c.file_name ?? undefined,
        sha256: c.sha256 ?? undefined,
      }),
    ),
    compliance: r.compliance.map(
      (c): ComplianceItem => ({
        id: c.id,
        companyId: c.company_id,
        name: c.name,
        issuedBy: c.issued_by,
        reference: c.reference,
        validUntil: c.valid_until,
        covers: c.covers as CertType[],
        blobId: c.file_path ?? undefined,
        fileName: c.file_name ?? undefined,
      }),
    ),
  };
}

// ---------- Loading ----------

async function all<T extends keyof Tables>(table: T): Promise<Row<T>[]> {
  const { data, error } = await sb().from(table).select("*");
  if (error) throw new Error(`Couldn't load ${String(table)}: ${error.message}`);
  return (data ?? []) as unknown as Row<T>[];
}

let loading: Promise<void> | null = null;
let again = false;

/** Reload everything the user can see. Calls made while a reload runs are folded into one more. */
export function refresh(): Promise<void> {
  if (loading) {
    again = true;
    return loading;
  }
  loading = (async () => {
    do {
      again = false;
      const session = cache.session;
      if (!session) {
        set({ db: EMPTY });
        continue;
      }
      const [orders, bids, rounds, invoices, payments, messages, evidence, companies, members, kyc, listings, certs, compliance, specs] =
        await Promise.all([
          all("orders"),
          all("bids"),
          all("bid_rounds"),
          all("invoices"),
          all("payments"),
          all("messages"),
          all("evidence"),
          all("companies"),
          all("company_members"),
          all("kyc_docs"),
          all("service_listings"),
          all("certificates"),
          all("compliance_items"),
          all("saved_specs"),
        ]);
      set({
        db: mapAll({ orders, bids, rounds, invoices, payments, messages, evidence, companies, members, kyc, listings, certs, compliance, specs, session }),
      });
    } while (again);
  })().finally(() => {
    loading = null;
  });
  return loading;
}

async function loadSession(userId: string | null, email: string) {
  if (!userId) {
    set({ session: null, ready: true, db: EMPTY });
    return;
  }
  const { data } = await sb().from("profiles").select("full_name, role").eq("id", userId).maybeSingle();
  set({ session: { userId, email, name: data?.full_name || email, appRole: (data?.role ?? "customer") as Role }, ready: true });
  await refresh().catch(() => {});
}

let started = false;
let poll: ReturnType<typeof setInterval> | null = null;

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  const client = sb();
  client.auth.getSession().then(({ data }) => loadSession(data.session?.user.id ?? null, data.session?.user.email ?? ""));
  client.auth.onAuthStateChange((event, s) => {
    if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") {
      // Defer: calling Supabase inside this callback can deadlock the auth lock.
      setTimeout(() => {
        if (event === "SIGNED_IN") void client.rpc("claim_invites");
        void loadSession(s?.user.id ?? null, s?.user.email ?? "");
      }, 0);
    }
  });
  // Chat arrives live; everything else refreshes every 20 s while the tab is open.
  client
    .channel("qualty-messages")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => void refresh().catch(() => {}))
    .subscribe();
  poll = setInterval(() => {
    if (cache.session && document.visibilityState === "visible") void refresh().catch(() => {});
  }, 20_000);
}

function subscribe(l: () => void) {
  start();
  listeners.add(l);
  return () => listeners.delete(l);
}

const getCache = () => cache;
const SERVER: Cache = { db: EMPTY, session: null, ready: false };

export function useRemoteDB(): DB {
  return useSyncExternalStore(subscribe, () => getCache().db, () => SERVER.db);
}

export function useRemoteSession(): { session: Session | null; ready: boolean } {
  const c = useSyncExternalStore(subscribe, getCache, () => SERVER);
  return { session: c.session, ready: c.ready };
}

/** For tests and sign-out. */
export function stopRemote() {
  if (poll) clearInterval(poll);
}

// ---------- Auth ----------

export async function signUp(input: { name: string; email: string; password: string; asCompany: boolean }) {
  const { data, error } = await sb().auth.signUp({
    email: input.email.trim(),
    password: input.password,
    options: {
      data: { full_name: input.name.trim(), role: input.asCompany ? "company" : "customer" },
      emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
    },
  });
  if (error) throw new Error(error.message);
  return { needsConfirmation: !data.session };
}

export async function signIn(email: string, password: string) {
  const { error } = await sb().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
}

export async function signOut() {
  await sb().auth.signOut();
}

// ---------- Helpers ----------

const today = () => new Date().toISOString().slice(0, 10);
const need = () => {
  if (!cache.session) throw new Error("Sign in first.");
  return cache.session;
};
const fail = (error: { message: string } | null, what: string) => {
  if (error) throw new Error(`${what}: ${error.message}`);
};
const order = (id: string) => cache.db.orders.find((o) => o.id === id);
const asJson = (v: unknown) => v as Json;
const safeName = (n: string) => n.replace(/[^\w.-]+/g, "_").slice(-80);

/** Companies where I hold one of the roles. */
export function myCompanyIds(roles?: TeamRole[]) {
  const me = cache.session?.userId;
  return cache.db.team
    .filter((m) => m.userId === me && m.status === "active" && (!roles || roles.includes(m.role)))
    .map((m) => m.companyId);
}

async function upload(bucket: "evidence" | "company-docs", path: string, blob: Blob) {
  const { error } = await sb().storage.from(bucket).upload(path, blob, { contentType: blob.type || undefined, upsert: false });
  fail(error, "Upload failed");
  return path;
}

async function text(orderId: string, body: string) {
  await sb().from("messages").insert({ order_id: orderId, kind: "text", text: body, author_name: "", author_role: "customer" });
}

async function flag(orderId: string, body: string, severity: "warning" | "critical") {
  const { error } = await sb()
    .from("messages")
    .insert({ order_id: orderId, kind: "flag", text: body, severity, author_name: "", author_role: "company" });
  fail(error, "Couldn't post the flag");
}

// ---------- Specs ----------

export async function saveSpec(input: Omit<SavedSpec, "id" | "createdAt">): Promise<SavedSpec> {
  const s = need();
  const { data, error } = await sb()
    .from("saved_specs")
    .insert({ owner_id: s.userId, buyer_name: input.buyerName, reference: input.reference, params: asJson(input.params) })
    .select()
    .single();
  fail(error, "Couldn't save the spec");
  await refresh();
  return { id: data!.id, buyerName: data!.buyer_name, reference: data!.reference, params: input.params, createdAt: data!.created_at };
}

export async function deleteSpec(id: string) {
  const { error } = await sb().from("saved_specs").delete().eq("id", id);
  fail(error, "Couldn't delete the spec");
  await refresh();
}

// ---------- Orders ----------

export async function createOrder(
  input: Omit<Order, "id" | "status" | "members" | "bids" | "createdAt" | "inspectionCompany"> & {
    customerName: string;
    inspectionCompany?: string;
  },
): Promise<Order> {
  need();
  if (input.mode === "quick" && !input.listingId)
    throw new Error("Pick an inspection company from the list, or raise an enquiry so companies can bid.");
  const { data, error } = await sb()
    .from("orders")
    .insert({
      mode: input.mode,
      service: input.service,
      commodity: input.commodity,
      spec: input.spec ? asJson(input.spec) : null,
      spec_label: input.specLabel,
      buyer_name: input.buyer.name,
      buyer_gstin: input.buyer.gstin ?? null,
      buyer_iec: input.buyer.iec ?? null,
      seller_name: input.seller.name,
      seller_gstin: input.seller.gstin ?? null,
      seller_iec: input.seller.iec ?? null,
      location: input.location,
      inspection_date: input.inspectionDate,
      volume_tons: input.volumeTons,
      listing_id: input.listingId ?? null,
      customer_id: cache.session!.userId,
    })
    .select()
    .single();
  fail(error, "Couldn't create the order");
  for (const side of ["buyer", "seller"] as const) {
    if (input[side].verification === "format-checked")
      await sb().rpc("set_party_verification", { oid: data!.id, side, state: "format-checked" });
  }
  if (input.spec) await text(data!.id, `Booked spec: ${describeSpec(input.spec)}. Readings outside it are flagged automatically.`);
  await refresh();
  return order(data!.id) ?? ({ id: data!.id, ref: ref(data!) } as Order);
}

export async function setPartyVerified(orderId: string, side: "buyer" | "seller") {
  const { error } = await sb().rpc("set_party_verification", { oid: orderId, side, state: "verified" });
  fail(error, "Couldn't mark it verified");
  await text(orderId, `Qualty admin verified the ${side}.`);
  await refresh();
}

// ---------- Bids ----------

export async function submitBid(orderId: string, bid: Omit<Bid, "id" | "createdAt" | "status" | "rounds">): Promise<Bid> {
  const s = need();
  const companyId = bid.companyId ?? myCompanyIds(["owner", "sales"])[0];
  if (!companyId) throw new Error("Only a company owner or sales member can bid. Set up your company first.");
  const { data, error } = await sb()
    .from("bids")
    .insert({
      order_id: orderId,
      company_id: companyId,
      price_usd: bid.priceUSD,
      discount_pct: bid.discountPct ?? 0,
      days: bid.days,
      scope: bid.scope,
      created_by: s.userId,
    })
    .select()
    .single();
  fail(error, "Couldn't submit the bid");
  const off = bid.discountPct ? ` (${bid.discountPct}% off $${bid.priceUSD.toLocaleString()})` : "";
  await text(orderId, `Bid: $${bidNet(bid).toLocaleString()}${off} for ${bid.days} day(s).`);
  await refresh();
  return order(orderId)?.bids.find((b) => b.id === data!.id) ?? ({ ...bid, id: data!.id, status: "open", createdAt: data!.created_at } as Bid);
}

export async function acceptBid(orderId: string, bidId: string) {
  const { error } = await sb().rpc("accept_bid", { bid: bidId });
  fail(error, "Couldn't accept the bid");
  await refresh();
}

export async function counterBid(orderId: string, bidId: string, by: BidRound["by"], priceUSD: number, note = "") {
  const s = need();
  if (!(priceUSD > 0)) return;
  const { error } = await sb().from("bid_rounds").insert({ bid_id: bidId, side: by, price_usd: priceUSD, note: note.trim(), created_by: s.userId });
  fail(error, "Couldn't send the offer");
  if (by === "company") {
    const { error: e2 } = await sb().from("bids").update({ price_usd: priceUSD, discount_pct: 0 }).eq("id", bidId);
    fail(e2, "Couldn't revise the bid");
  }
  await text(
    orderId,
    `${by === "company" ? "Revised the bid to" : "Counter-offer:"} $${priceUSD.toLocaleString()}.${note.trim() ? ` Note: ${note.trim()}` : ""}`,
  );
  await refresh();
}

export async function discountBid(orderId: string, bidId: string, discountPct: number) {
  if (discountPct < 0 || discountPct >= 100) return;
  const { error } = await sb().from("bids").update({ discount_pct: discountPct }).eq("id", bidId);
  fail(error, "Couldn't apply the discount");
  const b = order(orderId)?.bids.find((x) => x.id === bidId);
  if (b) await text(orderId, `Gave ${discountPct}% off: bid is now $${bidNet({ priceUSD: b.priceUSD, discountPct }).toLocaleString()}.`);
  await refresh();
}

export async function setFollowUp(_orderId: string, bidId: string, date: string) {
  const { error } = await sb().from("bids").update({ follow_up_on: date || null }).eq("id", bidId);
  fail(error, "Couldn't save the follow-up date");
  await refresh();
}

export async function withdrawBid(orderId: string, bidId: string) {
  const { error } = await sb().rpc("withdraw_bid", { bid: bidId });
  fail(error, "Couldn't withdraw the bid");
  await text(orderId, "Withdrew the bid.");
  await refresh();
}

// ---------- Chat, evidence, completion ----------

async function startIfBooked(o: Order | undefined) {
  if (o?.status === "booked") await sb().rpc("set_order_status", { oid: o.id, next: "in-progress" });
}

export async function postMessage(msg: Omit<ChatMessage, "id" | "createdAt">): Promise<void> {
  need();
  const o = order(msg.orderId);
  if (msg.kind !== "text" && msg.role !== "customer") await startIfBooked(o);
  const { error } = await sb()
    .from("messages")
    .insert({
      order_id: msg.orderId,
      kind: msg.kind,
      text: msg.text,
      dispatch: msg.dispatch ? asJson(msg.dispatch) : null,
      readings: msg.readings ? asJson(msg.readings) : null,
      evidence_id: msg.evidenceId ?? null,
      severity: msg.severity ?? null,
      author_name: "",
      author_role: "customer",
    });
  fail(error, "Couldn't send the message");
  if (o?.spec && msg.kind === "observation" && msg.readings)
    for (const d of readingDeviations(o.spec, msg.readings)) await flag(o.id, `Quality deviation: ${d.text}`, d.severity);
  if (o && msg.kind === "dispatch" && msg.dispatch) {
    const d = msg.dispatch;
    if (!d.sealNo.trim()) await flag(o.id, `Missing seal number for ${d.vehicleNo}.`, "warning");
    const used = cache.db.messages.some((m) => m.orderId === o.id && m.kind === "dispatch" && d.sealNo && m.dispatch?.sealNo === d.sealNo);
    if (used) await flag(o.id, `Seal ${d.sealNo} was already used on another truck or container.`, "critical");
  }
  await refresh();
}

export async function addEvidence(opts: { orderId: string; file: File; caption: string; author: string; role: Role }): Promise<EvidenceRecord> {
  need();
  const o = order(opts.orderId);
  const gps = await getPosition();
  const capturedAt = new Date().toISOString();
  const isVideo = opts.file.type.startsWith("video/");
  const stamp = [
    `QUALTY.AI  ${o?.ref ?? opts.orderId}`,
    new Date(capturedAt).toLocaleString(),
    gps ? `GPS ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (±${gps.accuracy} m)` : "GPS unavailable — location not shared",
    `${opts.author}${o?.inspectionCompany ? ` · ${o.inspectionCompany}` : ""}`,
  ];
  const blob = isVideo ? opts.file : await watermarkPhoto(opts.file, stamp);
  const sha256 = await sha256Hex(await blob.arrayBuffer());
  const path = await upload("evidence", `${opts.orderId}/${crypto.randomUUID()}-${safeName(opts.file.name)}`, blob);
  await startIfBooked(o);
  const { data, error } = await sb()
    .from("evidence")
    .insert({
      order_id: opts.orderId,
      kind: isVideo ? "video" : "photo",
      file_name: opts.file.name,
      file_path: path,
      mime: blob.type || opts.file.type,
      captured_at: capturedAt,
      gps_lat: gps?.lat ?? null,
      gps_lng: gps?.lng ?? null,
      gps_accuracy: gps?.accuracy ?? null,
      sha256,
      caption: opts.caption,
      author_name: "",
      author_role: "customer",
    })
    .select()
    .single();
  fail(error, "Couldn't save the evidence");
  await sb()
    .from("messages")
    .insert({ order_id: opts.orderId, kind: "media", text: opts.caption || (isVideo ? "Video" : "Photo"), evidence_id: data!.id, author_name: "", author_role: "customer" });
  if (!gps) await flag(opts.orderId, `${isVideo ? "Video" : "Photo"} "${opts.caption || opts.file.name}" has no GPS. Ask the inspector to allow location.`, "warning");
  await refresh();
  return cache.db.evidence.find((e) => e.id === data!.id)!;
}

export async function completeInspection(orderId: string, checklist: Record<string, boolean>): Promise<string | null> {
  need();
  const o = order(orderId);
  if (!o) return null;
  const missing = REQUIRED_CHECKS.filter((c) => !checklist[c]);
  for (const c of missing) await flag(orderId, `Missing item at completion: ${c}.`, "warning");
  const vehicles = new Set(cache.db.messages.filter((m) => m.orderId === orderId && m.dispatch).map((m) => m.dispatch!.vehicleNo));
  const captions = cache.db.evidence.filter((e) => e.orderId === orderId && e.kind !== "report").map((e) => e.caption.toUpperCase());
  for (const v of vehicles)
    if (!captions.some((c) => c.includes(v.toUpperCase())))
      await flag(orderId, `No photo of ${v}. Add one with the vehicle or container number in the caption.`, "warning");
  await refresh();
  const summary = buildSummary(
    { ...o, id: o.ref ?? o.id },
    cache.db.messages.filter((m) => m.orderId === orderId),
    cache.db.evidence.filter((e) => e.orderId === orderId),
    missing,
  );
  await startIfBooked(order(orderId));
  const { error: se } = await sb().rpc("set_order_status", { oid: orderId, next: "completed" });
  fail(se, "Couldn't close the inspection");
  const file = new Blob([summary], { type: "text/plain" });
  const name = `${o.ref ?? o.id}-inspection-summary.txt`;
  try {
    const path = await upload("evidence", `${orderId}/${crypto.randomUUID()}-${name}`, file);
    const { data } = await sb()
      .from("evidence")
      .insert({
        order_id: orderId,
        kind: "report",
        file_name: name,
        file_path: path,
        mime: "text/plain",
        captured_at: new Date().toISOString(),
        sha256: await sha256Hex(new TextEncoder().encode(summary)),
        caption: "Automatic inspection summary",
        author_name: "",
        author_role: "customer",
      })
      .select()
      .single();
    await sb()
      .from("messages")
      .insert({ order_id: orderId, kind: "text", text: summary, evidence_id: data?.id ?? null, author_name: "", author_role: "customer" });
  } catch {
    await sb().from("messages").insert({ order_id: orderId, kind: "text", text: summary, author_name: "", author_role: "customer" });
  }
  await refresh();
  return summary;
}

const blobCache = new Map<string, Blob>();

/** Downloads an evidence file (by evidence id) or a company document (by storage path). */
export async function getBlob(id: string): Promise<Blob | null> {
  if (blobCache.has(id)) return blobCache.get(id)!;
  const ev = cache.db.evidence.find((e) => e.id === id);
  const [bucket, path] = ev?.filePath ? (["evidence", ev.filePath] as const) : (["company-docs", id] as const);
  const { data, error } = await sb().storage.from(bucket).download(path);
  if (error || !data) return null;
  blobCache.set(id, data);
  return data;
}

// ---------- Companies, KYC, team ----------

export async function createCompany(input: Omit<Company, "id" | "kyc" | "createdAt">, ownerName: string): Promise<Company> {
  const s = need();
  if (ownerName.trim() && !s.name.trim()) await sb().from("profiles").update({ full_name: ownerName.trim() }).eq("id", s.userId);
  const { data, error } = await sb()
    .from("companies")
    .insert({
      name: input.name.trim(),
      address: input.address,
      email: input.email,
      phone: input.phone,
      gstin: input.gstin?.trim().toUpperCase() || null,
      pan: input.pan?.trim().toUpperCase() || null,
      created_by: s.userId,
    })
    .select()
    .single();
  fail(error, "Couldn't create the company");
  await refresh();
  return cache.db.companies.find((c) => c.id === data!.id)!;
}

export async function updateCompany(id: string, patch: Partial<Omit<Company, "id" | "kyc" | "createdAt">>) {
  const { error } = await sb()
    .from("companies")
    .update({
      ...(patch.name !== undefined && { name: patch.name }),
      ...(patch.address !== undefined && { address: patch.address }),
      ...(patch.email !== undefined && { email: patch.email }),
      ...(patch.phone !== undefined && { phone: patch.phone }),
      ...("gstin" in patch && { gstin: patch.gstin ?? null }),
      ...("pan" in patch && { pan: patch.pan ?? null }),
    })
    .eq("id", id);
  fail(error, "Couldn't save the profile");
  await refresh();
}

export async function inviteMember(companyId: string, input: { name: string; email?: string; phone?: string; role: TeamRole }): Promise<string[]> {
  const { email, phone, problems } = inviteProblems(
    cache.db.team.filter((m) => m.companyId === companyId),
    input,
  );
  if (problems.length) return problems;
  const { error } = await sb()
    .from("company_members")
    .insert({ company_id: companyId, name: input.name.trim(), email: email ?? null, phone: phone ?? null, role: input.role, status: "invited" });
  if (error) return [`Couldn't add the invite: ${error.message}`];
  await refresh();
  return [];
}

const lastOwner = (m: TeamMember) =>
  m.role === "owner" && cache.db.team.filter((x) => x.companyId === m.companyId && x.role === "owner").length === 1;

export async function setMemberRole(memberId: string, role: TeamRole) {
  const m = cache.db.team.find((x) => x.id === memberId);
  if (!m || m.role === role || lastOwner(m)) return;
  const { error } = await sb().from("company_members").update({ role }).eq("id", memberId);
  fail(error, "Couldn't change the role");
  await refresh();
}

/** On the backend people join by signing up with the invited email, so there's nothing to do here. */
export async function activateMember() {}

export async function removeMember(memberId: string) {
  const m = cache.db.team.find((x) => x.id === memberId);
  if (!m || lastOwner(m)) return;
  const { error } = await sb().from("company_members").delete().eq("id", memberId);
  fail(error, "Couldn't remove the member");
  await refresh();
}

export async function addKycDoc(companyId: string, type: KycDocType, file: File) {
  const sha256 = await sha256Hex(await file.arrayBuffer());
  const path = await upload("company-docs", `${companyId}/kyc/${crypto.randomUUID()}-${safeName(file.name)}`, file);
  const { error } = await sb()
    .from("kyc_docs")
    .insert({ company_id: companyId, type, file_name: file.name, file_path: path, sha256, status: "submitted" });
  fail(error, "Couldn't save the document");
  await refresh();
}

export async function reviewKycDoc(_companyId: string, docId: string, status: "verified" | "rejected", note = "") {
  const { error } = await sb().from("kyc_docs").update({ status, note: note.trim() || null }).eq("id", docId);
  fail(error, "Only Qualty admins can review KYC");
  await refresh();
}

// ---------- Service store ----------

export async function saveListing(input: Omit<ServiceListing, "id" | "createdAt" | "companyName"> & { id?: string }): Promise<string[]> {
  const problems = listingProblems(input);
  if (problems.length) return problems;
  const row = {
    company_id: input.companyId,
    service: input.service.trim(),
    location: input.location.trim(),
    commodities: input.commodities.map((c) => c.trim()).filter(Boolean),
    price_usd: input.priceUSD,
    discount_pct: input.discountPct,
    turnaround_days: input.turnaroundDays,
    surveyors: input.surveyors,
    available_from: input.availableFrom,
    available_to: input.availableTo,
    active: input.active,
  };
  const { error } = input.id
    ? await sb().from("service_listings").update(row).eq("id", input.id)
    : await sb().from("service_listings").insert(row);
  if (error) return [`Couldn't save the listing: ${error.message}`];
  await refresh();
  return [];
}

export async function deleteListing(id: string) {
  const { error } = await sb().from("service_listings").delete().eq("id", id);
  fail(error, "Couldn't delete the listing");
  await refresh();
}

// ---------- Payments ----------

export async function raiseInvoice(orderId: string, input: { amountUSD: number; discountPct: number; dueOn: string }): Promise<string[]> {
  const o = order(orderId);
  if (!o) return ["Order not found."];
  if (o.status === "enquiry") return ["Invoice after the customer confirms the booking."];
  if (o.invoice) return ["This order already has an invoice."];
  if (!(input.amountUSD > 0)) return ["Amount must be more than $0."];
  if (input.discountPct < 0 || input.discountPct >= 100) return ["Discount must be between 0 and 99%."];
  if (!input.dueOn) return ["Add a due date."];
  const number = `INV-${o.ref ?? o.id}`;
  const { error } = await sb()
    .from("invoices")
    .insert({ order_id: orderId, number, amount_usd: input.amountUSD, discount_pct: input.discountPct, due_on: input.dueOn, issued_on: today() });
  if (error) return [`Couldn't raise the invoice: ${error.message}`];
  await text(orderId, `Invoice ${number} raised for $${invoiceTotal({ ...input, number, issuedOn: today(), payments: [] }).toLocaleString()}, due ${input.dueOn}.`);
  await refresh();
  return [];
}

export async function recordPayment(orderId: string, p: Omit<Payment, "id">): Promise<string[]> {
  const o = order(orderId);
  const i = o?.invoice;
  if (!o || !i) return ["Raise an invoice first."];
  if (!(p.amountUSD > 0)) return ["Amount must be more than $0."];
  const due = invoiceTotal(i) - invoicePaid(i);
  if (p.amountUSD > due) return [`Only $${due.toLocaleString()} is left to pay on this invoice.`];
  const { data: inv } = await sb().from("invoices").select("id").eq("order_id", orderId).single();
  const { error } = await sb()
    .from("payments")
    .insert({ invoice_id: inv!.id, amount_usd: p.amountUSD, method: p.method, reference: p.reference, received_on: p.receivedOn });
  if (error) return [`Couldn't record the payment: ${error.message}`];
  const left = due - p.amountUSD;
  await text(
    orderId,
    `Payment of $${p.amountUSD.toLocaleString()} received (${p.method}${p.reference ? `, ref ${p.reference}` : ""}). ${left > 0 ? `$${left.toLocaleString()} still due.` : "Invoice fully paid."}`,
  );
  await refresh();
  return [];
}

// ---------- Certificates and compliance ----------

export async function issueCertificate(input: {
  companyId: string;
  orderId?: string;
  type: CertType;
  issuedTo: string;
  validUntil?: string;
  file?: File | null;
}): Promise<{ cert?: Certificate; problems: string[] }> {
  const problems: string[] = [];
  if (!cache.db.companies.some((c) => c.id === input.companyId)) problems.push("Set up the company profile first.");
  if (!input.issuedTo.trim()) problems.push("Add who the certificate is issued to.");
  if (input.validUntil && input.validUntil < today()) problems.push("'Valid until' can't be in the past.");
  const o = input.orderId ? order(input.orderId) : undefined;
  if (input.orderId && !o) problems.push("Order not found.");
  if (o && o.status !== "completed") problems.push("Issue certificates after the inspection is completed.");
  if (problems.length) return { problems };

  let file: { file_path?: string; file_name?: string; sha256?: string } = {};
  if (input.file) {
    const path = await upload("company-docs", `${input.companyId}/certificates/${crypto.randomUUID()}-${safeName(input.file.name)}`, input.file);
    file = { file_path: path, file_name: input.file.name, sha256: await sha256Hex(await input.file.arrayBuffer()) };
  }
  const year = today().slice(0, 4);
  const count = cache.db.certificates.filter((c) => c.companyId === input.companyId && c.type === input.type).length + 1;
  // Numbers repeat across companies, so the company's short id keeps them distinct.
  const number = `${certPrefix(input.type)}-${year}-${String(count).padStart(4, "0")}-${input.companyId.slice(0, 4).toUpperCase()}`;
  const { data, error } = await sb()
    .from("certificates")
    .insert({
      company_id: input.companyId,
      order_id: input.orderId ?? null,
      type: input.type,
      number,
      issued_to: input.issuedTo.trim(),
      issued_on: today(),
      valid_until: input.validUntil || null,
      verify_code: verifyCode(),
      status: "issued",
      ...file,
    })
    .select()
    .single();
  if (error) return { problems: [`Couldn't issue the certificate: ${error.message}`] };
  if (input.orderId) await text(input.orderId, `Issued ${input.type} ${number}. Check code: ${data!.verify_code}.`);
  await refresh();
  return { cert: cache.db.certificates.find((c) => c.id === data!.id), problems: [] };
}

export async function revokeCertificate(id: string, reason: string): Promise<string[]> {
  if (!reason.trim()) return ["Say why the certificate is revoked."];
  const cert = cache.db.certificates.find((c) => c.id === id);
  if (!cert || cert.status === "revoked") return [];
  const { error } = await sb().from("certificates").update({ status: "revoked", revoked_reason: reason.trim() }).eq("id", id);
  if (error) return [`Couldn't revoke it: ${error.message}`];
  if (cert.orderId) await text(cert.orderId, `${cert.type} ${cert.number} was revoked: ${reason.trim()}`);
  await refresh();
  return [];
}

/** Anyone, signed in or not, can check a certificate by its code or number. */
export async function checkCertificate(code: string): Promise<CertCheck> {
  const q = code.trim().toUpperCase();
  // The server matches check codes; a number typed in is resolved from what this user can see.
  const byNumber = cache.db.certificates.find((c) => c.number === q)?.verifyCode;
  const { data, error } = await sb().rpc("verify_certificate", { code: byNumber ?? q });
  const row = data?.[0];
  if (error || !row) return { result: "not-found" };
  const cert = {
    id: "",
    companyId: "",
    type: row.type as CertType,
    number: row.number,
    issuedTo: row.issued_to,
    issuedOn: row.issued_on,
    validUntil: row.valid_until ?? undefined,
    verifyCode: q,
    status: row.status,
    revokedReason: row.revoked_reason ?? undefined,
  } satisfies Certificate;
  if (row.status === "revoked") return { result: "revoked", cert, companyName: row.company_name };
  if (row.valid_until && row.valid_until < today()) return { result: "expired", cert, companyName: row.company_name };
  return { result: "valid", cert, companyName: row.company_name };
}

export async function addCompliance(input: Omit<ComplianceItem, "id" | "blobId" | "fileName"> & { file?: File | null }): Promise<string[]> {
  const problems: string[] = [];
  if (!input.name.trim()) problems.push("Add the accreditation or licence name.");
  if (!input.issuedBy.trim()) problems.push("Add who issued it.");
  if (!input.validUntil) problems.push("Add the expiry date.");
  if (problems.length) return problems;
  let file: { file_path?: string; file_name?: string } = {};
  if (input.file) {
    const path = await upload("company-docs", `${input.companyId}/compliance/${crypto.randomUUID()}-${safeName(input.file.name)}`, input.file);
    file = { file_path: path, file_name: input.file.name };
  }
  const { error } = await sb()
    .from("compliance_items")
    .insert({
      company_id: input.companyId,
      name: input.name.trim(),
      issued_by: input.issuedBy.trim(),
      reference: input.reference,
      valid_until: input.validUntil,
      covers: input.covers,
      ...file,
    });
  if (error) return [`Couldn't add it: ${error.message}`];
  await refresh();
  return [];
}

export async function removeCompliance(id: string) {
  const { error } = await sb().from("compliance_items").delete().eq("id", id);
  fail(error, "Couldn't remove it");
  await refresh();
}

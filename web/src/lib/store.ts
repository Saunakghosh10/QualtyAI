"use client";

// Browser-side data layer for Qualty.AI.
// The web app has no backend yet, so orders, saved specs, chat messages and
// evidence are kept in localStorage (records) and IndexedDB (photo/video files).
// Every function here is the seam to swap for real API calls later.

import { useSyncExternalStore } from "react";
import type { CommodityParams } from "@/components/CommodityCalibrator";

export type Role = "customer" | "company" | "inspector" | "admin";

export const ROLE_LABEL: Record<Role, string> = {
  customer: "Customer",
  company: "Inspection company",
  inspector: "Inspector",
  admin: "Qualty admin",
};

export interface SavedSpec {
  id: string;
  buyerName: string;
  reference: string;
  params: CommodityParams;
  createdAt: string;
}

export interface Party {
  name: string;
  gstin?: string;
  iec?: string;
  verification: "unverified" | "format-checked" | "verified";
}

export interface Bid {
  id: string;
  company: string;
  priceUSD: number;
  days: number;
  scope: string;
  createdAt: string;
  status: "open" | "accepted" | "declined" | "withdrawn";
  /** Discount the company offers on priceUSD, in percent. */
  discountPct?: number;
  /** Negotiation history: every counter-offer from either side, oldest first. */
  rounds?: BidRound[];
  /** Date the company plans to follow up with the customer (YYYY-MM-DD). */
  followUpOn?: string;
}

export interface BidRound {
  by: "customer" | "company";
  priceUSD: number;
  note: string;
  at: string;
}

/** Price after the bid's discount. */
export const bidNet = (b: Pick<Bid, "priceUSD" | "discountPct">) =>
  Math.round(b.priceUSD * (1 - (b.discountPct ?? 0) / 100));

export type OrderStatus = "enquiry" | "booked" | "in-progress" | "completed";

export interface Order {
  id: string;
  mode: "quick" | "inquiry";
  service: string;
  commodity: string;
  spec: CommodityParams | null;
  specLabel: string | null;
  buyer: Party;
  seller: Party;
  location: string;
  inspectionDate: string;
  volumeTons: number;
  status: OrderStatus;
  inspectionCompany: string | null;
  members: { role: Role; name: string }[];
  bids: Bid[];
  createdAt: string;
  completedAt?: string;
  /** Agreed price (after discount), set when a quick booking or a bid is confirmed. */
  priceUSD?: number;
  /** Service store listing the quick booking came from. */
  listingId?: string;
  invoice?: Invoice;
}

export type MessageKind = "text" | "system" | "observation" | "dispatch" | "flag" | "media" | "summary";

export interface DispatchEntry {
  vehicleNo: string;
  sealNo: string;
  bags: number;
  weightTons: number;
}

export interface ChatMessage {
  id: string;
  orderId: string;
  kind: MessageKind;
  role: Role | "system";
  author: string;
  text: string;
  createdAt: string;
  dispatch?: DispatchEntry;
  readings?: Partial<Pick<CommodityParams, "broken" | "purity" | "moisture" | "damageKernel" | "liveInsects">>;
  evidenceId?: string;
  severity?: "warning" | "critical";
}

export interface EvidenceRecord {
  id: string;
  orderId: string;
  kind: "photo" | "video" | "report";
  fileName: string;
  mime: string;
  capturedAt: string;
  gps: { lat: number; lng: number; accuracy: number } | null;
  sha256: string;
  author: string;
  role: Role;
  caption: string;
}

interface DB {
  specs: SavedSpec[];
  orders: Order[];
  messages: ChatMessage[];
  evidence: EvidenceRecord[];
  companies: Company[];
  team: TeamMember[];
  listings: ServiceListing[];
  certificates: Certificate[];
  compliance: ComplianceItem[];
}

const KEY = "qualty_store_v1";
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

let cache: DB | null = null;
const listeners = new Set<() => void>();

function load(): DB {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache!;
}

function commit(next: DB) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: keep the in-memory copy for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

// Returns the whole store. Derive filtered lists with useMemo in the component;
// the snapshot must stay referentially stable between renders.
export function useDB(): DB {
  return useSyncExternalStore(subscribe, load, () => EMPTY);
}

export const uid = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const now = () => new Date().toISOString();

// ---------- Saved buyer specs ----------

export function saveSpec(input: Omit<SavedSpec, "id" | "createdAt">): SavedSpec {
  const spec: SavedSpec = { ...input, id: uid("spec"), createdAt: now() };
  const db = load();
  commit({ ...db, specs: [spec, ...db.specs] });
  return spec;
}

export function deleteSpec(id: string) {
  const db = load();
  commit({ ...db, specs: db.specs.filter((s) => s.id !== id) });
}

export const specLabel = (s: SavedSpec) =>
  s.reference ? `${s.buyerName} · ${s.reference}` : s.buyerName;

// ---------- Buyer / seller verification ----------

// GSTIN: 2-digit state code, 10-char PAN, entity digit, 'Z', check char.
const GSTIN_RE = /^[0-3][0-9][A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
// IEC: 10 characters (DGFT now issues the PAN as the IEC).
const IEC_RE = /^[A-Z0-9]{10}$/;

export function checkParty(p: { name: string; gstin?: string; iec?: string }): {
  party: Party;
  problems: string[];
} {
  const gstin = p.gstin?.trim().toUpperCase() || undefined;
  const iec = p.iec?.trim().toUpperCase() || undefined;
  const problems: string[] = [];
  if (gstin && !GSTIN_RE.test(gstin)) problems.push("GSTIN should be 15 characters, like 27AAPFU0939F1ZV.");
  if (iec && !IEC_RE.test(iec)) problems.push("IEC should be 10 letters or digits.");
  if (gstin && iec && IEC_RE.test(iec) && GSTIN_RE.test(gstin) && gstin.slice(2, 12) !== iec) {
    problems.push("IEC does not match the PAN inside the GSTIN.");
  }
  const hasId = Boolean(gstin || iec);
  return {
    party: {
      name: p.name.trim(),
      gstin,
      iec,
      verification: hasId && problems.length === 0 ? "format-checked" : "unverified",
    },
    problems,
  };
}

export function setPartyVerified(orderId: string, side: "buyer" | "seller") {
  updateOrder(orderId, (o) => ({ ...o, [side]: { ...o[side], verification: "verified" } }));
  const o = getOrder(orderId);
  if (o) systemMessage(orderId, `Admin verified the ${side}: ${o[side].name}.`);
}

// ---------- Orders and chatrooms ----------

export function getOrder(id: string) {
  return load().orders.find((o) => o.id === id) ?? null;
}

function updateOrder(id: string, fn: (o: Order) => Order) {
  const db = load();
  commit({ ...db, orders: db.orders.map((o) => (o.id === id ? fn(o) : o)) });
}

function nextOrderNo(mode: Order["mode"]) {
  const prefix = mode === "quick" ? "QI" : "RI";
  const year = new Date().getFullYear();
  const count = load().orders.filter((o) => o.mode === mode).length + 1;
  return `${prefix}-${year}-${String(count).padStart(4, "0")}`;
}

export function createOrder(
  input: Omit<Order, "id" | "status" | "members" | "bids" | "createdAt" | "inspectionCompany"> & {
    customerName: string;
    inspectionCompany?: string;
  },
): Order {
  const { customerName, inspectionCompany, ...rest } = input;
  const company = input.mode === "quick" ? inspectionCompany || "Qualty partner surveyors" : null;
  const order: Order = {
    ...rest,
    id: nextOrderNo(input.mode),
    status: input.mode === "quick" ? "booked" : "enquiry",
    inspectionCompany: company,
    members: [
      { role: "customer", name: customerName },
      ...(company ? [{ role: "company" as Role, name: company }] : []),
      { role: "admin", name: "Qualty admin team" },
    ],
    bids: [],
    createdAt: now(),
  };
  const db = load();
  commit({ ...db, orders: [order, ...db.orders] });
  systemMessage(
    order.id,
    input.mode === "quick"
      ? `Chatroom opened for order ${order.id}. Members: ${order.members.map((m) => m.name).join(", ")}.`
      : `Enquiry ${order.id} is open for bids. Inspection companies can bid in this room; the customer picks one.`,
  );
  if (order.spec) {
    systemMessage(order.id, `Booked spec: ${describeSpec(order.spec)}. Readings outside it are flagged automatically.`);
  }
  return order;
}

export function describeSpec(s: CommodityParams) {
  return `${s.commodity}, broken ≤ ${s.broken}%, purity ≥ ${s.purity}%, moisture ≤ ${s.moisture}%, damaged ≤ ${s.damageKernel}%, live insects ${s.liveInsects === 0 ? "nil" : `≤ ${s.liveInsects}`}`;
}

export function submitBid(orderId: string, bid: Omit<Bid, "id" | "createdAt" | "status" | "rounds">) {
  const full: Bid = { ...bid, id: uid("bid"), createdAt: now(), status: "open", rounds: [] };
  updateOrder(orderId, (o) => ({ ...o, bids: [...o.bids, full] }));
  const off = bid.discountPct ? ` (${bid.discountPct}% off $${bid.priceUSD.toLocaleString()})` : "";
  systemMessage(orderId, `${bid.company} bid $${bidNet(bid).toLocaleString()}${off} for ${bid.days} day(s).`);
  return full;
}

export function acceptBid(orderId: string, bidId: string) {
  const o = getOrder(orderId);
  const bid = o?.bids.find((b) => b.id === bidId);
  if (!o || !bid || bid.status !== "open" || o.status !== "enquiry") return;
  updateOrder(orderId, (x) => ({
    ...x,
    status: "booked",
    inspectionCompany: bid.company,
    priceUSD: bidNet(bid),
    members: x.members.some((m) => m.role === "company")
      ? x.members
      : [...x.members.slice(0, 1), { role: "company", name: bid.company }, ...x.members.slice(1)],
    bids: x.bids.map((b) => ({ ...b, status: b.id === bidId ? "accepted" : b.status === "withdrawn" ? "withdrawn" : "declined" })),
  }));
  systemMessage(orderId, `Customer accepted ${bid.company}'s bid of $${bidNet(bid).toLocaleString()}. ${bid.company} joined the chatroom.`);
}

// ---------- Bid negotiation (enquiries) ----------

function updateBid(orderId: string, bidId: string, fn: (b: Bid) => Bid) {
  updateOrder(orderId, (o) => ({ ...o, bids: o.bids.map((b) => (b.id === bidId ? fn(b) : b)) }));
}

const openBid = (orderId: string, bidId: string) => {
  const o = getOrder(orderId);
  const bid = o?.bids.find((b) => b.id === bidId);
  return o && bid && o.status === "enquiry" && bid.status === "open" ? { o, bid } : null;
};

/** A counter-offer from either side. A company counter replaces its price; a customer counter is a request. */
export function counterBid(orderId: string, bidId: string, by: BidRound["by"], priceUSD: number, note = "") {
  const hit = openBid(orderId, bidId);
  if (!hit || !(priceUSD > 0)) return;
  const round: BidRound = { by, priceUSD, note: note.trim(), at: now() };
  updateBid(orderId, bidId, (b) => ({
    ...b,
    ...(by === "company" ? { priceUSD, discountPct: 0 } : {}),
    rounds: [...(b.rounds ?? []), round],
  }));
  const who = by === "company" ? hit.bid.company : "The customer";
  const ask = by === "company" ? "revised the bid to" : `asked ${hit.bid.company} for`;
  systemMessage(orderId, `${who} ${ask} $${priceUSD.toLocaleString()}.${round.note ? ` Note: ${round.note}` : ""}`);
}

/** Company gives a discount on its open bid. */
export function discountBid(orderId: string, bidId: string, discountPct: number) {
  const hit = openBid(orderId, bidId);
  if (!hit || discountPct < 0 || discountPct >= 100) return;
  updateBid(orderId, bidId, (b) => ({ ...b, discountPct }));
  const net = bidNet({ priceUSD: hit.bid.priceUSD, discountPct });
  systemMessage(orderId, `${hit.bid.company} gave ${discountPct}% off: bid is now $${net.toLocaleString()}.`);
}

export function setFollowUp(orderId: string, bidId: string, date: string) {
  if (!openBid(orderId, bidId)) return;
  updateBid(orderId, bidId, (b) => ({ ...b, followUpOn: date || undefined }));
}

export function withdrawBid(orderId: string, bidId: string) {
  const hit = openBid(orderId, bidId);
  if (!hit) return;
  updateBid(orderId, bidId, (b) => ({ ...b, status: "withdrawn" }));
  systemMessage(orderId, `${hit.bid.company} withdrew its bid.`);
}

// ---------- Inspection companies: profile, KYC, team ----------

export type KycDocType =
  | "Certificate of incorporation"
  | "GST certificate"
  | "PAN card"
  | "IEC certificate"
  | "Accreditation certificate"
  | "Cancelled cheque / bank letter";

export const KYC_REQUIRED: readonly KycDocType[] = [
  "Certificate of incorporation",
  "GST certificate",
  "PAN card",
  "Cancelled cheque / bank letter",
];

export interface KycDoc {
  id: string;
  type: KycDocType;
  fileName: string;
  /** Blob id in IndexedDB. */
  blobId: string;
  sha256: string;
  uploadedAt: string;
  status: "submitted" | "verified" | "rejected";
  note?: string;
}

export type KycStatus = "not-started" | "in-progress" | "submitted" | "verified" | "rejected";

export interface Company {
  id: string;
  name: string;
  gstin?: string;
  pan?: string;
  address: string;
  email: string;
  phone: string;
  kyc: KycDoc[];
  createdAt: string;
}

export function kycStatus(c: Company): KycStatus {
  if (c.kyc.length === 0) return "not-started";
  if (c.kyc.some((d) => d.status === "rejected")) return "rejected";
  const have = (t: KycDocType, st?: KycDoc["status"]) => c.kyc.some((d) => d.type === t && (!st || d.status === st));
  if (KYC_REQUIRED.every((t) => have(t, "verified"))) return "verified";
  if (KYC_REQUIRED.every((t) => have(t))) return "submitted";
  return "in-progress";
}

export type TeamRole = "owner" | "sales" | "ops" | "finance" | "inspector";

export const TEAM_ROLE_LABEL: Record<TeamRole, string> = {
  owner: "Owner",
  sales: "Sales",
  ops: "Operations",
  finance: "Finance",
  inspector: "Inspector",
};

export type Area = "orders" | "enquiries" | "store" | "payments" | "certificates" | "compliance" | "kyc" | "team";

/** What each team role can open in the company console. */
export const ROLE_ACCESS: Record<TeamRole, readonly Area[]> = {
  owner: ["orders", "enquiries", "store", "payments", "certificates", "compliance", "kyc", "team"],
  sales: ["orders", "enquiries", "store"],
  ops: ["orders", "certificates", "compliance"],
  finance: ["orders", "payments", "kyc"],
  inspector: ["orders", "certificates"],
};

export const canAccess = (role: TeamRole, area: Area) => ROLE_ACCESS[role].includes(area);

export interface TeamMember {
  id: string;
  companyId: string;
  name: string;
  email?: string;
  phone?: string;
  role: TeamRole;
  status: "invited" | "active";
  invitedAt: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Digits with an optional leading +, 8 to 15 digits (E.164 length), spaces and dashes allowed. */
const PHONE_RE = /^\+?[0-9][0-9 -]{6,18}[0-9]$/;
const phoneDigits = (p: string) => p.replace(/\D/g, "").length;

export function createCompany(input: Omit<Company, "id" | "kyc" | "createdAt">, ownerName: string): Company {
  const c: Company = {
    ...input,
    name: input.name.trim(),
    gstin: input.gstin?.trim().toUpperCase() || undefined,
    pan: input.pan?.trim().toUpperCase() || undefined,
    id: uid("co"),
    kyc: [],
    createdAt: now(),
  };
  const owner: TeamMember = {
    id: uid("tm"),
    companyId: c.id,
    name: ownerName.trim() || "Owner",
    email: c.email,
    phone: c.phone,
    role: "owner",
    status: "active",
    invitedAt: now(),
  };
  const db = load();
  commit({ ...db, companies: [...db.companies, c], team: [...db.team, owner] });
  return c;
}

export function updateCompany(id: string, patch: Partial<Omit<Company, "id" | "kyc" | "createdAt">>) {
  const db = load();
  commit({ ...db, companies: db.companies.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
}

/** Invite a team member by email or phone. Returns problems; empty means the invite was added. */
export function inviteMember(
  companyId: string,
  input: { name: string; email?: string; phone?: string; role: TeamRole },
): string[] {
  const email = input.email?.trim().toLowerCase() || undefined;
  const phone = input.phone?.trim() || undefined;
  const problems: string[] = [];
  if (!input.name.trim()) problems.push("Add the person's name.");
  if (!email && !phone) problems.push("Add an email or a phone number to send the invite to.");
  if (email && !EMAIL_RE.test(email)) problems.push("That email address doesn't look right.");
  if (phone && (!PHONE_RE.test(phone) || phoneDigits(phone) < 8 || phoneDigits(phone) > 15))
    problems.push("Phone numbers need 8 to 15 digits, like +91 98765 43210.");
  const db = load();
  const team = db.team.filter((m) => m.companyId === companyId);
  if (email && team.some((m) => m.email === email)) problems.push(`${email} is already on the team.`);
  if (phone && team.some((m) => m.phone && m.phone.replace(/\D/g, "") === phone.replace(/\D/g, "")))
    problems.push(`${phone} is already on the team.`);
  if (problems.length) return problems;
  const m: TeamMember = {
    id: uid("tm"),
    companyId,
    name: input.name.trim(),
    email,
    phone,
    role: input.role,
    status: "invited",
    invitedAt: now(),
  };
  commit({ ...db, team: [...db.team, m] });
  return [];
}

/** Change a member's role. The last owner can't be demoted, so the company never locks itself out. */
export function setMemberRole(memberId: string, role: TeamRole) {
  const db = load();
  const m = db.team.find((x) => x.id === memberId);
  if (!m || m.role === role) return;
  if (m.role === "owner" && db.team.filter((x) => x.companyId === m.companyId && x.role === "owner").length === 1) return;
  commit({ ...db, team: db.team.map((x) => (x.id === memberId ? { ...x, role } : x)) });
}

export function activateMember(memberId: string) {
  const db = load();
  commit({ ...db, team: db.team.map((x) => (x.id === memberId ? { ...x, status: "active" } : x)) });
}

export function removeMember(memberId: string) {
  const db = load();
  const m = db.team.find((x) => x.id === memberId);
  if (!m) return;
  if (m.role === "owner" && db.team.filter((x) => x.companyId === m.companyId && x.role === "owner").length === 1) return;
  commit({ ...db, team: db.team.filter((x) => x.id !== memberId) });
}

export async function addKycDoc(companyId: string, type: KycDocType, file: File) {
  const buf = await file.arrayBuffer();
  const sha256 = await sha256Hex(buf);
  const blobId = uid("kyc");
  await putBlob(blobId, file);
  const doc: KycDoc = { id: blobId, type, fileName: file.name, blobId, sha256, uploadedAt: now(), status: "submitted" };
  const db = load();
  commit({
    ...db,
    companies: db.companies.map((c) =>
      // A new upload of the same type replaces the old one.
      c.id === companyId ? { ...c, kyc: [...c.kyc.filter((d) => d.type !== type), doc] } : c,
    ),
  });
  return doc;
}

/** Admin review of a KYC document. */
export function reviewKycDoc(companyId: string, docId: string, status: "verified" | "rejected", note = "") {
  const db = load();
  commit({
    ...db,
    companies: db.companies.map((c) =>
      c.id === companyId
        ? { ...c, kyc: c.kyc.map((d) => (d.id === docId ? { ...d, status, note: note.trim() || undefined } : d)) }
        : c,
    ),
  });
}

// ---------- Service store (feeds quick booking) ----------

export const SERVICES = [
  "Pre-Shipment Inspection (PSI)",
  "Loading & Unloading Supervision",
  "Container Stuffing Survey",
  "Destination Cargo Inspection",
] as const;

export interface ServiceListing {
  id: string;
  companyId: string;
  companyName: string;
  service: string;
  /** Commodities covered; empty means any. */
  commodities: string[];
  /** Port or city where surveyors are based. */
  location: string;
  priceUSD: number;
  discountPct: number;
  turnaroundDays: number;
  surveyors: number;
  availableFrom: string;
  availableTo: string;
  active: boolean;
  createdAt: string;
}

export const listingNet = (l: Pick<ServiceListing, "priceUSD" | "discountPct">) =>
  bidNet({ priceUSD: l.priceUSD, discountPct: l.discountPct });

export function listingProblems(l: Omit<ServiceListing, "id" | "createdAt" | "companyName">): string[] {
  const p: string[] = [];
  if (!l.service.trim()) p.push("Pick a service.");
  if (!l.location.trim()) p.push("Add the port or city.");
  if (!(l.priceUSD > 0)) p.push("Price must be more than $0.");
  if (l.discountPct < 0 || l.discountPct >= 100) p.push("Discount must be between 0 and 99%.");
  if (!(l.turnaroundDays >= 1)) p.push("Turnaround must be at least 1 day.");
  if (!(l.surveyors >= 1)) p.push("At least 1 surveyor must be available.");
  if (!l.availableFrom || !l.availableTo || l.availableTo < l.availableFrom)
    p.push("The 'available until' date must be on or after 'available from'.");
  return p;
}

export function saveListing(input: Omit<ServiceListing, "id" | "createdAt" | "companyName"> & { id?: string }): string[] {
  const problems = listingProblems(input);
  if (problems.length) return problems;
  const db = load();
  const company = db.companies.find((c) => c.id === input.companyId);
  if (!company) return ["Set up the company profile first."];
  const clean = {
    ...input,
    service: input.service.trim(),
    location: input.location.trim(),
    commodities: input.commodities.map((c) => c.trim()).filter(Boolean),
    companyName: company.name,
  };
  if (input.id && db.listings.some((l) => l.id === input.id)) {
    commit({ ...db, listings: db.listings.map((l) => (l.id === input.id ? { ...l, ...clean, id: l.id } : l)) });
  } else {
    commit({ ...db, listings: [...db.listings, { ...clean, id: uid("lst"), createdAt: now() }] });
  }
  return [];
}

export function deleteListing(id: string) {
  const db = load();
  commit({ ...db, listings: db.listings.filter((l) => l.id !== id) });
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Listings a customer can quick-book: matching service, place, date and budget; cheapest first. */
export function findListings(
  listings: ServiceListing[],
  q: { service: string; location: string; date: string; commodity?: string; maxPriceUSD?: number },
): ServiceListing[] {
  const place = norm(q.location).split(" ").filter((w) => w.length > 2 && !["port", "berth"].includes(w));
  const commodity = norm(q.commodity ?? "");
  return listings
    .filter((l) => l.active && l.service === q.service)
    .filter((l) => !q.date || (l.availableFrom <= q.date && q.date <= l.availableTo))
    .filter((l) => place.length === 0 || place.some((w) => norm(l.location).includes(w)))
    .filter((l) => !commodity || l.commodities.length === 0 || l.commodities.some((c) => commodity.includes(norm(c))))
    .filter((l) => !q.maxPriceUSD || listingNet(l) <= q.maxPriceUSD)
    .sort((a, b) => listingNet(a) - listingNet(b));
}

// ---------- Payments ----------

export interface Payment {
  id: string;
  amountUSD: number;
  method: "Bank transfer" | "UPI" | "Card" | "Letter of credit" | "Other";
  reference: string;
  receivedOn: string;
}

export interface Invoice {
  number: string;
  amountUSD: number;
  discountPct: number;
  issuedOn: string;
  dueOn: string;
  payments: Payment[];
}

export type PaymentStatus = "not-invoiced" | "unpaid" | "part-paid" | "paid" | "overdue";

export const invoiceTotal = (i: Invoice) => bidNet({ priceUSD: i.amountUSD, discountPct: i.discountPct });
export const invoicePaid = (i: Invoice) => i.payments.reduce((s, p) => s + p.amountUSD, 0);

export function paymentStatus(o: Pick<Order, "invoice">, today = new Date().toISOString().slice(0, 10)): PaymentStatus {
  const i = o.invoice;
  if (!i) return "not-invoiced";
  const paid = invoicePaid(i);
  if (paid >= invoiceTotal(i)) return "paid";
  if (i.dueOn < today) return "overdue";
  return paid > 0 ? "part-paid" : "unpaid";
}

export function raiseInvoice(orderId: string, input: { amountUSD: number; discountPct: number; dueOn: string }): string[] {
  const o = getOrder(orderId);
  if (!o) return ["Order not found."];
  if (o.status === "enquiry") return ["Invoice after the customer confirms the booking."];
  if (o.invoice) return ["This order already has an invoice."];
  if (!(input.amountUSD > 0)) return ["Amount must be more than $0."];
  if (input.discountPct < 0 || input.discountPct >= 100) return ["Discount must be between 0 and 99%."];
  if (!input.dueOn) return ["Add a due date."];
  const invoice: Invoice = {
    number: `INV-${o.id}`,
    amountUSD: input.amountUSD,
    discountPct: input.discountPct,
    issuedOn: now().slice(0, 10),
    dueOn: input.dueOn,
    payments: [],
  };
  updateOrder(orderId, (x) => ({ ...x, invoice }));
  systemMessage(orderId, `Invoice ${invoice.number} raised for $${invoiceTotal(invoice).toLocaleString()}, due ${input.dueOn}.`);
  return [];
}

export function recordPayment(orderId: string, p: Omit<Payment, "id">): string[] {
  const o = getOrder(orderId);
  const i = o?.invoice;
  if (!o || !i) return ["Raise an invoice first."];
  if (!(p.amountUSD > 0)) return ["Amount must be more than $0."];
  const due = invoiceTotal(i) - invoicePaid(i);
  if (p.amountUSD > due) return [`Only $${due.toLocaleString()} is left to pay on this invoice.`];
  updateOrder(orderId, (x) => ({ ...x, invoice: { ...i, payments: [...i.payments, { ...p, id: uid("pay") }] } }));
  const left = due - p.amountUSD;
  systemMessage(
    orderId,
    `Payment of $${p.amountUSD.toLocaleString()} received (${p.method}${p.reference ? `, ref ${p.reference}` : ""}). ${left > 0 ? `$${left.toLocaleString()} still due.` : "Invoice fully paid."}`,
  );
  return [];
}

// ---------- Certificates and compliance ----------

export const CERT_TYPES = [
  "Certificate of Conformity (CoC)",
  "Clean Inspection Certificate (CIC)",
  "Halal certificate",
  "Certificate of quality",
  "Certificate of weight",
  "Phytosanitary certificate",
  "Fumigation certificate",
  "Certificate of origin",
] as const;
export type CertType = (typeof CERT_TYPES)[number];

export interface Certificate {
  id: string;
  companyId: string;
  orderId?: string;
  type: CertType;
  number: string;
  issuedTo: string;
  issuedOn: string;
  validUntil?: string;
  /** Short code anyone holding the certificate can use to check it. */
  verifyCode: string;
  status: "issued" | "revoked";
  revokedReason?: string;
  blobId?: string;
  fileName?: string;
  sha256?: string;
}

const certPrefix = (t: CertType) =>
  (t.match(/\(([A-Za-z]+)\)/)?.[1] ?? t.split(" ").map((w) => w[0]).join("")).toUpperCase();

function verifyCode() {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  // Crockford base32 without I, L, O, U so codes read cleanly over the phone.
  const abc = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const s = Array.from(bytes, (b) => abc[b % 32]).join("");
  return `${s.slice(0, 5)}-${s.slice(5)}`;
}

export async function issueCertificate(input: {
  companyId: string;
  orderId?: string;
  type: CertType;
  issuedTo: string;
  validUntil?: string;
  file?: File | null;
}): Promise<{ cert?: Certificate; problems: string[] }> {
  const db = load();
  const problems: string[] = [];
  const company = db.companies.find((c) => c.id === input.companyId);
  if (!company) problems.push("Set up the company profile first.");
  if (!input.issuedTo.trim()) problems.push("Add who the certificate is issued to.");
  const today = now().slice(0, 10);
  if (input.validUntil && input.validUntil < today) problems.push("'Valid until' can't be in the past.");
  const order = input.orderId ? db.orders.find((o) => o.id === input.orderId) : undefined;
  if (input.orderId && !order) problems.push("Order not found.");
  if (order && order.status !== "completed") problems.push("Issue certificates after the inspection is completed.");
  if (problems.length) return { problems };

  let file: Pick<Certificate, "blobId" | "fileName" | "sha256"> = {};
  if (input.file) {
    const blobId = uid("cert");
    const sha256 = await sha256Hex(await input.file.arrayBuffer());
    await putBlob(blobId, input.file);
    file = { blobId, fileName: input.file.name, sha256 };
  }
  const fresh = load();
  const year = today.slice(0, 4);
  const prefix = certPrefix(input.type);
  const count = fresh.certificates.filter((c) => c.companyId === input.companyId && c.type === input.type).length + 1;
  const cert: Certificate = {
    id: uid("crt"),
    companyId: input.companyId,
    orderId: input.orderId,
    type: input.type,
    number: `${prefix}-${year}-${String(count).padStart(4, "0")}`,
    issuedTo: input.issuedTo.trim(),
    issuedOn: today,
    validUntil: input.validUntil || undefined,
    verifyCode: verifyCode(),
    status: "issued",
    ...file,
  };
  commit({ ...fresh, certificates: [cert, ...fresh.certificates] });
  if (cert.orderId) {
    systemMessage(cert.orderId, `${company!.name} issued ${cert.type} ${cert.number}. Check code: ${cert.verifyCode}.`);
  }
  return { cert, problems: [] };
}

export function revokeCertificate(id: string, reason: string) {
  if (!reason.trim()) return ["Say why the certificate is revoked."];
  const db = load();
  const cert = db.certificates.find((c) => c.id === id);
  if (!cert || cert.status === "revoked") return [];
  commit({
    ...db,
    certificates: db.certificates.map((c) => (c.id === id ? { ...c, status: "revoked", revokedReason: reason.trim() } : c)),
  });
  if (cert.orderId) systemMessage(cert.orderId, `${cert.type} ${cert.number} was revoked: ${reason.trim()}`);
  return [];
}

export type CertCheck =
  | { result: "valid" | "expired" | "revoked"; cert: Certificate; companyName: string }
  | { result: "not-found" };

export function checkCertificate(code: string, today = now().slice(0, 10)): CertCheck {
  const q = code.trim().toUpperCase();
  const db = load();
  const cert = db.certificates.find((c) => c.verifyCode === q || c.number === q);
  if (!cert) return { result: "not-found" };
  const companyName = db.companies.find((c) => c.id === cert.companyId)?.name ?? "Unknown company";
  if (cert.status === "revoked") return { result: "revoked", cert, companyName };
  if (cert.validUntil && cert.validUntil < today) return { result: "expired", cert, companyName };
  return { result: "valid", cert, companyName };
}

/** An accreditation, licence or scheme approval the company holds (ISO 17020, Halal body approval, CoC programme). */
export interface ComplianceItem {
  id: string;
  companyId: string;
  name: string;
  issuedBy: string;
  reference: string;
  validUntil: string;
  /** Certificate types this approval lets the company issue. */
  covers: CertType[];
  blobId?: string;
  fileName?: string;
}

export type ComplianceState = "valid" | "expiring" | "expired";

/** Expiring = within 60 days, so there's time to renew before work stops. */
export function complianceState(c: Pick<ComplianceItem, "validUntil">, today = now().slice(0, 10)): ComplianceState {
  if (c.validUntil < today) return "expired";
  const days = (Date.parse(c.validUntil) - Date.parse(today)) / 86_400_000;
  return days <= 60 ? "expiring" : "valid";
}

export async function addCompliance(input: Omit<ComplianceItem, "id" | "blobId" | "fileName"> & { file?: File | null }) {
  const problems: string[] = [];
  if (!input.name.trim()) problems.push("Add the accreditation or licence name.");
  if (!input.issuedBy.trim()) problems.push("Add who issued it.");
  if (!input.validUntil) problems.push("Add the expiry date.");
  if (problems.length) return problems;
  const { file, ...rest } = input;
  let extra: Pick<ComplianceItem, "blobId" | "fileName"> = {};
  if (file) {
    const blobId = uid("cmp");
    await putBlob(blobId, file);
    extra = { blobId, fileName: file.name };
  }
  const db = load();
  commit({
    ...db,
    compliance: [...db.compliance, { ...rest, name: rest.name.trim(), issuedBy: rest.issuedBy.trim(), id: uid("cmp"), ...extra }],
  });
  return [];
}

export function removeCompliance(id: string) {
  const db = load();
  commit({ ...db, compliance: db.compliance.filter((c) => c.id !== id) });
}

/** Certificate types the company may not issue because no valid approval covers them. */
export function uncoveredCertTypes(items: ComplianceItem[], companyId: string, today?: string): CertType[] {
  const ok = new Set(
    items
      .filter((i) => i.companyId === companyId && complianceState(i, today) !== "expired")
      .flatMap((i) => i.covers),
  );
  return CERT_TYPES.filter((t) => !ok.has(t));
}

// ---------- Messages and automatic flags ----------

function push(msg: Omit<ChatMessage, "id" | "createdAt">): ChatMessage {
  const full: ChatMessage = { ...msg, id: uid("msg"), createdAt: now() };
  const db = load();
  commit({ ...db, messages: [...db.messages, full] });
  return full;
}

export function systemMessage(orderId: string, text: string) {
  return push({ orderId, kind: "system", role: "system", author: "Qualty", text });
}

function flag(orderId: string, text: string, severity: "warning" | "critical") {
  return push({ orderId, kind: "flag", role: "system", author: "Inspection Copilot", text, severity });
}

export function postMessage(msg: Omit<ChatMessage, "id" | "createdAt">) {
  const o = getOrder(msg.orderId);
  if (o && o.status === "booked" && msg.role === "inspector" && msg.kind !== "text") {
    updateOrder(o.id, (x) => ({ ...x, status: "in-progress" }));
  }
  const saved = push(msg);
  if (o && msg.kind === "observation" && msg.readings && o.spec) checkReadings(o, msg.readings);
  if (o && msg.kind === "dispatch" && msg.dispatch) checkDispatch(o, msg.dispatch);
  return saved;
}

// Compares field readings against the spec booked on the order.
export function readingDeviations(spec: CommodityParams, r: NonNullable<ChatMessage["readings"]>) {
  const out: { text: string; severity: "warning" | "critical" }[] = [];
  if (r.liveInsects !== undefined && r.liveInsects > spec.liveInsects)
    out.push({ text: `Live insects found (${r.liveInsects}); the booked spec allows ${spec.liveInsects}.`, severity: "critical" });
  if (r.broken !== undefined && r.broken > spec.broken)
    out.push({ text: `Broken ${r.broken}% is above the booked ${spec.broken}%.`, severity: r.broken > spec.broken * 1.5 ? "critical" : "warning" });
  if (r.purity !== undefined && r.purity < spec.purity)
    out.push({ text: `Purity ${r.purity}% is below the booked ${spec.purity}%.`, severity: spec.purity - r.purity > 2 ? "critical" : "warning" });
  if (r.moisture !== undefined && r.moisture > spec.moisture)
    out.push({ text: `Moisture ${r.moisture}% is above the booked ${spec.moisture}%.`, severity: r.moisture - spec.moisture > 1 ? "critical" : "warning" });
  if (r.damageKernel !== undefined && r.damageKernel > spec.damageKernel)
    out.push({ text: `Damaged kernels ${r.damageKernel}% are above the booked ${spec.damageKernel}%.`, severity: "warning" });
  return out;
}

function checkReadings(o: Order, r: NonNullable<ChatMessage["readings"]>) {
  readingDeviations(o.spec!, r).forEach((d) => flag(o.id, `Quality deviation: ${d.text}`, d.severity));
}

function checkDispatch(o: Order, d: DispatchEntry) {
  const db = load();
  const earlier = db.messages.filter((m) => m.orderId === o.id && m.kind === "dispatch" && m.dispatch);
  if (!d.sealNo.trim()) flag(o.id, `Missing seal number for ${d.vehicleNo}.`, "warning");
  const dupe = earlier.filter((m) => m.dispatch!.sealNo && m.dispatch!.sealNo === d.sealNo);
  if (d.sealNo && dupe.length > 1) flag(o.id, `Seal ${d.sealNo} was already used on another truck or container.`, "critical");
}

// ---------- Completion and automatic summary ----------

export const REQUIRED_CHECKS = [
  "Sample drawn and sealed",
  "Moisture reading taken",
  "Hold or container cleanliness checked",
  "Seal photo taken",
  "Weighbridge slip photo taken",
] as const;

export function completeInspection(orderId: string, checklist: Record<string, boolean>) {
  const o = getOrder(orderId);
  if (!o) return null;
  const missing = REQUIRED_CHECKS.filter((c) => !checklist[c]);
  missing.forEach((c) => flag(orderId, `Missing item at completion: ${c}.`, "warning"));
  // Every truck or container needs a photo, but the photo usually comes after the
  // dispatch entry, so this is checked when the inspection closes.
  const before = load();
  const vehicles = new Set(
    before.messages
      .filter((m) => m.orderId === orderId && m.kind === "dispatch" && m.dispatch)
      .map((m) => m.dispatch!.vehicleNo),
  );
  const captions = before.evidence
    .filter((e) => e.orderId === orderId && e.kind !== "report")
    .map((e) => e.caption.toUpperCase());
  vehicles.forEach((v) => {
    if (!captions.some((c) => c.includes(v)))
      flag(orderId, `No photo of ${v}. Add one with the vehicle or container number in the caption.`, "warning");
  });
  const db = load();
  const msgs = db.messages.filter((m) => m.orderId === orderId);
  const ev = db.evidence.filter((e) => e.orderId === orderId);
  const summary = buildSummary(o, msgs, ev, missing);
  const record: EvidenceRecord = {
    id: uid("ev"),
    orderId,
    kind: "report",
    fileName: `${o.id}-inspection-summary.txt`,
    mime: "text/plain",
    capturedAt: now(),
    gps: null,
    sha256: "",
    author: "Inspection Copilot",
    role: "admin",
    caption: "Automatic inspection summary",
  };
  void sha256Hex(new TextEncoder().encode(summary))
    .then(async (hash) => {
      await putBlob(record.id, new Blob([summary], { type: "text/plain" }));
      const d = load();
      commit({ ...d, evidence: [...d.evidence, { ...record, sha256: hash }] });
    })
    .catch(() => {
      // The summary text is still in the chat; say plainly that the Vault copy failed.
      systemMessage(orderId, "The summary could not be saved to the Vault on this device. Download it from the chat instead.");
    });
  updateOrder(orderId, (x) => ({ ...x, status: "completed", completedAt: now() }));
  push({ orderId, kind: "summary", role: "system", author: "Inspection Copilot", text: summary, evidenceId: record.id });
  return summary;
}

export function buildSummary(o: Order, msgs: ChatMessage[], ev: EvidenceRecord[], missing: readonly string[]) {
  const fmt = (iso: string) => new Date(iso).toLocaleString();
  const dispatch = msgs.filter((m) => m.kind === "dispatch" && m.dispatch).map((m) => m.dispatch!);
  const obs = msgs.filter((m) => m.kind === "observation");
  const flags = msgs.filter((m) => m.kind === "flag");
  const bags = dispatch.reduce((s, d) => s + (d.bags || 0), 0);
  const tons = dispatch.reduce((s, d) => s + (d.weightTons || 0), 0);
  const critical = flags.filter((f) => f.severity === "critical").length;
  const outcome =
    critical > 0 ? "Not conforming: critical deviations were raised." : flags.length > 0 ? "Conforming with remarks." : "Conforming to the booked spec.";

  const lines = [
    `INSPECTION SUMMARY — ${o.id}`,
    `${o.service} · ${o.commodity}`,
    `Location: ${o.location}`,
    `Buyer: ${o.buyer.name} (${o.buyer.verification})   Seller: ${o.seller.name} (${o.seller.verification})`,
    `Inspection company: ${o.inspectionCompany ?? "not assigned"}`,
    `Completed: ${fmt(new Date().toISOString())}`,
    "",
    `Outcome: ${outcome}`,
    o.spec ? `Booked spec: ${describeSpec(o.spec)}` : "Booked spec: none attached",
    "",
    `Dispatch: ${dispatch.length} truck(s)/container(s), ${bags.toLocaleString()} bags, ${tons.toFixed(2)} t`,
    ...dispatch.map((d) => `  • ${d.vehicleNo} — seal ${d.sealNo || "MISSING"}, ${d.bags} bags, ${d.weightTons} t`),
    "",
    `Inspector observations (${obs.length}):`,
    ...obs.map((m) => `  • ${fmt(m.createdAt)} ${m.author}: ${m.text}`),
    "",
    `Flags (${flags.length}):`,
    ...flags.map((f) => `  • [${f.severity}] ${f.text}`),
    "",
    `Evidence: ${ev.filter((e) => e.kind === "photo").length} photo(s), ${ev.filter((e) => e.kind === "video").length} video(s), each stamped with date, time and GPS and hashed (SHA-256).`,
    missing.length ? `Checklist items not done: ${missing.join("; ")}` : "Checklist: all items done.",
  ];
  return lines.join("\n");
}

// ---------- Evidence files (IndexedDB) ----------

const IDB = "qualty_evidence";

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("files");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putBlob(id: string, blob: Blob) {
  const db = await idb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction("files", "readwrite");
    tx.objectStore("files").put(blob, id);
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
}

export async function getBlob(id: string): Promise<Blob | null> {
  const db = await idb();
  return new Promise((res, rej) => {
    const req = db.transaction("files").objectStore("files").get(id);
    req.onsuccess = () => res((req.result as Blob) ?? null);
    req.onerror = () => rej(req.error);
  });
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array) {
  const buf = await crypto.subtle.digest("SHA-256", data as BufferSource);
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getPosition(): Promise<EvidenceRecord["gps"]> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  });
}

// Burns order no, date/time and GPS into the bottom of a photo.
async function watermarkPhoto(file: File, stamp: string[]): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1600;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  const size = Math.max(14, Math.round(w / 55));
  const pad = Math.round(size * 0.7);
  const band = stamp.length * size * 1.35 + pad * 2;
  ctx.fillStyle = "rgba(0,0,0,0.62)";
  ctx.fillRect(0, h - band, w, band);
  ctx.fillStyle = "#fff";
  ctx.font = `600 ${size}px ui-monospace, Menlo, monospace`;
  ctx.textBaseline = "top";
  stamp.forEach((line, i) => ctx.fillText(line, pad, h - band + pad + i * size * 1.35));
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not encode photo"))), "image/jpeg", 0.85));
}

export async function addEvidence(opts: {
  orderId: string;
  file: File;
  caption: string;
  author: string;
  role: Role;
}): Promise<EvidenceRecord> {
  const o = getOrder(opts.orderId);
  const gps = await getPosition();
  const capturedAt = now();
  const isVideo = opts.file.type.startsWith("video/");
  const stamp = [
    `QUALTY.AI  ${opts.orderId}`,
    new Date(capturedAt).toLocaleString(),
    gps ? `GPS ${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)} (±${gps.accuracy} m)` : "GPS unavailable — location not shared",
    `${opts.author}${o?.inspectionCompany ? ` · ${o.inspectionCompany}` : ""}`,
  ];
  // Videos can't be re-encoded in the browser cheaply: the stamp is stored with
  // the file and shown over it, and the hash covers the original bytes.
  const blob = isVideo ? opts.file : await watermarkPhoto(opts.file, stamp);
  const sha256 = await sha256Hex(await blob.arrayBuffer());
  const rec: EvidenceRecord = {
    id: uid("ev"),
    orderId: opts.orderId,
    kind: isVideo ? "video" : "photo",
    fileName: opts.file.name,
    mime: blob.type || opts.file.type,
    capturedAt,
    gps,
    sha256,
    author: opts.author,
    role: opts.role,
    caption: opts.caption,
  };
  await putBlob(rec.id, blob);
  const db = load();
  commit({ ...db, evidence: [...db.evidence, rec] });
  postMessage({
    orderId: opts.orderId,
    kind: "media",
    role: opts.role,
    author: opts.author,
    text: opts.caption || (isVideo ? "Video" : "Photo"),
    evidenceId: rec.id,
  });
  if (!gps) flag(opts.orderId, `${isVideo ? "Video" : "Photo"} "${opts.caption || opts.file.name}" has no GPS. Ask the inspector to allow location.`, "warning");
  return rec;
}

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
  status: "open" | "accepted" | "declined";
}

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
}

const KEY = "qualty_store_v1";
const EMPTY: DB = { specs: [], orders: [], messages: [], evidence: [] };

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

export function submitBid(orderId: string, bid: Omit<Bid, "id" | "createdAt" | "status">) {
  const full: Bid = { ...bid, id: uid("bid"), createdAt: now(), status: "open" };
  updateOrder(orderId, (o) => ({ ...o, bids: [...o.bids, full] }));
  systemMessage(orderId, `${bid.company} bid $${bid.priceUSD.toLocaleString()} for ${bid.days} day(s).`);
}

export function acceptBid(orderId: string, bidId: string) {
  const o = getOrder(orderId);
  const bid = o?.bids.find((b) => b.id === bidId);
  if (!o || !bid) return;
  updateOrder(orderId, (x) => ({
    ...x,
    status: "booked",
    inspectionCompany: bid.company,
    members: x.members.some((m) => m.role === "company")
      ? x.members
      : [...x.members.slice(0, 1), { role: "company", name: bid.company }, ...x.members.slice(1)],
    bids: x.bids.map((b) => ({ ...b, status: b.id === bidId ? "accepted" : "declined" })),
  }));
  systemMessage(orderId, `Customer accepted ${bid.company}'s bid of $${bid.priceUSD.toLocaleString()}. ${bid.company} joined the chatroom.`);
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { riceSpec } from "../../test/fixtures";

type Store = typeof import("./store");
let S: Store;

// The store caches in module scope; load a fresh copy for every test.
beforeEach(async () => {
  vi.resetModules();
  S = await import("./store");
});

const party = (name: string) => S.checkParty({ name }).party;

function quickOrder(spec: typeof riceSpec | null = riceSpec) {
  return S.createOrder({
    mode: "quick",
    service: "Pre-Shipment Inspection (PSI)",
    commodity: "Rice",
    spec,
    specLabel: "Al-Khaleej · PO-1",
    buyer: party("Al-Khaleej Foods"),
    seller: party("Punjab Rice Mills"),
    location: "Mundra",
    inspectionDate: "2026-11-05",
    volumeTons: 2500,
    customerName: "Cust",
  });
}

const db = () => JSON.parse(localStorage.getItem("qualty_store_v1")!);
const messages = (orderId: string) => db().messages.filter((m: { orderId: string }) => m.orderId === orderId);
const flags = (orderId: string) => messages(orderId).filter((m: { kind: string }) => m.kind === "flag");
const inspector = (orderId: string) => ({ orderId, role: "inspector" as const, author: "Inspector" });

describe("checkParty (buyer/seller verification)", () => {
  it("accepts a GSTIN and the IEC that matches its PAN", () => {
    const r = S.checkParty({ name: " Buyer ", gstin: "27aapfu0939f1zv", iec: "aapfu0939f" });
    expect(r.problems).toEqual([]);
    expect(r.party).toEqual({ name: "Buyer", gstin: "27AAPFU0939F1ZV", iec: "AAPFU0939F", verification: "format-checked" });
  });

  it.each([
    [{ gstin: "123" }, "GSTIN should be 15 characters"],
    [{ iec: "SHORT" }, "IEC should be 10"],
    [{ gstin: "27AAPFU0939F1ZV", iec: "BBBBB1234B" }, "IEC does not match"],
  ])("rejects %o", (ids, msg) => {
    const r = S.checkParty({ name: "X", ...ids });
    expect(r.problems.some((p) => p.startsWith(msg))).toBe(true);
    expect(r.party.verification).toBe("unverified");
  });

  it("leaves a party without IDs unverified", () => {
    expect(S.checkParty({ name: "X" }).party.verification).toBe("unverified");
  });

  it("lets admin mark a party verified and posts it in the chat", () => {
    const o = quickOrder();
    S.setPartyVerified(o.id, "seller");
    expect(S.getOrder(o.id)!.seller.verification).toBe("verified");
    expect(messages(o.id).at(-1).text).toContain("verified the seller: Punjab Rice Mills");
  });
});

describe("saved specs", () => {
  it("saves under buyer name and reference, newest first, and deletes", () => {
    const a = S.saveSpec({ buyerName: "A", reference: "", params: riceSpec });
    const b = S.saveSpec({ buyerName: "B", reference: "PO-9", params: riceSpec });
    expect(db().specs.map((s: { id: string }) => s.id)).toEqual([b.id, a.id]);
    expect(S.specLabel(b)).toBe("B · PO-9");
    expect(S.specLabel(a)).toBe("A");
    S.deleteSpec(a.id);
    expect(db().specs).toHaveLength(1);
  });

  it("survives a reload (fresh module reads localStorage)", async () => {
    S.saveSpec({ buyerName: "Persisted", reference: "", params: riceSpec });
    vi.resetModules();
    const fresh: Store = await import("./store");
    fresh.saveSpec({ buyerName: "Second", reference: "", params: riceSpec });
    expect(db().specs.map((s: { buyerName: string }) => s.buyerName)).toEqual(["Second", "Persisted"]);
  });
});

describe("orders and chatrooms", () => {
  it("creates a quick order with sequential number and customer + company + admin in the room", () => {
    const o1 = quickOrder();
    const o2 = quickOrder();
    const year = new Date().getFullYear();
    expect(o1.id).toBe(`QI-${year}-0001`);
    expect(o2.id).toBe(`QI-${year}-0002`);
    expect(o1.status).toBe("booked");
    expect(o1.members.map((m) => m.role)).toEqual(["customer", "company", "admin"]);
    expect(messages(o1.id)[0].text).toMatch(/^Chatroom opened for order/);
    expect(messages(o1.id)[1].text).toMatch(/^Booked spec: Rice, broken ≤ 2%/);
  });

  it("runs an enquiry: bids, accept, losing bids declined, company joins", () => {
    const e = S.createOrder({
      mode: "inquiry",
      service: "Loading supervision",
      commodity: "Wheat",
      spec: null,
      specLabel: null,
      buyer: party("B"),
      seller: party("S"),
      location: "Kandla",
      inspectionDate: "2026-11-10",
      volumeTons: 9000,
      customerName: "Cust",
    });
    expect(e.id).toMatch(/^RI-/);
    expect(e.status).toBe("enquiry");
    expect(e.members.map((m) => m.role)).toEqual(["customer", "admin"]);
    S.submitBid(e.id, { company: "SGS", priceUSD: 1200, days: 3, scope: "" });
    S.submitBid(e.id, { company: "Cotecna", priceUSD: 950, days: 4, scope: "2 surveyors" });
    const cheap = S.getOrder(e.id)!.bids.find((b) => b.company === "Cotecna")!;
    S.acceptBid(e.id, cheap.id);
    const after = S.getOrder(e.id)!;
    expect(after.status).toBe("booked");
    expect(after.inspectionCompany).toBe("Cotecna");
    expect(after.members.map((m) => `${m.role}:${m.name}`)).toEqual(["customer:Cust", "company:Cotecna", "admin:Qualty admin team"]);
    expect(after.bids.map((b) => b.status)).toEqual(["declined", "accepted"]);
  });

  it("ignores accepting an unknown bid", () => {
    const o = quickOrder();
    S.acceptBid(o.id, "nope");
    S.acceptBid("missing", "nope");
    expect(S.getOrder(o.id)!.status).toBe("booked");
  });

  it("moves to in-progress when the inspector first reports", () => {
    const o = quickOrder();
    S.postMessage({ ...inspector(o.id), kind: "text", text: "on my way" });
    expect(S.getOrder(o.id)!.status).toBe("booked");
    S.postMessage({ ...inspector(o.id), kind: "observation", text: "dry hold" });
    expect(S.getOrder(o.id)!.status).toBe("in-progress");
  });
});

describe("automatic flags", () => {
  it("flags readings outside the booked spec with severity", () => {
    const o = quickOrder();
    S.postMessage({ ...inspector(o.id), kind: "observation", text: "hold 3", readings: { broken: 4, purity: 95, moisture: 13, damageKernel: 1, liveInsects: 1 } });
    expect(flags(o.id).map((f: { severity: string; text: string }) => `${f.severity}: ${f.text}`)).toEqual([
      "critical: Quality deviation: Live insects found (1); the booked spec allows 0.",
      "critical: Quality deviation: Broken 4% is above the booked 2%.",
      "critical: Quality deviation: Purity 95% is below the booked 98.5%.",
      "warning: Quality deviation: Moisture 13% is above the booked 12.5%.",
      "warning: Quality deviation: Damaged kernels 1% are above the booked 0.5%.",
    ]);
  });

  it("does not flag readings inside the spec, or orders without a spec", () => {
    const o = quickOrder();
    S.postMessage({ ...inspector(o.id), kind: "observation", text: "ok", readings: { broken: 1.5, purity: 99, moisture: 12 } });
    const noSpec = quickOrder(null);
    S.postMessage({ ...inspector(noSpec.id), kind: "observation", text: "x", readings: { broken: 40 } });
    expect(flags(o.id)).toHaveLength(0);
    expect(flags(noSpec.id)).toHaveLength(0);
  });

  it("grades small vs large deviations", () => {
    expect(S.readingDeviations(riceSpec, { broken: 2.5, purity: 98, moisture: 13 }).map((d) => d.severity)).toEqual(["warning", "warning", "warning"]);
    expect(S.readingDeviations(riceSpec, { broken: 3.1, purity: 96, moisture: 14 }).map((d) => d.severity)).toEqual(["critical", "critical", "critical"]);
  });

  it("flags a missing seal and a reused seal on dispatch", () => {
    const o = quickOrder();
    const send = (vehicleNo: string, sealNo: string) =>
      S.postMessage({ ...inspector(o.id), kind: "dispatch", text: vehicleNo, dispatch: { vehicleNo, sealNo, bags: 500, weightTons: 25 } });
    send("TRUCK1", "");
    send("TRUCK2", "S-1");
    send("TRUCK3", "S-1");
    expect(flags(o.id).map((f: { text: string }) => f.text)).toEqual([
      "Missing seal number for TRUCK1.",
      "Seal S-1 was already used on another truck or container.",
    ]);
  });
});

describe("closing an inspection", () => {
  it("flags unticked checklist items and trucks with no photo, then writes the summary", async () => {
    const o = quickOrder();
    S.postMessage({ ...inspector(o.id), kind: "observation", text: "slight musty odour", readings: { liveInsects: 1 } });
    S.postMessage({ ...inspector(o.id), kind: "dispatch", text: "t", dispatch: { vehicleNo: "MSCU1", sealNo: "A", bags: 500, weightTons: 25.5 } });
    S.postMessage({ ...inspector(o.id), kind: "dispatch", text: "t", dispatch: { vehicleNo: "TGHU2", sealNo: "B", bags: 400, weightTons: 20 } });
    const video = new File([new Uint8Array([1, 2, 3])], "clip.mp4", { type: "video/mp4" });
    await S.addEvidence({ orderId: o.id, file: video, caption: "loading mscu1", author: "Inspector", role: "inspector" });

    const checklist = Object.fromEntries(S.REQUIRED_CHECKS.map((c) => [c, c !== "Seal photo taken"]));
    const summary = S.completeInspection(o.id, checklist)!;

    const texts = flags(o.id).map((f: { text: string }) => f.text);
    expect(texts).toContain("Missing item at completion: Seal photo taken.");
    expect(texts).toContain("No photo of TGHU2. Add one with the vehicle or container number in the caption.");
    expect(texts.some((t: string) => t.includes("No photo of MSCU1"))).toBe(false);

    expect(S.getOrder(o.id)!.status).toBe("completed");
    expect(summary).toContain("Outcome: Not conforming: critical deviations were raised.");
    expect(summary).toContain("Dispatch: 2 truck(s)/container(s), 900 bags, 45.50 t");
    expect(summary).toContain("slight musty odour");
    expect(summary).toContain("0 photo(s), 1 video(s)");
    expect(messages(o.id).at(-1).kind).toBe("summary");

    // The summary file lands in the Vault with a hash of its exact text.
    await vi.waitFor(() => expect(db().evidence.some((e: { kind: string }) => e.kind === "report")).toBe(true));
    const report = db().evidence.find((e: { kind: string }) => e.kind === "report");
    expect(report.sha256).toBe(await S.sha256Hex(new TextEncoder().encode(summary)));
    const blob = await S.getBlob(report.id);
    expect(await blob!.text()).toBe(summary);
  });

  it("calls a clean inspection conforming", () => {
    const o = quickOrder();
    const summary = S.completeInspection(o.id, Object.fromEntries(S.REQUIRED_CHECKS.map((c) => [c, true])))!;
    expect(summary).toContain("Outcome: Conforming to the booked spec.");
    expect(summary).toContain("Checklist: all items done.");
  });

  it("returns null for an unknown order", () => {
    expect(S.completeInspection("nope", {})).toBeNull();
  });
});

describe("evidence", () => {
  it("stores the file, hashes the exact bytes, and flags missing GPS", async () => {
    const o = quickOrder();
    const bytes = new Uint8Array([9, 8, 7, 6]);
    const rec = await S.addEvidence({ orderId: o.id, file: new File([bytes], "v.mp4", { type: "video/mp4" }), caption: "", author: "I", role: "inspector" });
    expect(rec.kind).toBe("video");
    expect(rec.gps).toBeNull();
    expect(rec.sha256).toBe(await S.sha256Hex(bytes));
    expect(new Uint8Array(await (await S.getBlob(rec.id))!.arrayBuffer())).toEqual(bytes);
    expect(messages(o.id).some((m: { kind: string; evidenceId?: string }) => m.kind === "media" && m.evidenceId === rec.id)).toBe(true);
    expect(flags(o.id).at(-1).text).toContain("has no GPS");
  });

  it("records GPS when the device shares it", async () => {
    vi.stubGlobal("navigator", {
      geolocation: { getCurrentPosition: (ok: (p: unknown) => void) => ok({ coords: { latitude: 22.74412, longitude: 69.70421, accuracy: 7.6 } }) },
    });
    expect(await S.getPosition()).toEqual({ lat: 22.74412, lng: 69.70421, accuracy: 8 });
    vi.unstubAllGlobals();
  });

  it("returns null when location is refused", async () => {
    vi.stubGlobal("navigator", { geolocation: { getCurrentPosition: (_ok: unknown, fail: () => void) => fail() } });
    expect(await S.getPosition()).toBeNull();
    vi.unstubAllGlobals();
  });
});

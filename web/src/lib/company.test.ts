import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { riceSpec } from "../../test/fixtures";

type Store = typeof import("./local-store");
let S: Store;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  S = await import("./local-store");
});

const party = (name: string) => S.checkParty({ name }).party;
const db = () => JSON.parse(localStorage.getItem("qualty_store_v1")!);
const texts = (orderId: string) =>
  db().messages.filter((m: { orderId: string }) => m.orderId === orderId).map((m: { text: string }) => m.text);

function company(name = "Acme Surveyors") {
  return S.createCompany({ name, address: "Mundra", email: "ops@acme.in", phone: "+91 98765 43210" }, "Ravi");
}

function order(mode: "quick" | "inquiry" = "inquiry") {
  return S.createOrder({
    mode,
    service: "Pre-Shipment Inspection (PSI)",
    commodity: "Rice",
    spec: riceSpec,
    specLabel: null,
    buyer: party("Buyer"),
    seller: party("Seller"),
    location: "Mundra Port, Gujarat, Berth 04",
    inspectionDate: "2026-11-05",
    volumeTons: 2500,
    customerName: "Cust",
  });
}

describe("bid negotiation", () => {
  it("applies a discount, counters, and books at the net price", () => {
    const o = order();
    const bid = S.submitBid(o.id, { company: "Acme", priceUSD: 2000, days: 3, scope: "PSI", discountPct: 10 });
    expect(S.bidNet(bid)).toBe(1800);

    S.counterBid(o.id, bid.id, "customer", 1500, "Budget is tight");
    S.counterBid(o.id, bid.id, "company", 1700);
    S.discountBid(o.id, bid.id, 5);
    const b = S.getOrder(o.id)!.bids[0];
    expect(b.rounds!.map((r) => r.by)).toEqual(["customer", "company"]);
    expect(S.bidNet(b)).toBe(1615);

    S.acceptBid(o.id, bid.id);
    const after = S.getOrder(o.id)!;
    expect(after.status).toBe("booked");
    expect(after.priceUSD).toBe(1615);
    expect(texts(o.id).some((t: string) => t.includes("asked Acme for $1,500"))).toBe(true);
  });

  it("ignores negotiation on withdrawn bids and closed enquiries", () => {
    const o = order();
    const a = S.submitBid(o.id, { company: "A", priceUSD: 1000, days: 2, scope: "" });
    const b = S.submitBid(o.id, { company: "B", priceUSD: 900, days: 2, scope: "" });
    S.withdrawBid(o.id, b.id);
    S.acceptBid(o.id, b.id);
    expect(S.getOrder(o.id)!.status).toBe("enquiry");
    S.acceptBid(o.id, a.id);
    S.discountBid(o.id, a.id, 50);
    const bids = S.getOrder(o.id)!.bids;
    expect(bids.map((x) => x.status)).toEqual(["accepted", "withdrawn"]);
    expect(bids[0].discountPct).toBeUndefined();
  });
});

describe("team", () => {
  it("invites by email or phone and validates both", () => {
    const c = company();
    expect(S.inviteMember(c.id, { name: "Sales", email: "SALES@acme.in", role: "sales" })).toEqual([]);
    expect(S.inviteMember(c.id, { name: "Ops", phone: "+91 90000 11111", role: "ops" })).toEqual([]);
    expect(S.inviteMember(c.id, { name: "X", role: "ops" })[0]).toMatch(/email or a phone/);
    expect(S.inviteMember(c.id, { name: "X", email: "bad", role: "ops" })[0]).toMatch(/email/);
    expect(S.inviteMember(c.id, { name: "X", phone: "123", role: "ops" })[0]).toMatch(/8 to 15 digits/);
    expect(S.inviteMember(c.id, { name: "Dup", email: "sales@acme.in", role: "ops" })[0]).toMatch(/already/);
    expect(db().team.map((m: { role: string }) => m.role)).toEqual(["owner", "sales", "ops"]);
  });

  it("never removes or demotes the last owner", () => {
    const c = company();
    const owner = db().team[0];
    S.setMemberRole(owner.id, "sales");
    S.removeMember(owner.id);
    expect(db().team[0]).toMatchObject({ id: owner.id, role: "owner" });
    expect(S.canAccess("sales", "payments")).toBe(false);
    expect(S.canAccess("finance", "payments")).toBe(true);
    expect(c.id).toBeTruthy();
  });
});

describe("KYC", () => {
  it("moves from submitted to verified once every required document is verified", async () => {
    const c = company();
    for (const t of S.KYC_REQUIRED) await S.addKycDoc(c.id, t, new File(["x"], `${t}.pdf`));
    const get = () => db().companies[0];
    expect(S.kycStatus(get())).toBe("submitted");
    for (const d of get().kyc) S.reviewKycDoc(c.id, d.id, "verified");
    expect(S.kycStatus(get())).toBe("verified");
  });
});

describe("service store", () => {
  it("finds listings by service, place, date, commodity and budget, cheapest first", () => {
    const c = company();
    const base = {
      companyId: c.id,
      service: "Pre-Shipment Inspection (PSI)",
      commodities: ["Rice"],
      location: "Mundra",
      priceUSD: 700,
      discountPct: 0,
      turnaroundDays: 2,
      surveyors: 3,
      availableFrom: "2026-11-01",
      availableTo: "2026-11-30",
      active: true,
    };
    expect(S.saveListing(base)).toEqual([]);
    expect(S.saveListing({ ...base, priceUSD: 800, discountPct: 25 })).toEqual([]);
    expect(S.saveListing({ ...base, location: "Kandla" })).toEqual([]);
    expect(S.saveListing({ ...base, availableTo: "2026-10-01" })[0]).toMatch(/available until/);

    const q = { service: base.service, location: "Mundra Port, Gujarat, Berth 04", date: "2026-11-05", commodity: "Rice (1121 Basmati)" };
    const hits = S.findListings(db().listings, q);
    expect(hits.map(S.listingNet)).toEqual([600, 700]);
    expect(S.findListings(db().listings, { ...q, maxPriceUSD: 650 })).toHaveLength(1);
    expect(S.findListings(db().listings, { ...q, date: "2026-12-05" })).toHaveLength(0);
    expect(S.findListings(db().listings, { ...q, commodity: "Wheat" })).toHaveLength(0);
  });
});

describe("payments", () => {
  it("tracks an invoice from unpaid to paid and refuses overpayment", () => {
    const o = order("quick");
    expect(S.paymentStatus(S.getOrder(o.id)!)).toBe("not-invoiced");
    expect(S.raiseInvoice(o.id, { amountUSD: 1000, discountPct: 10, dueOn: "2099-01-01" })).toEqual([]);
    expect(S.raiseInvoice(o.id, { amountUSD: 1000, discountPct: 0, dueOn: "2099-01-01" })[0]).toMatch(/already/);
    const pay = (amountUSD: number) =>
      S.recordPayment(o.id, { amountUSD, method: "Bank transfer", reference: "UTR1", receivedOn: "2026-11-04" });
    expect(pay(400)).toEqual([]);
    expect(S.paymentStatus(S.getOrder(o.id)!)).toBe("part-paid");
    expect(pay(600)[0]).toMatch(/Only \$500/);
    expect(pay(500)).toEqual([]);
    expect(S.paymentStatus(S.getOrder(o.id)!)).toBe("paid");
  });

  it("marks unpaid invoices past their due date overdue", () => {
    const o = order("quick");
    S.raiseInvoice(o.id, { amountUSD: 100, discountPct: 0, dueOn: "2026-01-01" });
    expect(S.paymentStatus(S.getOrder(o.id)!, "2026-02-01")).toBe("overdue");
  });

  it("won't invoice an open enquiry", () => {
    expect(S.raiseInvoice(order().id, { amountUSD: 100, discountPct: 0, dueOn: "2099-01-01" })[0]).toMatch(/confirms/);
  });
});

describe("certificates and compliance", () => {
  it("issues numbered certificates that can be checked and revoked", async () => {
    const c = company();
    const r = await S.issueCertificate({ companyId: c.id, type: "Certificate of Conformity (CoC)", issuedTo: "Seller", validUntil: "2099-01-01" });
    expect(r.problems).toEqual([]);
    expect(r.cert!.number).toMatch(/^COC-\d{4}-0001$/);
    expect(S.checkCertificate(r.cert!.verifyCode.toLowerCase()).result).toBe("valid");
    expect(S.checkCertificate(r.cert!.verifyCode, "2099-06-01").result).toBe("expired");
    S.revokeCertificate(r.cert!.id, "Wrong lot number");
    expect(S.checkCertificate(r.cert!.number).result).toBe("revoked");
    expect(S.checkCertificate("NOPE").result).toBe("not-found");
  });

  it("only issues order certificates after the inspection is completed", async () => {
    const c = company();
    const o = order("quick");
    const r = await S.issueCertificate({ companyId: c.id, orderId: o.id, type: "Halal certificate", issuedTo: "Seller" });
    expect(r.problems[0]).toMatch(/completed/);
  });

  it("flags expiring approvals and lists certificate types not covered", async () => {
    const c = company();
    expect(
      await S.addCompliance({ companyId: c.id, name: "Halal body approval", issuedBy: "ESMA", reference: "H-1", validUntil: "2026-12-01", covers: ["Halal certificate"] }),
    ).toEqual([]);
    const item = db().compliance[0];
    expect(S.complianceState(item, "2026-11-04")).toBe("expiring");
    expect(S.complianceState(item, "2026-06-01")).toBe("valid");
    expect(S.complianceState(item, "2027-01-01")).toBe("expired");
    expect(S.uncoveredCertTypes(db().compliance, c.id, "2026-11-04")).not.toContain("Halal certificate");
    expect(S.uncoveredCertTypes(db().compliance, c.id, "2027-01-01")).toContain("Halal certificate");
  });
});

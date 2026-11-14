import { beforeEach, describe, expect, it, vi } from "vitest";
import "fake-indexeddb/auto";
import { riceSpec } from "../../test/fixtures";
import { messageDays } from "./chat";

type Store = typeof import("./local-store");
let S: Store;

beforeEach(async () => {
  localStorage.clear();
  vi.resetModules();
  S = await import("./local-store");
});

const party = (name: string) => S.checkParty({ name }).party;
const texts = (orderId: string) =>
  JSON.parse(localStorage.getItem("qualty_store_v1")!)
    .messages.filter((m: { orderId: string }) => m.orderId === orderId)
    .map((m: { text: string }) => m.text) as string[];

function order(mode: "quick" | "inquiry", extra: Partial<Parameters<Store["createOrder"]>[0]> = {}) {
  return S.createOrder({
    mode,
    service: "Pre-Shipment Inspection (PSI)",
    commodity: "Rice",
    spec: riceSpec,
    specLabel: null,
    buyer: party("Buyer"),
    seller: party("Seller"),
    location: "Mundra Port",
    inspectionDate: "2026-11-20",
    volumeTons: 2500,
    customerName: "Cust",
    ...extra,
  });
}

describe("30% platform margin", () => {
  it("charges the customer 30% over the company's price and pays the company its price", () => {
    const o = order("quick", { priceUSD: 600, inspectionCompany: "Acme Surveyors" });
    expect(o.priceUSD).toBe(600);
    expect(o.customerPriceUSD).toBe(780);
    expect(o.invoice?.amountUSD).toBe(780);
  });

  it("books an accepted bid at the bid for the company and 30% more for the customer", () => {
    const o = order("inquiry", { budgetUSD: 2500 });
    const bid = S.submitBid(o.id, { company: "Acme Surveyors", priceUSD: 1000, days: 3, scope: "" });
    S.acceptBid(o.id, bid.id);
    const booked = S.getOrder(o.id)!;
    expect(booked.priceUSD).toBe(1000);
    expect(booked.customerPriceUSD).toBe(1300);
    expect(booked.invoice?.amountUSD).toBe(1300);
  });

  it("shows companies the customer's budget 30% lower, and customers each bid 30% higher", () => {
    expect(S.budgetForCompanies(2500)).toBe(1750);
    expect(S.customerPrice(1000)).toBe(1300);
    expect(S.customerPrice(615)).toBe(800);
  });

  it("never writes a price into the shared chat, so neither side sees the other's figure", () => {
    const o = order("inquiry", { budgetUSD: 2500 });
    const bid = S.submitBid(o.id, { company: "Acme Surveyors", priceUSD: 1000, discountPct: 10, days: 3, scope: "" });
    S.counterBid(o.id, bid.id, "customer", 800);
    S.acceptBid(o.id, bid.id);
    for (const t of texts(o.id)) expect(t).not.toMatch(/\$/);
  });

  it("lets the Qualty team negotiate the customer's price, never below the company's", () => {
    const o = order("quick", { priceUSD: 600, inspectionCompany: "Acme Surveyors" });
    expect(S.setCustomerPrice(o.id, 550)).toEqual(["The customer price can't be below the company's $600."]);
    expect(S.setCustomerPrice(o.id, 700)).toEqual([]);
    expect(S.getOrder(o.id)!.customerPriceUSD).toBe(700);
    expect(S.getOrder(o.id)!.invoice?.amountUSD).toBe(700);
    S.recordPayment(o.id, { amountUSD: 100, method: "UPI", reference: "x", receivedOn: "2026-11-14" });
    expect(S.setCustomerPrice(o.id, 650)).toEqual(["Payment has started on this invoice, so its price is fixed."]);
  });

  it("opens the room once the customer's full price is paid", () => {
    const o = order("quick", { priceUSD: 600, inspectionCompany: "Acme Surveyors" });
    expect(S.recordPayment(o.id, { amountUSD: 600, method: "UPI", reference: "a", receivedOn: "2026-11-14" })).toEqual([]);
    expect(S.roomOpen(S.getOrder(o.id)!)).toBe(false);
    S.recordPayment(o.id, { amountUSD: 180, method: "UPI", reference: "b", receivedOn: "2026-11-14" });
    expect(S.roomOpen(S.getOrder(o.id)!)).toBe(true);
  });
});

describe("group names", () => {
  it("renames a room, keeps the order number and limits the length", () => {
    const o = order("quick", { priceUSD: 600, inspectionCompany: "Acme Surveyors" });
    expect(S.roomTitle(S.getOrder(o.id)!)).toBe(`Rice · ${o.id}`);
    expect(S.renameRoom(o.id, "  Basmati to Dubai, Lot 7 ")).toEqual([]);
    expect(S.roomTitle(S.getOrder(o.id)!)).toBe(`Basmati to Dubai, Lot 7 · ${o.id}`);
    expect(texts(o.id)).toContain("Group renamed to Basmati to Dubai, Lot 7.");
    expect(S.renameRoom(o.id, "x".repeat(61))).toEqual(["Keep the group name under 60 characters."]);
    expect(S.renameRoom(o.id, "")).toEqual([]);
    expect(S.roomTitle(S.getOrder(o.id)!)).toBe(`Rice · ${o.id}`);
  });
});

describe("standard certificate services", () => {
  it("lists ECTN and CoC at one fixed rate across India", () => {
    const c = S.createCompany({ name: "Acme Surveyors", address: "Mumbai", email: "a@acme.in", phone: "+91 98765 43210" }, "Ravi");
    const base = {
      companyId: c.id,
      commodities: [],
      discountPct: 0,
      turnaroundDays: 2,
      surveyors: 2,
      availableFrom: "2026-11-01",
      availableTo: "2027-03-31",
      active: true,
    };
    const ectn = S.SERVICES.find((s) => s.startsWith("ECTN"))!;
    expect(S.STANDARD_RATES[ectn]).toBeGreaterThan(0);
    expect(S.saveListing({ ...base, service: ectn, location: S.ALL_INDIA, priceUSD: 999 })).toEqual([
      `${ectn} has a standard rate of $${S.STANDARD_RATES[ectn]} across India.`,
    ]);
    expect(S.saveListing({ ...base, service: ectn, location: S.ALL_INDIA, priceUSD: S.STANDARD_RATES[ectn]! })).toEqual([]);
    const rule = `${ectn} has a standard rate of $${S.STANDARD_RATES[ectn]} across India.`;
    expect(S.saveListing({ ...base, service: ectn, location: "Chennai Port", priceUSD: 999 })).toEqual([rule]);
    expect(S.saveListing({ ...base, service: ectn, location: S.ALL_INDIA, priceUSD: S.STANDARD_RATES[ectn]!, discountPct: 50 })).toEqual([rule]);
    const found = S.findListings(JSON.parse(localStorage.getItem("qualty_store_v1")!).listings, { service: ectn, location: "Chennai Port", date: "2026-12-01" });
    expect(found).toHaveLength(1);
  });
});

describe("chat by day", () => {
  it("groups messages by day with Today and Yesterday labels", () => {
    const m = (id: string, createdAt: string) => ({ id, createdAt });
    const days = messageDays(
      [m("a", "2026-11-10T09:00:00"), m("b", "2026-11-13T22:00:00"), m("c", "2026-11-14T08:00:00"), m("d", "2026-11-14T09:00:00")],
      new Date("2026-11-14T12:00:00"),
    );
    expect(days.map((d) => [d.label, d.items.map((x) => x.id)])).toEqual([
      ["Tue, 10 Nov 2026", ["a"]],
      ["Yesterday", ["b"]],
      ["Today", ["c", "d"]],
    ]);
  });
});

describe("one price per side", () => {
  it("works out each side's figure when the store holds both", () => {
    const o = order("inquiry", { budgetUSD: 2500 });
    const bid = S.submitBid(o.id, { company: "Acme Surveyors", priceUSD: 1000, discountPct: 10, days: 3, scope: "" });
    S.counterBid(o.id, bid.id, "customer", 1040);
    const fresh = S.getOrder(o.id)!;
    const b = fresh.bids[0]!;
    expect(S.orderCompanyBudget(fresh)).toBe(1750);
    expect(S.bidCustomerPrice(b)).toBe(1170);
    expect(b.rounds!.map((r) => S.roundCustomerPrice(r))).toEqual([1040]);
    expect(S.listingCustomerPrice({ priceUSD: 600, discountPct: 0 })).toBe(780);
  });

  it("uses the figure the database sent when only one side is known", () => {
    expect(S.bidCustomerPrice({ priceUSD: 0, discountPct: 0, customerPriceUSD: 1170 })).toBe(1170);
    expect(S.roundCustomerPrice({ priceUSD: 0, customerPriceUSD: 1040 })).toBe(1040);
    expect(S.listingCustomerPrice({ priceUSD: 0, discountPct: 0, customerPriceUSD: 780 })).toBe(780);
    expect(S.orderCompanyBudget({ companyBudgetUSD: 1750 })).toBe(1750);
    expect(S.orderCustomerPrice({ customerPriceUSD: 780 })).toBe(780);
    expect(S.orderCustomerPrice({ priceUSD: 600 })).toBe(780);
    expect(S.orderCustomerPrice({})).toBeUndefined();
  });
});

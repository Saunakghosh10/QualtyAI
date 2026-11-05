import { beforeEach, describe, expect, it, vi } from "vitest";
import { riceSpec } from "../../test/fixtures";

// Without Supabase keys the facade runs the browser-only store, but every write is a Promise.
describe("store facade (demo mode)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it("is in demo mode and wraps local writes in promises", async () => {
    const S = await import("./store");
    expect(S.isRemote).toBe(false);
    const p = S.createOrder({
      mode: "quick",
      service: "Pre-Shipment Inspection (PSI)",
      commodity: "Rice",
      spec: riceSpec,
      specLabel: null,
      buyer: S.checkParty({ name: "B" }).party,
      seller: S.checkParty({ name: "S" }).party,
      location: "Mundra",
      inspectionDate: "2026-11-05",
      volumeTons: 100,
      customerName: "C",
    });
    expect(p).toBeInstanceOf(Promise);
    const o = await p;
    expect(S.orderRef(o)).toMatch(/^QI-\d{4}-0001$/);
    expect(await S.inviteMember("nope", { name: "", role: "ops" })).toContain("Add the person's name.");
    expect((await S.checkCertificate("NOPE")).result).toBe("not-found");
    await S.postMessage({ orderId: o.id, kind: "text", role: "customer", author: "C", text: "hi" });
    expect(JSON.parse(localStorage.getItem("qualty_store_v1")!).messages.some((m: { text: string }) => m.text === "hi")).toBe(true);
  });
});

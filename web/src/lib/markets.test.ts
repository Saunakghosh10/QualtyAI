import { describe, expect, it } from "vitest";
import { marketFit, MARKET_LIMITS } from "./markets";
import { riceSpec } from "../../test/fixtures";

describe("marketFit", () => {
  it("lists fitting markets first and names the failing limit for the rest", () => {
    const fits = marketFit(riceSpec);
    const firstFail = fits.findIndex((f) => !f.fits);
    expect(fits.slice(0, firstFail).every((f) => f.fits)).toBe(true);
    expect(fits.find((f) => f.market === "European Union")).toEqual({
      market: "European Union",
      fits: false,
      failing: ["purity 98.5% < 99%"],
    });
    expect(fits.find((f) => f.market === "UAE / GCC")?.fits).toBe(true);
  });

  it("fails every market when live insects are present", () => {
    expect(marketFit({ ...riceSpec, liveInsects: 2 }).every((f) => !f.fits && f.failing.includes("live insects"))).toBe(true);
  });

  it.each([
    ["broken", { broken: 30 }, "broken 30% >"],
    ["moisture", { moisture: 16 }, "moisture 16% >"],
    ["damage", { damageKernel: 9 }, "damaged 9% >"],
  ])("reports %s over the limit", (_name, change, text) => {
    const fits = marketFit({ ...riceSpec, ...change });
    expect(fits.every((f) => !f.fits)).toBe(true);
    expect(fits[0].failing.some((s) => s.startsWith(text))).toBe(true);
  });

  it("has limits for every commodity the Calibrator offers", () => {
    for (const c of ["Rice", "Wheat", "Corn", "Soybeans", "Pulses", "Sugar"] as const) {
      expect(MARKET_LIMITS[c].length).toBeGreaterThan(0);
      expect(marketFit({ ...riceSpec, commodity: c }).length).toBe(MARKET_LIMITS[c].length);
    }
  });
});

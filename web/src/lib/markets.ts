import type { CommodityParams } from "@/components/CommodityCalibrator";

// Indicative import limits per destination market. These are working values
// so the Calibrator can show "which market suits this quality"; replace them
// with the confirmed contract/regulatory standards before relying on them.
export interface MarketLimit {
  market: string;
  maxBroken: number;
  minPurity: number;
  maxMoisture: number;
  maxDamage: number;
  liveInsectsAllowed: boolean;
}

export const INDICATIVE = true;

const M = (market: string, maxBroken: number, minPurity: number, maxMoisture: number, maxDamage: number): MarketLimit => ({
  market,
  maxBroken,
  minPurity,
  maxMoisture,
  maxDamage,
  liveInsectsAllowed: false,
});

export const MARKET_LIMITS: Record<CommodityParams["commodity"], MarketLimit[]> = {
  Rice: [
    M("European Union", 2, 99, 13, 0.5),
    M("UAE / GCC", 5, 98, 14, 1),
    M("Saudi Arabia", 5, 98.5, 13.5, 1),
    M("Iran", 5, 98, 14, 1.5),
    M("United Kingdom", 3, 99, 13, 0.75),
    M("West Africa", 25, 95, 14, 3),
    M("Bangladesh", 15, 96, 14, 2),
  ],
  Wheat: [
    M("European Union", 3, 98, 14, 1),
    M("Egypt", 5, 98, 13.5, 2),
    M("Indonesia", 5, 97, 14, 2),
    M("Bangladesh", 6, 97, 14, 3),
    M("UAE / GCC", 5, 98, 13.5, 2),
  ],
  Corn: [
    M("European Union", 4, 98, 14, 3),
    M("Vietnam", 6, 97, 14.5, 5),
    M("Malaysia", 6, 97, 14.5, 5),
    M("Bangladesh", 8, 96, 14.5, 6),
  ],
  Soybeans: [
    M("European Union (Non-GMO)", 5, 99, 13, 2),
    M("China", 20, 98, 13, 8),
    M("Japan", 8, 99, 13, 3),
    M("Indonesia", 15, 98, 13, 5),
  ],
  Pulses: [
    M("European Union", 2, 99.5, 14, 1),
    M("UAE / GCC", 3, 99, 14, 2),
    M("Bangladesh", 5, 98, 15, 3),
    M("Sri Lanka", 4, 98.5, 14, 2),
  ],
  Sugar: [
    M("European Union", 0.5, 99.8, 0.06, 0.2),
    M("UAE / GCC", 1, 99.7, 0.08, 0.5),
    M("West Africa", 2, 99.5, 0.1, 1),
    M("Bangladesh", 2, 99.5, 0.1, 1),
  ],
};

export interface MarketFit {
  market: string;
  fits: boolean;
  failing: string[];
}

export function marketFit(p: CommodityParams): MarketFit[] {
  return (MARKET_LIMITS[p.commodity] ?? [])
    .map((m) => {
      const failing: string[] = [];
      if (p.broken > m.maxBroken) failing.push(`broken ${p.broken}% > ${m.maxBroken}%`);
      if (p.purity < m.minPurity) failing.push(`purity ${p.purity}% < ${m.minPurity}%`);
      if (p.moisture > m.maxMoisture) failing.push(`moisture ${p.moisture}% > ${m.maxMoisture}%`);
      if (p.damageKernel > m.maxDamage) failing.push(`damaged ${p.damageKernel}% > ${m.maxDamage}%`);
      if (p.liveInsects > 0 && !m.liveInsectsAllowed) failing.push("live insects");
      return { market: m.market, fits: failing.length === 0, failing };
    })
    .sort((a, b) => Number(b.fits) - Number(a.fits) || a.failing.length - b.failing.length);
}

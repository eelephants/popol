export type ThemeFlags = { aiInfra: boolean; trump: boolean; tariff: boolean };
export type Score = 0 | 1 | 2 | 3;

export type ValuationThresholds = {
  roeRange: [number, number]; // percent
  perMax: number;
  psrRange: [number, number];
  pbrMax: number;
};
export const DEFAULT_THRESHOLDS: ValuationThresholds = {
  roeRange: [15, 20], perMax: 15, psrRange: [1.5, 3], pbrMax: 1.5,
};

export type WatchlistItem = {
  ticker: string; name: string;
  buyThesis: string; sellRisk: string;
  theme: ThemeFlags; highOverride: number | null;
};
export type WatchlistConfig = { items: WatchlistItem[]; thresholds: ValuationThresholds };

export const ZONE_PCTS = [10, 15, 20, 25] as const;
export type ZonePct = (typeof ZONE_PCTS)[number];
export type Zone = { pct: ZonePct; price: number; reached: boolean };
export type NearestZone = { pct: ZonePct; price: number; distancePct: number } | null;
export type ZoneStatus = "in-zone" | "near" | "far" | "unknown";

export type CrossState = "golden" | "death" | "none";

export type MaSignalLevel =
  | "strong-overheated"
  | "overheated"
  | "weak-overheated"
  | "normal"
  | "weak-oversold"
  | "oversold"
  | "strong-oversold";

export type Valuation = { per: number | null; psr: number | null; pbr: number | null; roe: number | null };
export type BadgeState = "pass" | "warn" | "fail" | "na";
export type ValuationBadges = Record<"per" | "psr" | "pbr" | "roe", BadgeState>;

export type Regime = "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
export type MacroRegime = {
  regime: Regime;
  activeZones: ZonePct[];
  fng: number;
  tenYear: number | null;
  hySpread: number | null;
  hySpreadPercentile: number | null; // 0..100
  hySpreadRising: boolean;
  note: string;
};

export type EnrichedStock = {
  ticker: string; name: string;
  price: number | null; priceKrw: number | null; changePct: number | null; isStale: boolean;
  high: number; highSource: "sheet" | "52w";
  zones: Zone[]; nearestUnreached: NearestZone; drawdownPct: number; zoneStatus: ZoneStatus;
  rsi14: number | null; sma50: number | null; sma200: number | null;
  crossState: CrossState; crossFreshDays: number | null;
  range52wPct: number | null; volumeSpike: number | null;
  valuation: Valuation; valuationBadges: ValuationBadges;
  buyThesis: string; sellRisk: string; theme: ThemeFlags; score: Score;
};

export type MacroData = {
  fearGreed: { score: number; rating: string } | null;
  tenYearYield: number | null;
  hySpread: number | null;
  usdKrw: number | null;
  regime: MacroRegime | null;
};

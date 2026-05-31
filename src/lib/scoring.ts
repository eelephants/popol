import type {
  ThemeFlags, Score, Valuation, ValuationThresholds, ValuationBadges, BadgeState,
  Regime, MacroRegime, ZonePct,
} from "@/lib/types";

export function themeScore(theme: ThemeFlags): Score {
  const n = (theme.aiInfra ? 1 : 0) + (theme.trump ? 1 : 0) + (theme.tariff ? 1 : 0);
  return n as Score;
}

function maxBadge(value: number | null, max: number): BadgeState {
  if (value == null || value <= 0) return "na";
  if (value <= max) return "pass";
  if (value <= max * 1.2) return "warn";
  return "fail";
}
function rangeBadge(value: number | null, [lo, hi]: [number, number]): BadgeState {
  if (value == null || value <= 0) return "na";
  if (value >= lo && value <= hi) return "pass";
  if (value >= lo * 0.8 && value <= hi * 1.2) return "warn";
  return "fail";
}
function roeBadge(value: number | null, [lo, hi]: [number, number]): BadgeState {
  if (value == null) return "na";
  if (value >= lo && value <= hi) return "pass";
  if (value > hi) return "warn"; // 상한 초과 = 레버리지 주의 (사용자 룰)
  return "fail"; // < lo
}

export function valuationBadges(v: Valuation, t: ValuationThresholds): ValuationBadges {
  return {
    per: maxBadge(v.per, t.perMax),
    psr: rangeBadge(v.psr, t.psrRange),
    pbr: maxBadge(v.pbr, t.pbrMax),
    roe: roeBadge(v.roe, t.roeRange),
  };
}

const REGIME_TABLE: { max: number; regime: Regime; zones: ZonePct[] }[] = [
  { max: 25, regime: "extreme-fear", zones: [10, 15] },
  { max: 44, regime: "fear", zones: [15] },
  { max: 55, regime: "neutral", zones: [15, 20] },
  { max: 74, regime: "greed", zones: [20] },
  { max: 100, regime: "extreme-greed", zones: [25] },
];
const DEEPER: ZonePct[] = [10, 15, 20, 25];

export function macroRegime(
  fng: number,
  tenYear: number | null,
  hySpread: number | null,
  hySpreadPercentile: number | null,
): MacroRegime {
  const base = REGIME_TABLE.find((r) => fng <= r.max) ?? REGIME_TABLE[REGIME_TABLE.length - 1];
  let zones = base.zones;
  let note = `공포탐욕 ${fng} → ${base.regime}`;
  if (hySpreadPercentile != null && hySpreadPercentile >= 90) {
    const deepest = zones[zones.length - 1];
    const idx = DEEPER.indexOf(deepest);
    const bumped = DEEPER[Math.min(idx + 1, DEEPER.length - 1)];
    zones = [bumped];
    note += ` · 하이일드 스프레드 상위 ${Math.round(hySpreadPercentile)}% → 한 칸 보수적`;
  }
  return { regime: base.regime, activeZones: zones, fng, tenYear, hySpread, hySpreadPercentile, note };
}

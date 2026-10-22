// 소몽 적정주가 템플릿: EPS 성장률을 적정 P/E로 보고(성장률 20% → 20배) 향후 1년 EPS에 곱한다.
// 보통장은 성장률의 1~2배, 강세장은 1.5~2.5배. 목표주가(보수)는 보통장 상단, 목표주가(강세)는 강세장 상단.

/** [과거 3년, 과거 2년, 과거 1년, 가장 최근, 향후 1년, 향후 2년] 순 희석 EPS. */
export type EpsRow = (number | null)[];

export const EPS_LABELS = ["과거 3년", "과거 2년", "과거 1년", "가장 최근", "향후 1년", "향후 2년"] as const;

export function growthRates(eps: EpsRow): (number | null)[] {
  const out: (number | null)[] = [];
  for (let i = 1; i < eps.length; i++) {
    const prev = eps[i - 1];
    const cur = eps[i];
    out.push(prev != null && cur != null && prev !== 0 ? cur / prev - 1 : null);
  }
  return out;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export type Valuation = {
  growthPct: number;
  normalMultiple: [number, number];
  bullMultiple: [number, number];
  fairRange: [number, number];
  targetConservative: number;
  targetBull: number;
  upsideConservativePct: number | null;
  upsideBullPct: number | null;
};

export type FairPriceResult = {
  growth: (number | null)[];
  medianGrowthPct: number | null;
  /** 엑셀 안내 ⑤: 역성장이 있거나 변동이 50% 이상이면 보정값(장기 성장률 추정치)을 쓴다. */
  needsAdjustment: boolean;
  forwardEps: number | null;
  currentMultiple: number | null;
  base: Valuation | null;
  adjusted: Valuation | null;
};

const pct = (target: number, price: number | null) => (price != null && price > 0 ? (target / price - 1) * 100 : null);

function valuation(growthPct: number, forwardEps: number, price: number | null): Valuation | null {
  if (!(growthPct > 0) || !(forwardEps > 0)) return null; // 음수 배수는 가격이 아니다
  const normal: [number, number] = [growthPct, growthPct * 2];
  const bull: [number, number] = [growthPct * 1.5, growthPct * 2.5];
  const targetConservative = forwardEps * normal[1];
  const targetBull = forwardEps * bull[1];
  return {
    growthPct,
    normalMultiple: normal,
    bullMultiple: bull,
    fairRange: [forwardEps * normal[0], forwardEps * normal[1]],
    targetConservative,
    targetBull,
    upsideConservativePct: pct(targetConservative, price),
    upsideBullPct: pct(targetBull, price),
  };
}

export function fairPrice(eps: EpsRow, price: number | null, ltgPct: number | null): FairPriceResult {
  const growth = growthRates(eps);
  const known = growth.filter((g): g is number => g != null);
  const med = median(known);
  const forwardEps = eps[4] ?? null;
  const needsAdjustment = known.some((g) => g < 0 || Math.abs(g) >= 0.5);
  return {
    growth,
    medianGrowthPct: med == null ? null : med * 100,
    needsAdjustment,
    forwardEps,
    currentMultiple: price != null && forwardEps != null && forwardEps > 0 ? price / forwardEps : null,
    base: med != null && forwardEps != null ? valuation(med * 100, forwardEps, price) : null,
    adjusted: ltgPct != null && forwardEps != null ? valuation(ltgPct, forwardEps, price) : null,
  };
}

/** ③ 직접 계산: 적정배수를 정해 향후 1년 EPS에 곱한다. */
export function customTarget(multiple: number | null, forwardEps: number | null, price: number | null) {
  if (multiple == null || !(multiple > 0) || forwardEps == null || !(forwardEps > 0)) return null;
  const target = multiple * forwardEps;
  return { target, upsidePct: pct(target, price) };
}

/** PEG = P/E ÷ EPS 성장률(%). 성장률이 0 이하면 의미가 없다. */
export function peg(pe: number | null, growthPct: number | null): number | null {
  if (pe == null || growthPct == null || !(pe > 0) || !(growthPct > 0)) return null;
  return pe / growthPct;
}

// 몰빵지수: 상위 20종목(ETF 제외)의 투자금 비중과 업종 쏠림을 본다.
// 한 종목 20% 이상이면 축소 검토, 30% 이상이면 축소 필요.
import { SECTORS, lookupSector, type Sector } from "@/lib/sectorMap";

export const MAX_HOLDINGS = 20;
export const REVIEW_PCT = 20;
export const REDUCE_PCT = 30;

export type SizeClass = "초대형" | "대형" | "중형";
export type WeightFlag = "reduce" | "review" | "ok";

export type Holding = { ticker: string; name: string; amount: number; sector: Sector | null };

export type HoldingRow = Holding & {
  weightPct: number;
  size: SizeClass | null;
  flag: WeightFlag;
};

export type ConcentrationResult = {
  rows: HoldingRow[];
  total: number;
  sectors: { sector: Sector | "미분류"; weightPct: number }[];
  top: HoldingRow | null;
  overLimit: boolean;
};

/** 시가총액($백만) 2,000억 달러 초과 초대형, 100억 달러 초과 대형, 그 외 중형. */
export function sizeClass(marketCapM: number | null): SizeClass | null {
  if (marketCapM == null) return null;
  if (marketCapM > 200_000) return "초대형";
  if (marketCapM > 10_000) return "대형";
  return "중형";
}

export function weightFlag(weightPct: number): WeightFlag {
  if (weightPct >= REDUCE_PCT) return "reduce";
  if (weightPct >= REVIEW_PCT) return "review";
  return "ok";
}

/** 표에 있는 종목은 업종을 자동으로 채운다. 사용자가 고른 업종이 있으면 그것을 쓴다. */
export function defaultSector(ticker: string): Sector | null {
  return lookupSector(ticker)?.sector ?? null;
}

export function concentration(holdings: Holding[]): ConcentrationResult {
  const valid = holdings.filter((h) => Number.isFinite(h.amount) && h.amount > 0);
  const total = valid.reduce((s, h) => s + h.amount, 0);
  const rows: HoldingRow[] = holdings.map((h) => {
    const amount = Number.isFinite(h.amount) && h.amount > 0 ? h.amount : 0;
    const weightPct = total > 0 ? (amount / total) * 100 : 0;
    return {
      ...h,
      amount,
      weightPct,
      size: sizeClass(lookupSector(h.ticker)?.marketCapM ?? null),
      flag: weightFlag(weightPct),
    };
  });
  const bySector = new Map<Sector | "미분류", number>();
  for (const r of rows) {
    if (r.weightPct === 0) continue;
    const key = r.sector ?? "미분류";
    bySector.set(key, (bySector.get(key) ?? 0) + r.weightPct);
  }
  const sectors = [...SECTORS, "미분류" as const]
    .map((sector) => ({ sector, weightPct: bySector.get(sector) ?? 0 }))
    .filter((s) => s.weightPct > 0)
    .sort((a, b) => b.weightPct - a.weightPct);
  const top = rows.reduce<HoldingRow | null>((best, r) => (r.weightPct > (best?.weightPct ?? 0) ? r : best), null);
  return { rows, total, sectors, top, overLimit: holdings.length > MAX_HOLDINGS };
}

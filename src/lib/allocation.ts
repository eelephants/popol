/** 자산 분배 계산 — 전부 원화 기준으로 계산하고, 통화 전환은 입출력에서만 한다.
 *  주식 수는 (배분금액 ÷ 단가) 비율이라 어느 통화로 계산해도 같으므로 코어는 원화 하나로 둔다. */

export type Currency = "KRW" | "USD";

/** 증권사 소수점 매수 자리수. 이 밑으로는 주문이 안 되므로 내림한다. */
const SHARE_DECIMALS = 6;

/** 33.3% 같은 소수 비율에서 생기는 부동소수 먼지를 턴다 (50,000,000 × 33.3 / 100 = 16649999.999999998). */
const roundTo = (n: number, dp: number) => Math.round(n * 10 ** dp) / 10 ** dp;

export type AllocRow = {
  symbol: string;
  name: string;
  pct: number;
  /** 원화 단가. 미국주는 EnrichedStock.priceKrw, 국장은 price. 환율 조회 실패 시 null. */
  priceKrw: number | null;
};

export type AllocResult = AllocRow & {
  amountKrw: number;
  /** 소수점 매수 기준 주수. 단가를 모르면 null (0주와 구분한다) */
  shares: number | null;
  filledKrw: number | null;
  leftoverKrw: number | null;
};

export type Allocation = {
  rows: AllocResult[];
  pctTotal: number;
  /** 미배정 비율 (합이 100을 넘으면 0) */
  cashPct: number;
  cashKrw: number;
  overAllocated: boolean;
  /** 주 단위로 떨어지지 않아 남는 금액의 합 */
  leftoverKrw: number;
};

export function allocate(totalKrw: number, rows: AllocRow[]): Allocation {
  const total = Math.max(0, totalKrw);
  const results: AllocResult[] = rows.map((r) => {
    const amountKrw = roundTo((total * r.pct) / 100, 2);
    if (r.priceKrw == null || r.priceKrw <= 0) {
      return { ...r, amountKrw, shares: null, filledKrw: null, leftoverKrw: null };
    }
    const shares = Math.floor((amountKrw / r.priceKrw) * 10 ** SHARE_DECIMALS) / 10 ** SHARE_DECIMALS;
    const filledKrw = roundTo(shares * r.priceKrw, 2);
    return { ...r, amountKrw, shares, filledKrw, leftoverKrw: roundTo(amountKrw - filledKrw, 2) };
  });

  const pctTotal = roundTo(rows.reduce((s, r) => s + r.pct, 0), 6);
  const cashPct = Math.max(0, 100 - pctTotal);
  return {
    rows: results,
    pctTotal,
    cashPct,
    cashKrw: roundTo((total * cashPct) / 100, 2),
    overAllocated: pctTotal > 100,
    leftoverKrw: roundTo(results.reduce((s, r) => s + (r.leftoverKrw ?? 0), 0), 2),
  };
}

/** 입력 금액을 원화로 정규화. 달러인데 환율이 없으면 계산 불가(null). */
export function toKrw(amount: number, base: Currency, usdKrw: number | null): number | null {
  if (base === "KRW") return amount;
  return usdKrw == null || usdKrw <= 0 ? null : amount * usdKrw;
}

/** 원화 금액을 표시 통화로 렌더. 환율이 없으면 원화로 폴백. */
export function formatMoney(krw: number, base: Currency, usdKrw: number | null): string {
  if (base === "USD" && usdKrw != null && usdKrw > 0) {
    return `$${(krw / usdKrw).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₩${Math.round(krw).toLocaleString("ko-KR")}`;
}

/** 표시 통화를 바꿀 때 입력값을 같은 가치로 환산. 환율이 없으면 그대로 둔다.
 *  왕복 환산은 반올림 때문에 무손실이 아니다 (₩50,000,000 → $32,637.08 → ₩50,000,007). */
export function convertAmount(amount: number, from: Currency, to: Currency, usdKrw: number | null): number {
  if (from === to || usdKrw == null || usdKrw <= 0) return amount;
  return to === "USD" ? Math.round((amount / usdKrw) * 100) / 100 : Math.round(amount * usdKrw);
}

/** 주수 표시 — 소수점 매수 자리수까지 보여주되 정수면 소수점을 붙이지 않는다. */
export function formatShares(shares: number): string {
  return shares.toLocaleString("ko-KR", { maximumFractionDigits: SHARE_DECIMALS });
}

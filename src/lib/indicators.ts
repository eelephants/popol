import type { CrossState, MaSignalLevel } from "@/lib/types";

export function sma(closes: number[], period: number): number | null {
  if (closes.length < period || period <= 0) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function rsi14(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const g = delta > 0 ? delta : 0;
    const l = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

export function crossState(sma50: number | null, sma200: number | null): CrossState {
  if (sma50 == null || sma200 == null) return "none";
  if (sma50 > sma200) return "golden";
  if (sma50 < sma200) return "death";
  return "none";
}

/** 최근 lookback 세션 내 50/200일선 부호 전환이 며칠 전인지. 없으면 null. */
export function crossFreshDays(closes: number[], lookback = 5): number | null {
  const signAt = (endIndex: number): number | null => {
    const upto = closes.slice(0, endIndex + 1);
    const s50 = sma(upto, 50);
    const s200 = sma(upto, 200);
    if (s50 == null || s200 == null) return null;
    return Math.sign(s50 - s200);
  };
  const last = closes.length - 1;
  const today = signAt(last);
  if (today == null || today === 0) return null;
  for (let d = 1; d <= lookback; d++) {
    const prev = signAt(last - d);
    if (prev == null) return null;
    if (prev !== today) return d - 1;
  }
  return null;
}

export function range52w(price: number, low52: number, high52: number): number | null {
  if (high52 <= low52) return null;
  return ((price - low52) / (high52 - low52)) * 100;
}

export function volumeSpike(todayVolume: number, recentVolumes: number[]): number | null {
  if (recentVolumes.length === 0) return null;
  const avg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  if (avg === 0) return null;
  return todayVolume / avg;
}

/** 이격도(%) = (price − sma) / sma × 100. price/sma가 null이거나 sma가 0이면 null. */
export function disparity(price: number | null, sma: number | null): number | null {
  if (price == null || sma == null || sma === 0) return null;
  return ((price - sma) / sma) * 100;
}

/** 이격도(%)를 7단계 매매신호 레벨로 매핑. null이면 null. 임계값 ±5/±10/±15(하한 포함). */
export function maSignal(disparityPct: number | null): MaSignalLevel | null {
  if (disparityPct == null) return null;
  const a = Math.abs(disparityPct);
  if (a < 5) return "normal";
  const over = disparityPct > 0;
  if (a < 10) return over ? "weak-overheated" : "weak-oversold";
  if (a < 15) return over ? "overheated" : "oversold";
  return over ? "strong-overheated" : "strong-oversold";
}

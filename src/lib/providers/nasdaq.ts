import type { AnnualEps } from "@/lib/providers/sec";

// Nasdaq 애널리스트 API: 연간 EPS 컨센서스(보통 4개 회계연도). 키는 없지만 브라우저 같은 헤더가 필요하다.
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nasdaq.com",
  Referer: "https://www.nasdaq.com/",
};

export type YearlyForecast = { fiscalEnd: string; eps: number };

export type ForwardEstimate = {
  /** 마지막 실적 다음 두 회계연도의 컨센서스 EPS (계산기의 향후 1년·2년). */
  next: { label: string; eps: number }[];
  /** 마지막 실적 EPS → 가장 먼 컨센서스 EPS의 연평균 성장률(%). 3~5년 장기 성장률 자리에 쓴다. */
  growthPct: number | null;
  growthBasis: string | null;
};

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** "Jun 2027" → 2027*12+5. 못 읽으면 null. */
export function monthIndex(fiscalEnd: string): number | null {
  const m = /^([A-Za-z]{3})[a-z]*\s+(\d{4})$/.exec(fiscalEnd.trim());
  if (!m) return null;
  const mon = MONTHS.indexOf(m[1].toLowerCase());
  return mon < 0 ? null : Number(m[2]) * 12 + mon;
}

const isoMonthIndex = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1;
const fy = (monthIdx: number) => `FY${Math.floor(monthIdx / 12)}`;

/** 컨센서스 행을 마지막 실적 뒤에 맞춰 향후 1·2년과 장기 성장률로 바꾼다. 순수 함수. */
export function forwardFromForecast(rows: YearlyForecast[], lastActual: AnnualEps | null): ForwardEstimate | null {
  const parsed = rows
    .map((r) => ({ ...r, idx: monthIndex(r.fiscalEnd) }))
    .filter((r): r is YearlyForecast & { idx: number } => r.idx != null && Number.isFinite(r.eps))
    .sort((a, b) => a.idx - b.idx);
  const after = lastActual ? parsed.filter((r) => r.idx > isoMonthIndex(lastActual.periodEnd)) : parsed;
  if (after.length === 0) return null;

  const next = after.slice(0, 2).map((r) => ({ label: fy(r.idx), eps: r.eps }));

  // 기준점: 마지막 실적(있으면) 아니면 첫 컨센서스. 2년 이상 떨어진 마지막 컨센서스까지의 CAGR.
  const base = lastActual && lastActual.value > 0 ? { idx: isoMonthIndex(lastActual.periodEnd), eps: lastActual.value, actual: true } : { idx: after[0].idx, eps: after[0].eps, actual: false };
  const end = after[after.length - 1];
  const years = Math.round((end.idx - base.idx) / 12);
  let growthPct: number | null = null;
  let growthBasis: string | null = null;
  if (years >= 2 && base.eps > 0 && end.eps > 0) {
    growthPct = (Math.pow(end.eps / base.eps, 1 / years) - 1) * 100;
    growthBasis = `${fy(base.idx)} ${base.actual ? "실적" : "예상"} → ${fy(end.idx)} 예상, ${years}년 연평균`;
  }
  return { next, growthPct, growthBasis };
}

/** 연간 EPS 컨센서스. 응답이 없거나 막히면 빈 배열(계산기는 직접 입력으로 남는다). */
export async function getYearlyEpsForecast(ticker: string): Promise<YearlyForecast[]> {
  try {
    const sym = ticker.toUpperCase().replace("-", ".");
    const res = await fetch(`https://api.nasdaq.com/api/analyst/${encodeURIComponent(sym)}/earnings-forecast`, {
      headers: HEADERS,
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const rows = (await res.json())?.data?.yearlyForecast?.rows;
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r: { fiscalEnd?: unknown; consensusEPSForecast?: unknown }) => ({
        fiscalEnd: String(r.fiscalEnd ?? ""),
        eps: typeof r.consensusEPSForecast === "number" ? r.consensusEPSForecast : Number(r.consensusEPSForecast),
      }))
      .filter((r: YearlyForecast) => r.fiscalEnd && Number.isFinite(r.eps));
  } catch {
    return [];
  }
}

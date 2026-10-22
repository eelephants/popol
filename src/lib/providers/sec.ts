import { SITE_URL } from "@/lib/site";

// SEC EDGAR XBRL API: 미국 상장사의 10-K 희석 EPS. 키 없이 동작하지만 연락처가 담긴 User-Agent를 요구한다.
const HEADERS = { "User-Agent": `popol-watchlist ${SITE_URL}`, Accept: "application/json" };

export type AnnualEps = { periodEnd: string; value: number };

type Fact = { start?: string; end: string; val: number; form: string; filed: string };

async function cikOf(ticker: string): Promise<string | null> {
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: HEADERS,
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const rows: Record<string, { cik_str: number; ticker: string }> = await res.json();
  const want = ticker.toUpperCase().replace(".", "-"); // Yahoo BRK-B ↔ SEC BRK-B, 혹시 BRK.B로 와도 맞춘다
  const hit = Object.values(rows).find((r) => r.ticker.toUpperCase() === want);
  return hit ? String(hit.cik_str).padStart(10, "0") : null;
}

/** 같은 회계연도가 여러 10-K에 다시 실리므로(재작성 포함) 기간 끝 날짜별로 가장 늦게 제출된 값을 쓴다. */
export function annualFromFacts(facts: Fact[]): AnnualEps[] {
  const byEnd = new Map<string, Fact>();
  for (const f of facts) {
    if (!f.form.startsWith("10-K") || !f.start) continue;
    const days = (Date.parse(f.end) - Date.parse(f.start)) / 86_400_000;
    if (days < 350 || days > 380) continue; // 연간 수치만 (분기 누적 제외)
    const prev = byEnd.get(f.end);
    if (!prev || f.filed > prev.filed) byEnd.set(f.end, f);
  }
  return [...byEnd.values()]
    .sort((a, b) => a.end.localeCompare(b.end))
    .map((f) => ({ periodEnd: f.end, value: f.val }));
}

/** 최근 회계연도 희석 EPS(오래된 순). 미국 상장사가 아니거나 응답이 없으면 빈 배열. */
export async function getAnnualEps(ticker: string, years = 4): Promise<AnnualEps[]> {
  try {
    const cik = await cikOf(ticker);
    if (!cik) return [];
    for (const tag of ["EarningsPerShareDiluted", "EarningsPerShareBasicAndDiluted"]) {
      const res = await fetch(`https://data.sec.gov/api/xbrl/companyconcept/CIK${cik}/us-gaap/${tag}.json`, {
        headers: HEADERS,
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;
      const facts: Fact[] = (await res.json())?.units?.["USD/shares"] ?? [];
      const annual = annualFromFacts(facts);
      if (annual.length) return annual.slice(-years);
    }
    return [];
  } catch {
    return [];
  }
}

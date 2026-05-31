import type { Valuation } from "@/lib/types";

export async function getValuation(ticker: string, apiKey: string): Promise<Valuation> {
  const empty: Valuation = { per: null, psr: null, pbr: null, roe: null };
  if (!apiKey) return empty;
  try {
    const url = `https://finnhub.io/api/v1/stock/metric?metric=all&symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return empty;
    const m = (await res.json())?.metric ?? {};
    const pick = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      per: pick(m.peTTM ?? m.peBasicExclExtraTTM),
      psr: pick(m.psTTM),
      pbr: pick(m.pbAnnual ?? m.pbQuarterly),
      roe: pick(m.roeTTM),
    };
  } catch {
    return empty;
  }
}

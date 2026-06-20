import { resolveKrName } from "@/lib/krStocks";

export type SymbolMatch = { symbol: string; name: string; exchange: string };

const isKrSymbol = (s: string) => /\.(KS|KQ)$/i.test(s);

export function filterByMarket(matches: SymbolMatch[], market: "US" | "KR"): SymbolMatch[] {
  return matches.filter((m) => (market === "KR" ? isKrSymbol(m.symbol) : !isKrSymbol(m.symbol)));
}

async function fetchYahoo(q: string): Promise<SymbolMatch[]> {
  for (const base of ["https://query2.finance.yahoo.com", "https://query1.finance.yahoo.com"]) {
    try {
      const url = `${base}/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=8&newsCount=0`;
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, cache: "no-store" });
      if (!res.ok) continue;
      const json = await res.json();
      const quotes: unknown[] = json?.quotes ?? [];
      const out = quotes
        .map((x) => x as { symbol?: string; shortname?: string; longname?: string; quoteType?: string; exchDisp?: string; exchange?: string })
        .filter((x) => x.symbol && (x.quoteType === "EQUITY" || x.quoteType === "ETF"))
        .map((x) => ({ symbol: x.symbol as string, name: x.shortname || x.longname || (x.symbol as string), exchange: x.exchDisp || x.exchange || "" }));
      if (out.length) return out;
    } catch {
      // try next base
    }
  }
  return [];
}

export async function searchSymbols(query: string, market: "US" | "KR" = "US"): Promise<SymbolMatch[]> {
  const q = query.trim();
  if (!q) return [];
  const yahoo = filterByMarket(await fetchYahoo(q), market);
  if (market === "KR") {
    const mapped = resolveKrName(q);
    const seen = new Set(mapped.map((m) => m.symbol));
    return [...mapped, ...yahoo.filter((m) => !seen.has(m.symbol))].slice(0, 8);
  }
  return yahoo;
}

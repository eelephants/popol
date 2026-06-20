export type SymbolMatch = { symbol: string; name: string; exchange: string };

export async function searchSymbols(query: string): Promise<SymbolMatch[]> {
  const q = query.trim();
  if (!q) return [];
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

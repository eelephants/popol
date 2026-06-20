export type Quote = {
  price: number; previousClose: number; volume: number;
  high52: number; low52: number; marketTime: number;
};
export type DailyHistory = { closes: number[]; volumes: number[] };
export type YahooData = { quote: Quote; history: DailyHistory };

const CHART_BASES = [
  "https://query2.finance.yahoo.com",
  "https://query1.finance.yahoo.com",
];

/** Yahoo v8 chart endpoint: one call returns live quote (meta) + daily history.
 *  Server-side only (no CORS from browser). Keyless, no crumb on the chart route. */
export async function getYahooData(ticker: string): Promise<YahooData | null> {
  for (const base of CHART_BASES) {
    try {
      const url = `${base}/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store", // live price + never cache a transient 429 failure
      });
      if (!res.ok) continue;
      const json = await res.json();
      const result = json?.chart?.result?.[0];
      const meta = result?.meta;
      if (meta?.regularMarketPrice == null) continue;
      const q = result?.indicators?.quote?.[0] ?? {};
      const rawCloses: (number | null)[] = q.close ?? [];
      const rawVolumes: (number | null)[] = q.volume ?? [];
      const closes: number[] = [];
      const volumes: number[] = [];
      for (let i = 0; i < rawCloses.length; i++) {
        if (rawCloses[i] == null) continue; // keep close & volume aligned to the same trading day
        closes.push(rawCloses[i] as number);
        volumes.push((rawVolumes[i] ?? 0) as number);
      }
      const price: number = meta.regularMarketPrice;
      const quote: Quote = {
        price,
        previousClose: meta.previousClose ?? closes[closes.length - 2] ?? price,
        volume: meta.regularMarketVolume ?? volumes[volumes.length - 1] ?? 0,
        high52: meta.fiftyTwoWeekHigh ?? (closes.length ? Math.max(...closes.slice(-252), price) : price),
        low52: meta.fiftyTwoWeekLow ?? (closes.length ? Math.min(...closes.slice(-252), price) : price),
        marketTime: meta.regularMarketTime ? meta.regularMarketTime * 1000 : Date.now(),
      };
      return { quote, history: { closes, volumes } };
    } catch {
      // try next base
    }
  }
  return null;
}

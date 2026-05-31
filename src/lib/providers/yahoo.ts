// yahoo-finance2 v2.14.0: the static `quote` this-context doesn't satisfy
// `ModuleThis` in its own type declarations. Casting to `any` is the minimal
// fix — runtime behaviour is identical.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import _yahooFinance from "yahoo-finance2";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const yf = _yahooFinance as any;

export type Quote = {
  price: number; previousClose: number; volume: number;
  high52: number; low52: number; marketTime: number;
};
export type DailyHistory = { closes: number[]; volumes: number[] };

export async function getQuote(ticker: string): Promise<Quote | null> {
  try {
    const q = await yf.quote(ticker);
    if (q?.regularMarketPrice == null) return null;
    return {
      price: q.regularMarketPrice,
      previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
      volume: q.regularMarketVolume ?? 0,
      high52: q.fiftyTwoWeekHigh ?? q.regularMarketPrice,
      low52: q.fiftyTwoWeekLow ?? q.regularMarketPrice,
      marketTime: q.regularMarketTime ? new Date(q.regularMarketTime).getTime() : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getDailyHistory(ticker: string): Promise<DailyHistory | null> {
  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 2);
    const chart = await yf.chart(ticker, { period1, interval: "1d" });
    const quotes = chart?.quotes ?? [];
    const closes = quotes.map((c: { close: unknown }) => c.close).filter((v: unknown): v is number => v != null);
    const volumes = quotes.map((c: { volume: unknown }) => c.volume).filter((v: unknown): v is number => v != null);
    if (closes.length === 0) return null;
    return { closes, volumes };
  } catch {
    return null;
  }
}

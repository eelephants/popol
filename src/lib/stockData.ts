import { cache } from "react";
import { getYahooData } from "@/lib/providers/yahoo";
import { getValuation } from "@/lib/providers/finnhub";
import { getUsdKrw } from "@/lib/providers/macro";
import { enrichStock } from "@/lib/enrich";
import { DEFAULT_THRESHOLDS, type EnrichedStock, type WatchlistItem } from "@/lib/types";

/** Server-side single-stock fetch + enrichment, shared by /api/stock and
 *  the /stock/[ticker] page. Wrapped in React cache() so generateMetadata and
 *  the page component dedupe to one fetch per request. Returns null if no data. */
export const getEnrichedStock = cache(
  async (rawTicker: string, name?: string): Promise<EnrichedStock | null> => {
    const ticker = rawTicker.trim().toUpperCase();
    if (!ticker) return null;
    const finnhubKey = process.env.FINNHUB_API_KEY ?? "";
    const [yahoo, valuation, usdKrw] = await Promise.all([
      getYahooData(ticker),
      getValuation(ticker, finnhubKey),
      getUsdKrw(),
    ]);
    if (!yahoo) return null;
    const item: WatchlistItem = {
      ticker,
      name: name || ticker,
      buyThesis: "",
      sellRisk: "",
      theme: { aiInfra: false, trump: false, tariff: false },
      highOverride: null,
    };
    return enrichStock(item, {
      quote: yahoo.quote,
      history: yahoo.history,
      valuation,
      usdKrw,
      thresholds: DEFAULT_THRESHOLDS,
      isStale: false,
    });
  },
);

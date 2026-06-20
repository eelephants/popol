import type { EnrichedStock, WatchlistItem, Valuation, ValuationThresholds } from "@/lib/types";
import type { Quote, DailyHistory } from "@/lib/providers/yahoo";
import { rsi14, sma, crossState, crossFreshDays, range52w, volumeSpike, disparity, maSignal } from "@/lib/indicators";
import { buildZones, nearestUnreachedZone, zoneStatusOf, drawdownPct } from "@/lib/buyzones";
import { themeScore, valuationBadges } from "@/lib/scoring";

export type EnrichInput = {
  quote: Quote | null;
  history: DailyHistory | null;
  valuation: Valuation;
  usdKrw: number | null;
  thresholds: ValuationThresholds;
  isStale: boolean;
};

export function enrichStock(item: WatchlistItem, d: EnrichInput): EnrichedStock {
  const price = d.quote?.price ?? null;
  const changePct =
    d.quote && d.quote.previousClose
      ? ((d.quote.price - d.quote.previousClose) / d.quote.previousClose) * 100
      : null;
  const high = item.highOverride ?? d.quote?.high52 ?? price ?? 0;
  const highSource: "sheet" | "52w" = item.highOverride != null ? "sheet" : "52w";

  const zones = price != null && high > 0 ? buildZones(high, price) : [];
  const nearestUnreached = price != null ? nearestUnreachedZone(zones, price) : null;
  const zoneStatus = price != null ? zoneStatusOf(zones, price) : "unknown";

  const closes = d.history?.closes ?? [];
  const volumes = d.history?.volumes ?? [];
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const disparity50 = disparity(price, sma50);
  const disparity200 = disparity(price, sma200);

  return {
    ticker: item.ticker, name: item.name,
    price, priceKrw: price != null && d.usdKrw != null ? price * d.usdKrw : null, changePct, isStale: d.isStale,
    high, highSource,
    zones, nearestUnreached, zoneStatus,
    drawdownPct: price != null && high > 0 ? drawdownPct(high, price) : 0,
    rsi14: rsi14(closes),
    sma50, sma200,
    crossState: crossState(sma50, sma200),
    crossFreshDays: closes.length >= 200 ? crossFreshDays(closes) : null,
    disparity50, disparity200,
    signal50: maSignal(disparity50), signal200: maSignal(disparity200),
    range52wPct: d.quote ? range52w(d.quote.price, d.quote.low52, d.quote.high52) : null,
    volumeSpike: d.quote && volumes.length > 1 ? volumeSpike(d.quote.volume, volumes.slice(-21, -1)) : null,
    valuation: d.valuation,
    valuationBadges: valuationBadges(d.valuation, d.thresholds),
    buyThesis: item.buyThesis, sellRisk: item.sellRisk, theme: item.theme,
    score: themeScore(item.theme),
  };
}

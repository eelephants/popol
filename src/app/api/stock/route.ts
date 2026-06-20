import { NextResponse } from "next/server";
import { getYahooData } from "@/lib/providers/yahoo";
import { getValuation } from "@/lib/providers/finnhub";
import { getUsdKrw } from "@/lib/providers/macro";
import { enrichStock } from "@/lib/enrich";
import { DEFAULT_THRESHOLDS, type WatchlistItem } from "@/lib/types";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ticker = (params.get("ticker") ?? "").trim().toUpperCase();
  const name = params.get("name") ?? ticker;
  if (!ticker) return NextResponse.json({ error: "ticker required", stock: null }, { status: 400 });

  const finnhubKey = process.env.FINNHUB_API_KEY ?? "";
  const [yahoo, valuation, usdKrw] = await Promise.all([
    getYahooData(ticker),
    getValuation(ticker, finnhubKey),
    getUsdKrw(),
  ]);
  if (!yahoo) return NextResponse.json({ error: `no data for ${ticker}`, stock: null }, { status: 404 });

  const item: WatchlistItem = {
    ticker,
    name: name || ticker,
    buyThesis: "",
    sellRisk: "",
    theme: { aiInfra: false, trump: false, tariff: false },
    highOverride: null,
  };
  const stock = enrichStock(item, {
    quote: yahoo.quote,
    history: yahoo.history,
    valuation,
    usdKrw,
    thresholds: DEFAULT_THRESHOLDS,
    isStale: false,
  });
  return NextResponse.json({ stock, updatedAt: Date.now() });
}

import { NextResponse } from "next/server";
import { fetchWatchlistConfig } from "@/lib/sheet";
import { getYahooData } from "@/lib/providers/yahoo";
import { getValuation } from "@/lib/providers/finnhub";
import { getUsdKrw } from "@/lib/providers/macro";
import { enrichStock } from "@/lib/enrich";

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return NextResponse.json({ error: "GOOGLE_SHEET_ID not set", stocks: [] }, { status: 500 });
    }
    const gid = process.env.GOOGLE_SHEET_GID ?? "0";
    const finnhubKey = process.env.FINNHUB_API_KEY ?? "";

    const [config, usdKrw] = await Promise.all([fetchWatchlistConfig(sheetId, gid), getUsdKrw()]);

    const stocks = await Promise.all(
      config.items.map(async (item) => {
        const [yahoo, valuation] = await Promise.all([
          getYahooData(item.ticker),
          getValuation(item.ticker, finnhubKey),
        ]);
        return enrichStock(item, {
          quote: yahoo?.quote ?? null,
          history: yahoo?.history ?? null,
          valuation,
          usdKrw,
          thresholds: config.thresholds,
          isStale: yahoo == null,
        });
      }),
    );

    return NextResponse.json({ stocks, updatedAt: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e), stocks: [] }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { getCnnSentiment, getHySpreadPath } from "@/lib/providers/macro";
import { getYahooData } from "@/lib/providers/yahoo";
import { sma, rsi14, disparity } from "@/lib/indicators";

export type MarketReaderData = {
  putCall: number | null;
  vix: number | null;
  hy: { latest: number; low1y: number; peak3m: number } | null;
  spx: { price: number; disparity200: number | null; rsi: number | null } | null;
  updatedAt: number;
};

/** 역발상·차트 판독기의 자동 지표. 각 소스는 따로 실패할 수 있어 null로 비워 둔다. */
export async function GET() {
  const fredKey = process.env.FRED_API_KEY ?? "";
  const [cnn, hy, spx] = await Promise.all([
    getCnnSentiment(),
    getHySpreadPath(fredKey).catch(() => null),
    getYahooData("^GSPC").catch(() => null),
  ]);
  const closes = spx?.history.closes ?? [];
  const data: MarketReaderData = {
    putCall: cnn.putCall,
    vix: cnn.vix,
    hy,
    spx: spx
      ? {
          price: spx.quote.price,
          disparity200: disparity(spx.quote.price, sma(closes, 200)),
          rsi: rsi14(closes),
        }
      : null,
    updatedAt: Date.now(),
  };
  return NextResponse.json(data);
}

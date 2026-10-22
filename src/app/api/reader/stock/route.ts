import { NextResponse } from "next/server";
import { getYahooData } from "@/lib/providers/yahoo";
import { getAnnualEps, type AnnualEps } from "@/lib/providers/sec";
import { getValuation } from "@/lib/providers/finnhub";

export type StockReaderData = {
  ticker: string;
  market: "US" | "KR";
  price: number;
  eps: AnnualEps[];
  pe: number | null;
  peSource: "finnhub" | "eps" | null;
};

/** 적정주가 계산기 자동 입력값: 현재가, 최근 4개 회계연도 희석 EPS(SEC), 종목 P/E.
 *  향후 EPS 추정치와 장기 성장률은 무료 소스가 없어 사용자가 넣는다. */
export async function GET(req: Request) {
  const ticker = (new URL(req.url).searchParams.get("ticker") ?? "").trim().toUpperCase();
  if (!ticker) return NextResponse.json({ error: "ticker required" }, { status: 400 });

  const isKr = /\.(KS|KQ)$/i.test(ticker);
  const finnhubKey = process.env.FINNHUB_API_KEY ?? "";
  const [yahoo, eps, valuation] = await Promise.all([
    getYahooData(ticker).catch((e) => {
      console.error(e);
      return undefined;
    }),
    isKr ? Promise.resolve([]) : getAnnualEps(ticker),
    isKr ? Promise.resolve(null) : getValuation(ticker, finnhubKey),
  ]);
  if (yahoo === undefined)
    return NextResponse.json({ error: "시세 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도하세요." }, { status: 503 });
  if (!yahoo) return NextResponse.json({ error: `no data for ${ticker}` }, { status: 404 });

  const price = yahoo.quote.price;
  const lastEps = eps[eps.length - 1]?.value ?? null;
  const pe = valuation?.per ?? (lastEps != null && lastEps > 0 ? price / lastEps : null);
  const data: StockReaderData = {
    ticker,
    market: yahoo.quote.currency === "KRW" ? "KR" : "US",
    price,
    eps,
    pe,
    peSource: valuation?.per != null ? "finnhub" : pe != null ? "eps" : null,
  };
  return NextResponse.json(data);
}

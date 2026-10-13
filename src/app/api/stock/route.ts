import { NextResponse } from "next/server";
import { getEnrichedStock } from "@/lib/stockData";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ticker = (params.get("ticker") ?? "").trim().toUpperCase();
  const name = params.get("name") ?? ticker;
  if (!ticker) return NextResponse.json({ error: "ticker required", stock: null }, { status: 400 });

  const stock = await getEnrichedStock(ticker, name).catch((e) => {
    console.error(e); // Yahoo outage, or a real bug — don't hide it behind the 503
    return undefined;
  });
  if (stock === undefined)
    return NextResponse.json({ error: "시세 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도하세요.", stock: null }, { status: 503 });
  if (!stock) return NextResponse.json({ error: `no data for ${ticker}`, stock: null }, { status: 404 });
  return NextResponse.json({ stock, updatedAt: Date.now() });
}

import { NextResponse } from "next/server";
import { getEnrichedStock } from "@/lib/stockData";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const ticker = (params.get("ticker") ?? "").trim().toUpperCase();
  const name = params.get("name") ?? ticker;
  if (!ticker) return NextResponse.json({ error: "ticker required", stock: null }, { status: 400 });

  const stock = await getEnrichedStock(ticker, name);
  if (!stock) return NextResponse.json({ error: `no data for ${ticker}`, stock: null }, { status: 404 });
  return NextResponse.json({ stock, updatedAt: Date.now() });
}

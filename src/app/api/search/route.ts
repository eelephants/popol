import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/providers/search";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q") ?? "";
  const market = params.get("market") === "KR" ? "KR" : "US";
  const matches = await searchSymbols(q, market);
  return NextResponse.json({ matches });
}

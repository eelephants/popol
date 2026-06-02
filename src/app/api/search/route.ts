import { NextResponse } from "next/server";
import { searchSymbols } from "@/lib/providers/search";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const matches = await searchSymbols(q);
  return NextResponse.json({ matches });
}

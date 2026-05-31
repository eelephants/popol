import { NextResponse } from "next/server";
import { getTenYearYield, getHySpread, getFearGreed, getUsdKrw } from "@/lib/providers/macro";
import { macroRegime } from "@/lib/scoring";
import type { MacroData } from "@/lib/types";

export async function GET() {
  const fredKey = process.env.FRED_API_KEY ?? "";
  const [tenYear, hy, fg, usdKrw] = await Promise.all([
    getTenYearYield(fredKey),
    getHySpread(fredKey),
    getFearGreed(),
    getUsdKrw(),
  ]);
  const regime = fg ? macroRegime(fg.score, tenYear, hy?.value ?? null, hy?.percentile1y ?? null) : null;
  const data: MacroData = {
    fearGreed: fg,
    tenYearYield: tenYear,
    hySpread: hy?.value ?? null,
    usdKrw,
    regime,
  };
  return NextResponse.json(data);
}

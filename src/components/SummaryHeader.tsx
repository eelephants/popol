import type { EnrichedStock, MacroData } from "@/lib/types";
import { usSession } from "@/lib/marketHours";

export function SummaryHeader({ stocks, macro }: { stocks: EnrichedStock[]; macro: MacroData | null }) {
  const inZone = stocks.filter((s) => s.zoneStatus === "in-zone").length;
  const oversold = stocks.filter((s) => s.rsi14 != null && s.rsi14 < 30).length;
  const session = usSession(Date.now());
  const movers = stocks.filter((s) => s.changePct != null);
  const topMover = movers.length
    ? movers.reduce((a, b) => (Math.abs(b.changePct!) > Math.abs(a.changePct!) ? b : a))
    : null;
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <p className="text-sm">
        매수존 <b className="text-green-600">{inZone}</b>개 · RSI&lt;30 <b className="text-red-500">{oversold}</b>개
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        미국장 {session.label}
        {macro?.fearGreed && <> · 공포탐욕 {macro.fearGreed.score} ({macro.fearGreed.rating})</>}
      </p>
      {topMover && (
        <p className="mt-1 text-xs text-zinc-500">
          오늘의 무버: {topMover.ticker}{" "}
          <b className={topMover.changePct! >= 0 ? "text-green-600" : "text-red-500"}>
            {topMover.changePct! >= 0 ? "+" : ""}{topMover.changePct!.toFixed(2)}%
          </b>
        </p>
      )}
      {macro?.regime && (
        <p className="mt-1 text-xs text-zinc-500">
          레짐: {macro.regime.regime} · 활성 매수존 {macro.regime.activeZones.map((z) => `-${z}%`).join(", ")}
        </p>
      )}
    </header>
  );
}

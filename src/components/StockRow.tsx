import type { EnrichedStock } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  "in-zone": "bg-green-500 text-white",
  near: "bg-amber-400 text-black",
  far: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  unknown: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800",
};

function zoneLabel(s: EnrichedStock): string {
  const reached = s.zones.filter((z) => z.reached);
  if (reached.length) return `-${reached[reached.length - 1].pct}% 존 진입`;
  if (s.nearestUnreached) return `-${s.nearestUnreached.pct}%존까지 ${s.nearestUnreached.distancePct.toFixed(1)}%`;
  return "—";
}

export function StockRow({ stock, onClick }: { stock: EnrichedStock; onClick?: () => void }) {
  const rsiLow = stock.rsi14 != null && stock.rsi14 < 30;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-3 text-left dark:border-zinc-800"
    >
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[stock.zoneStatus]}`}>
        {zoneLabel(stock)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{stock.name}</span>
        <span className="block text-xs text-zinc-500">{stock.ticker}</span>
      </span>
      <span className="text-right">
        <span className={`block tabular-nums ${stock.isStale ? "opacity-40" : ""}`} title={stock.isStale ? "지연/오프라인 데이터" : undefined}>
          {stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}
        </span>
        {stock.changePct != null && (
          <span className={`block text-xs ${stock.changePct >= 0 ? "text-green-600" : "text-red-500"}`}>
            {stock.changePct >= 0 ? "+" : ""}{stock.changePct.toFixed(2)}%
          </span>
        )}
        <span className="flex items-center justify-end gap-1 text-xs">
          {stock.rsi14 != null && (
            <span className={rsiLow ? "font-semibold text-red-500" : "text-zinc-500"}>RSI {stock.rsi14.toFixed(0)}</span>
          )}
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-500">점수 {stock.score}</span>
        </span>
      </span>
    </button>
  );
}

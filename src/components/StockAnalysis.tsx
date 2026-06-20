import type { EnrichedStock, MaSignalLevel } from "@/lib/types";
import { BuyZoneLadder } from "./BuyZoneLadder";
import { RsiGauge } from "./RsiGauge";
import { ValuationBadges } from "./ValuationBadges";

const SIGNAL_DISPLAY: Record<MaSignalLevel, { emoji: string; label: string; className: string }> = {
  "strong-overheated": { emoji: "🔴", label: "강과열 · 매도 고려", className: "text-red-500" },
  "overheated": { emoji: "🟠", label: "과열", className: "text-orange-500" },
  "weak-overheated": { emoji: "🟡", label: "약과열", className: "text-amber-500" },
  "normal": { emoji: "🟢", label: "정상", className: "text-green-600" },
  "weak-oversold": { emoji: "🟡", label: "약과매도", className: "text-amber-500" },
  "oversold": { emoji: "🟠", label: "과매도", className: "text-orange-500" },
  "strong-oversold": { emoji: "🔴", label: "강과매도 · 매수 고려", className: "text-red-500" },
};

function SignalRow({
  label, sma, disparity, signal,
}: {
  label: string; sma: number | null; disparity: number | null; signal: MaSignalLevel | null;
}) {
  if (sma == null) return null;
  const sig = signal ? SIGNAL_DISPLAY[signal] : null;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-zinc-500">
      <span>{label}</span>
      <span className="tabular-nums">{sma.toFixed(2)}</span>
      {disparity != null && (
        <span className="tabular-nums">
          {disparity >= 0 ? "+" : ""}
          {disparity.toFixed(2)}%
        </span>
      )}
      {sig && <span className={`font-medium ${sig.className}`}>{sig.emoji} {sig.label}</span>}
    </div>
  );
}

function zoneChip(stock: EnrichedStock): string {
  const reached = stock.zones.filter((z) => z.reached);
  if (reached.length) return `-${reached[reached.length - 1].pct}% 존 진입`;
  if (stock.nearestUnreached) return `-${stock.nearestUnreached.pct}%존까지 ${stock.nearestUnreached.distancePct.toFixed(1)}%`;
  return "—";
}

export function StockAnalysis({ stock }: { stock: EnrichedStock }) {
  const status = stock.zoneStatus;
  const chipStyle =
    status === "in-zone"
      ? "bg-green-500 text-white"
      : status === "near"
        ? "bg-amber-400 text-black"
        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400";
  return (
    <div className="mx-3 my-2 space-y-4 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-bold">
            {stock.name} <span className="text-sm text-zinc-500">{stock.ticker}</span>
          </h2>
          {stock.price != null && (
            <p className="mt-0.5">
              {stock.market === "KR" ? (
                <span className="text-lg font-semibold tabular-nums">₩{Math.round(stock.price).toLocaleString()}</span>
              ) : (
                <span className="text-lg font-semibold tabular-nums">${stock.price.toFixed(2)}</span>
              )}
              {stock.changePct != null && (
                <span className={`ml-2 text-sm ${stock.changePct >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {stock.changePct >= 0 ? "+" : ""}
                  {stock.changePct.toFixed(2)}%
                </span>
              )}
              {stock.market === "US" && stock.priceKrw != null && (
                <span className="ml-2 text-sm text-zinc-500">₩{Math.round(stock.priceKrw).toLocaleString()}</span>
              )}
            </p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${chipStyle}`}>{zoneChip(stock)}</span>
      </div>

      <BuyZoneLadder stock={stock} />

      <div className="grid grid-cols-2 gap-3 text-xs">
        <RsiGauge rsi={stock.rsi14} />
        <div className="space-y-0.5">
          <div className="text-zinc-500">추세</div>
          <div className="font-medium">
            {stock.crossState === "golden" ? "골든크로스 영역" : stock.crossState === "death" ? "데드크로스 영역" : "—"}
            {stock.crossFreshDays != null && ` (${stock.crossFreshDays}일 전 교차)`}
          </div>
          <SignalRow label="단기(50일)" sma={stock.sma50} disparity={stock.disparity50} signal={stock.signal50} />
          <SignalRow label="장기(200일)" sma={stock.sma200} disparity={stock.disparity200} signal={stock.signal200} />
          {stock.range52wPct != null && <div className="text-zinc-500">52주 위치 {stock.range52wPct.toFixed(0)}%</div>}
          {stock.volumeSpike != null && (
            <div className={stock.volumeSpike >= 1.5 ? "text-amber-600" : "text-zinc-500"}>거래량 {stock.volumeSpike.toFixed(1)}배</div>
          )}
        </div>
      </div>

      {stock.market === "US" && <ValuationBadges stock={stock} />}
    </div>
  );
}

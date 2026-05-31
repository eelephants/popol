"use client";
import type { EnrichedStock } from "@/lib/types";
import { BuyZoneLadder } from "./BuyZoneLadder";
import { RsiGauge } from "./RsiGauge";
import { ValuationBadges } from "./ValuationBadges";

export function StockDetailCard({ stock, onClose }: { stock: EnrichedStock; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-bold">{stock.name} <span className="text-sm text-zinc-500">{stock.ticker}</span></h2>
            {stock.price != null && (
              <p className="tabular-nums">
                ${stock.price.toFixed(2)}
                {stock.priceKrw != null && <span className="ml-2 text-sm text-zinc-500">₩{Math.round(stock.priceKrw).toLocaleString()}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400">닫기</button>
        </div>

        <section className="mb-4"><BuyZoneLadder stock={stock} /></section>

        <section className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <RsiGauge rsi={stock.rsi14} />
          <div>
            <div className="text-zinc-500">추세</div>
            <div className="font-medium">
              {stock.crossState === "golden" ? "골든크로스 영역" : stock.crossState === "death" ? "데드크로스 영역" : "—"}
              {stock.crossFreshDays != null && ` (${stock.crossFreshDays}일 전 교차)`}
            </div>
            {stock.range52wPct != null && <div className="text-zinc-500">52주 위치 {stock.range52wPct.toFixed(0)}%</div>}
            {stock.volumeSpike != null && stock.volumeSpike >= 1.5 && (
              <div className="text-amber-600">거래량 {stock.volumeSpike.toFixed(1)}배</div>
            )}
          </div>
        </section>

        <section className="mb-4"><ValuationBadges stock={stock} /></section>

        <section className="text-sm">
          <p><span className="text-zinc-500">매수논리:</span> {stock.buyThesis}</p>
          <p><span className="text-zinc-500">리스크:</span> {stock.sellRisk}</p>
          <div className="mt-2 flex gap-1">
            {stock.theme.aiInfra && <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">AI인프라</span>}
            {stock.theme.trump && <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">트럼프</span>}
            {stock.theme.tariff && <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">관세피난처</span>}
            <span className="ml-auto text-xs text-zinc-500">점수 {stock.score}/3</span>
          </div>
        </section>
      </div>
    </div>
  );
}

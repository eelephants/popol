"use client";
import { useState } from "react";
import type { EnrichedStock } from "@/lib/types";
import { StockRow } from "./StockRow";

type Sort = "distance" | "score" | "rsi";

function distanceKey(s: EnrichedStock): number {
  if (s.zones.some((z) => z.reached)) return -Infinity;
  return s.nearestUnreached?.distancePct ?? Infinity;
}

export function StockList({ stocks, onSelect }: { stocks: EnrichedStock[]; onSelect: (s: EnrichedStock) => void }) {
  const [sort, setSort] = useState<Sort>("distance");
  const sorted = [...stocks].sort((a, b) => {
    if (sort === "score") return b.score - a.score;
    if (sort === "rsi") return (a.rsi14 ?? 999) - (b.rsi14 ?? 999);
    return distanceKey(a) - distanceKey(b);
  });
  return (
    <div>
      <div className="flex gap-2 px-3 py-2 text-xs">
        {(["distance", "score", "rsi"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-full px-3 py-1 ${sort === s ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            {s === "distance" ? "매수존 거리" : s === "score" ? "점수" : "RSI"}
          </button>
        ))}
      </div>
      {sorted.map((s) => (
        <StockRow key={s.ticker} stock={s} onClick={() => onSelect(s)} />
      ))}
    </div>
  );
}

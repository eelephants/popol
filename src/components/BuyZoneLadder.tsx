import type { EnrichedStock } from "@/lib/types";

export function BuyZoneLadder({ stock }: { stock: EnrichedStock }) {
  const rows = [
    { label: `고점 (${stock.highSource === "sheet" ? "시트" : "52주"})`, price: stock.high, marker: false },
    ...stock.zones.map((z) => ({ label: `-${z.pct}%`, price: z.price, marker: z.reached })),
  ];
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">{r.label}</span>
          <span className={`tabular-nums ${r.marker ? "font-semibold text-green-600" : ""}`}>
            ${r.price.toFixed(2)} {r.marker && "✓"}
          </span>
        </div>
      ))}
      {stock.price != null && (
        <div className="mt-1 flex items-center justify-between border-t border-zinc-200 pt-1 text-sm dark:border-zinc-800">
          <span className="font-medium">현재가</span>
          <span className="tabular-nums font-semibold">
            ${stock.price.toFixed(2)} <span className="text-xs text-red-500">(-{stock.drawdownPct.toFixed(1)}%)</span>
          </span>
        </div>
      )}
    </div>
  );
}

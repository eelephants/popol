import type { EnrichedStock, BadgeState } from "@/lib/types";

const STYLE: Record<BadgeState, string> = {
  pass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  fail: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  na: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800",
};

export function ValuationBadges({ stock }: { stock: EnrichedStock }) {
  const entries: [string, BadgeState, number | null][] = [
    ["PER", stock.valuationBadges.per, stock.valuation.per],
    ["PSR", stock.valuationBadges.psr, stock.valuation.psr],
    ["PBR", stock.valuationBadges.pbr, stock.valuation.pbr],
    ["ROE", stock.valuationBadges.roe, stock.valuation.roe],
  ];
  const pass = entries.filter(([, b]) => b === "pass").length;
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-500">밸류에이션 {pass}/4 통과</div>
      <div className="flex flex-wrap gap-1">
        {entries.map(([k, b, v]) => (
          <span key={k} className={`rounded px-2 py-1 text-xs ${STYLE[b]}`}>
            {k} {v != null ? v.toFixed(1) : "n/a"}
          </span>
        ))}
      </div>
    </div>
  );
}

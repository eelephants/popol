import type { EnrichedStock } from "@/lib/types";

export function ThemeConcentration({ stocks }: { stocks: EnrichedStock[] }) {
  const total = stocks.length || 1;
  const counts = {
    AI인프라: stocks.filter((s) => s.theme.aiInfra).length,
    트럼프: stocks.filter((s) => s.theme.trump).length,
    관세피난처: stocks.filter((s) => s.theme.tariff).length,
  };
  return (
    <div className="mx-3 my-2 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="mb-2 font-medium">테마 집중도</div>
      {Object.entries(counts).map(([k, c]) => (
        <div key={k} className="mb-1">
          <div className="flex justify-between text-xs"><span>{k}</span><span>{c}/{total}</span></div>
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(c / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

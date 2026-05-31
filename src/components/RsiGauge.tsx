export function RsiGauge({ rsi }: { rsi: number | null }) {
  if (rsi == null) return <span className="text-xs text-zinc-400">RSI n/a</span>;
  const color = rsi < 30 ? "bg-red-500" : rsi > 70 ? "bg-amber-500" : "bg-zinc-400";
  return (
    <div className="text-xs">
      <div className="mb-1 flex justify-between"><span>RSI(14)</span><span className="font-semibold">{rsi.toFixed(0)}</span></div>
      <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, rsi))}%` }} />
      </div>
    </div>
  );
}

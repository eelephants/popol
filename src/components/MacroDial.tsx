import type { MacroData } from "@/lib/types";

export function MacroDial({ macro }: { macro: MacroData | null }) {
  if (!macro?.regime) return null;
  const r = macro.regime;
  return (
    <div className="mx-3 my-2 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="font-medium">매크로 레짐</span>
        <span className="rounded-full bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-black">{r.regime}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{r.note}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div><div className="text-zinc-500">공포탐욕</div><div className="font-semibold">{r.fng}</div></div>
        <div><div className="text-zinc-500">10년물</div><div className="font-semibold">{r.tenYear?.toFixed(2) ?? "—"}%</div></div>
        <div><div className="text-zinc-500">HY 스프레드</div><div className="font-semibold">{r.hySpread?.toFixed(2) ?? "—"}{r.hySpreadPercentile != null && ` (${r.hySpreadPercentile.toFixed(0)}%)`}</div></div>
      </div>
    </div>
  );
}

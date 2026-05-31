"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EnrichedStock, MacroData } from "@/lib/types";
import { SummaryHeader } from "@/components/SummaryHeader";
import { StockList } from "@/components/StockList";
import { StockDetailCard } from "@/components/StockDetailCard";
import { MacroDial } from "@/components/MacroDial";
import { ThemeConcentration } from "@/components/ThemeConcentration";

export default function Page() {
  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [selected, setSelected] = useState<EnrichedStock | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const prevInZone = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [w, m] = await Promise.all([
      fetch("/api/watchlist").then((r) => r.json()),
      fetch("/api/macro").then((r) => r.json()).catch(() => null),
    ]);
    const next: EnrichedStock[] = w.stocks ?? [];
    const nowInZone = new Set(next.filter((s) => s.zoneStatus === "in-zone").map((s) => s.ticker));
    const fresh = [...nowInZone].filter((t) => !prevInZone.current.has(t));
    if (prevInZone.current.size > 0 && fresh.length > 0) setToast(`${fresh.join(", ")} 매수존 진입!`);
    prevInZone.current = nowInZone;
    setStocks(next);
    setMacro(m);
    setUpdatedAt(w.updatedAt ?? Date.now());
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <main className="mx-auto max-w-md pb-10">
      <SummaryHeader stocks={stocks} macro={macro} />
      <MacroDial macro={macro} />
      <StockList stocks={stocks} onSelect={setSelected} />
      <ThemeConcentration stocks={stocks} />
      <div className="px-3 py-4 text-center text-xs text-zinc-400">
        <button onClick={load} className="rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700">새로고침</button>
        {updatedAt && <p className="mt-2">갱신 {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(updatedAt)} KST</p>}
      </div>
      {selected && <StockDetailCard stock={selected} onClose={() => setSelected(null)} />}
      {toast && (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto w-fit rounded-full bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}

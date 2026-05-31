"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EnrichedStock, MacroData } from "@/lib/types";
import { SummaryHeader } from "@/components/SummaryHeader";
import { StockList } from "@/components/StockList";
import { StockDetailCard } from "@/components/StockDetailCard";
import { MacroDial } from "@/components/MacroDial";
import { ThemeConcentration } from "@/components/ThemeConcentration";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Page() {
  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [selected, setSelected] = useState<EnrichedStock | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prevInZone = useRef<Set<string>>(new Set());
  const prevOversold = useRef<Set<string>>(new Set());
  const pullStart = useRef(-1);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const [w, m] = await Promise.all([
        fetch("/api/watchlist").then((r) => r.json()),
        fetch("/api/macro").then((r) => r.json()).catch(() => null),
      ]);
      const next: EnrichedStock[] = w?.stocks ?? [];
      setError(w?.error ? "데이터를 불러오지 못했습니다" : next.length === 0 ? "표시할 종목이 없습니다" : null);
      const nowInZone = new Set(next.filter((s) => s.zoneStatus === "in-zone").map((s) => s.ticker));
      const nowOversold = new Set(next.filter((s) => s.rsi14 != null && s.rsi14 < 30).map((s) => s.ticker));
      const freshZone = [...nowInZone].filter((t) => !prevInZone.current.has(t));
      const freshOversold = [...nowOversold].filter((t) => !prevOversold.current.has(t));
      if (prevInZone.current.size > 0 || prevOversold.current.size > 0) {
        const msgs: string[] = [];
        if (freshZone.length) msgs.push(`${freshZone.join(", ")} 매수존 진입!`);
        if (freshOversold.length) msgs.push(`${freshOversold.join(", ")} RSI<30 (과매도)`);
        if (msgs.length) setToast(msgs.join(" · "));
      }
      prevInZone.current = nowInZone;
      prevOversold.current = nowOversold;
      setStocks(next);
      setMacro(m);
      setUpdatedAt(w?.updatedAt ?? Date.now());
    } catch {
      setError("네트워크 오류 — 잠시 후 다시 시도하세요");
    } finally {
      setRefreshing(false);
    }
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

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    pullStart.current = window.scrollY <= 0 ? e.touches[0].clientY : -1;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (pullStart.current >= 0 && e.changedTouches[0].clientY - pullStart.current > 70 && !refreshing) {
      load();
    }
    pullStart.current = -1;
  };

  const kst = (ms: number) =>
    new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(ms);

  return (
    <main className="mx-auto max-w-md pb-10" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <div className="flex items-center justify-between px-4 pt-2">
        <span className="text-xs text-zinc-400">{refreshing ? "새로고침 중…" : "당겨서 새로고침"}</span>
        <ThemeToggle />
      </div>
      <SummaryHeader stocks={stocks} macro={macro} />
      {!online && (
        <div className="mx-3 my-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          오프라인 · {updatedAt ? `${kst(updatedAt)} KST 데이터` : "캐시 데이터"}
        </div>
      )}
      {error && (
        <div className="mx-3 my-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">
          {error}
        </div>
      )}
      <MacroDial macro={macro} />
      <StockList stocks={stocks} onSelect={setSelected} />
      <ThemeConcentration stocks={stocks} />
      <div className="px-3 py-4 text-center text-xs text-zinc-400">
        <button onClick={load} className="rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700">새로고침</button>
        {updatedAt && <p className="mt-2">갱신 {kst(updatedAt)} KST</p>}
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

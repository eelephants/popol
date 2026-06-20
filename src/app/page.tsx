"use client";
import { useCallback, useEffect, useState } from "react";
import type { EnrichedStock, MacroData } from "@/lib/types";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { StockAnalysis } from "@/components/StockAnalysis";
import { MacroDial } from "@/components/MacroDial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usSession } from "@/lib/marketHours";
import Link from "next/link";
import { POPULAR_TICKERS } from "@/lib/popular";

const RECENT_KEY = "recent-tickers";

export default function Page() {
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [stock, setStock] = useState<EnrichedStock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Picked[]>([]);
  const [session, setSession] = useState("");

  useEffect(() => {
    fetch("/api/macro").then((r) => r.json()).then(setMacro).catch(() => {});
    setSession(usSession(Date.now()).label);
    try {
      const r = localStorage.getItem(RECENT_KEY);
      if (r) setRecent(JSON.parse(r));
    } catch {}
  }, []);

  const analyze = useCallback(async (p: Picked) => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/stock?ticker=${encodeURIComponent(p.symbol)}&name=${encodeURIComponent(p.name)}`);
      const j = await r.json();
      if (!j.stock) {
        setError(j.error || "데이터를 찾을 수 없습니다");
        setStock(null);
      } else {
        setStock(j.stock);
        setRecent((prev) => {
          const next = [p, ...prev.filter((x) => x.symbol !== p.symbol)].slice(0, 8);
          try {
            localStorage.setItem(RECENT_KEY, JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } catch {
      setError("네트워크 오류 — 잠시 후 다시 시도하세요");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <main className="mx-auto max-w-md pb-10">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-lg font-bold">종목 분석</h1>
        <ThemeToggle />
      </div>
      {session && <p className="px-4 pb-1 text-xs text-zinc-500">미국장 {session}</p>}
      <MacroDial macro={macro} />
      <SearchBox onPick={analyze} />

      {recent.length > 0 && (
        <div className="flex flex-wrap gap-2 px-3 py-1">
          {recent.map((p) => (
            <button
              key={p.symbol}
              onClick={() => analyze(p)}
              className="rounded-full bg-zinc-100 px-3 py-1 text-xs dark:bg-zinc-800"
            >
              {p.symbol}
            </button>
          ))}
        </div>
      )}

      {loading && <p className="px-4 py-6 text-center text-sm text-zinc-400">불러오는 중…</p>}
      {error && (
        <div className="mx-3 my-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/40 dark:text-red-300">
          {error}
        </div>
      )}
      {stock && !loading && <StockAnalysis stock={stock} />}
      {!stock && !loading && !error && (
        <p className="px-4 py-10 text-center text-sm text-zinc-400">
          검색해서 종목을 분석해보세요.
          <br />
          RSI·이동평균·매수존(-10~-25%)을 자동 계산합니다.
        </p>
      )}

      <nav className="px-3 pt-6" aria-label="인기 종목">
        <div className="mb-2 px-1 text-xs text-zinc-500">인기 종목 바로 분석</div>
        <div className="flex flex-wrap gap-2">
          {POPULAR_TICKERS.map((p) => (
            <Link
              key={p.ticker}
              href={`/stock/${p.ticker}`}
              prefetch={false}
              className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300"
            >
              {p.ticker} <span className="text-zinc-400">{p.name}</span>
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}

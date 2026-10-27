"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EnrichedStock, MacroData } from "@/lib/types";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { StockAnalysis } from "@/components/StockAnalysis";
import { MacroDial } from "@/components/MacroDial";
import { ThemeToggle } from "@/components/ThemeToggle";
import { usSession } from "@/lib/marketHours";
import { TickerChips } from "@/components/TickerChips";
import { POPULAR_TICKERS, POPULAR_KR } from "@/lib/popular";

const recentKey = (m: "US" | "KR") => `recent-tickers-${m.toLowerCase()}`;

export default function Page() {
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [stock, setStock] = useState<EnrichedStock | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recent, setRecent] = useState<Picked[]>([]);
  const [session, setSession] = useState("");
  const [market, setMarket] = useState<"US" | "KR">("US");

  useEffect(() => {
    fetch("/api/macro").then((r) => r.json()).then(setMacro).catch(() => {});
    setSession(usSession(Date.now()).label);
  }, []);

  useEffect(() => {
    try {
      const r = localStorage.getItem(recentKey(market));
      setRecent(r ? JSON.parse(r) : []);
    } catch {
      setRecent([]);
    }
  }, [market]);

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
            localStorage.setItem(recentKey(market), JSON.stringify(next));
          } catch {}
          return next;
        });
      }
    } catch {
      setError("네트워크 오류 — 잠시 후 다시 시도하세요");
    } finally {
      setLoading(false);
    }
  }, [market]);

  return (
    <main className="mx-auto max-w-md pb-10">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-lg font-bold">종목 분석</h1>
        <ThemeToggle />
      </div>
      <div className="flex gap-1 px-4 pt-2">
        {(["US", "KR"] as const).map((m) => (
          <button
            key={m}
            onClick={() => { setMarket(m); setStock(null); setError(null); }}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              market === m ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
            }`}
          >
            {m === "US" ? "미국장" : "국장"}
          </button>
        ))}
      </div>
      {market === "US" && session && <p className="px-4 pb-1 text-xs text-zinc-500">미국장 {session}</p>}
      {market === "US" && <MacroDial macro={macro} />}
      <SearchBox onPick={analyze} market={market} />

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
        <div className="px-4 py-8 text-center">
          <p className="text-base font-semibold">이 종목, 지금 비싼 걸까 싼 걸까?</p>
          <p className="mt-1 text-sm text-zinc-500">
            종목명만 검색하면 RSI·50/200일선 이격도·고점 대비 매수존(-10~-25%)을 한 화면에 계산해 드려요.
          </p>
          <p className="mt-2 text-xs text-zinc-400">무료 · 가입 없음 · 미국장·국장 모두</p>
        </div>
      )}

      <TickerChips label="인기 종목 바로 분석" items={market === "US" ? POPULAR_TICKERS : POPULAR_KR} />

      <nav aria-label="다른 도구" className="grid grid-cols-2 gap-2 px-3 pt-6">
        <Link href="/reader" className="rounded-xl bg-zinc-50 px-3 py-2.5 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          <div className="text-sm font-medium">판독기 ›</div>
          <div className="mt-0.5 text-xs text-zinc-500">시장 공포·과열을 점수로</div>
        </Link>
        <Link href="/allocate" className="rounded-xl bg-zinc-50 px-3 py-2.5 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">
          <div className="text-sm font-medium">자산 분배 ›</div>
          <div className="mt-0.5 text-xs text-zinc-500">비율대로 몇 주 살지 계산</div>
        </Link>
      </nav>
    </main>
  );
}

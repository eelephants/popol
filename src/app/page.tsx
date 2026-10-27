"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { EnrichedStock, MacroData } from "@/lib/types";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { StockAnalysis } from "@/components/StockAnalysis";
import { MacroDial } from "@/components/MacroDial";
import { usSession } from "@/lib/marketHours";
import { TickerChips } from "@/components/TickerChips";
import { PageTitle, Panel, Segmented } from "@/components/ui";
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
      setError("네트워크 오류예요. 잠시 후 다시 시도하세요.");
    } finally {
      setLoading(false);
    }
  }, [market]);

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <PageTitle
        title="종목 분석"
        sub={market === "US" ? (session ? `미국장 ${session}` : "미국장") : "국장 종목은 원화 그대로 계산해요"}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented
          label="시장"
          value={market}
          onChange={(m) => { setMarket(m); setStock(null); setError(null); }}
          options={[{ id: "US", label: "미국장" }, { id: "KR", label: "국장" }]}
          className="md:w-56"
        />
        <div className="flex-1">
          <SearchBox onPick={analyze} market={market} />
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs text-muted">최근 본 종목</span>
          {recent.map((p) => (
            <button
              key={p.symbol}
              onClick={() => analyze(p)}
              className="h-8 rounded-control bg-raised px-2.5 text-sm transition-colors hover:bg-line"
            >
              {p.symbol}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-4">
        {market === "US" && <MacroDial macro={macro} />}

        {loading && (
          <Panel className="px-5 py-10 text-center text-sm text-muted" as="div">불러오는 중…</Panel>
        )}
        {error && (
          <Panel className="px-5 py-4 text-sm" as="div">
            <span className="font-semibold text-up">불러오지 못했어요.</span> {error}
          </Panel>
        )}
        {stock && !loading && <StockAnalysis stock={stock} />}

        {!stock && !loading && !error && (
          <Panel className="grid gap-6 p-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:p-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight">이 종목, 지금 비싼 걸까 싼 걸까?</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">
                종목명만 검색하면 52주 고점 대비 매수존(−10~−25%), RSI, 50·200일선과의 거리를 한 화면에 계산해 드려요.
                가입 없이 무료이고, 미국장·국장 모두 돼요.
              </p>
            </div>
            <ul className="divide-y divide-rule self-start rounded-card border border-line">
              <li>
                <Link href="/reader" className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-raised">
                  <span>
                    <span className="block text-[15px] font-semibold">판독기</span>
                    <span className="block text-sm text-muted">시장 공포·과열을 점수로, 적정주가까지</span>
                  </span>
                  <span aria-hidden className="text-muted">→</span>
                </Link>
              </li>
              <li>
                <Link href="/allocate" className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-raised">
                  <span>
                    <span className="block text-[15px] font-semibold">자산 분배</span>
                    <span className="block text-sm text-muted">비율대로 몇 주씩 살지 계산</span>
                  </span>
                  <span aria-hidden className="text-muted">→</span>
                </Link>
              </li>
            </ul>
          </Panel>
        )}
      </div>

      <TickerChips label="많이 보는 종목" items={market === "US" ? POPULAR_TICKERS : POPULAR_KR} />
    </main>
  );
}

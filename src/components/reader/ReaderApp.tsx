"use client";
import { useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MarketView } from "./MarketView";
import { StockView } from "./StockView";
import { ConcentrationView } from "./ConcentrationView";

export type ReaderView = "market" | "stock" | "concentration";

const TABS: { id: ReaderView; label: string }[] = [
  { id: "market", label: "시장" },
  { id: "stock", label: "종목" },
  { id: "concentration", label: "몰빵지수" },
];

export function ReaderApp({ initialView, initialTicker }: { initialView: ReaderView; initialTicker?: string }) {
  const [view, setView] = useState<ReaderView>(initialView);

  const select = (v: ReaderView) => {
    setView(v);
    try {
      // 새로고침·공유해도 같은 탭이 열리게 주소만 바꾼다 (페이지 이동 없음)
      window.history.replaceState(null, "", v === "market" ? "/reader" : `/reader?view=${v}`);
    } catch {}
  };

  return (
    <main className="mx-auto max-w-md pb-10">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-lg font-bold">판독기</h1>
        <ThemeToggle />
      </div>
      <div role="tablist" aria-label="판독기 종류" className="mx-4 mt-2 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={view === t.id}
            onClick={() => select(t.id)}
            className={`rounded-lg py-2 text-sm font-medium transition-colors ${
              view === t.id ? "bg-white text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-1">
        {view === "market" && <MarketView />}
        {view === "stock" && <StockView initialTicker={initialTicker} />}
        {view === "concentration" && <ConcentrationView />}
      </div>
      <p className="px-4 pt-2 text-xs text-zinc-500">
        판독 기준은 소몽 클래스의 판독기 엑셀을 그대로 옮긴 것입니다. 투자 판단의 참고 자료이며 매매 권유가 아닙니다.
      </p>
    </main>
  );
}

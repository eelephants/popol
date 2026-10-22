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
      <details className="group mx-4 mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-sm dark:bg-zinc-900">
        <summary className="cursor-pointer list-none font-medium">
          처음이라면: 판독기 읽는 법{" "}
          <span aria-hidden className="inline-block text-zinc-400 transition-transform group-open:rotate-90">›</span>
        </summary>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-zinc-700 dark:text-zinc-300">
          <li>지표마다 값을 1~5점으로 바꾸고, 점수의 평균을 바늘로 보여 줘요.</li>
          <li>바늘이 왼쪽(1점, 공포)일수록 다들 겁먹은 때라 나눠 사기 좋고, 오른쪽(5점, 광기)일수록 다들 들뜬 때라 나눠 팔 때예요.</li>
          <li>지표 아래 회색 <b>설명</b>을 누르면 그 지표가 무엇인지와 점수 기준이 나와요.</li>
          <li>자동으로 못 가져오는 값은 옆 링크에서 확인해 직접 넣으면 돼요. 넣은 값은 이 기기에만 저장돼요.</li>
          <li><b>종목</b> 탭은 한 회사의 적정주가를, <b>몰빵지수</b> 탭은 내 투자금이 한곳에 몰렸는지를 봐요.</li>
        </ul>
      </details>
      <div className="pt-1">
        {view === "market" && <MarketView />}
        {view === "stock" && <StockView initialTicker={initialTicker} />}
        {view === "concentration" && <ConcentrationView />}
      </div>
      <p className="px-4 pt-2 text-xs text-zinc-500">
        판독 결과는 공개된 시장 지표를 정해진 구간에 따라 점수로 바꾼 참고 자료예요. 매매 권유가 아니며, 투자 판단과 책임은 본인에게 있습니다.
      </p>
    </main>
  );
}

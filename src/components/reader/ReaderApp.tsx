"use client";
import { useState } from "react";
import { PageTitle, Segmented } from "@/components/ui";
import { MarketView } from "./MarketView";
import { StockView } from "./StockView";
import { ConcentrationView } from "./ConcentrationView";

export type ReaderView = "market" | "stock" | "concentration";

const TABS: { id: ReaderView; label: string }[] = [
  { id: "market", label: "시장" },
  { id: "stock", label: "종목" },
  { id: "concentration", label: "몰빵지수" },
];

const SUB: Record<ReaderView, string> = {
  market: "투자자 심리와 지수 흐름을 1~5점으로 바꿔, 지금 시장이 겁먹었는지 들떴는지 봐요.",
  stock: "이익이 늘어나는 속도로 적정주가를 어림하고, 지금 가격 부담을 점수로 봐요.",
  concentration: "내 투자금이 한 종목·한 업종에 너무 몰려 있지 않은지 봐요.",
};

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
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <PageTitle title="판독기" sub={SUB[view]} />
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <Segmented label="판독기 종류" value={view} onChange={select} options={TABS} className="w-full md:w-auto" />
        <details className="group rounded-card bg-raised px-4 py-2.5 text-sm md:max-w-md">
          <summary className="cursor-pointer list-none font-medium">
            처음이라면: 판독기 읽는 법{" "}
            <span aria-hidden className="inline-block text-muted transition-transform group-open:rotate-90">›</span>
          </summary>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-ink">
            <li>지표마다 값을 1~5점으로 바꾸고, 점수의 평균을 바늘로 보여 줘요.</li>
            <li>바늘이 왼쪽(1점, 공포)일수록 다들 겁먹은 때라 나눠 사기 좋고, 오른쪽(5점, 광기)일수록 다들 들뜬 때라 나눠 팔 때예요.</li>
            <li>지표 아래 <b>설명</b>을 누르면 그 지표가 무엇인지와 점수 기준이 나와요.</li>
            <li>자동으로 못 가져오는 값은 옆 링크에서 확인해 직접 넣으면 돼요. 넣은 값은 이 기기에만 저장돼요.</li>
          </ul>
        </details>
      </div>
      <div className="mt-5">
        {view === "market" && <MarketView />}
        {view === "stock" && <StockView initialTicker={initialTicker} />}
        {view === "concentration" && <ConcentrationView />}
      </div>
    </main>
  );
}

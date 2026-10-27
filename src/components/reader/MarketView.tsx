"use client";
import { useCallback, useEffect, useId, useState } from "react";
import type { MarketReaderData } from "@/app/api/reader/market/route";
import {
  CHART_READER, CONTRARIAN_READER, HY_HELP, HY_STAGES, averageScore, hySpreadScore, type IndicatorKey, type ReaderScore,
} from "@/lib/readers";
import { IndicatorRow, ScorePill, readValue, useExplain } from "./IndicatorRow";
import { ReaderCard, ExtLink } from "./ReaderCard";
import { fmt } from "./levels";
import { useStored } from "./useStored";

type Stored = { inputs: Partial<Record<IndicatorKey, string>>; hy?: ReaderScore };

const HINTS: Partial<Record<IndicatorKey, React.ReactNode>> = {
  bullBear: <ExtLink href="https://www.aaii.com/sentimentsurvey">AAII 설문</ExtLink>,
  marginDebt: <ExtLink href="https://www.finra.org/finra-data/browse-catalog/margin-statistics">FINRA</ExtLink>,
  breadth200: <ExtLink href="https://www.barchart.com/stocks/quotes/$S5TH">Barchart $S5TH</ExtLink>,
  breadth50: <ExtLink href="https://www.barchart.com/stocks/quotes/$S5FI">Barchart $S5FI</ExtLink>,
};

const HY_TABLE = HY_STAGES.map((s) => ({ range: s.label, score: s.score }));

function HyRow({ data, value, onChange, loading }: {
  data: MarketReaderData["hy"]; value: ReaderScore | undefined; onChange: (v: ReaderScore | undefined) => void; loading: boolean;
}) {
  const id = useId();
  const band = useExplain(HY_HELP, HY_TABLE);
  const auto = hySpreadScore(data);
  const score = value ?? auto;
  return (
    <li className="border-t border-zinc-100 py-2.5 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-medium leading-snug">하이일드 스프레드</label>
          <div className="text-xs leading-snug text-zinc-500 tabular-nums">
            일간 ·{" "}
            {data
              ? `FRED ${fmt(data.latest)}% · 1년 저점 ${fmt(data.low1y)}% · 3개월 고점 ${fmt(data.peak3m)}%`
              : loading
                ? "불러오는 중…"
                : <ExtLink href="https://fred.stlouisfed.org/series/BAMLH0A0HYM2">FRED</ExtLink>}
            {" · "}
            {band.toggle}
          </div>
        </div>
        <select
          id={id}
          value={score ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : (Number(e.target.value) as ReaderScore);
            onChange(v === auto ? undefined : v);
          }}
          className="w-[7.5rem] flex-none rounded-lg border border-zinc-300 bg-transparent px-2 py-2 text-sm outline-none focus:border-zinc-600 dark:border-zinc-700 dark:bg-zinc-950"
        >
          <option value="">선택 안 함</option>
          {HY_STAGES.map((s) => (
            <option key={s.score} value={s.score}>{s.label}</option>
          ))}
        </select>
        <ScorePill score={score ?? null} />
      </div>
      {value !== undefined && auto != null && (
        <button type="button" onClick={() => onChange(undefined)} className="mt-1 text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-2">
          자동 판단({HY_STAGES.find((s) => s.score === auto)?.label})으로 되돌리기
        </button>
      )}
      {band.body}
    </li>
  );
}

export function MarketView() {
  const [data, setData] = useState<MarketReaderData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [stored, setStored] = useStored<Stored>("reader-market-v1", { inputs: {} });

  const load = useCallback(() => {
    setStatus("loading");
    fetch("/api/reader/market")
      .then((r) => r.json())
      .then((d: MarketReaderData) => { setData(d); setStatus("ok"); })
      .catch(() => setStatus("error"));
  }, []);
  useEffect(load, [load]);

  const auto: Partial<Record<IndicatorKey, number | null>> = {
    bullBear: data?.aaii?.spread ?? null,
    putCall: data?.putCall ?? null,
    vix: data?.vix ?? null,
    disparity200: data?.spx?.disparity200 ?? null,
    rsi: data?.spx?.rsi ?? null,
  };
  const source: Partial<Record<IndicatorKey, string>> = {
    bullBear: data?.aaii ? `AAII ${data.aaii.reportedDate} 발표 자동` : "AAII 자동",
    putCall: "CNN 자동",
    vix: "CNN 자동",
    disparity200: "S&P 500 자동",
    rsi: "S&P 500 자동",
  };
  const setInput = (k: IndicatorKey) => (v: string | undefined) =>
    setStored((s) => ({ ...s, inputs: { ...s.inputs, [k]: v } }));

  const scoreOf = (k: IndicatorKey, list = CONTRARIAN_READER) =>
    list.find((x) => x.key === k)!.score(readValue(stored.inputs[k], auto[k]));

  const contrarianScores = [...CONTRARIAN_READER.map((s) => scoreOf(s.key)), stored.hy ?? hySpreadScore(data?.hy ?? null)];
  const chartScores = CHART_READER.map((s) => scoreOf(s.key, CHART_READER));
  const filled = (xs: (ReaderScore | null)[]) => xs.filter((x) => x != null).length;
  const loading = status === "loading";

  const stamp = (
    <div className="flex items-center justify-between gap-2">
      <span>
        {status === "error"
          ? "자동값을 불러오지 못했습니다."
          : data
            ? `자동값 ${new Date(data.updatedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })} 기준 · 직접 넣은 값은 이 기기에 저장됩니다`
            : "자동값 불러오는 중…"}
      </span>
      <button type="button" onClick={load} disabled={loading} className="flex-none rounded-lg px-2 py-1 font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800">
        새로고침
      </button>
    </div>
  );

  return (
    <>
      <ReaderCard
        title="역발상 판독기"
        subtitle="남들이 겁낼 때 사고 들뜰 때 판다는 생각으로, 투자자들의 심리를 5가지 지표로 잽니다."
        score={averageScore(contrarianScores)}
        filled={filled(contrarianScores)}
        total={contrarianScores.length}
        footer={stamp}
      >
        {CONTRARIAN_READER.map((s) => (
          <IndicatorRow
            key={s.key}
            spec={s}
            auto={auto[s.key]}
            autoSource={source[s.key]}
            value={stored.inputs[s.key]}
            onChange={setInput(s.key)}
            hint={HINTS[s.key]}
            loading={loading && s.key in source}
          />
        ))}
        <HyRow data={data?.hy ?? null} value={stored.hy} onChange={(v) => setStored((s) => ({ ...s, hy: v }))} loading={loading} />
      </ReaderCard>

      <ReaderCard
        title="차트 판독기 · S&P 500"
        subtitle="미국 대표 지수가 너무 많이 올랐는지, 너무 많이 빠졌는지 가격 흐름으로 봅니다."
        score={averageScore(chartScores)}
        filled={filled(chartScores)}
        total={chartScores.length}
        footer={data?.spx ? <span className="tabular-nums">S&P 500 {fmt(data.spx.price)}</span> : undefined}
      >
        {CHART_READER.map((s) => (
          <IndicatorRow
            key={s.key}
            spec={s}
            auto={auto[s.key]}
            autoSource={source[s.key]}
            value={stored.inputs[s.key]}
            onChange={setInput(s.key)}
            hint={HINTS[s.key]}
            loading={loading && s.key in source}
          />
        ))}
      </ReaderCard>
    </>
  );
}

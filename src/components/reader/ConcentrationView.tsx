"use client";
import { useState } from "react";
import { SearchBox, type Picked } from "@/components/SearchBox";
import {
  MAX_HOLDINGS, REDUCE_PCT, REVIEW_PCT, concentration, defaultSector, type WeightFlag,
} from "@/lib/concentration";
import { SECTORS, type Sector } from "@/lib/sectorMap";
import { fmt, parseNum } from "./levels";
import { useStored } from "./useStored";

type StoredRow = { ticker: string; name: string; amount: string; sector?: Sector | null };
type Stored = { rows: StoredRow[] };

const FLAG: Record<WeightFlag, { label: string; className: string } | null> = {
  reduce: { label: "축소 필요", className: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300" },
  review: { label: "축소 검토", className: "bg-amber-50 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300" },
  ok: null,
};

export function ConcentrationView() {
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [stored, setStored, restored] = useStored<Stored>("concentration-v1", { rows: [] });

  const holdings = stored.rows.map((r) => ({
    ticker: r.ticker,
    name: r.name,
    amount: parseNum(r.amount) ?? 0,
    sector: r.sector !== undefined ? r.sector : defaultSector(r.ticker),
  }));
  const c = concentration(holdings);
  const top = c.top;
  const topFlag = top ? FLAG[top.flag] : null;

  const add = (p: Picked) =>
    setStored((s) => (s.rows.some((r) => r.ticker === p.symbol) ? s : { rows: [...s.rows, { ticker: p.symbol, name: p.name, amount: "" }] }));
  const update = (i: number, patch: Partial<StoredRow>) =>
    setStored((s) => ({ rows: s.rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const remove = (i: number) => setStored((s) => ({ rows: s.rows.filter((_, j) => j !== i) }));

  return (
    <>
      <section className="mx-3 my-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
        <h2 className="text-base font-semibold">몰빵지수</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          상위 {MAX_HOLDINGS}종목(ETF 제외)의 투자금으로 한 종목·한 업종 쏠림을 봅니다. {REVIEW_PCT}% 이상 축소 검토, {REDUCE_PCT}% 이상 축소 필요.
        </p>

        <div className="mt-3 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">가장 큰 비중</div>
            <div className="text-3xl font-semibold tabular-nums leading-tight">{top && top.weightPct > 0 ? `${fmt(top.weightPct, 1)}%` : "—"}</div>
            <div className="truncate text-sm text-zinc-600 dark:text-zinc-400">
              {top && top.weightPct > 0
                ? `${top.ticker}${top.flag === "ok" ? ` — 기준(${REVIEW_PCT}%) 안쪽` : ""}`
                : "종목과 금액을 넣으면 계산합니다"}
            </div>
          </div>
          {topFlag && (
            <span className={`mb-1 flex-none whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${topFlag.className}`}>{topFlag.label}</span>
          )}
        </div>
        <p className="mt-2 text-xs tabular-nums text-zinc-500">
          종목 {stored.rows.length}/{MAX_HOLDINGS} · 합계 {c.total.toLocaleString("ko-KR")}만원
          {c.overLimit && <span className="text-red-700 dark:text-red-400"> · {MAX_HOLDINGS}종목을 넘었습니다</span>}
        </p>
      </section>

      <div className="flex gap-1 px-4">
        {(["US", "KR"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMarket(m)}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              market === m ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
            }`}
          >
            {m === "US" ? "미국장" : "국장"}
          </button>
        ))}
      </div>
      <SearchBox onPick={add} market={market} />

      {restored && stored.rows.length === 0 && (
        <p className="px-4 py-6 text-center text-sm text-zinc-500">보유 종목을 검색해 추가하고 투자금(만원)을 넣으세요.</p>
      )}

      <ul className="px-3">
        {c.rows.map((r, i) => {
          const flag = FLAG[r.flag];
          return (
            <li key={r.ticker} className="mb-2 rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1 truncate">
                  <b>{r.ticker}</b> <span className="text-sm text-zinc-500">{r.name !== r.ticker ? r.name : ""}</span>
                </div>
                <input
                  value={stored.rows[i].amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`${r.ticker} 투자금 (만원)`}
                  className="w-20 rounded-lg border border-zinc-300 bg-transparent px-2 py-1.5 text-right text-base tabular-nums outline-none focus:border-zinc-600 dark:border-zinc-700 dark:focus:border-zinc-400"
                />
                <span className="text-xs text-zinc-500">만원</span>
                <span className="w-14 text-right text-sm font-semibold tabular-nums">{fmt(r.weightPct, 1)}%</span>
                <button onClick={() => remove(i)} aria-label={`${r.ticker} 삭제`} className="-mr-1 px-1.5 py-1 text-lg leading-none text-zinc-400 hover:text-red-600">×</button>
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                <select
                  value={r.sector ?? ""}
                  onChange={(e) => update(i, { sector: (e.target.value || null) as Sector | null })}
                  aria-label={`${r.ticker} 업종`}
                  className="rounded-md border border-zinc-300 bg-transparent px-1.5 py-1 text-xs outline-none focus:border-zinc-600 dark:border-zinc-700 dark:bg-zinc-950"
                >
                  <option value="">미분류</option>
                  {SECTORS.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                </select>
                {r.size && <span>{r.size}</span>}
                {flag && <span className={`ml-auto flex-none whitespace-nowrap rounded-full px-2 py-0.5 font-medium ${flag.className}`}>{flag.label}</span>}
              </div>
            </li>
          );
        })}
      </ul>

      {c.sectors.length > 0 && (
        <section className="mx-3 my-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <h2 className="text-base font-semibold">업종 분산</h2>
          <p className="text-xs text-zinc-500">GICS 11개 업종 기준 · 표에 없는 종목은 업종을 직접 고르세요</p>
          <ul className="mt-3 space-y-2.5">
            {c.sectors.map((s, i) => (
              <li key={s.sector}>
                <div className="flex justify-between text-sm">
                  <span>{s.sector}</span>
                  <span className="tabular-nums">{fmt(s.weightPct, 1)}%</span>
                </div>
                <div className="mt-1 h-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-1 rounded-full ${i === 0 ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-400 dark:bg-zinc-500"}`}
                    style={{ width: `${Math.min(100, s.weightPct)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

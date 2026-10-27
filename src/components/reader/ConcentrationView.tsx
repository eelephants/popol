"use client";
import { useState } from "react";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { Segmented } from "@/components/ui";
import {
  MAX_HOLDINGS, REDUCE_PCT, REVIEW_PCT, concentration, defaultSector, type WeightFlag,
} from "@/lib/concentration";
import { SECTORS, type Sector } from "@/lib/sectorMap";
import { fmt, parseNum } from "./levels";
import { useStored } from "./useStored";

type StoredRow = { ticker: string; name: string; amount: string; sector?: Sector | null };
type Stored = { rows: StoredRow[] };

const FLAG: Record<WeightFlag, { label: string; className: string } | null> = {
  reduce: { label: "축소 필요", className: "bg-hot-2 text-hot-2-ink" },
  review: { label: "축소 검토", className: "bg-warn text-warn-ink" },
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
    <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <section className="rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">몰빵지수</h2>
          <p className="mt-0.5 text-sm text-muted">
            한 종목이 {REVIEW_PCT}%를 넘으면 줄일지 고민하고, {REDUCE_PCT}%를 넘으면 줄이는 게 좋아요. ETF를 뺀 많이 가진 {MAX_HOLDINGS}종목까지 넣으세요.
          </p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[13px] text-muted">가장 큰 비중</div>
              <div className="num text-[34px] font-bold leading-tight tracking-tight">
                {top && top.weightPct > 0 ? `${fmt(top.weightPct, 1)}%` : <span className="text-xl font-normal text-faint">아직 없음</span>}
              </div>
              <div className="truncate text-sm text-muted">
                {top && top.weightPct > 0
                  ? `${top.ticker}${top.flag === "ok" ? `, 기준(${REVIEW_PCT}%) 안쪽이에요` : ""}`
                  : "종목과 금액을 넣으면 계산해요"}
              </div>
            </div>
            {topFlag && (
              <span className={`mb-1 inline-flex h-6 flex-none items-center whitespace-nowrap rounded-control px-2 text-xs font-medium ${topFlag.className}`}>{topFlag.label}</span>
            )}
          </div>
          <p className="num mt-3 text-[13px] text-muted">
            종목 {stored.rows.length}/{MAX_HOLDINGS} · 합계 {c.total.toLocaleString("ko-KR")}만원
            {c.overLimit && <span className="font-semibold text-up"> · {MAX_HOLDINGS}종목을 넘었어요</span>}
          </p>
        </section>

        <section aria-label="보유 종목" className="rounded-card border border-line bg-surface">
          <div className="flex flex-col gap-3 border-b border-rule p-4 sm:flex-row sm:items-center">
            <Segmented
              label="시장"
              value={market}
              onChange={setMarket}
              options={[{ id: "US", label: "미국장" }, { id: "KR", label: "국장" }]}
              className="sm:w-48"
            />
            <div className="flex-1">
              <SearchBox onPick={add} market={market} />
            </div>
          </div>

          {restored && stored.rows.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-muted">보유 종목을 검색해 추가하고 투자금(만원)을 넣으세요.</p>
          )}

          <ul>
            {c.rows.map((r, i) => {
              const flag = FLAG[r.flag];
              return (
                <li key={r.ticker} className="border-t border-rule px-4 py-3 first:border-t-0">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-semibold">{r.ticker}</span> <span className="text-sm text-muted">{r.name !== r.ticker ? r.name : ""}</span>
                    </div>
                    <input
                      value={stored.rows[i].amount}
                      onChange={(e) => update(i, { amount: e.target.value })}
                      inputMode="decimal"
                      placeholder="0"
                      aria-label={`${r.ticker} 투자금 (만원)`}
                      className="num h-10 w-24 rounded-control border border-control bg-surface px-2 text-right text-base outline-none focus:border-accent"
                    />
                    <span className="text-[13px] text-muted">만원</span>
                    <span className="num w-14 text-right text-[15px] font-semibold">{fmt(r.weightPct, 1)}%</span>
                    <button onClick={() => remove(i)} aria-label={`${r.ticker} 삭제`} className="-mr-2 flex h-9 w-9 items-center justify-center rounded-control text-lg leading-none text-muted hover:bg-raised hover:text-ink">×</button>
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[13px] text-muted">
                    <select
                      value={r.sector ?? ""}
                      onChange={(e) => update(i, { sector: (e.target.value || null) as Sector | null })}
                      aria-label={`${r.ticker} 업종`}
                      className="h-8 rounded-control border border-control bg-surface px-1.5 text-[13px] text-ink outline-none focus:border-accent"
                    >
                      <option value="">미분류</option>
                      {SECTORS.map((sec) => <option key={sec} value={sec}>{sec}</option>)}
                    </select>
                    {r.size && <span>{r.size}</span>}
                    {flag && <span className={`ml-auto inline-flex h-6 flex-none items-center whitespace-nowrap rounded-control px-2 font-medium ${flag.className}`}>{flag.label}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="text-lg font-semibold">업종 분산</h2>
        <p className="mt-0.5 text-sm text-muted">GICS 11개 업종 기준이에요. 표에 없는 종목은 업종을 직접 고르세요.</p>
        {c.sectors.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {c.sectors.map((s, i) => (
              <li key={s.sector}>
                <div className="flex justify-between text-[15px]">
                  <span>{s.sector}</span>
                  <span className="num">{fmt(s.weightPct, 1)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-raised">
                  <div className={`h-1.5 rounded-full ${i === 0 ? "bg-accent" : "bg-control"}`} style={{ width: `${Math.min(100, s.weightPct)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 rounded-control border border-dashed border-line px-4 py-3 text-sm text-muted">종목을 넣으면 업종별 비중이 여기에 나와요.</p>
        )}
      </section>
    </div>
  );
}

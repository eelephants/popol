"use client";
import { useCallback, useEffect, useId, useState } from "react";
import type { StockReaderData } from "@/app/api/reader/stock/route";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { EPS_LABELS, customTarget, fairPrice, peg, type Valuation } from "@/lib/fairPrice";
import { STOCK_READER, UPSIDE_VERDICT, averageScore, levelOf, upsideScore, type IndicatorKey } from "@/lib/readers";
import { IndicatorRow, readValue } from "./IndicatorRow";
import { ReaderCard, ExtLink } from "./ReaderCard";
import { LEVEL_PILL, fmt, parseNum, signed } from "./levels";
import { useStored } from "./useStored";

type Method = "base" | "adjusted" | "custom";
type PerStock = { eps: (string | undefined)[]; ltg?: string; method?: Method; multiple?: string; pe?: string; upside?: string; peg?: string };
const EMPTY: PerStock = { eps: [] };

const METHODS: { id: Method; label: string }[] = [
  { id: "base", label: "① 기본값" },
  { id: "adjusted", label: "② 보정값" },
  { id: "custom", label: "③ 직접 계산" },
];

function money(v: number | null | undefined, market: "US" | "KR") {
  if (v == null || !Number.isFinite(v)) return "—";
  return market === "KR" ? `₩${Math.round(v).toLocaleString("ko-KR")}` : `$${fmt(v, 2)}`;
}

function NumField({ label, sub, value, onChange, suffix, placeholder }: {
  label: string; sub?: React.ReactNode; value: string; onChange: (v: string) => void; suffix?: string; placeholder?: string;
}) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block truncate text-xs text-zinc-600 dark:text-zinc-400">{label}</label>
      <div className="mt-1 flex items-center gap-1">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder ?? "—"}
          className="w-full min-w-0 rounded-lg border border-zinc-300 bg-transparent px-2 py-2 text-right text-base tabular-nums outline-none placeholder:text-zinc-400 focus:border-zinc-600 dark:border-zinc-700 dark:focus:border-zinc-400"
        />
        {suffix && <span className="flex-none text-xs text-zinc-500">{suffix}</span>}
      </div>
      {sub != null && <div className="mt-0.5 text-right text-xs tabular-nums text-zinc-500">{sub}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{k}</span>
      <span className="text-right text-sm tabular-nums">{v}</span>
    </div>
  );
}

export function StockView({ initialTicker }: { initialTicker?: string }) {
  const [market, setMarket] = useState<"US" | "KR">(/\.(KS|KQ)$/i.test(initialTicker ?? "") ? "KR" : "US");
  const [last, setLast] = useStored<{ ticker?: string; name?: string }>("reader-stock-last-v1", {});
  const ticker = last.ticker;
  const [data, setData] = useState<StockReaderData | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [s, setS] = useStored<PerStock>(`fairprice-v1:${ticker ?? ""}`, EMPTY);
  const [marketPe, setMarketPe] = useStored<{ value?: string }>("reader-marketpe-v1", {});

  useEffect(() => {
    if (initialTicker) setLast({ ticker: initialTicker.toUpperCase(), name: initialTicker.toUpperCase() });
  }, [initialTicker, setLast]);

  const load = useCallback((t: string) => {
    setStatus("loading");
    setError(null);
    fetch(`/api/reader/stock?ticker=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "데이터를 찾을 수 없습니다");
        setData(j);
        setStatus("ok");
      })
      .catch((e: Error) => { setData(null); setError(e.message); setStatus("error"); });
  }, []);
  useEffect(() => { if (ticker) load(ticker); }, [ticker, load]);

  const pick = (p: Picked) => setLast({ ticker: p.symbol, name: p.name });

  // SEC 과거 EPS는 오른쪽(가장 최근)부터 채운다
  const autoEps: (number | null)[] = [null, null, null, null, null, null];
  const epsYears: (string | null)[] = [null, null, null, null, null, null];
  if (data) {
    const past = data.eps.slice(-4);
    past.forEach((e, i) => {
      const pos = 4 - past.length + i;
      autoEps[pos] = e.value;
      epsYears[pos] = `FY${e.periodEnd.slice(0, 4)}`;
    });
  }
  const eps = autoEps.map((a, i) => readValue(s.eps[i], a));
  const price = data?.price ?? null;
  const ltg = parseNum(s.ltg);
  const r = fairPrice(eps, price, ltg);
  const method: Method = s.method ?? (r.needsAdjustment && ltg != null ? "adjusted" : "base");
  const val: Valuation | null = method === "adjusted" ? r.adjusted : method === "base" ? r.base : null;
  const custom = method === "custom" ? customTarget(parseNum(s.multiple), r.forwardEps, price) : null;
  const target = method === "custom" ? custom?.target ?? null : val?.targetConservative ?? null;
  const upside = method === "custom" ? custom?.upsidePct ?? null : val?.upsideConservativePct ?? null;
  const uScore = upsideScore(upside);
  const growthUsed = method === "adjusted" ? ltg : method === "base" ? r.medianGrowthPct : ltg ?? r.medianGrowthPct;
  const mk = data?.market ?? market;

  const setEps = (i: number) => (v: string) =>
    setS((p) => { const next = [...p.eps]; next[i] = v; return { ...p, eps: next }; });

  const pe = readValue(s.pe, data?.pe ?? null);
  const autoReader: Partial<Record<IndicatorKey, number | null>> = {
    stockPe: data?.pe ?? null,
    upside,
    peg: peg(pe, growthUsed),
  };
  const readerValue: Partial<Record<IndicatorKey, string | undefined>> = {
    marketPe: marketPe.value,
    stockPe: s.pe,
    upside: s.upside,
    peg: s.peg,
  };
  const setReader = (k: IndicatorKey) => (v: string | undefined) => {
    if (k === "marketPe") setMarketPe({ value: v });
    else setS((p) => ({ ...p, [k === "stockPe" ? "pe" : k]: v }));
  };
  const scores = STOCK_READER.map((x) => x.score(readValue(readerValue[x.key], autoReader[x.key])));

  return (
    <>
      <div className="flex gap-1 px-4 pt-1">
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
      <SearchBox onPick={pick} market={market} />

      {!ticker && (
        <p className="px-4 py-8 text-center text-sm text-zinc-500">
          종목을 검색하면 적정주가와 주가 판독 결과를 계산합니다.
          <br />
          미국 종목은 과거 4년 EPS를 SEC 공시에서 자동으로 채웁니다.
        </p>
      )}

      {ticker && (
        <section className="mx-3 my-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="min-w-0 truncate text-base font-semibold">
              적정주가 계산기 <span className="text-sm font-normal text-zinc-500">{ticker}{last.name && last.name !== ticker ? ` · ${last.name}` : ""}</span>
            </h2>
            <span className="flex-none text-sm tabular-nums text-zinc-600 dark:text-zinc-400">{status === "ok" ? `현재가 ${money(price, mk)}` : ""}</span>
          </div>

          {status === "loading" && <p className="py-3 text-sm text-zinc-500">불러오는 중…</p>}
          {status === "error" && (
            <p className="py-3 text-sm text-zinc-700 dark:text-zinc-300">
              {error}{" "}
              <button type="button" onClick={() => ticker && load(ticker)} className="font-medium underline underline-offset-2">다시 시도</button>
            </p>
          )}

          {/* 답: 목표주가(보수)와 상승여력 */}
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-xs text-zinc-500">{method === "custom" ? "적정주가 (직접 계산)" : "목표주가 (보수)"}</div>
              {target != null ? (
                <>
                  <div className="text-3xl font-semibold tabular-nums leading-tight">{money(target, mk)}</div>
                  <div className="text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                    현재가 대비 {upside != null ? `${signed(upside)}%` : "—"}
                    {method !== "custom" && val && <> · 강세장 {money(val.targetBull, mk)} ({signed(val.upsideBullPct)}%)</>}
                  </div>
                </>
              ) : (
                <div className="pt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {r.forwardEps == null
                    ? "아래에 향후 1년 EPS 추정치를 넣으면 계산합니다."
                    : method === "adjusted" && ltg == null
                      ? "장기 성장률을 넣으면 계산합니다."
                      : method === "custom" && parseNum(s.multiple) == null
                        ? "적정 배수를 넣으면 계산합니다."
                        : "성장률이 0 이하라 이 방식으로는 적정가를 낼 수 없습니다."}
                </div>
              )}
            </div>
            {uScore != null && (
              <span className={`mb-1 flex-none whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${LEVEL_PILL[levelOf(uScore)]}`}>
                {UPSIDE_VERDICT[uScore]}
              </span>
            )}
          </div>

          <div role="radiogroup" aria-label="계산 방식" className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1 dark:bg-zinc-900">
            {METHODS.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setS((p) => ({ ...p, method: m.id }))}
                className={`rounded-lg py-2 text-sm font-medium transition-colors ${
                  method === m.id ? "bg-white text-zinc-900 dark:bg-zinc-700 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-zinc-500">
            {method === "base" && "EPS 성장률의 중앙값을 적정 P/E로 봅니다 (성장률 20% → 20배)."}
            {method === "adjusted" && "애널리스트 장기 성장률(3~5년 CAGR)을 적정 P/E로 봅니다."}
            {method === "custom" && "적정 배수를 직접 정해 향후 1년 EPS에 곱합니다."}
          </p>

          {r.needsAdjustment && method === "base" && (
            <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
              역성장이 있거나 이익 변동이 50% 이상이라 기본값이 부정확할 수 있습니다. 장기 성장률을 넣고 ② 보정값으로 보세요.
            </p>
          )}

          {method === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumField label="적정 배수 (P/E)" value={s.multiple ?? ""} onChange={(v) => setS((p) => ({ ...p, multiple: v }))} suffix="배" placeholder="예: 30" />
              <div className="self-end pb-2 text-right text-sm tabular-nums text-zinc-600 dark:text-zinc-400">현재 배수 {fmt(r.currentMultiple, 1)}배</div>
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-zinc-50 px-3 py-1.5 dark:bg-zinc-900">
              <Row k="적용 성장률" v={val ? `${fmt(val.growthPct, 1)}%` : "—"} />
              <Row k="적정 배수 (보통)" v={val ? `${fmt(val.normalMultiple[0], 1)} ~ ${fmt(val.normalMultiple[1], 1)}배` : "—"} />
              <Row k="적정 배수 (강세장)" v={val ? `${fmt(val.bullMultiple[0], 1)} ~ ${fmt(val.bullMultiple[1], 1)}배` : "—"} />
              <Row k="적정 가격대" v={val ? `${money(val.fairRange[0], mk)} ~ ${money(val.fairRange[1], mk)}` : "—"} />
              <Row k="현재 배수 (향후 1년 EPS 기준)" v={r.currentMultiple != null ? `${fmt(r.currentMultiple, 1)}배` : "—"} />
            </div>
          )}

          <h3 className="mt-4 text-sm font-semibold">희석 EPS</h3>
          <p className="text-xs text-zinc-500">
            {data?.eps.length ? "과거 4년은 SEC 10-K에서 자동 · " : mk === "KR" ? "국장 종목은 EPS를 직접 넣습니다 · " : ""}
            향후 2년은 <ExtLink href={`https://seekingalpha.com/symbol/${encodeURIComponent(ticker ?? "")}/earnings/estimates`}>시킹알파 Earnings Estimates</ExtLink>에서
          </p>
          <div className="mt-2 grid grid-cols-3 gap-x-2 gap-y-3">
            {EPS_LABELS.map((label, i) => {
              const g = i > 0 ? r.growth[i - 1] : null;
              const shown = s.eps[i] !== undefined ? s.eps[i]! : autoEps[i] != null ? String(autoEps[i]) : "";
              return (
                <NumField
                  key={label}
                  label={epsYears[i] ? `${label} · ${epsYears[i]}` : label}
                  value={shown}
                  onChange={setEps(i)}
                  sub={i === 0 ? " " : g != null ? `${signed(g * 100)}%` : "—"}
                />
              );
            })}
          </div>
          <p className="mt-1 text-xs tabular-nums text-zinc-500">성장률 중앙값 {r.medianGrowthPct != null ? `${fmt(r.medianGrowthPct, 1)}%` : "—"}</p>

          <div className="mt-3">
            <NumField
              label="장기 성장률 · EPS FWD Long Term Growth (3~5년 CAGR)"
              value={s.ltg ?? ""}
              onChange={(v) => setS((p) => ({ ...p, ltg: v }))}
              suffix="%"
              placeholder="예: 15"
            />
          </div>

          <ul className="mt-3 space-y-1 text-xs text-zinc-500">
            <li>성장률(기대수익률)과 P/E가 비슷한 것이 좋지만, 호황·상승장에선 프리미엄을 더 받기도 합니다.</li>
            <li>상승여력이 마이너스면 미래 성장가치가 먼저 반영됐거나 월가 추정치가 보수적인 경우입니다.</li>
          </ul>
        </section>
      )}

      {ticker && (
        <ReaderCard
          title="주가 판독기"
          subtitle="시장과 종목의 가격 부담을 함께 봅니다. 상승여력과 PEG는 위 계산기 결과를 씁니다."
          score={averageScore(scores)}
          filled={scores.filter((x) => x != null).length}
          total={scores.length}
        >
          {STOCK_READER.map((x) => (
            <IndicatorRow
              key={x.key}
              spec={x}
              auto={autoReader[x.key]}
              autoSource={
                x.key === "stockPe"
                  ? data?.peSource === "finnhub" ? "Finnhub 최근 12개월" : "현재가 ÷ 최근 회계연도 EPS"
                  : x.key === "upside"
                    ? "적정주가 계산기 결과"
                    : x.key === "peg"
                      ? `P/E ÷ 성장률 ${fmt(growthUsed, 1)}%`
                      : undefined
              }
              value={readerValue[x.key]}
              onChange={setReader(x.key)}
              hint={
                x.key === "marketPe" ? (
                  <ExtLink href="https://www.factset.com/earningsinsight">FactSet 주간</ExtLink>
                ) : x.key === "peg" ? "P/E와 성장률이 있으면 자동 계산" : undefined
              }
              digits={x.key === "upside" ? 1 : 2}
              loading={status === "loading" && x.key === "stockPe"}
            />
          ))}
        </ReaderCard>
      )}
    </>
  );
}

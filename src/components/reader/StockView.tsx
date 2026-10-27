"use client";
import { useCallback, useEffect, useId, useState } from "react";
import type { StockReaderData } from "@/app/api/reader/stock/route";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { Segmented } from "@/components/ui";
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
  { id: "base", label: "① 기본" },
  { id: "adjusted", label: "② 장기 성장률" },
  { id: "custom", label: "③ 직접 입력" },
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
      <label htmlFor={id} className="block truncate text-[13px] text-muted">{label}</label>
      <div className="mt-1 flex items-center gap-1">
        <input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          inputMode="decimal"
          placeholder={placeholder ?? "—"}
          className="w-full min-w-0 rounded-control border border-control bg-surface px-2 py-2 text-right text-base tabular-nums outline-none placeholder:text-faint focus:border-accent"
        />
        {suffix && <span className="flex-none text-[13px] text-muted">{suffix}</span>}
      </div>
      {sub != null && <div className="mt-0.5 text-right text-[13px] tabular-nums text-muted">{sub}</div>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-sm text-muted">{k}</span>
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
    // 향후 1·2년은 Nasdaq 컨센서스
    data.forward?.next.forEach((f, i) => {
      autoEps[4 + i] = f.eps;
      epsYears[4 + i] = f.label;
    });
  }
  const autoLtg = data?.forward?.growthPct != null ? Math.round(data.forward.growthPct * 10) / 10 : null;
  const overridden = s.eps.some((v, i) => v !== undefined && autoEps[i] != null) || (s.ltg !== undefined && autoLtg != null);
  const eps = autoEps.map((a, i) => readValue(s.eps[i], a));
  const price = data?.price ?? null;
  const ltg = readValue(s.ltg, autoLtg);
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
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <Segmented
          label="시장"
          value={market}
          onChange={setMarket}
          options={[{ id: "US", label: "미국장" }, { id: "KR", label: "국장" }]}
          className="md:w-56"
        />
        <div className="flex-1">
          <SearchBox onPick={pick} market={market} />
        </div>
      </div>

      {!ticker && (
        <div className="mt-4 rounded-card border border-line bg-surface p-5">
          <h2 className="text-lg font-semibold">종목을 검색해 시작하세요</h2>
          <p className="mt-1 text-[15px] text-muted">
            미국 종목은 지난 4년 실적과 앞으로 2년 예상 이익을 자동으로 채워, 열자마자 목표주가가 나와요. 국장 종목은 이익 숫자를 직접 넣으면 계산해요.
          </p>
        </div>
      )}

      <div className="mt-4 grid items-start gap-4 md:grid-cols-2">
      {ticker && (
        <section className="rounded-card border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="min-w-0 truncate text-lg font-semibold">
              적정주가 계산기 <span className="text-sm font-normal text-muted">{ticker}{last.name && last.name !== ticker ? ` · ${last.name}` : ""}</span>
            </h2>
            <span className="flex-none text-sm tabular-nums text-muted">{status === "ok" ? `현재가 ${money(price, mk)}` : ""}</span>
          </div>

          {status === "loading" && <p className="py-3 text-sm text-muted">불러오는 중…</p>}
          {status === "error" && (
            <p className="py-3 text-sm text-ink">
              {error}{" "}
              <button type="button" onClick={() => ticker && load(ticker)} className="font-medium underline underline-offset-2">다시 시도</button>
            </p>
          )}

          {/* 답: 목표주가(보수)와 상승여력 */}
          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[13px] text-muted">{method === "custom" ? "적정주가 (직접 입력한 PER 기준)" : "목표주가 (보수적으로 본 값)"}</div>
              {target != null ? (
                <>
                  <div className="num text-[34px] font-bold leading-tight tracking-tight">{money(target, mk)}</div>
                  <div className="text-sm tabular-nums text-muted">
                    현재가 대비 {upside != null ? `${signed(upside)}%` : "—"}
                    {method !== "custom" && val && <> · 강세장 {money(val.targetBull, mk)} ({signed(val.upsideBullPct)}%)</>}
                  </div>
                </>
              ) : (
                <div className="pt-1 text-sm text-muted">
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
              <span className={`mb-1 inline-flex h-6 flex-none items-center whitespace-nowrap rounded-control px-2 text-xs font-medium ${LEVEL_PILL[levelOf(uScore)]}`}>
                {UPSIDE_VERDICT[uScore]}
              </span>
            )}
          </div>

          <div role="radiogroup" aria-label="계산 방식" className="mt-3 grid grid-cols-3 gap-1 rounded-card bg-raised p-1">
            {METHODS.map((m) => (
              <button
                key={m.id}
                role="radio"
                aria-checked={method === m.id}
                onClick={() => setS((p) => ({ ...p, method: m.id }))}
                className={`rounded-control py-2 text-sm font-medium transition-colors ${
                  method === m.id ? "bg-surface font-semibold text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[13px] text-muted">
            {method === "base" && "이 회사 이익(EPS)이 해마다 늘어난 비율의 중간값을 적정 PER로 봐요. 이익이 매년 20%씩 늘면 PER 20배가 적정하다는 식이에요."}
            {method === "adjusted" && "애널리스트들이 예상한 앞으로 3~5년 이익 성장률을 적정 PER로 봐요. 이익이 해마다 들쭉날쭉한 회사에 더 잘 맞아요."}
            {method === "custom" && "적정하다고 생각하는 PER을 직접 넣으면, 내년 예상 이익에 곱해서 적정주가를 계산해요."}
          </p>

          {r.needsAdjustment && method === "base" && (
            <p className="mt-3 rounded-control bg-warn px-3 py-2 text-sm text-warn-ink">
              이익이 줄었던 해가 있거나 해마다 크게 들쭉날쭉해서 ① 결과가 부정확할 수 있어요. 아래에 장기 성장률을 넣고 ②로 보세요.
            </p>
          )}

          {method === "custom" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <NumField label="적정 PER" value={s.multiple ?? ""} onChange={(v) => setS((p) => ({ ...p, multiple: v }))} suffix="배" placeholder="예: 30" />
              <div className="self-end pb-2 text-right text-sm tabular-nums text-muted">현재 배수 {fmt(r.currentMultiple, 1)}배</div>
            </div>
          ) : (
            <div className="mt-3 rounded-card bg-raised px-3 py-1.5">
              <Row k="적용한 이익 성장률" v={val ? `${fmt(val.growthPct, 1)}%` : "—"} />
              <Row k="적정 PER (보통 시장)" v={val ? `${fmt(val.normalMultiple[0], 1)} ~ ${fmt(val.normalMultiple[1], 1)}배` : "—"} />
              <Row k="적정 PER (상승장)" v={val ? `${fmt(val.bullMultiple[0], 1)} ~ ${fmt(val.bullMultiple[1], 1)}배` : "—"} />
              <Row k="적정 가격대" v={val ? `${money(val.fairRange[0], mk)} ~ ${money(val.fairRange[1], mk)}` : "—"} />
              <Row k="지금 PER (내년 예상 이익 기준)" v={r.currentMultiple != null ? `${fmt(r.currentMultiple, 1)}배` : "—"} />
            </div>
          )}

          <h3 className="mt-4 text-sm font-semibold">주당순이익(EPS)</h3>
          <p className="text-[13px] text-muted">회사가 1년 동안 주식 1주당 번 돈이에요. 이 숫자가 해마다 얼마나 늘었는지로 적정 PER을 정합니다.</p>
          <p className="text-[13px] text-muted">
            {data?.eps.length ? "지난 4년은 미국 공시(SEC)" : mk === "KR" ? "국장 종목은 직접 넣어 주세요" : "지난 4년은 직접 넣어 주세요"}
            {data?.forward?.next.length ? (
              <>, 향후 2년은 애널리스트 예상 평균(Nasdaq)에서 자동으로 채웠어요. 숫자는 고쳐 쓸 수 있어요.</>
            ) : (
              <>
                {" · "}향후 2년은{" "}
                <ExtLink href={`https://seekingalpha.com/symbol/${encodeURIComponent(ticker ?? "")}/earnings/estimates`}>시킹알파 Earnings Estimates</ExtLink>에서
              </>
            )}
            {overridden && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setS((p) => ({ ...p, eps: [], ltg: undefined }))}
                  className="underline decoration-control underline-offset-2 hover:text-ink"
                >
                  자동값으로 되돌리기
                </button>
              </>
            )}
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
          <p className="mt-1 text-[13px] tabular-nums text-muted">해마다 늘어난 비율의 중간값 {r.medianGrowthPct != null ? `${fmt(r.medianGrowthPct, 1)}%` : "—"}</p>

          <div className="mt-3">
            <NumField
              label="장기 성장률 (앞으로 몇 년간 이익이 해마다 늘 것으로 보는 비율)"
              value={s.ltg !== undefined ? s.ltg : autoLtg != null ? String(autoLtg) : ""}
              sub={
                s.ltg === undefined && data?.forward?.growthBasis
                  ? `Nasdaq 애널리스트 예상 · ${data.forward.growthBasis}`
                  : s.ltg === undefined
                    ? "시킹알파 Growth 탭 'EPS FWD Long Term Growth' 값을 넣어도 돼요"
                    : "직접 입력"
              }
              onChange={(v) => setS((p) => ({ ...p, ltg: v }))}
              suffix="%"
              placeholder="예: 15"
            />
          </div>

          <ul className="mt-3 space-y-1 text-[13px] text-muted">
            <li>보통은 이익 성장률과 PER이 비슷하면 적당한 가격으로 봐요. 시장이 좋을 때는 이보다 비싸게 거래되기도 해요.</li>
            <li>목표주가가 지금 주가보다 낮게 나오면, 시장이 먼 미래 성장까지 미리 값을 매겼거나 애널리스트 예상이 보수적인 경우예요.</li>
          </ul>
        </section>
      )}

      {ticker && (
        <ReaderCard
          title="주가 판독기"
          subtitle="시장 전체와 이 종목이 이익에 비해 비싼지 싼지 봅니다. 상승여력과 PEG는 위 계산기 결과로 자동 계산돼요."
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
      </div>
    </>
  );
}

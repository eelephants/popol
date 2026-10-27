"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { PageTitle, Segmented, inputCls } from "@/components/ui";
import { allocate, toKrw, formatMoney, convertAmount, formatShares, type Currency } from "@/lib/allocation";

type Row = {
  symbol: string;
  name: string;
  pctInput: string;
  priceKrw: number | null;
  market: "US" | "KR" | null;
  status: "loading" | "ok" | "error";
};

const STORE_KEY = "allocation-v1";
type Saved = { base: Currency; total: string; totalKrw: number; rows: { symbol: string; name: string; pct: number }[] };

const num = (s: string) => Number(s.replace(/[^0-9.]/g, "")) || 0;

/** 원화 단가만 뽑아온다 — 국장은 price 자체가 원화, 미국주는 서버가 환율을 곱해 priceKrw로 준다. */
async function fetchPriceKrw(symbol: string, name: string) {
  const r = await fetch(`/api/stock?ticker=${encodeURIComponent(symbol)}&name=${encodeURIComponent(name)}`);
  const j = await r.json();
  const s = j.stock;
  if (!s) return null;
  return {
    name: s.name as string,
    market: s.market as "US" | "KR",
    priceKrw: (s.market === "KR" ? s.price : s.priceKrw) as number | null,
  };
}

export default function AllocatePage() {
  const [base, setBase] = useState<Currency>("KRW");
  // 입력칸은 표시용 문자열, 계산의 정본은 원화 금액. 통화를 왕복해도 정본이 반올림으로 깎이지 않는다.
  const [total, setTotal] = useState("");
  const [totalKrw, setTotalKrw] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [market, setMarket] = useState<"US" | "KR">("US");
  const [fx, setFx] = useState<{ loaded: boolean; usdKrw: number | null }>({ loaded: false, usdKrw: null });
  const [restored, setRestored] = useState(false);

  // 저장분 복원 + 환율 조회 → 복원된 종목의 현재가 재조회 (가격은 저장하지 않는다)
  useEffect(() => {
    let saved: Saved | null = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      saved = raw ? (JSON.parse(raw) as Saved) : null;
    } catch {}
    if (saved) {
      setBase(saved.base ?? "KRW");
      setTotal(saved.total ?? "");
      setTotalKrw(saved.totalKrw ?? 0);
      setRows((saved.rows ?? []).map((r) => ({ ...r, pctInput: String(r.pct), priceKrw: null, market: null, status: "loading" })));
    }
    setRestored(true);

    fetch("/api/macro")
      .then((r) => r.json())
      .then((m) => setFx({ loaded: true, usdKrw: m?.usdKrw ?? null }))
      .catch(() => setFx({ loaded: true, usdKrw: null }));

    for (const r of saved?.rows ?? []) {
      fetchPriceKrw(r.symbol, r.name)
        .then((q) =>
          setRows((prev) =>
            prev.map((x) =>
              x.symbol === r.symbol
                ? q
                  ? { ...x, priceKrw: q.priceKrw, market: q.market, status: "ok" }
                  : { ...x, status: "error" }
                : x,
            ),
          ),
        )
        .catch(() => setRows((prev) => prev.map((x) => (x.symbol === r.symbol ? { ...x, status: "error" } : x))));
    }
  }, []);

  // 환율을 못 받아오면 달러 기준으로 계산할 수 없다 — 원화로 되돌린다
  useEffect(() => {
    if (fx.loaded && fx.usdKrw == null) {
      setBase((b) => {
        if (b === "USD") setTotal(totalKrw ? String(totalKrw) : "");
        return "KRW";
      });
    }
  }, [fx]);

  useEffect(() => {
    if (!restored) return;
    const data: Saved = {
      base,
      total,
      totalKrw,
      rows: rows.map((r) => ({ symbol: r.symbol, name: r.name, pct: num(r.pctInput) })),
    };
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch {}
  }, [base, total, totalKrw, rows, restored]);

  const alloc = useMemo(
    () =>
      allocate(
        totalKrw,
        rows.map((r) => ({ symbol: r.symbol, name: r.name, pct: num(r.pctInput), priceKrw: r.priceKrw })),
      ),
    [totalKrw, rows],
  );

  const add = useCallback(
    async (p: Picked) => {
      if (rows.some((r) => r.symbol === p.symbol)) return;
      const used = rows.reduce((s, r) => s + num(r.pctInput), 0);
      const remain = Math.max(0, 100 - used);
      setRows((prev) => [
        ...prev,
        { symbol: p.symbol, name: p.name, pctInput: String(remain), priceKrw: null, market: null, status: "loading" },
      ]);
      try {
        const q = await fetchPriceKrw(p.symbol, p.name);
        setRows((prev) =>
          prev.map((x) =>
            x.symbol === p.symbol
              ? q
                ? { ...x, name: q.name || x.name, priceKrw: q.priceKrw, market: q.market, status: "ok" }
                : { ...x, status: "error" }
              : x,
          ),
        );
      } catch {
        setRows((prev) => prev.map((x) => (x.symbol === p.symbol ? { ...x, status: "error" } : x)));
      }
    },
    [rows],
  );

  const money = (krw: number) => formatMoney(krw, base, fx.usdKrw);

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <PageTitle title="자산 분배" sub="총 자산과 종목별 비율을 넣으면 배분 금액과 살 주수(소수점 6자리)를 계산해요." />

      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="rounded-card border border-line bg-surface p-5">
            <label htmlFor="total" className="block text-[15px] font-medium">총 자산</label>
            <div className="mt-2 flex gap-2">
              <input
                id="total"
                value={total}
                onChange={(e) => {
                  setTotal(e.target.value);
                  setTotalKrw(toKrw(num(e.target.value), base, fx.usdKrw) ?? 0);
                }}
                inputMode="decimal"
                placeholder={base === "USD" ? "예: 50000" : "예: 50000000"}
                className={`num h-12 min-w-0 flex-1 text-lg ${inputCls}`}
              />
              <div role="group" aria-label="통화" className="inline-flex shrink-0 rounded-card bg-raised p-1">
                {(["KRW", "USD"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      if (c === base) return;
                      // 통화만 바꾸고 자산 크기는 유지 — 표시만 환산하고 원화 정본은 그대로 둔다
                      setTotal(total.trim() ? String(convertAmount(totalKrw, "KRW", c, fx.usdKrw)) : total);
                      setBase(c);
                    }}
                    disabled={c === "USD" && fx.usdKrw == null}
                    aria-pressed={base === c}
                    className={`h-10 w-11 rounded-control text-[15px] transition-colors disabled:opacity-40 ${
                      base === c ? "bg-surface font-semibold text-ink" : "text-muted hover:text-ink"
                    }`}
                  >
                    {c === "KRW" ? "₩" : "$"}
                  </button>
                ))}
              </div>
            </div>
            <p className="num mt-2 text-xs text-muted">
              {fx.usdKrw != null
                ? `$1 = ₩${Math.round(fx.usdKrw).toLocaleString("ko-KR")} (일별 환율) · 미국 종목은 이 환율로 환산해 계산해요`
                : fx.loaded
                  ? "환율을 불러오지 못해 달러 기준·미국 종목 계산이 제한돼요"
                  : "환율 불러오는 중…"}
            </p>
          </section>

          <section aria-label="종목과 비율" className="rounded-card border border-line bg-surface">
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

            {rows.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-muted">
                종목을 검색해 추가하세요. 비율대로 배분 금액과 살 주수를 계산해요.
              </p>
            )}

            <ul>
              {alloc.rows.map((r, i) => {
                const row = rows[i];
                return (
                  <li key={r.symbol} className="border-t border-rule px-4 py-3 first:border-t-0">
                    <div className="flex items-center gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate">
                          <span className="font-semibold">{r.symbol}</span> <span className="text-sm text-muted">{r.name}</span>
                        </div>
                        <div className="num text-xs text-muted">
                          {row.status === "loading"
                            ? "현재가 불러오는 중…"
                            : r.priceKrw != null
                              ? `현재가 ${money(r.priceKrw)}`
                              : "현재가를 불러오지 못했어요"}
                        </div>
                      </div>
                      <input
                        value={row.pctInput}
                        onChange={(e) =>
                          setRows((prev) => prev.map((x, j) => (j === i ? { ...x, pctInput: e.target.value } : x)))
                        }
                        inputMode="decimal"
                        aria-label={`${r.symbol} 비율 %`}
                        className={`num h-10 w-16 text-right ${inputCls} px-2`}
                      />
                      <span className="text-sm text-muted">%</span>
                      <button
                        onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`${r.symbol} 삭제`}
                        className="-mr-2 flex h-9 w-9 items-center justify-center rounded-control text-lg leading-none text-muted hover:bg-raised hover:text-ink"
                      >
                        ×
                      </button>
                    </div>

                    <div className="num mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-[17px] font-bold">{money(r.amountKrw)}</span>
                      {r.shares != null ? (
                        <>
                          <span className="text-[15px]">{formatShares(r.shares)}주</span>
                          {/* 소수점 매수라 체결금액은 배분금액과 거의 같다 — 차이가 1원 이상일 때만 보여준다 */}
                          {(r.leftoverKrw ?? 0) >= 1 && (
                            <span className="text-xs text-muted">
                              체결 {money(r.filledKrw ?? 0)} · 잔액 {money(r.leftoverKrw ?? 0)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-muted">주수 계산 불가</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </div>

        <section aria-label="합계" className="rounded-card border border-line bg-surface p-5 md:sticky md:top-4">
          <h2 className="text-lg font-semibold">합계</h2>
          <dl className="num mt-3 divide-y divide-rule text-[15px]">
            <div className="flex justify-between py-2.5">
              <dt className="text-muted">배정 비율</dt>
              <dd className={alloc.overAllocated ? "font-semibold text-up" : "font-semibold"}>
                {alloc.pctTotal.toLocaleString("ko-KR")}%
              </dd>
            </div>
            {!alloc.overAllocated && (
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">현금으로 남김 {alloc.cashPct.toLocaleString("ko-KR")}%</dt>
                <dd>{money(alloc.cashKrw)}</dd>
              </div>
            )}
            {alloc.leftoverKrw >= 1 && (
              <div className="flex justify-between py-2.5">
                <dt className="text-muted">단수 잔액 합</dt>
                <dd>{money(alloc.leftoverKrw)}</dd>
              </div>
            )}
          </dl>
          {alloc.overAllocated && (
            <p className="mt-2 rounded-control bg-hot-1 px-3 py-2 text-sm text-hot-1-ink">
              비율 합이 100%를 넘어요. 총 자산보다{" "}
              {money(alloc.rows.reduce((sum, r) => sum + r.amountKrw, 0) - (toKrw(num(total), base, fx.usdKrw) ?? 0))} 많이 배분됐어요.
            </p>
          )}
          {rows.length === 0 && <p className="mt-2 text-sm text-muted">종목을 넣으면 합계가 여기에 나와요.</p>}
        </section>
      </div>
    </main>
  );
}

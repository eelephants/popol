"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SearchBox, type Picked } from "@/components/SearchBox";
import { ThemeToggle } from "@/components/ThemeToggle";
import { allocate, toKrw, formatMoney, convertAmount, type Currency } from "@/lib/allocation";

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
    <main className="mx-auto max-w-md pb-10">
      <div className="flex items-center justify-between px-4 pt-3">
        <h1 className="text-lg font-bold">자산 분배</h1>
        <ThemeToggle />
      </div>

      <div className="px-4 pt-3">
        <label className="mb-1 block text-xs text-zinc-500">총 자산</label>
        <div className="flex gap-2">
          <input
            value={total}
            onChange={(e) => {
              setTotal(e.target.value);
              setTotalKrw(toKrw(num(e.target.value), base, fx.usdKrw) ?? 0);
            }}
            inputMode="decimal"
            placeholder={base === "USD" ? "예: 50000" : "예: 50000000"}
            className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700"
          />
          <div className="flex shrink-0 overflow-hidden rounded-xl border border-zinc-300 dark:border-zinc-700">
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
                className={`px-3 py-3 text-sm font-medium disabled:opacity-40 ${
                  base === c ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "text-zinc-500"
                }`}
              >
                {c === "KRW" ? "₩" : "$"}
              </button>
            ))}
          </div>
        </div>
        <p className="pt-1 text-xs text-zinc-400">
          {fx.usdKrw != null
            ? `$1 = ₩${Math.round(fx.usdKrw).toLocaleString("ko-KR")} (일별 환율) · 미국 종목은 이 환율로 환산해 계산합니다`
            : fx.loaded
              ? "환율을 불러오지 못했습니다 — 달러 기준·미국 종목 계산이 제한됩니다"
              : "환율 불러오는 중…"}
        </p>
      </div>

      <div className="flex gap-1 px-4 pt-4">
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

      {rows.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-zinc-400">
          총 자산을 넣고 종목을 검색해 추가하세요.
          <br />
          비율대로 배분 금액과 매수 가능 주수를 계산합니다.
        </p>
      )}

      <ul className="px-3">
        {alloc.rows.map((r, i) => {
          const row = rows[i];
          return (
            <li key={r.symbol} className="mb-2 rounded-xl border border-zinc-200 px-3 py-3 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate">
                    <b>{r.symbol}</b> <span className="text-sm text-zinc-500">{r.name}</span>
                  </div>
                  <div className="text-xs text-zinc-400">
                    {row.status === "loading"
                      ? "현재가 불러오는 중…"
                      : r.priceKrw != null
                        ? `현재가 ${money(r.priceKrw)}`
                        : "현재가를 불러오지 못했습니다"}
                  </div>
                </div>
                <input
                  value={row.pctInput}
                  onChange={(e) =>
                    setRows((prev) => prev.map((x, j) => (j === i ? { ...x, pctInput: e.target.value } : x)))
                  }
                  inputMode="decimal"
                  aria-label={`${r.symbol} 비율 %`}
                  className="w-16 rounded-lg border border-zinc-300 bg-transparent px-2 py-1 text-right text-base outline-none focus:border-zinc-500 dark:border-zinc-700"
                />
                <span className="text-sm text-zinc-500">%</span>
                <button
                  onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                  aria-label={`${r.symbol} 삭제`}
                  className="px-1 text-lg leading-none text-zinc-400 hover:text-red-500"
                >
                  ×
                </button>
              </div>

              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t border-zinc-100 pt-2 text-sm dark:border-zinc-800">
                <span className="font-semibold">{money(r.amountKrw)}</span>
                {r.shares != null ? (
                  <>
                    <span className="text-zinc-500">
                      {r.shares.toLocaleString("ko-KR")}주 · 체결 {money(r.filledKrw ?? 0)}
                    </span>
                    {(r.leftoverKrw ?? 0) > 0 && (
                      <span className="text-xs text-zinc-400">잔액 {money(r.leftoverKrw ?? 0)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-xs text-zinc-400">주수 계산 불가</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {rows.length > 0 && (
        <div className="mx-3 mt-2 rounded-xl bg-zinc-50 px-3 py-3 text-sm dark:bg-zinc-900">
          <div className="flex justify-between">
            <span className="text-zinc-500">배정 비율</span>
            <span className={alloc.overAllocated ? "font-semibold text-red-600 dark:text-red-400" : "font-semibold"}>
              {alloc.pctTotal.toLocaleString("ko-KR")}%
            </span>
          </div>
          {alloc.overAllocated ? (
            <p className="pt-1 text-xs text-red-600 dark:text-red-400">
              비율 합이 100%를 넘습니다 — 총 자산보다 {money(alloc.rows.reduce((s, r) => s + r.amountKrw, 0) - (toKrw(num(total), base, fx.usdKrw) ?? 0))} 많이 배분됐습니다.
            </p>
          ) : (
            <div className="flex justify-between pt-1">
              <span className="text-zinc-500">현금 {alloc.cashPct.toLocaleString("ko-KR")}%</span>
              <span>{money(alloc.cashKrw)}</span>
            </div>
          )}
          {alloc.leftoverKrw > 0 && (
            <div className="flex justify-between pt-1 text-xs text-zinc-400">
              <span>단수 잔액 합</span>
              <span>{money(alloc.leftoverKrw)}</span>
            </div>
          )}
        </div>
      )}
    </main>
  );
}

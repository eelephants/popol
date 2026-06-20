"use client";
import { useEffect, useRef, useState } from "react";

export type Picked = { symbol: string; name: string };

export function SearchBox({ onPick, market }: { onPick: (p: Picked) => void; market: "US" | "KR" }) {
  const [q, setQ] = useState("");
  const [matches, setMatches] = useState<{ symbol: string; name: string; exchange: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 1) {
      setMatches([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(term)}&market=${market}`);
        const j = await r.json();
        setMatches(j.matches ?? []);
        setOpen(true);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q, market]);

  const pick = (symbol: string, name: string) => {
    setOpen(false);
    setQ("");
    setMatches([]);
    onPick({ symbol, name });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      if (matches[0]) pick(matches[0].symbol, matches[0].name);
      else if (q.trim()) pick(q.trim().toUpperCase(), q.trim().toUpperCase());
    }
  };

  return (
    <div className="relative px-3 py-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => matches.length > 0 && setOpen(true)}
        placeholder={market === "KR" ? "종목 검색 (예: 삼성전자, 005930, SK하이닉스)" : "종목 검색 (예: AAPL, tesla, NVDA)"}
        className="w-full rounded-xl border border-zinc-300 bg-transparent px-4 py-3 text-base outline-none focus:border-zinc-500 dark:border-zinc-700"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className="absolute inset-x-3 z-20 mt-1 max-h-72 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          {matches.map((m) => (
            <li key={m.symbol}>
              <button
                onClick={() => pick(m.symbol, m.name)}
                className="flex w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <span className="min-w-0 truncate">
                  <b>{m.symbol}</b> <span className="text-sm text-zinc-500">{m.name}</span>
                </span>
                <span className="shrink-0 text-xs text-zinc-400">{m.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && <p className="px-1 pt-1 text-xs text-zinc-400">검색 중…</p>}
    </div>
  );
}

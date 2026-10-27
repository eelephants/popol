"use client";
import { useEffect, useRef, useState } from "react";
import { inputCls } from "./ui";

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
    <div className="relative">
      <svg viewBox="0 0 16 16" aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="7" cy="7" r="4.5" />
        <path d="m10.5 10.5 3 3" strokeLinecap="round" />
      </svg>
      <input
        aria-label="종목 검색"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => matches.length > 0 && setOpen(true)}
        placeholder={market === "KR" ? "종목 검색 (예: 삼성전자, 005930, SK하이닉스)" : "종목 검색 (예: AAPL, tesla, NVDA)"}
        className={`h-12 w-full pl-10 ${inputCls}`}
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <ul className={/* taste-skill-ignore: 떠 있는 메뉴라 그림자 */ "absolute inset-x-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-card border border-line bg-surface py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"}>
          {matches.map((m) => (
            <li key={m.symbol}>
              <button
                onClick={() => pick(m.symbol, m.name)}
                className="flex min-h-11 w-full items-center justify-between gap-2 px-4 py-2 text-left hover:bg-raised"
              >
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{m.symbol}</span> <span className="text-sm text-muted">{m.name}</span>
                </span>
                <span className="shrink-0 text-xs text-muted">{m.exchange}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {loading && <p className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">검색 중…</p>}
    </div>
  );
}

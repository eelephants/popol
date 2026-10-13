import Link from "next/link";

/** Crawlable links to seed-ticker analysis pages (home + stock pages). */
export function TickerChips({ label, items }: { label: string; items: { ticker: string; name: string }[] }) {
  return (
    <nav className="px-3 pt-6" aria-label={label}>
      <div className="mb-2 px-1 text-xs text-zinc-500">{label}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <Link
            key={p.ticker}
            href={`/stock/${p.ticker}`}
            prefetch={false}
            className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-600 hover:border-zinc-400 dark:border-zinc-800 dark:text-zinc-300"
          >
            {p.ticker} <span className="text-zinc-400">{p.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

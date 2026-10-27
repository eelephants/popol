import Link from "next/link";

/** 대표 종목으로 가는 링크 목록(홈·종목 페이지). 크롤러가 따라갈 수 있는 실제 링크다. */
export function TickerChips({ label, items }: { label: string; items: { ticker: string; name: string }[] }) {
  return (
    <nav aria-label={label} className="mt-10">
      <h2 className="mb-3 text-base font-semibold">{label}</h2>
      <div className="overflow-hidden rounded-card border border-line bg-surface">
      {/* 칸마다 위쪽 선만 긋고 첫 줄 선은 테두리 밑에 숨긴다. 개수가 열에 안 맞아도 빈칸이 선으로 드러나지 않는다 */}
      <ul className="-mt-px grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5">
        {items.map((p) => (
          <li key={p.ticker} className="border-t border-rule">
            <Link
              href={`/stock/${p.ticker}`}
              prefetch={false}
              className="flex h-14 flex-col justify-center px-4 transition-colors hover:bg-raised"
            >
              <span className="truncate text-[15px] font-semibold">{p.name}</span>
              <span className="text-xs text-muted">{p.ticker}</span>
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </nav>
  );
}

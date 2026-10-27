"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";

const TABS = [
  { href: "/", label: "분석", isActive: (p: string) => p === "/" || p.startsWith("/stock") },
  { href: "/reader", label: "판독기", isActive: (p: string) => p.startsWith("/reader") },
  { href: "/allocate", label: "분배", isActive: (p: string) => p.startsWith("/allocate") },
];

/** 제품 표식: 고점에서 아래로 내려가는 매수존 사다리 네 칸. 마지막 칸이 지금 가격. */
export function Mark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden className={className}>
      <rect x="2" y="3" width="16" height="2.5" rx="1" className="fill-ink" />
      <rect x="2" y="7.5" width="12" height="2.5" rx="1" className="fill-ink" />
      <rect x="2" y="12" width="8" height="2.5" rx="1" className="fill-ink" />
      <rect x="2" y="16.5" width="4" height="2.5" rx="1" className="fill-accent" />
    </svg>
  );
}

/** 위: 워드마크(+ 넓은 화면에서는 메뉴)와 테마 전환. 아래: 휴대폰용 탭바. */
export function NavBar() {
  const pathname = usePathname() ?? "/";
  return (
    <>
      <header className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 text-[17px] font-bold tracking-tight">
          <Mark className="h-5 w-5" />
          관심종목
        </Link>
        <nav aria-label="주요 메뉴" className="hidden items-center gap-1 md:flex">
          {TABS.map((t) => {
            const active = t.isActive(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-control px-3 py-1.5 text-sm transition-colors ${
                  active ? "bg-raised font-semibold text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {t.label}
              </Link>
            );
          })}
          <span className="mx-2 h-4 w-px bg-line" aria-hidden />
          <ThemeToggle />
        </nav>
        <div className="md:hidden">
          <ThemeToggle />
        </div>
      </header>

      <nav
        aria-label="주요 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface md:hidden"
      >
        <div className="mx-auto flex max-w-md pb-[env(safe-area-inset-bottom)]">
          {TABS.map((t) => {
            const active = t.isActive(pathname);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-1 items-center justify-center text-[15px] transition-colors ${
                  active ? "font-semibold text-ink" : "text-muted"
                }`}
              >
                <span className={`rounded-control px-3 py-1 ${active ? "bg-raised" : ""}`}>{t.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

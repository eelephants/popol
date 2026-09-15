"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "분석", isActive: (p: string) => p === "/" || p.startsWith("/stock") },
  { href: "/allocate", label: "분배", isActive: (p: string) => p.startsWith("/allocate") },
];

export function NavBar() {
  const pathname = usePathname() ?? "/";
  return (
    <nav
      aria-label="주요 메뉴"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95"
    >
      <div className="mx-auto flex max-w-md pb-[env(safe-area-inset-bottom)]">
        {TABS.map((t) => {
          const active = t.isActive(pathname);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 py-3 text-center text-sm font-medium ${
                active ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500"
              }`}
            >
              {active && <span className="absolute inset-x-6 top-0 h-0.5 rounded-full bg-zinc-900 dark:bg-zinc-100" />}
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

import Link from "next/link";
import { guideBySlug, type Guide } from "@/lib/guides";

/** 가이드 글로 가는 링크 목록(홈·종목·도구 화면 아래). 제목과 한 줄 설명을 함께 보여 준다. */
export function GuideLinks({ label, slugs, className = "mt-10" }: { label: string; slugs: string[]; className?: string }) {
  const items = slugs.map(guideBySlug).filter((g): g is Guide => g != null);
  return (
    <nav aria-label={label} className={className}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{label}</h2>
        <Link href="/guide" className="text-sm text-muted hover:text-ink">전체 가이드 →</Link>
      </div>
      <ul className="divide-y divide-rule rounded-card border border-line bg-surface">
        {items.map((g) => (
          <li key={g.slug}>
            <Link href={`/guide/${g.slug}`} className="block px-4 py-3 transition-colors hover:bg-raised">
              <span className="block text-[15px] font-semibold">{g.title}</span>
              <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{g.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

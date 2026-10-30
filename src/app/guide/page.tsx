import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES, GUIDE_CATEGORIES, readingMinutes } from "@/lib/guides";
import { PageTitle } from "@/components/ui";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

const title = "투자 지표 가이드 — RSI·이동평균·매수존·밸류에이션 읽는 법";
const description =
  "RSI, 50·200일 이동평균, 이격도, 52주 고점 매수존, PER·PBR, 적정주가, 공포·탐욕 지표, 자산 분배를 계산 예시와 함께 쉽게 풀어 쓴 가이드.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/guide" },
  openGraph: { ...OG_BASE, url: "/guide", title, description, images: OG_IMAGE },
  twitter: { card: "summary_large_image" },
};

export default function GuideIndex() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <PageTitle
        title="투자 지표 가이드"
        sub="관심종목이 계산하는 지표가 무엇을 뜻하고 어떻게 계산되는지, 숫자 예시로 풀어 썼어요."
      />
      <div className="grid gap-8 md:grid-cols-2">
        {GUIDE_CATEGORIES.map((cat) => (
          <section key={cat}>
            <h2 className="mb-3 text-base font-semibold">{cat}</h2>
            <ul className="divide-y divide-rule rounded-card border border-line bg-surface">
              {GUIDES.filter((g) => g.category === cat).map((g) => (
                <li key={g.slug}>
                  <Link href={`/guide/${g.slug}`} className="block px-4 py-3 transition-colors hover:bg-raised">
                    <span className="block text-[15px] font-semibold">{g.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{g.description}</span>
                    <span className="num mt-1 block text-xs text-faint">{readingMinutes(g)}분 읽기</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

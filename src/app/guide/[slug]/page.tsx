import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES, guideBySlug, readingMinutes, type GuideBlock } from "@/lib/guides";
import { GuideLinks } from "@/components/GuideLinks";
import { ProseNote, ProseSection, ProseTable } from "@/components/Prose";
import { OG_BASE, OG_IMAGE, SITE_URL } from "@/lib/site";

type Params = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const g = guideBySlug((await params).slug);
  if (!g) return {};
  const url = `/guide/${g.slug}`;
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: url },
    openGraph: { ...OG_BASE, type: "article", url, title: g.title, description: g.description, images: OG_IMAGE },
    twitter: { card: "summary_large_image" },
  };
}

function Block({ b }: { b: GuideBlock }) {
  if (typeof b === "string") return <p>{b}</p>;
  if ("list" in b)
    return (
      <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
        {b.list.map((li) => <li key={li}>{li}</li>)}
      </ul>
    );
  if ("note" in b) return <ProseNote>{b.note}</ProseNote>;
  if ("faq" in b)
    return (
      <dl className="space-y-4">
        {b.faq.map((f) => (
          <div key={f.q}>
            <dt className="font-semibold">{f.q}</dt>
            <dd className="mt-1">{f.a}</dd>
          </div>
        ))}
      </dl>
    );
  return <ProseTable head={b.table.head} rows={b.table.rows} />;
}

const dateKo = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return `${y}년 ${m}월 ${day}일`;
};

export default async function GuidePage({ params }: Params) {
  const g = guideBySlug((await params).slug);
  if (!g) notFound();
  const url = `${SITE_URL}/guide/${g.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: g.title,
      description: g.description,
      datePublished: g.updated,
      dateModified: g.updated,
      inLanguage: "ko",
      mainEntityOfPage: url,
      author: { "@type": "Organization", name: "관심종목", url: SITE_URL },
      publisher: { "@type": "Organization", name: "관심종목", url: SITE_URL },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "가이드", item: `${SITE_URL}/guide` },
        { "@type": "ListItem", position: 2, name: g.title, item: url },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="md:grid md:grid-cols-[minmax(0,42rem)_200px] md:justify-between md:gap-10">
      <article>
        <nav aria-label="위치" className="pt-2 text-sm text-muted">
          <Link href="/guide" className="hover:text-ink">가이드</Link>
          <span aria-hidden className="mx-1.5">/</span>
          <span>{g.category}</span>
        </nav>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">{g.title}</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">{g.description}</p>
        <p className="num mt-2 text-xs text-faint">
          <time dateTime={g.updated}>{dateKo(g.updated)}</time> 고침 · {readingMinutes(g)}분 읽기
        </p>

        {g.sections.map((s, i) => (
          <ProseSection key={s.heading} id={`s${i + 1}`} title={s.heading}>
            {s.body.map((b, i) => <Block key={i} b={b} />)}
          </ProseSection>
        ))}

        <Link
          href={g.tool.href}
          className="mt-10 flex h-12 items-center justify-between rounded-card bg-ink px-5 text-[15px] font-semibold text-ground transition-opacity hover:opacity-90"
        >
          {g.tool.label}
          <span aria-hidden>→</span>
        </Link>

        <GuideLinks label="이어서 읽기" slugs={g.related} />
      </article>
      {/* 넓은 화면: 글 순서. 휴대폰에서는 본문만 */}
      <aside className="hidden md:block">
        <nav aria-label="이 글의 순서" className="sticky top-6 pt-10">
          <h2 className="text-sm font-semibold text-muted">이 글의 순서</h2>
          <ol className="mt-3 space-y-2 border-l border-line text-sm">
            {g.sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#s${i + 1}`} className="-ml-px block border-l border-transparent pl-3 text-muted hover:border-ink hover:text-ink">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
          <Link href="/guide" className="mt-6 block text-sm text-muted hover:text-ink">전체 가이드 →</Link>
        </nav>
      </aside>
      </div>
    </main>
  );
}

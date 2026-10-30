import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnrichedStock } from "@/lib/stockData";
import { POPULAR_TICKERS, POPULAR_KR, SEED_TICKERS } from "@/lib/popular";
import { KR_STOCKS } from "@/lib/krStocks";
import { StockAnalysis } from "@/components/StockAnalysis";
import { TickerChips } from "@/components/TickerChips";
import { GuideLinks } from "@/components/GuideLinks";
import { Panel } from "@/components/ui";
import { stockNarrative } from "@/lib/stockNarrative";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

type Params = { params: Promise<{ ticker: string }> };

// SSR per request — Yahoo data is live (provider uses no-store).
export const dynamic = "force-dynamic";

// Chart meta has no company name; resolve display name for seed tickers.
const displayName = (t: string) =>
  SEED_TICKERS.find((p) => p.ticker === t)?.name ??
  KR_STOCKS.find((s) => s.ticker === t)?.krName;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker).trim().toUpperCase();
  // Yahoo outages throw → 500 (crawler retries); only a real unknown ticker is null → 404.
  // ponytail: the 500 relies on no loading.tsx/Suspense above this page — adding one turns it into a streamed 200.
  const stock = await getEnrichedStock(t, displayName(t));
  if (!stock) {
    return { title: `${t} — 종목을 찾을 수 없음`, robots: { index: false, follow: false } };
  }
  const price =
    stock.price != null
      ? stock.market === "KR"
        ? `₩${Math.round(stock.price).toLocaleString()}`
        : `$${stock.price.toFixed(2)}`
      : "";
  const rsi = stock.rsi14 != null ? `RSI ${stock.rsi14.toFixed(0)}` : "";
  const cross =
    stock.crossState === "golden" ? "골든크로스" : stock.crossState === "death" ? "데드크로스" : "";
  const title = `${stock.name} (${t}) 분석 — RSI·매수존·밸류에이션`;
  const description =
    `${stock.name}(${t}) ${[price, rsi, cross].filter(Boolean).join(" · ")}. ` +
    `이동평균 50/200·매수존(-10~-25%)·밸류에이션을 실시간 무료 데이터로 자동 계산.`;
  const url = `/stock/${t}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { ...OG_BASE, url, title, description, images: OG_IMAGE },
    twitter: { card: "summary_large_image" },
  };
}

export default async function StockPage({ params }: Params) {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker).trim().toUpperCase();
  const stock = await getEnrichedStock(t, displayName(t));
  if (!stock) notFound();
  const others = (stock.market === "KR" ? POPULAR_KR : POPULAR_TICKERS).filter((p) => p.ticker !== t);
  const narrative = stockNarrative(stock);

  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <div className="pb-4 pt-2">
        <Link href="/" className="text-sm text-muted hover:text-ink">← 다른 종목 검색</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {stock.name} 분석
        </h1>
        <p className="mt-1 text-sm text-muted">
          RSI·이동평균(50/200)·매수존(−10~−25%)·밸류에이션을 실시간 무료 데이터로 계산했어요. 모든 종목에 같은 공식을 써요.
        </p>
      </div>
      <StockAnalysis stock={stock} />
      {narrative.length > 0 && (
        <Panel className="mt-4 p-5">
          <h2 className="text-base font-semibold">지금 지표 읽기</h2>
          <dl className="mt-3 space-y-3 text-[15px] leading-relaxed">
            {narrative.map((n) => (
              <div key={n.topic}>
                <dt className="text-sm font-semibold text-muted">{n.topic}</dt>
                <dd>
                  {n.text}{" "}
                  <Link href={`/guide/${n.guide}`} className="whitespace-nowrap text-sm text-muted underline decoration-control underline-offset-2 hover:text-ink">
                    읽는 법
                  </Link>
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-muted">공개 데이터를 같은 공식으로 계산한 참고 자료이며 매매 권유가 아닙니다.</p>
        </Panel>
      )}
      <TickerChips label="다른 종목 분석" items={others} />
      <GuideLinks label="지표 가이드" slugs={["buy-zone", "rsi", "moving-average", "valuation-ratios"]} />
    </main>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEnrichedStock } from "@/lib/stockData";
import { POPULAR_TICKERS } from "@/lib/popular";
import { StockAnalysis } from "@/components/StockAnalysis";

type Params = { params: Promise<{ ticker: string }> };

// SSR per request — Yahoo data is live (provider uses no-store).
export const dynamic = "force-dynamic";

// Chart meta has no company name; resolve display name for seed tickers.
const displayName = (t: string) => POPULAR_TICKERS.find((p) => p.ticker === t)?.name;

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker).trim().toUpperCase();
  const stock = await getEnrichedStock(t, displayName(t));
  if (!stock) {
    return { title: `${t} — 종목을 찾을 수 없음`, robots: { index: false, follow: false } };
  }
  const price = stock.price != null ? `$${stock.price.toFixed(2)}` : "";
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
    openGraph: { type: "website", url, title, description, locale: "ko_KR", siteName: "관심종목" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function StockPage({ params }: Params) {
  const { ticker } = await params;
  const t = decodeURIComponent(ticker).trim().toUpperCase();
  const stock = await getEnrichedStock(t, displayName(t));
  if (!stock) notFound();

  return (
    <main className="mx-auto max-w-md pb-10">
      <div className="px-4 pt-3">
        <Link href="/" className="text-sm text-zinc-500">← 검색으로 돌아가기</Link>
        <h1 className="mt-1 text-lg font-bold">
          {stock.name} <span className="text-sm text-zinc-500">{t}</span> 분석
        </h1>
      </div>
      <StockAnalysis stock={stock} />
      <p className="px-4 pt-4 text-xs text-zinc-400">
        RSI·이동평균(50/200)·매수존(-10~-25%)·밸류에이션을 실시간 무료 데이터로 자동 계산합니다.
        계산 공식은 모든 종목에 동일하게 적용됩니다.
      </p>
    </main>
  );
}

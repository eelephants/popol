import type { Metadata } from "next";
import { OG_BASE, OG_IMAGE } from "@/lib/site";
import { GuideLinks } from "@/components/GuideLinks";

const title = "주식 판독기 — 역발상·차트·주가 판독, 적정주가 계산, 몰빵지수";
const description =
  "풋콜비율·VIX·하이일드 스프레드로 보는 역발상 판독기, S&P 500 이격도·RSI 차트 판독기, EPS 성장률 기반 적정주가 계산기와 주가 판독기, 포트폴리오 쏠림을 보는 몰빵지수.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/reader" },
  openGraph: { ...OG_BASE, url: "/reader", title, description, images: OG_IMAGE },
  twitter: { card: "summary_large_image" },
};

export default function ReaderLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      {/* 계산 화면 아래 해설 링크: 도구만 있는 화면에 읽을 거리를 붙인다 */}
      <div className="mx-auto max-w-5xl px-4 md:px-8">
        <GuideLinks label="판독기 지표 가이드" slugs={["market-sentiment", "market-breadth", "fair-price", "concentration"]} />
      </div>
    </>
  );
}

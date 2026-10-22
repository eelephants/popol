import type { Metadata } from "next";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

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
  return children;
}

import type { Metadata } from "next";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

const title = "자산 분배 계산기 — 비율별 매수 주수·소수점 매수";
const description =
  "총 자산과 종목별 비율을 넣으면 배분 금액과 매수 주수(소수점 6자리)를 계산합니다. 미국·한국 주식 혼합, 원화·달러 표시 전환 지원.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/allocate" },
  openGraph: { ...OG_BASE, url: "/allocate", title, description, images: OG_IMAGE },
  twitter: { card: "summary_large_image" },
};

export default function AllocateLayout({ children }: { children: React.ReactNode }) {
  return children;
}

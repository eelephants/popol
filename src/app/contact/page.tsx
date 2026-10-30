import type { Metadata } from "next";
import Link from "next/link";
import { ExtLink, ProseSection } from "@/components/Prose";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

const title = "문의";
const description = "관심종목(stock-budget.site) 계산 오류 제보, 기능 제안, 개인정보·광고 관련 문의 방법.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/contact" },
  openGraph: { ...OG_BASE, url: "/contact", title, description, images: OG_IMAGE },
};

const ISSUES = "https://github.com/eelephants/popol/issues";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <div className="max-w-2xl">
        <h1 className="pt-2 text-2xl font-bold tracking-tight">문의</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          계산이 이상해 보이거나, 있었으면 하는 기능이 있다면 알려 주세요.
        </p>

        <ProseSection title="문의 남기는 곳">
          <p>
            문의는 <ExtLink href={ISSUES}>GitHub 이슈</ExtLink>로 받습니다. GitHub 계정으로 로그인한 뒤 &lsquo;New issue&rsquo;를 눌러 내용을 적어
            주세요. 남긴 문의와 답변은 공개되므로 개인정보나 계좌 정보는 적지 마세요.
          </p>
        </ProseSection>

        <ProseSection title="빨리 확인할 수 있게 적어 주세요">
          <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
            <li>계산 오류: 종목 코드(예: AAPL, 005930.KS), 본 화면, 이상하다고 느낀 값과 비교한 출처</li>
            <li>화면 문제: 기기와 브라우저(예: 아이폰 사파리), 어떤 동작을 했을 때 생기는지</li>
            <li>기능 제안: 어떤 상황에서 무엇을 확인하고 싶은지</li>
          </ul>
        </ProseSection>

        <ProseSection title="답하기 어려운 문의">
          <p>
            &lsquo;이 종목을 지금 사도 될까요&rsquo; 같은 개별 투자 상담에는 답하지 않습니다. 관심종목은 공개 데이터를 계산해 보여 주는 도구이고
            투자 자문을 하지 않아요. 지표를 읽는 법은 <Link href="/guide" className="underline decoration-control underline-offset-2">가이드</Link>에
            정리해 두었습니다.
          </p>
        </ProseSection>
      </div>
    </main>
  );
}

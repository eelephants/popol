import type { Metadata } from "next";
import Link from "next/link";
import { ProseSection } from "@/components/Prose";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

const title = "이용약관";
const description = "관심종목(stock-budget.site) 이용 조건, 투자 정보의 성격과 면책, 데이터 정확성, 광고, 약관 변경에 관한 안내.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/terms" },
  openGraph: { ...OG_BASE, url: "/terms", title, description, images: OG_IMAGE },
};

const EFFECTIVE = "2026년 10월 30일";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <div className="max-w-2xl">
        <h1 className="pt-2 text-2xl font-bold tracking-tight">이용약관</h1>
        <p className="mt-1 text-xs text-muted">시행일 {EFFECTIVE}</p>

        <ProseSection title="1. 서비스">
          <p>
            관심종목(이하 &lsquo;서비스&rsquo;)은 공개된 시세·재무·시장 데이터를 정해진 공식으로 계산해 보여 주는 무료 웹 서비스입니다. 회원가입
            없이 누구나 이용할 수 있으며, 이 약관은 stock-budget.site의 모든 화면에 적용됩니다.
          </p>
        </ProseSection>

        <ProseSection title="2. 투자 정보의 성격">
          <p>
            서비스가 보여 주는 매수존, 지표, 점수, 판독 문구, 적정주가와 목표주가, 배분 계산은 모두 참고용 계산 결과입니다. 특정 금융투자상품의
            매수·매도를 권유하거나 투자 자문을 제공하지 않으며, 서비스는 투자자문업자나 투자일임업자가 아닙니다.
          </p>
          <p>투자 판단과 그 결과에 대한 책임은 이용자 본인에게 있습니다.</p>
        </ProseSection>

        <ProseSection title="3. 데이터의 정확성">
          <p>
            서비스는 Yahoo Finance, 미국 SEC EDGAR, Nasdaq, Finnhub, CNN, AAII, FRED, Frankfurter 등 제3자가 제공하는 데이터를 씁니다. 제공처의
            지연·누락·오류나 일시적인 장애로 값이 늦거나 틀릴 수 있으며, 서비스는 데이터의 정확성·완전성·적시성을 보증하지 않습니다. 실제 거래
            전에는 이용하는 증권사의 시세를 확인해 주세요.
          </p>
        </ProseSection>

        <ProseSection title="4. 이용자가 넣은 값">
          <p>
            판독기, 적정주가 계산기, 자산 분배, 몰빵지수에 넣은 값은 이용자의 브라우저에만 저장되고 서버로 보내지 않습니다. 브라우저 데이터를
            지우면 함께 사라지며, 서비스는 이를 복구할 수 없습니다. 자세한 내용은{" "}
            <Link href="/privacy" className="underline decoration-control underline-offset-2">개인정보처리방침</Link>을 확인해 주세요.
          </p>
        </ProseSection>

        <ProseSection title="5. 광고">
          <p>
            서비스는 운영비를 충당하기 위해 Google AdSense 광고를 게재합니다. 광고의 내용은 광고주와 광고 네트워크가 정하며, 서비스는 광고에서
            소개하는 상품이나 서비스를 보증하지 않습니다.
          </p>
        </ProseSection>

        <ProseSection title="6. 금지 행위">
          <p>
            서비스의 정상적인 운영을 방해하는 행위, 예를 들어 자동화된 수단으로 짧은 시간에 과도한 요청을 보내 서버나 데이터 제공처에 부담을 주는
            행위는 허용되지 않습니다.
          </p>
        </ProseSection>

        <ProseSection title="7. 서비스의 변경과 중단">
          <p>
            계산 방식, 화면, 데이터 출처는 더 나은 서비스를 위해 예고 없이 바뀔 수 있습니다. 데이터 제공처의 정책 변경이나 운영상의 이유로 일부
            기능이 중단될 수도 있습니다.
          </p>
        </ProseSection>

        <ProseSection title="8. 약관 변경과 문의">
          <p>
            이 약관이 바뀌면 이 페이지에 시행일과 함께 알립니다. 약관에 관한 문의는{" "}
            <Link href="/contact" className="underline decoration-control underline-offset-2">문의</Link> 페이지의 안내를 따라 주세요.
          </p>
        </ProseSection>
      </div>
    </main>
  );
}

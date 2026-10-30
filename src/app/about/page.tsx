import type { Metadata } from "next";
import Link from "next/link";
import { ExtLink, ProseSection, ProseTable } from "@/components/Prose";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

const title = "서비스 소개";
const description =
  "관심종목(stock-budget.site)이 무엇을 계산하는지, 어떤 공개 데이터를 쓰는지, 계산 원칙과 한계를 소개합니다.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/about" },
  openGraph: { ...OG_BASE, url: "/about", title, description, images: OG_IMAGE },
};

const SOURCES = [
  ["Yahoo Finance", "현재가, 52주 최고·최저가, 2년치 일별 종가·거래량", "조회할 때마다"],
  ["미국 SEC EDGAR", "연간 보고서(10-K)의 희석 주당순이익", "조회할 때마다"],
  ["Nasdaq", "애널리스트 연간 EPS 컨센서스", "조회할 때마다"],
  ["Finnhub", "PER·PSR·PBR·ROE (미국 종목)", "조회할 때마다"],
  ["CNN 공포·탐욕 지수", "지수 값, 풋콜비율, VIX", "하루 단위"],
  ["AAII 투자자 심리 설문", "Bull-Bear Spread", "주 단위"],
  ["FRED (미국 연준 경제 데이터)", "10년물 국채 금리, 하이일드 스프레드", "하루 단위"],
  ["Frankfurter", "원·달러 기준 환율", "하루 단위"],
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 md:px-8">
      <div className="max-w-2xl">
        <h1 className="pt-2 text-2xl font-bold tracking-tight">서비스 소개</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          관심종목은 미국·한국 주식을 검색하면 매수존, RSI, 이동평균, 밸류에이션을 한 화면에 계산해 주는 무료 웹 서비스예요.
        </p>

        <ProseSection title="무엇을 하나요">
          <p>
            주식을 살 때 많은 사람이 묻는 질문은 &lsquo;지금 이 가격이 비싼 걸까, 싼 걸까&rsquo;입니다. 그런데 답에 필요한 숫자는 여러 사이트에
            흩어져 있고, 같은 지표라도 계산 기준이 제각각이에요. 관심종목은 이 숫자들을 정해진 공식으로 한곳에 모아 보여 줍니다.
          </p>
          <ul className="list-disc space-y-1.5 pl-5 marker:text-faint">
            <li><Link href="/" className="underline decoration-control underline-offset-2">종목 분석</Link>: 52주 고점 대비 매수존(−10~−25%), RSI(14), 50·200일선 이격도와 추세, 밸류에이션</li>
            <li><Link href="/reader" className="underline decoration-control underline-offset-2">판독기</Link>: 시장 심리와 지수 흐름을 1~5점으로 바꾼 판독, EPS 성장률 기반 적정주가, 보유 종목 쏠림을 보는 몰빵지수</li>
            <li><Link href="/allocate" className="underline decoration-control underline-offset-2">자산 분배</Link>: 총 자산과 비율로 배분 금액과 살 주수(소수점 6자리) 계산</li>
            <li><Link href="/guide" className="underline decoration-control underline-offset-2">가이드</Link>: 각 지표의 뜻과 계산 방법, 읽는 법과 한계를 숫자 예시로 설명한 글</li>
          </ul>
        </ProseSection>

        <ProseSection title="계산 원칙">
          <p>
            모든 종목에 같은 공식을 씁니다. 특정 종목을 골라 추천하거나 순위를 매기지 않고, 검색한 종목이 무엇이든 같은 기준으로 계산한 결과만
            보여 줘요. 각 공식과 기준값은 <Link href="/guide" className="underline decoration-control underline-offset-2">가이드</Link>에 그대로 공개했습니다.
          </p>
          <p>
            판독기의 점수 구간과 밸류에이션 기준은 널리 알려진 투자 원칙(가치투자의 PER·PBR 기준, 성장률만큼의 적정 PER, 역발상 투자의 심리
            지표 등)을 출발점으로 정했어요. 기준은 판단을 돕는 잣대일 뿐 정답이 아니며, 화면마다 기준표를 함께 보여 줘서 이용자가 직접 확인할 수
            있게 했습니다.
          </p>
        </ProseSection>

        <ProseSection title="데이터 출처">
          <p>회원가입이나 유료 구독 없이 누구나 볼 수 있는 공개 데이터만 씁니다.</p>
          <ProseTable head={["출처", "가져오는 값", "갱신"]} rows={SOURCES} />
          <p>
            무료로 자동 수집할 수 있는 출처가 없는 일부 지표(FINRA 신용융자, S&P 500 선행 P/E, 이동평균 위 종목 비율)는 판독기에서 직접 넣도록
            했고, 넣은 값은 이 기기에만 저장돼요.
          </p>
        </ProseSection>

        <ProseSection title="한계와 책임">
          <p>
            데이터 제공처의 지연이나 오류, 일시적인 장애로 숫자가 늦거나 틀릴 수 있어요. 지표는 모두 과거와 현재의 공개 데이터를 계산한 것이라
            앞으로의 주가를 예측하거나 보장하지 않습니다. 관심종목의 모든 결과는 참고 자료이며 투자 권유가 아니고, 투자 판단과 책임은 이용자에게
            있습니다. 자세한 내용은 <Link href="/terms" className="underline decoration-control underline-offset-2">이용약관</Link>을 확인해 주세요.
          </p>
        </ProseSection>

        <ProseSection title="운영과 문의">
          <p>
            관심종목은 개인 프로젝트로 만들어 운영하며, 사이트 운영비는 광고(Google AdSense)로 충당합니다. 소스 코드는{" "}
            <ExtLink href="https://github.com/eelephants/popol">GitHub</ExtLink>에 공개되어 있어 계산 방식을 코드로도 확인할 수 있어요.
          </p>
          <p>
            계산 오류 제보나 기능 제안은 <Link href="/contact" className="underline decoration-control underline-offset-2">문의</Link> 페이지의
            안내를 따라 남겨 주세요.
          </p>
        </ProseSection>
      </div>
    </main>
  );
}

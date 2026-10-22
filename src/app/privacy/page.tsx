import type { Metadata } from "next";
import { OG_BASE, OG_IMAGE } from "@/lib/site";

const title = "개인정보처리방침";
const description = "관심종목(stock-budget.site)이 다루는 정보, 기기 저장 데이터, 광고 쿠키(Google AdSense)와 맞춤 광고 해제 방법.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privacy" },
  openGraph: { ...OG_BASE, url: "/privacy", title, description, images: OG_IMAGE },
};

const EFFECTIVE = "2026년 10월 23일";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{children}</div>
    </section>
  );
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-2">
    {children}
  </a>
);

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-md px-4 pb-10 pt-3">
      <h1 className="text-lg font-bold">개인정보처리방침</h1>
      <p className="mt-1 text-xs text-zinc-500">시행일 {EFFECTIVE}</p>

      <Section title="수집하는 정보">
        <p>관심종목은 회원가입이나 로그인이 없고, 이름·연락처·이메일 같은 개인정보를 직접 수집하지 않습니다.</p>
      </Section>

      <Section title="이 기기에만 저장되는 정보">
        <p>
          최근 검색한 종목, 판독기와 적정주가 계산기에 넣은 값, 자산 분배·몰빵지수 입력값, 화면 테마는 브라우저의 저장소(localStorage)에만
          보관되며 서버로 보내지 않습니다. 브라우저의 사이트 데이터 삭제로 언제든 지울 수 있습니다.
        </p>
      </Section>

      <Section title="서버를 거치는 정보">
        <p>
          종목을 조회하면 종목 코드(예: AAPL)가 서버를 거쳐 시세·재무 데이터 제공처(Yahoo Finance, 미국 SEC EDGAR, CNN, FRED, Finnhub,
          Frankfurter)로 전달됩니다. 개인을 식별하는 정보는 함께 보내지 않습니다.
        </p>
        <p>사이트는 Vercel에서 운영되며, 접속 시 IP 주소·브라우저 정보 같은 기술적 기록이 호스팅 운영을 위해 처리될 수 있습니다.</p>
      </Section>

      <Section title="광고와 쿠키">
        <p>
          이 사이트는 Google AdSense 광고를 게재합니다. Google을 비롯한 제3자 공급업체는 쿠키를 사용해 사용자의 이 사이트 또는 다른
          사이트 방문 기록을 바탕으로 광고를 게재합니다.
        </p>
        <p>
          Google은 광고 쿠키를 사용해 Google과 파트너가 이 사이트와 인터넷의 다른 사이트 방문 기록을 바탕으로 광고를 게재할 수 있게
          합니다. 자세한 내용은 <A href="https://policies.google.com/technologies/ads">Google 광고 정책</A>을 참고하세요.
        </p>
        <p>
          맞춤 광고는 <A href="https://myadcenter.google.com/">Google 내 광고 센터</A>에서 끌 수 있고, 제3자 공급업체의 맞춤 광고 쿠키는{" "}
          <A href="https://www.aboutads.info/choices/">aboutads.info</A>에서 거부할 수 있습니다.
        </p>
      </Section>

      <Section title="투자 정보에 대하여">
        <p>사이트의 지표와 판독 결과는 공개 데이터를 계산한 참고 자료이며 투자 권유가 아닙니다. 투자 판단과 책임은 이용자에게 있습니다.</p>
      </Section>

      <Section title="문의와 변경">
        <p>
          문의는 <A href="https://github.com/eelephants/popol/issues">GitHub 이슈</A>로 남겨 주세요. 이 방침이 바뀌면 이 페이지에
          시행일과 함께 알립니다.
        </p>
      </Section>
    </main>
  );
}

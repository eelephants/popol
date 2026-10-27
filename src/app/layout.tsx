import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { SITE_URL, OG_BASE } from "@/lib/site";
import { adsenseClient } from "@/lib/ads";

const TITLE = "관심종목 · 미국·한국 주식 RSI·매수존 자동 분석";
const DESCRIPTION =
  "검색한 미국·한국 주식의 RSI·이동평균(50/200)·매수존(-10~-25%)·밸류에이션을 무료 실시간 데이터로 자동 계산하는 모바일 PWA. 공포탐욕지수·10년물 금리·환율 매크로 지표 포함.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · 관심종목" },
  description: DESCRIPTION,
  applicationName: "관심종목",
  keywords: ["미국 주식 분석", "한국 주식 분석", "국장", "삼성전자 RSI", "RSI 계산", "이동평균선 50 200", "매수존", "밸류에이션", "공포탐욕지수", "주식 PWA", "stock analyzer"],
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // GOOGLE_/NAVER_SITE_VERIFICATION in Vercel env emit the Search Console / Search Advisor tags.
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
  // og:image / twitter image come from app/opengraph-image.tsx (file convention).
  openGraph: {
    ...OG_BASE,
    url: SITE_URL,
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "관심종목" },
};
// WebSite (not WebApplication): Google reads it for the site name; the app
// rich result would need ratings we don't have.
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "관심종목",
  alternateName: "popol",
  url: SITE_URL,
  inLanguage: "ko",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0c0d0f" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adClient = adsenseClient();
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* AdSense: 사이트 확인용 메타 + 자동 광고 스크립트. 심사 크롤러가 head에서 찾으므로 next/script가 아닌 일반 태그로 둔다. */}
        {adClient && (
          <>
            <meta name="google-adsense-account" content={adClient} />
            <script async src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adClient}`} crossOrigin="anonymous" />
          </>
        )}
      </head>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        <NavBar />
        <div className="pb-20 md:pb-10">
          {children}
          <footer className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 pb-6 pt-10 text-xs text-muted md:px-8">
            <span>관심종목 · 공개 데이터를 계산한 참고 자료이며 매매 권유가 아닙니다.</span>
            <Link href="/privacy" className="hover:text-ink">개인정보처리방침</Link>
          </footer>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  );
}

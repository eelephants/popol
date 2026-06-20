import type { Metadata, Viewport } from "next";
import "./globals.css";

const SITE_URL = "https://popol-topaz.vercel.app";
const TITLE = "관심종목 · 미국 주식 RSI·매수존 자동 분석";
const DESCRIPTION =
  "검색한 미국 주식의 RSI·이동평균(50/200)·매수존(-10~-25%)·밸류에이션을 무료 실시간 데이터로 자동 계산하는 모바일 PWA. 공포탐욕지수·10년물 금리·환율 매크로 지표 포함.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s · 관심종목" },
  description: DESCRIPTION,
  applicationName: "관심종목",
  keywords: ["미국 주식 분석", "RSI 계산", "이동평균선 50 200", "매수존", "밸류에이션", "공포탐욕지수", "주식 PWA", "stock analyzer"],
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  // Set GOOGLE_SITE_VERIFICATION in Vercel env to emit the Search Console tag.
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  // og:image / twitter image come from app/opengraph-image.tsx (file convention).
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: SITE_URL,
    siteName: "관심종목",
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
export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
          }}
        />
      </body>
    </html>
  );
}

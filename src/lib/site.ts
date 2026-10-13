export const SITE_URL = "https://popol-topaz.vercel.app";

/** Shared openGraph fields. A page-level openGraph object replaces the root one
 *  wholesale, so child pages spread this and add `images: OG_IMAGE`; Next fills
 *  twitter title/description/images from openGraph when a page sets only `card`. */
export const OG_BASE = { type: "website", locale: "ko_KR", siteName: "관심종목" } as const;
export const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "관심종목 — 미국·한국 주식 RSI·매수존 자동 분석",
};

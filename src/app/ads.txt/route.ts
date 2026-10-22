import { adsTxt, adsenseClient } from "@/lib/ads";

/** AdSense 판매자 인증 파일. 게시자 ID가 없으면 404 — 빈 ads.txt는 "광고 판매자 없음"으로 읽힌다. */
export function GET() {
  const body = adsTxt(adsenseClient());
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}

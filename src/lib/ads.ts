// Google AdSense. 게시자 ID는 Vercel 환경변수 ADSENSE_CLIENT(ca-pub-숫자 16자리)로 받는다.
// 없거나 형식이 틀리면 광고 스크립트·ads.txt를 내보내지 않는다 (로컬·프리뷰 기본값).

const CLIENT_RE = /^ca-pub-\d{16}$/;

export function adsenseClient(raw = process.env.ADSENSE_CLIENT): string | null {
  const v = raw?.trim();
  return v && CLIENT_RE.test(v) ? v : null;
}

/** ads.txt 한 줄. f08c47fec0942fa0은 Google의 공개 인증 기관 ID(TAG-ID). */
export function adsTxt(client: string | null): string | null {
  if (!client) return null;
  return `google.com, ${client.replace(/^ca-/, "")}, DIRECT, f08c47fec0942fa0\n`;
}

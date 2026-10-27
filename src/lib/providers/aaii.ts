// AAII 개인투자자 심리 설문 (매주 목요일 발표). 결과 페이지 HTML 표의 맨 윗줄이 최신 주다.
const URL_RESULTS = "https://www.aaii.com/sentimentsurvey/sent_results";

export type AaiiSentiment = {
  reportedDate: string; // 예: "Oct 21"
  bullish: number;
  neutral: number;
  bearish: number;
  /** Bull-Bear Spread(%p) = 강세 − 약세 */
  spread: number;
};

const pct = (s: string) => {
  const m = /(-?\d+(?:\.\d+)?)\s*%/.exec(s);
  return m ? Number(m[1]) : null;
};

/** 결과 표에서 날짜·강세·중립·약세 네 칸이 모두 읽히는 첫 행. 순수 함수. */
export function parseAaii(html: string): AaiiSentiment | null {
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) ?? []) {
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1].replace(/<[^>]+>/g, "").trim());
    if (cells.length < 4) continue;
    const [date, b, n, br] = cells;
    const bullish = pct(b);
    const neutral = pct(n);
    const bearish = pct(br);
    if (!/^[A-Za-z]{3}\s+\d{1,2}$/.test(date) || bullish == null || neutral == null || bearish == null) continue;
    return { reportedDate: date, bullish, neutral, bearish, spread: Math.round((bullish - bearish) * 10) / 10 };
  }
  return null;
}

export async function getAaiiSentiment(): Promise<AaiiSentiment | null> {
  try {
    const res = await fetch(URL_RESULTS, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "text/html",
      },
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parseAaii(await res.text());
  } catch {
    return null;
  }
}

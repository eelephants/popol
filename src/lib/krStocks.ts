import type { SymbolMatch } from "@/lib/providers/search";

export type KrStock = { ticker: string; krName: string; aliases?: string[] };

/** 코스피/코스닥 주요 종목 큐레이션 (확장 가능). .KS=코스피, .KQ=코스닥.
 *  주의: 각 코드는 Yahoo 차트(KRW 반환)로 검증할 것 — Step 5 참고. */
export const KR_STOCKS: KrStock[] = [
  { ticker: "005930.KS", krName: "삼성전자" },
  { ticker: "000660.KS", krName: "SK하이닉스" },
  { ticker: "005380.KS", krName: "현대차" },
  { ticker: "000270.KS", krName: "기아" },
  { ticker: "373220.KS", krName: "LG에너지솔루션" },
  { ticker: "207940.KS", krName: "삼성바이오로직스" },
  { ticker: "068270.KS", krName: "셀트리온" },
  { ticker: "035420.KS", krName: "NAVER", aliases: ["네이버"] },
  { ticker: "035720.KS", krName: "카카오" },
  { ticker: "012330.KS", krName: "현대모비스" },
  { ticker: "005490.KS", krName: "POSCO홀딩스", aliases: ["포스코홀딩스", "포스코"] },
  { ticker: "105560.KS", krName: "KB금융" },
  { ticker: "055550.KS", krName: "신한지주" },
  { ticker: "006400.KS", krName: "삼성SDI" },
  { ticker: "051910.KS", krName: "LG화학" },
  { ticker: "028260.KS", krName: "삼성물산" },
  { ticker: "015760.KS", krName: "한국전력", aliases: ["한전"] },
  { ticker: "032830.KS", krName: "삼성생명" },
  { ticker: "086790.KS", krName: "하나금융지주" },
  { ticker: "066570.KS", krName: "LG전자" },
  { ticker: "247540.KQ", krName: "에코프로비엠" },
  { ticker: "086520.KQ", krName: "에코프로" },
  { ticker: "196170.KQ", krName: "알테오젠" },
  { ticker: "293490.KQ", krName: "카카오게임즈" },
  { ticker: "263750.KQ", krName: "펄어비스" },
  { ticker: "058470.KQ", krName: "리노공업" },
  { ticker: "035900.KQ", krName: "JYP Ent.", aliases: ["JYP"] },
];

const norm = (s: string) => s.replace(/\s+/g, "").toLowerCase();

export function resolveKrName(query: string): SymbolMatch[] {
  const nq = norm(query);
  if (!nq) return [];
  return KR_STOCKS.filter((s) => {
    const hay = [s.krName, ...(s.aliases ?? [])].map(norm);
    return hay.some((h) => h.includes(nq));
  })
    .map((s) => ({
      symbol: s.ticker,
      name: s.krName,
      exchange: s.ticker.endsWith(".KQ") ? "코스닥" : "코스피",
    }))
    .slice(0, 8);
}

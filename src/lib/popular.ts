/** Seed list of popular US tickers — used for /stock/[ticker] SEO pages,
 *  sitemap entries, and homepage internal links (crawlable discovery). */
export const POPULAR_TICKERS: { ticker: string; name: string }[] = [
  { ticker: "AAPL", name: "Apple" },
  { ticker: "MSFT", name: "Microsoft" },
  { ticker: "NVDA", name: "NVIDIA" },
  { ticker: "GOOGL", name: "Alphabet" },
  { ticker: "AMZN", name: "Amazon" },
  { ticker: "META", name: "Meta" },
  { ticker: "TSLA", name: "Tesla" },
  { ticker: "AVGO", name: "Broadcom" },
  { ticker: "AMD", name: "AMD" },
  { ticker: "NFLX", name: "Netflix" },
  { ticker: "JPM", name: "JPMorgan" },
  { ticker: "V", name: "Visa" },
];

export const POPULAR_KR = [
  { ticker: "005930.KS", name: "삼성전자" },
  { ticker: "000660.KS", name: "SK하이닉스" },
  { ticker: "373220.KS", name: "LG에너지솔루션" },
  { ticker: "035420.KS", name: "NAVER" },
  { ticker: "035720.KS", name: "카카오" },
  { ticker: "005380.KS", name: "현대차" },
  { ticker: "247540.KQ", name: "에코프로비엠" },
  { ticker: "068270.KS", name: "셀트리온" },
];

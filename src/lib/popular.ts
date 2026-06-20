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

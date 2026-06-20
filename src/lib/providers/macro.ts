async function fredObservations(seriesId: string, key: string, limit: number): Promise<number[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&file_type=json&api_key=${key}&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) return [];
  const obs = (await res.json())?.observations ?? [];
  return obs.map((o: { value: string }) => Number(o.value)).filter((n: number) => Number.isFinite(n));
}

export async function getTenYearYield(fredKey: string): Promise<number | null> {
  if (!fredKey) return null;
  const vals = await fredObservations("DGS10", fredKey, 5);
  return vals[0] ?? null;
}

export async function getHySpread(
  fredKey: string,
): Promise<{ value: number; percentile1y: number; rising: boolean } | null> {
  if (!fredKey) return null;
  const vals = await fredObservations("BAMLH0A0HYM2", fredKey, 260);
  if (vals.length === 0) return null;
  const value = vals[0];
  const below = vals.filter((v) => v <= value).length;
  const percentile1y = (below / vals.length) * 100;
  const rising = vals.length >= 2 ? vals[0] > vals[1] : false; // vals sorted desc: latest > previous
  return { value, percentile1y, rising };
}

export async function getFearGreed(): Promise<{ score: number; rating: string } | null> {
  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: {
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        Origin: "https://www.cnn.com",
        Referer: "https://www.cnn.com/",
        // CNN blocks generic UAs (HTTP 418); a full browser UA is required.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const fg = (await res.json())?.fear_and_greed;
    if (fg?.score == null) return null;
    return { score: Math.round(fg.score), rating: fg.rating ?? "" };
  } catch {
    return null;
  }
}

export async function getUsdKrw(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json())?.rates?.KRW ?? null;
  } catch {
    return null;
  }
}

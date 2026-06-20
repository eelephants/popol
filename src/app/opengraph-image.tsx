import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "관심종목 — 미국 주식 RSI·매수존 자동 분석";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE_KO = "관심종목";
const SUB_KO = "미국 주식 RSI · 매수존 · 밸류에이션 자동 분석";

/** Fetch a tiny Noto Sans KR subset (only the glyphs we render) as TTF.
 *  Returns undefined on any failure so the image still renders (Latin fallback). */
async function loadKoreanFont(weight: 400 | 700, text: string): Promise<ArrayBuffer | undefined> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}&text=${encodeURIComponent(text)}`;
    // No modern UA → Google Fonts serves a TTF url (Satori can't decode woff2).
    const css = await fetch(api).then((r) => (r.ok ? r.text() : ""));
    const url = css.match(/src:\s*url\((https:\/\/[^)]+\.ttf)\)/)?.[1];
    if (!url) return undefined;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : undefined;
  } catch {
    return undefined;
  }
}

export default async function Image() {
  const [bold, regular] = await Promise.all([
    loadKoreanFont(700, TITLE_KO),
    loadKoreanFont(400, SUB_KO),
  ]);
  const hasKo = Boolean(bold && regular);

  const fonts = hasKo
    ? [
        { name: "NotoKR", data: bold as ArrayBuffer, weight: 700 as const, style: "normal" as const },
        { name: "NotoKR", data: regular as ArrayBuffer, weight: 400 as const, style: "normal" as const },
      ]
    : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#09090b",
          color: "#fafafa",
          padding: "80px",
          fontFamily: hasKo ? "NotoKR" : "sans-serif",
        }}
      >
        <div style={{ fontSize: 132, fontWeight: 700, letterSpacing: -2 }}>
          {hasKo ? TITLE_KO : "popol"}
        </div>
        <div style={{ marginTop: 12, fontSize: 40, color: "#a1a1aa", fontWeight: 400 }}>
          {hasKo ? SUB_KO : "US Stock Analyzer · RSI · Buy Zone · Valuation"}
        </div>
        <div style={{ marginTop: 56, display: "flex", gap: 16 }}>
          {["RSI 14", "MA 50 / 200", "BUY ZONE -10~-25%"].map((t) => (
            <div
              key={t}
              style={{
                fontSize: 30,
                color: "#e4e4e7",
                border: "2px solid #27272a",
                borderRadius: 9999,
                padding: "10px 28px",
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 64, fontSize: 28, color: "#52525b" }}>popol-topaz.vercel.app</div>
      </div>
    ),
    { ...size, fonts },
  );
}

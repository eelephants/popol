import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "관심종목 — 미국 주식 RSI·매수존 자동 분석";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE_KO = "관심종목";
const SUB_KO = "미국 주식 RSI · 매수존 · 밸류에이션 자동 분석";

/** Fetch a tiny Noto Sans KR subset (only the glyphs we render).
 *  Returns undefined on failure → image still renders (Latin fallback). */
// Old Android UA → Google Fonts serves TTF (not woff2, which Satori can't decode).
const TTF_UA =
  "Mozilla/5.0 (Linux; U; Android 2.2; en-us; Nexus One Build/FRF91) AppleWebKit/533.1 (KHTML, like Gecko) Version/4.0 Mobile Safari/533.1";

async function loadKoreanFont(text: string): Promise<ArrayBuffer | undefined> {
  try {
    const api = `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(text)}`;
    const css = await fetch(api, { headers: { "User-Agent": TTF_UA } }).then((r) =>
      r.ok ? r.text() : "",
    );
    // Match by format('truetype'/'opentype') — Google's ttf url has no .ttf
    // extension. Never accept woff2 (Satori 500s at stream time, uncatchable).
    const url = css.match(/url\((https:\/\/[^)]+)\)\s*format\((?:'|")(?:truetype|opentype)(?:'|")\)/i)?.[1];
    if (!url) return undefined;
    const res = await fetch(url);
    return res.ok ? await res.arrayBuffer() : undefined;
  } catch {
    return undefined;
  }
}

function Card({ ko }: { ko: boolean }) {
  return (
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
        fontFamily: ko ? "NotoKR" : "sans-serif",
      }}
    >
      <div style={{ fontSize: ko ? 132 : 132, fontWeight: 700, letterSpacing: -2 }}>
        {ko ? TITLE_KO : "popol"}
      </div>
      <div style={{ marginTop: 12, fontSize: 40, color: "#a1a1aa" }}>
        {ko ? SUB_KO : "US Stock Analyzer · RSI · Buy Zone · Valuation"}
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
  );
}

export default async function Image() {
  const data = await loadKoreanFont(TITLE_KO + SUB_KO);
  if (data) {
    try {
      // ImageResponse throws if the font can't be decoded — fall back to Latin.
      return new ImageResponse(<Card ko />, {
        ...size,
        fonts: [{ name: "NotoKR", data, weight: 700, style: "normal" }],
      });
    } catch {
      /* fall through */
    }
  }
  return new ImageResponse(<Card ko={false} />, size);
}

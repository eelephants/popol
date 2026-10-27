import type { ReaderLevel } from "@/lib/readers";

// 판독기는 온도로 읽는다: 공포(차가운 파랑, 장기 매수 쪽) ↔ 광기(뜨거운 빨강, 분할 매도 쪽). 중립은 무채색.
export const LEVEL_PILL: Record<ReaderLevel, string> = {
  공포: "bg-cold-2 text-cold-2-ink",
  불안: "bg-cold-1 text-cold-1-ink",
  중립: "bg-flat text-flat-ink",
  과열: "bg-hot-1 text-hot-1-ink",
  광기: "bg-hot-2 text-hot-2-ink",
};

/** 게이지에서 현재 구간을 칠하는 색. */
export const LEVEL_FILL: Record<ReaderLevel, string> = {
  공포: "fill-[var(--temp-1)]",
  불안: "fill-[var(--temp-2)]",
  중립: "fill-[var(--temp-3)]",
  과열: "fill-[var(--temp-4)]",
  광기: "fill-[var(--temp-5)]",
};

export const fmt = (v: number | null | undefined, digits = 2) =>
  v == null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const signed = (v: number | null | undefined, digits = 1) =>
  v == null || !Number.isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${fmt(v, digits)}`;

/** 입력칸 문자열 → 숫자. 빈칸·숫자 아님은 null (0은 0). */
export function parseNum(s: string | undefined): number | null {
  if (s == null) return null;
  const t = s.replace(/,/g, "").trim();
  if (t === "" || t === "-" || t === ".") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

import type { ReaderLevel } from "@/lib/readers";

// 판독기는 역발상 도구라 공포 쪽이 매수(초록), 광기 쪽이 매도(빨강). 중립은 무채색.
export const LEVEL_PILL: Record<ReaderLevel, string> = {
  공포: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  불안: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400",
  중립: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  과열: "bg-red-50 text-red-800 dark:bg-red-950/60 dark:text-red-400",
  광기: "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-300",
};

/** 게이지에서 현재 구간을 칠하는 색. */
export const LEVEL_FILL: Record<ReaderLevel, string> = {
  공포: "fill-emerald-600 dark:fill-emerald-500",
  불안: "fill-emerald-400 dark:fill-emerald-600",
  중립: "fill-zinc-500 dark:fill-zinc-400",
  과열: "fill-red-400 dark:fill-red-600",
  광기: "fill-red-600 dark:fill-red-500",
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

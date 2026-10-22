"use client";
import { useId, useState } from "react";
import { levelOf, type IndicatorSpec, type ReaderScore } from "@/lib/readers";
import { LEVEL_PILL, fmt, parseNum } from "./levels";

export function ScorePill({ score }: { score: ReaderScore | null }) {
  if (score == null)
    return <span className="w-[4.25rem] flex-none text-center text-sm text-zinc-400">—</span>;
  const level = levelOf(score);
  return (
    <span className={`w-[4.25rem] flex-none whitespace-nowrap rounded-full py-1 text-center text-xs font-medium tabular-nums ${LEVEL_PILL[level]}`}>
      {score} {level}
    </span>
  );
}

/** 엑셀의 구간표. 라벨 아랫줄의 "구간표" 토글로 연다. */
export function useBandTable(table: { range: string; score: ReaderScore }[]) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
      className="whitespace-nowrap text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
    >
      구간표 <span aria-hidden className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
    </button>
  );
  const body = open ? (
    <table id={id} className="mt-2 w-full text-xs">
      <tbody>
        {table.map((r) => (
          <tr key={r.score} className="border-t border-zinc-100 dark:border-zinc-800">
            <td className="py-1 text-zinc-600 dark:text-zinc-400">{r.range}</td>
            <td className="py-1 text-right tabular-nums">{r.score}점 · {levelOf(r.score)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ) : null;
  return { toggle, body };
}

type Props = {
  spec: IndicatorSpec;
  /** 서버가 받아온 값. 없으면 사용자가 넣는다. */
  auto?: number | null;
  autoSource?: string;
  /** 사용자가 고친 값(문자열). undefined면 자동값을 쓴다. */
  value: string | undefined;
  onChange: (v: string | undefined) => void;
  /** 자동값이 없을 때 어디서 찾는지. */
  hint?: React.ReactNode;
  digits?: number;
  loading?: boolean;
};

export function readValue(value: string | undefined, auto: number | null | undefined) {
  return value !== undefined ? parseNum(value) : auto ?? null;
}

const Dot = () => <span aria-hidden> · </span>;

export function IndicatorRow({ spec, auto = null, autoSource, value, onChange, hint, digits = 2, loading }: Props) {
  const id = useId();
  const band = useBandTable(spec.table);
  const v = readValue(value, auto);
  const score = spec.score(v);
  const shown = value !== undefined ? value : auto != null ? fmt(auto, digits).replace(/,/g, "") : "";

  const source =
    value !== undefined ? (
      auto != null ? (
        <button type="button" onClick={() => onChange(undefined)} className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200">
          자동값 {fmt(auto, digits)}로
        </button>
      ) : (
        "직접 입력"
      )
    ) : auto != null ? (
      autoSource ?? "자동"
    ) : loading ? (
      "불러오는 중…"
    ) : (
      hint ?? "직접 입력"
    );

  return (
    <li className="border-t border-zinc-100 py-2.5 dark:border-zinc-800">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-sm font-medium leading-snug">{spec.label}</label>
          <div className="text-xs leading-snug text-zinc-500">
            {spec.horizon && <>{spec.horizon}<Dot /></>}
            {spec.note && <>{spec.note}<Dot /></>}
            {source}
            <Dot />
            {band.toggle}
          </div>
        </div>
        <div className="flex flex-none items-center gap-1">
          <input
            id={id}
            value={shown}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            placeholder="—"
            className="w-[4.75rem] rounded-lg border border-zinc-300 bg-transparent px-2 py-2 text-right text-base tabular-nums outline-none placeholder:text-zinc-400 focus:border-zinc-600 dark:border-zinc-700 dark:focus:border-zinc-400"
          />
          <span className="w-6 text-xs text-zinc-500">{spec.unit}</span>
        </div>
        <ScorePill score={score} />
      </div>
      {band.body}
    </li>
  );
}

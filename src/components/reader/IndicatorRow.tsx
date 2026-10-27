"use client";
import { useId, useState } from "react";
import { levelOf, type IndicatorSpec, type ReaderScore } from "@/lib/readers";
import { LEVEL_PILL, fmt, parseNum } from "./levels";

export function ScorePill({ score }: { score: ReaderScore | null }) {
  if (score == null)
    return <span className="w-[4.25rem] flex-none text-center text-sm text-faint">—</span>;
  const level = levelOf(score);
  return (
    <span className={`num inline-flex h-6 w-[4.25rem] flex-none items-center justify-center whitespace-nowrap rounded-control text-xs font-medium ${LEVEL_PILL[level]}`}>
      {score} {level}
    </span>
  );
}

/** 쉬운 설명 + 점수 구간표. 라벨 아랫줄의 "설명" 토글로 연다. */
export function useExplain(help: string, table: { range: string; score: ReaderScore }[]) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const toggle = (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={() => setOpen((o) => !o)}
      className="whitespace-nowrap text-muted hover:text-ink"
    >
      설명 <span aria-hidden className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
    </button>
  );
  const body = open ? (
    <div id={id} className="mt-2 rounded-control bg-raised px-3 py-2">
      <p className="text-sm leading-relaxed text-ink">{help}</p>
      <table className="mt-2 w-full text-[13px]">
        <caption className="pb-1 text-left text-muted">점수 매기는 기준 (1점 공포 ↔ 5점 광기)</caption>
        <tbody>
        {table.map((r) => (
          <tr key={r.score} className="border-t border-rule">
            <td className="py-1 text-muted">{r.range}</td>
            <td className="py-1 text-right tabular-nums">{r.score}점 · {levelOf(r.score)}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
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
  const band = useExplain(spec.help, spec.table);
  const v = readValue(value, auto);
  const score = spec.score(v);
  const shown = value !== undefined ? value : auto != null ? fmt(auto, digits).replace(/,/g, "") : "";

  const source =
    value !== undefined ? (
      auto != null ? (
        <button type="button" onClick={() => onChange(undefined)} className="underline decoration-control underline-offset-2 hover:text-ink">
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
    <li className="border-t border-rule py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block text-[15px] font-medium leading-snug">{spec.label}</label>
          <div className="text-[13px] leading-snug text-muted">
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
            className="num h-10 w-[4.75rem] rounded-control border border-control bg-surface px-2 text-right text-base outline-none placeholder:text-faint focus:border-accent"
          />
          <span className="w-6 text-[13px] text-muted">{spec.unit}</span>
        </div>
        <ScorePill score={score} />
      </div>
      {band.body}
    </li>
  );
}

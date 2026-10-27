import { ACTIONS, LEVELS, LEVEL_HINTS, levelOf } from "@/lib/readers";
import { LEVEL_FILL, LEVEL_PILL, fmt } from "./levels";

// 판독기 바늘 게이지: 0~5점을 반원에 펴고, 1점 단위로 공포·불안·중립·과열·광기 다섯 칸.
const CX = 100;
const CY = 96;
const R_OUT = 88;
const R_IN = 66;

function polar(r: number, score: number) {
  const a = Math.PI * (1 - score / 5); // 0점 = 왼쪽 끝, 5점 = 오른쪽 끝
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

function band(i: number) {
  const gap = 0.04;
  const [x1, y1] = polar(R_OUT, i + gap);
  const [x2, y2] = polar(R_OUT, i + 1 - gap);
  const [x3, y3] = polar(R_IN, i + 1 - gap);
  const [x4, y4] = polar(R_IN, i + gap);
  return `M${x1},${y1} A${R_OUT},${R_OUT} 0 0 1 ${x2},${y2} L${x3},${y3} A${R_IN},${R_IN} 0 0 0 ${x4},${y4} Z`;
}

export function Gauge({ score, filled, total }: { score: number | null; filled: number; total: number }) {
  const level = score != null ? levelOf(score) : null;
  const needle = score != null ? polar(R_IN - 10, Math.min(5, Math.max(0, score))) : null;
  return (
    <div>
      <div className="flex items-center gap-4">
        <svg viewBox="0 0 200 104" className="w-44 shrink-0" role="img" aria-label={level ? `종합 ${fmt(score, 2)}점, ${level}` : "입력된 지표 없음"}>
          {LEVELS.map((l, i) => (
            <path key={l} d={band(i)} className={l === level ? LEVEL_FILL[l] : "fill-raised"} />
          ))}
          {needle && (
            <>
              <line x1={CX} y1={CY} x2={needle[0]} y2={needle[1]} strokeWidth={3} strokeLinecap="round" className="stroke-ink" />
              <circle cx={CX} cy={CY} r={5} className="fill-ink" />
            </>
          )}
          <text x={CX - R_OUT + 2} y={CY + 7} fontSize={13} className="fill-muted">공포</text>
          <text x={CX + R_OUT - 2} y={CY + 7} fontSize={13} textAnchor="end" className="fill-muted">광기</text>
        </svg>
        <div className="min-w-0">
          <div className="text-xs text-muted">종합 점수</div>
          <div className="num text-[34px] font-bold leading-tight tracking-tight">{score != null ? fmt(score, 2) : "—"}</div>
          {level ? (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className={`flex-none whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${LEVEL_PILL[level]}`}>{level}</span>
              <span className="text-sm font-medium">{ACTIONS[level]}</span>
            </div>
          ) : (
            <div className="mt-1 text-sm text-muted">지표를 하나 이상 넣으면 판단합니다</div>
          )}
          <div className="mt-1 text-xs text-muted tabular-nums">지표 {filled}/{total}개 반영</div>
        </div>
      </div>
      {level && <p className="mt-2 text-sm text-ink">{LEVEL_HINTS[level]}</p>}
    </div>
  );
}

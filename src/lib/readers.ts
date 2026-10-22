// 소몽 판독기(차트·주가·역발상) 공통 규칙. 지표마다 원값 → 1~5점, 점수 평균 → 5단계 판단 → 매매 판단.
// 구간표는 엑셀 원본 그대로이며, 경계값은 "80~"처럼 아래쪽 포함으로 읽는다.

export type ReaderScore = 1 | 2 | 3 | 4 | 5;
export type ReaderLevel = "공포" | "불안" | "중립" | "과열" | "광기";

export const LEVELS: ReaderLevel[] = ["공포", "불안", "중립", "과열", "광기"];

export const ACTIONS: Record<ReaderLevel, string> = {
  공포: "역발상 매수(장기)",
  불안: "분할 매수",
  중립: "매매 보류",
  과열: "매도 준비",
  광기: "분할 매도",
};

/** 엑셀 판단식: 0~1 공포, ~2 불안, ~3 중립, ~4 과열, ~5 광기 (평균 1.25 → 불안). */
export function levelOf(score: number): ReaderLevel {
  if (score <= 1) return "공포";
  if (score <= 2) return "불안";
  if (score <= 3) return "중립";
  if (score <= 4) return "과열";
  return "광기";
}

export function averageScore(scores: (ReaderScore | null)[]): number | null {
  const got = scores.filter((s): s is ReaderScore => s != null);
  if (got.length === 0) return null;
  return got.reduce((a, b) => a + b, 0) / got.length;
}

type Band = { min: number; score: ReaderScore; label: string };

/** 값이 클수록 점수가 높은 구간표. bands는 min 내림차순, 마지막은 -Infinity. */
function scoreHigh(value: number | null, bands: Band[]): ReaderScore | null {
  if (value == null || !Number.isFinite(value)) return null;
  return (bands.find((b) => value >= b.min) ?? bands[bands.length - 1]).score;
}

export type IndicatorKey =
  | "breadth200" | "breadth50" | "disparity200" | "rsi"
  | "marketPe" | "stockPe" | "upside" | "peg"
  | "bullBear" | "putCall" | "vix" | "marginDebt" | "hySpread";

export type IndicatorSpec = {
  key: IndicatorKey;
  label: string;
  unit: string;
  horizon?: string;
  /** 라벨 아래 줄에 붙는 짧은 설명 (기준·주기). */
  note?: string;
  /** 구간표를 화면에 그대로 보여주기 위한 행 (점수 5 → 1 순). */
  table: { range: string; score: ReaderScore }[];
  score: (v: number | null) => ReaderScore | null;
};

const B = (min: number, score: ReaderScore, label: string): Band => ({ min, score, label });

const breadth = (label: string, horizon: string, key: IndicatorKey): IndicatorSpec => {
  const bands = [B(80, 5, "80~"), B(70, 4, "70~80"), B(30, 3, "30~70"), B(20, 2, "20~30"), B(-Infinity, 1, "~20")];
  return {
    key, label, unit: "%", horizon,
    table: bands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, bands),
  };
};

const disparity200Bands = [B(15, 5, "15~"), B(10, 4, "10~15"), B(-10, 3, "-10~10"), B(-15, 2, "-15~-10"), B(-Infinity, 1, "~-15")];
/** RSI 표는 "21~30 → 2, ~20 → 1"이라 20은 공포 쪽에 넣는다. */
function rsiScore(v: number | null): ReaderScore | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 70) return 5;
  if (v >= 60) return 4;
  if (v >= 30) return 3;
  if (v > 20) return 2;
  return 1;
}

export const CHART_READER: IndicatorSpec[] = [
  breadth("200일선 위 종목 비율", "중기", "breadth200"),
  breadth("50일선 위 종목 비율", "단기", "breadth50"),
  {
    key: "disparity200", label: "이격도(200일)", unit: "%", horizon: "중기",
    table: disparity200Bands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, disparity200Bands),
  },
  {
    key: "rsi", label: "RSI(14)", unit: "", horizon: "초단기",
    table: [
      { range: "70~", score: 5 }, { range: "60~70", score: 4 }, { range: "30~60", score: 3 },
      { range: "21~30", score: 2 }, { range: "~20", score: 1 },
    ],
    score: rsiScore,
  },
];

const marketPeBands = [B(19, 5, "19~"), B(18, 4, "18~19"), B(16, 3, "16~18"), B(15, 2, "15~16"), B(-Infinity, 1, "~15")];
const stockPeBands = [B(50, 5, "50~"), B(30, 4, "30~50"), B(20, 3, "20~30"), B(10, 2, "10~20"), B(-Infinity, 1, "~10")];
const pegBands = [B(2.5, 5, "2.5~"), B(2, 4, "2~2.5"), B(1.5, 3, "1.5~2"), B(1, 2, "1~1.5"), B(-Infinity, 1, "~1")];

/** 상승여력(%) 점수 — 적정주가 계산기와 주가 판독기가 같은 표를 쓴다.
 *  엑셀 주가 판독기 표는 15~20%가 비어 있어 적정주가 계산기 표(10~20% → 2점)를 따른다. */
export function upsideScore(upsidePct: number | null): ReaderScore | null {
  if (upsidePct == null || !Number.isFinite(upsidePct)) return null;
  if (upsidePct < 0) return 5;
  if (upsidePct < 5) return 4;
  if (upsidePct < 10) return 3;
  if (upsidePct < 20) return 2;
  return 1;
}

export const UPSIDE_VERDICT: Record<ReaderScore, string> = {
  5: "적극 매도", 4: "매도 검토", 3: "중립", 2: "매수 검토", 1: "적극 매수",
};

const positive = (f: (v: number | null) => ReaderScore | null) => (v: number | null) =>
  v != null && v > 0 ? f(v) : null; // 적자 기업 P/E, 역성장 PEG는 판단 불가

export const STOCK_READER: IndicatorSpec[] = [
  {
    key: "marketPe", label: "시장 P/E", unit: "배", note: "S&P 500 · 12개월 선행",
    table: marketPeBands.map((b) => ({ range: b.label, score: b.score })),
    score: positive((v) => scoreHigh(v, marketPeBands)),
  },
  {
    key: "stockPe", label: "종목 P/E", unit: "배",
    table: stockPeBands.map((b) => ({ range: b.label, score: b.score })),
    score: positive((v) => scoreHigh(v, stockPeBands)),
  },
  {
    key: "upside", label: "목표주가 상승여력", unit: "%",
    table: [
      { range: "0% 미만", score: 5 }, { range: "0~5%", score: 4 }, { range: "5~10%", score: 3 },
      { range: "10~20%", score: 2 }, { range: "20%~", score: 1 },
    ],
    score: upsideScore,
  },
  {
    key: "peg", label: "PEG", unit: "", note: "성장성 고려",
    table: pegBands.map((b) => ({ range: b.label, score: b.score })),
    score: positive((v) => scoreHigh(v, pegBands)),
  },
];

const bullBearBands = [B(30, 5, "30~"), B(20, 4, "20~30"), B(-20, 3, "-20~20"), B(-30, 2, "-30~-20"), B(-Infinity, 1, "~-30")];
const marginBands = [B(40, 5, "40~"), B(20, 4, "20~40"), B(-20, 3, "-20~20"), B(-30, 2, "-30~-20"), B(-Infinity, 1, "~-30")];

/** 풋콜비율은 낮을수록 탐욕(콜 쏠림). */
export function putCallScore(v: number | null): ReaderScore | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v <= 0.4) return 5;
  if (v <= 0.5) return 4;
  if (v <= 1) return 3;
  if (v <= 1.2) return 2;
  return 1;
}

/** VIX는 낮을수록 탐욕. */
export function vixScore(v: number | null): ReaderScore | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v < 15) return 5;
  if (v < 20) return 4;
  if (v < 30) return 3;
  if (v < 40) return 2;
  return 1;
}

export const HY_STAGES: { score: ReaderScore; label: string }[] = [
  { score: 5, label: "3% 이하" },
  { score: 4, label: "바닥 대비 +1%p" },
  { score: 3, label: "3~5% 박스" },
  { score: 2, label: "5% 넘어 상승 중" },
  { score: 1, label: "5% 넘었다가 고점 대비 -1%p" },
];

export type HySeries = { latest: number; low1y: number; peak3m: number };

/** 하이일드 스프레드는 수준보다 흐름을 본다(엑셀은 서술형 구간).
 *  순서: 5% 위 고점을 찍고 1%p 내려옴(공포의 정점 통과) → 5% 위 → 1년 저점 +1%p(악화 시작) → 3% 이하 → 박스. */
export function hySpreadScore(s: HySeries | null): ReaderScore | null {
  if (!s) return null;
  if (s.peak3m >= 5 && s.latest <= s.peak3m - 1) return 1;
  if (s.latest >= 5) return 2;
  if (s.latest - s.low1y >= 1) return 4;
  if (s.latest <= 3) return 5;
  return 3;
}

export const CONTRARIAN_READER: IndicatorSpec[] = [
  {
    key: "bullBear", label: "Bull-Bear Spread", unit: "%p", horizon: "주간",
    table: bullBearBands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, bullBearBands),
  },
  {
    key: "putCall", label: "풋콜비율", unit: "", horizon: "일간", note: "5일 평균",
    table: [
      { range: "~0.4", score: 5 }, { range: "0.4~0.5", score: 4 }, { range: "0.5~1", score: 3 },
      { range: "1~1.2", score: 2 }, { range: "1.2~", score: 1 },
    ],
    score: putCallScore,
  },
  {
    key: "vix", label: "VIX", unit: "", horizon: "일간",
    table: [
      { range: "~15", score: 5 }, { range: "15~20", score: 4 }, { range: "20~30", score: 3 },
      { range: "30~40", score: 2 }, { range: "40~", score: 1 },
    ],
    score: vixScore,
  },
  {
    key: "marginDebt", label: "신용융자 증가율", unit: "%", horizon: "월간", note: "전년 대비",
    table: marginBands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, marginBands),
  },
];

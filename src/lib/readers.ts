// 판독기(차트·주가·역발상) 공통 규칙. 지표마다 원값 → 1~5점, 점수 평균 → 5단계 판단 → 매매 판단.
// 구간 경계는 "80~"처럼 아래쪽 포함으로 읽는다.

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

/** 판단 단계를 처음 보는 사람을 위한 한 줄 풀이. 1점(공포)에 가까울수록 남들이 겁낼 때다. */
export const LEVEL_HINTS: Record<ReaderLevel, string> = {
  공포: "다들 겁먹고 파는 때예요. 길게 보고 나눠서 사기 좋은 구간입니다.",
  불안: "걱정이 많은 편이에요. 조금씩 나눠 사기 괜찮은 구간입니다.",
  중립: "특별히 쏠리지 않았어요. 서두르지 말고 지켜보는 구간입니다.",
  과열: "기대가 커진 상태예요. 새로 사기보다 팔 계획을 세워 둘 때입니다.",
  광기: "다들 들떠서 사는 때예요. 나눠서 팔며 이익을 챙길 구간입니다.",
};

/** 평균 점수 → 단계: 0~1 공포, ~2 불안, ~3 중립, ~4 과열, ~5 광기 (평균 1.25 → 불안). */
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
  /** "설명"을 펼치면 보이는 쉬운 풀이: 무엇을 재는지, 어느 쪽이 겁/들뜸인지. */
  help: string;
  /** 구간표를 화면에 그대로 보여주기 위한 행 (점수 5 → 1 순). */
  table: { range: string; score: ReaderScore }[];
  score: (v: number | null) => ReaderScore | null;
};

const B = (min: number, score: ReaderScore, label: string): Band => ({ min, score, label });

const breadth = (label: string, horizon: string, key: IndicatorKey, help: string): IndicatorSpec => {
  const bands = [B(80, 5, "80~"), B(70, 4, "70~80"), B(30, 3, "30~70"), B(20, 2, "20~30"), B(-Infinity, 1, "~20")];
  return {
    key, label, unit: "%", horizon, help,
    table: bands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, bands),
  };
};

const disparity200Bands = [B(15, 5, "15~"), B(10, 4, "10~15"), B(-10, 3, "-10~10"), B(-15, 2, "-15~-10"), B(-Infinity, 1, "~-15")];
/** RSI 구간은 "21~30 → 2, ~20 → 1"이라 20은 공포 쪽에 넣는다. */
function rsiScore(v: number | null): ReaderScore | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v >= 70) return 5;
  if (v >= 60) return 4;
  if (v >= 30) return 3;
  if (v > 20) return 2;
  return 1;
}

export const CHART_READER: IndicatorSpec[] = [
  breadth("200일선 위 종목 비율", "중기", "breadth200",
    "S&P 500 종목 중 최근 200일 평균 가격보다 비싸게 거래되는 종목의 비율이에요. 높을수록 시장 전체가 달아올랐고, 낮을수록 대부분이 눌려 있다는 뜻입니다."),
  breadth("50일선 위 종목 비율", "단기", "breadth50",
    "같은 비율을 최근 50일 평균으로 본 거예요. 200일보다 빨리 움직여서 단기 분위기를 보여 줍니다."),
  {
    key: "disparity200", label: "이격도(200일)", unit: "%", horizon: "중기",
    help: "S&P 500 지수가 최근 200일 평균보다 몇 % 위에 있는지예요. +15% 넘게 멀어지면 너무 많이 올랐고, -15% 아래면 너무 많이 빠진 상태입니다.",
    table: disparity200Bands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, disparity200Bands),
  },
  {
    key: "rsi", label: "RSI(14)", unit: "", horizon: "초단기",
    help: "최근 14일 동안 오른 힘과 내린 힘을 0~100으로 비교한 값이에요. 70 이상이면 너무 빨리 올랐고, 30 아래면 너무 빨리 빠졌다는 신호입니다.",
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

/** 상승여력(%) 점수 — 적정주가 계산기와 주가 판독기가 같은 구간을 쓴다 (10~20% → 2점). */
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
    help: "미국 대표 500개 기업 주가가 앞으로 1년 예상 이익의 몇 배인지예요. 숫자가 클수록 시장 전체가 비싸게 거래되고 있다는 뜻이고, 오랜 평균은 16~17배 정도입니다.",
    table: marketPeBands.map((b) => ({ range: b.label, score: b.score })),
    score: positive((v) => scoreHigh(v, marketPeBands)),
  },
  {
    key: "stockPe", label: "종목 P/E", unit: "배",
    help: "이 회사 주가가 1년 이익의 몇 배인지예요. 30배라면 지금 이익으로 주가만큼 벌려면 30년 걸린다는 뜻이라, 클수록 비싸게 사는 셈입니다. 적자 회사는 계산하지 않아요.",
    table: stockPeBands.map((b) => ({ range: b.label, score: b.score })),
    score: positive((v) => scoreHigh(v, stockPeBands)),
  },
  {
    key: "upside", label: "목표주가 상승여력", unit: "%",
    help: "위 적정주가 계산기에서 나온 목표주가가 지금 주가보다 몇 % 높은지예요. 20% 넘게 남았으면 싼 편, 0% 아래면 목표보다 이미 비싼 상태입니다.",
    table: [
      { range: "0% 미만", score: 5 }, { range: "0~5%", score: 4 }, { range: "5~10%", score: 3 },
      { range: "10~20%", score: 2 }, { range: "20%~", score: 1 },
    ],
    score: upsideScore,
  },
  {
    key: "peg", label: "PEG", unit: "", note: "성장성 고려",
    help: "P/E를 이익 성장률(%)로 나눈 값이에요. 빨리 크는 회사는 P/E가 높아도 괜찮을 수 있어서, 성장 속도까지 감안해 봅니다. 1보다 낮으면 성장에 비해 싼 편입니다.",
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

/** 하이일드 스프레드 쉬운 풀이 (판독기 화면의 "설명"). */
export const HY_HELP =
  "신용이 낮은 회사가 돈을 빌릴 때 내는 금리가 국채 금리보다 얼마나 높은지예요. 경기가 불안해지면 벌어지고, 안심하면 좁아집니다. 수준보다 흐름을 봐서, 크게 벌어졌다가 꺾이기 시작할 때를 바닥 신호로 봅니다.";

export const HY_STAGES: { score: ReaderScore; label: string }[] = [
  { score: 5, label: "3% 이하" },
  { score: 4, label: "바닥 대비 +1%p" },
  { score: 3, label: "3~5% 박스" },
  { score: 2, label: "5% 넘어 상승 중" },
  { score: 1, label: "5% 넘었다가 고점 대비 -1%p" },
];

export type HySeries = { latest: number; low1y: number; peak3m: number };

/** 하이일드 스프레드는 수준보다 흐름을 본다(구간이 숫자가 아니라 흐름으로 정의됨).
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
    help: "미국 개인투자자 설문(AAII)에서 '오를 것'이라 답한 비율에서 '내릴 것' 비율을 뺀 값이에요. 크게 플러스면 다들 낙관하고, 크게 마이너스면 다들 비관하고 있습니다.",
    table: bullBearBands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, bullBearBands),
  },
  {
    key: "putCall", label: "풋콜비율", unit: "", horizon: "일간", note: "5일 평균",
    help: "하락에 거는 옵션(풋) 거래량 ÷ 상승에 거는 옵션(콜) 거래량이에요. 1을 넘으면 떨어질까 봐 보험을 많이 사는 중이고, 낮을수록 오를 거라 확신하는 분위기입니다.",
    table: [
      { range: "~0.4", score: 5 }, { range: "0.4~0.5", score: 4 }, { range: "0.5~1", score: 3 },
      { range: "1~1.2", score: 2 }, { range: "1.2~", score: 1 },
    ],
    score: putCallScore,
  },
  {
    key: "vix", label: "VIX", unit: "", horizon: "일간",
    help: "'공포지수'라고 불러요. 앞으로 한 달 동안 S&P 500이 얼마나 크게 흔들릴지 시장이 예상하는 값이에요. 15 아래면 안심한 상태, 30~40을 넘으면 큰 두려움입니다.",
    table: [
      { range: "~15", score: 5 }, { range: "15~20", score: 4 }, { range: "20~30", score: 3 },
      { range: "30~40", score: 2 }, { range: "40~", score: 1 },
    ],
    score: vixScore,
  },
  {
    key: "marginDebt", label: "신용융자 증가율", unit: "%", horizon: "월간", note: "전년 대비",
    help: "빚을 내서 주식을 산 돈이 1년 전보다 몇 % 늘었는지예요. 빠르게 늘면 무리해서 사는 사람이 많다는 뜻이고, 크게 줄면 빚을 갚느라 팔고 있다는 뜻입니다.",
    table: marginBands.map((b) => ({ range: b.label, score: b.score })),
    score: (v) => scoreHigh(v, marginBands),
  },
];

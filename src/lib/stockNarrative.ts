// 종목 페이지의 "지금 지표 읽기": 계산된 값을 문장으로 풀어 쓴다(서버 렌더, 종목마다 다른 본문).
// 기준은 화면 표시와 같다: RSI 70/30 · 이격도 신호 indicators.ts maSignal · 매수존 buyzones.ts.
import type { EnrichedStock, MaSignalLevel } from "@/lib/types";

const SIGNAL_WORD: Record<MaSignalLevel, string> = {
  "strong-overheated": "강한 과열",
  overheated: "과열",
  "weak-overheated": "약한 과열",
  normal: "정상",
  "weak-oversold": "약한 과매도",
  oversold: "과매도",
  "strong-oversold": "강한 과매도",
};

export type NarrativeLine = { topic: string; text: string; guide: string };

export function stockNarrative(s: EnrichedStock): NarrativeLine[] {
  const out: NarrativeLine[] = [];
  const name = s.name;

  if (s.price != null && s.high > 0) {
    const reached = s.zones.filter((z) => z.reached);
    const where = reached.length
      ? `−${reached[reached.length - 1].pct}% 매수존 안에 들어와 있어요`
      : s.nearestUnreached
        ? `가장 가까운 −${s.nearestUnreached.pct}% 매수존까지 ${Math.abs(s.nearestUnreached.distancePct).toFixed(1)}% 더 내려가야 해요`
        : "매수존 밖에 있어요";
    out.push({
      topic: "매수존",
      text: `${name}의 현재가는 52주 최고가보다 ${s.drawdownPct.toFixed(1)}% 낮고, ${where}.`,
      guide: "buy-zone",
    });
  }

  if (s.rsi14 != null) {
    const r = s.rsi14;
    const read =
      r >= 70
        ? "70 이상의 과열권이라 최근 짧은 기간에 빠르게 올랐다는 뜻이에요. 강한 상승 추세에서는 과열권이 오래 이어지기도 합니다"
        : r <= 30
          ? "30 이하의 침체권이라 최근 짧은 기간에 빠르게 내렸다는 뜻이에요. 하락 추세가 굳은 종목은 침체권에서도 더 빠질 수 있습니다"
          : "30~70 사이의 보통 구간이라 오르는 힘과 내리는 힘이 한쪽으로 크게 쏠리지 않았어요";
    out.push({ topic: "RSI", text: `RSI(14)는 ${r.toFixed(0)}로, ${read}.`, guide: "rsi" });
  }

  if (s.disparity200 != null && s.signal200) {
    const cross =
      s.crossState === "golden"
        ? "50일선이 200일선 위에 있는 골든크로스 상태"
        : s.crossState === "death"
          ? "50일선이 200일선 아래에 있는 데드크로스 상태"
          : null;
    const fresh = s.crossFreshDays != null ? `(${s.crossFreshDays === 0 ? "오늘" : `${s.crossFreshDays}일 전`} 교차)` : "";
    out.push({
      topic: "추세",
      text:
        `주가는 200일 평균보다 ${Math.abs(s.disparity200).toFixed(1)}% ${s.disparity200 >= 0 ? "위" : "아래"}에 있어 이격도 신호는 '${SIGNAL_WORD[s.signal200]}'이에요.` +
        (cross ? ` 이동평균은 ${cross}${fresh}입니다.` : ""),
      guide: "disparity",
    });
  }

  if (s.range52wPct != null) {
    const p = s.range52wPct;
    const read = p >= 80 ? "최고가 쪽에 가깝습니다" : p <= 20 ? "최저가 쪽에 가깝습니다" : "범위의 중간쯤입니다";
    out.push({
      topic: "52주 범위",
      text: `지난 52주 최저가를 0%, 최고가를 100%로 두면 지금 가격은 ${p.toFixed(0)}% 위치로 ${read}.`,
      guide: "buy-zone",
    });
  }

  return out;
}

import Link from "next/link";
import type { EnrichedStock, MaSignalLevel, BadgeState } from "@/lib/types";
import { Change, Panel, Pill, money, type Tone } from "./ui";

// 이격도 신호는 온도로: 과열은 뜨거운 빨강, 과매도는 차가운 파랑.
const SIGNAL: Record<MaSignalLevel, { label: string; tone: Tone }> = {
  "strong-overheated": { label: "강한 과열 · 매도 고려", tone: "hot-2" },
  overheated: { label: "과열", tone: "hot-1" },
  "weak-overheated": { label: "약한 과열", tone: "hot-1" },
  normal: { label: "정상", tone: "flat" },
  "weak-oversold": { label: "약한 과매도", tone: "cold-1" },
  oversold: { label: "과매도", tone: "cold-1" },
  "strong-oversold": { label: "강한 과매도 · 매수 고려", tone: "cold-2" },
};

const VALUATION: Record<BadgeState, { label: string; tone: Tone } | null> = {
  pass: { label: "충족", tone: "flat" },
  warn: { label: "근접", tone: "warn" },
  fail: { label: "벗어남", tone: "hot-1" },
  na: null,
};

/** 화면의 답: 매수존 기준으로 지금 어디쯤인지 한 문장. */
function zoneFinding(s: EnrichedStock): string {
  const reached = s.zones.filter((z) => z.reached);
  if (reached.length) return `고점 대비 −${reached[reached.length - 1].pct}% 매수존에 들어와 있어요.`;
  if (s.nearestUnreached) return `−${s.nearestUnreached.pct}% 매수존까지 ${Math.abs(s.nearestUnreached.distancePct).toFixed(1)}% 더 내려가야 해요.`;
  return "매수존을 계산할 고점 데이터가 없어요.";
}

/** 대표 요소: 52주 고점(오른쪽 끝)부터 −30%(왼쪽 끝)까지의 가격 띠. 매수존 네 칸과 지금 가격. */
function BuyZoneStrip({ s }: { s: EnrichedStock }) {
  if (!s.high || s.price == null) return null;
  const hi = s.high;
  const lo = hi * 0.7;
  const pos = (p: number) => Math.min(100, Math.max(0, ((p - lo) / (hi - lo)) * 100));
  const zoneStart = pos(hi * 0.9);
  const now = pos(s.price);
  return (
    <figure className="mt-6" aria-label={`매수존 띠: 현재가는 고점 대비 ${(-s.drawdownPct).toFixed(1)}%`}>
      <div className="relative h-7">
        <div
          className="absolute -translate-x-1/2 whitespace-nowrap text-xs font-semibold text-accent"
          style={{ left: `${Math.min(92, Math.max(8, now))}%` }}
        >
          지금 <span className="num">−{s.drawdownPct.toFixed(1)}%</span>
        </div>
      </div>
      <div className="relative h-3 rounded-[3px] bg-raised">
        {/* 매수존 구간: −10%부터 왼쪽 끝까지 차가운 색 */}
        <div className="absolute inset-y-0 left-0 rounded-l-[3px] bg-cold-1" style={{ width: `${zoneStart}%` }} />
        {s.zones.map((z) => (
          <div key={z.pct} className="absolute inset-y-0 w-px" style={{ left: `${pos(z.price)}%`, backgroundColor: "var(--cold-1-ink)", opacity: 0.35 }} />
        ))}
        <div className="absolute -inset-y-1.5 w-[3px] -translate-x-1/2 rounded-full bg-accent" style={{ left: `${now}%` }} />
      </div>
      <div className="relative mt-2 h-4 text-[11px] text-muted">
        {s.zones.map((z) => (
          <span key={z.pct} className="num absolute -translate-x-1/2" style={{ left: `${pos(z.price)}%` }}>
            −{z.pct}%
          </span>
        ))}
        <span className="absolute right-0">고점</span>
      </div>
    </figure>
  );
}

function Row({ label, sub, value, pill }: { label: string; sub?: string; value: React.ReactNode; pill?: React.ReactNode }) {
  return (
    <li className="flex min-h-[56px] items-center justify-between gap-4 border-t border-rule py-2.5 first:border-t-0">
      <div className="min-w-0">
        <div className="text-[15px]">{label}</div>
        {sub && <div className="text-xs text-muted">{sub}</div>}
      </div>
      <div className="flex flex-none flex-col items-end gap-1">
        <div className="num text-[15px] font-medium">{value}</div>
        {pill}
      </div>
    </li>
  );
}

function rsiWord(r: number): { label: string; tone: Tone } {
  if (r >= 70) return { label: "과열권", tone: "hot-1" };
  if (r <= 30) return { label: "침체권", tone: "cold-1" };
  return { label: "보통", tone: "flat" };
}

export function StockAnalysis({ stock: s }: { stock: EnrichedStock }) {
  const mk = s.market;
  const entries: [string, BadgeState, number | null, string][] = [
    ["PER", s.valuationBadges.per, s.valuation.per, "배"],
    ["PSR", s.valuationBadges.psr, s.valuation.psr, "배"],
    ["PBR", s.valuationBadges.pbr, s.valuation.pbr, "배"],
    ["ROE", s.valuationBadges.roe, s.valuation.roe, "%"],
  ];
  const passed = entries.filter(([, b]) => b === "pass").length;
  const hasValuation = entries.some(([, b]) => b !== "na");

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Panel className="flex flex-col p-5">
        <div className="flex items-baseline gap-2">
          <h2 className="truncate text-lg font-semibold">{s.name}</h2>
          <span className="text-sm text-muted">{s.ticker}</span>
        </div>
        {s.price != null ? (
          <>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="num text-[34px] font-bold leading-tight tracking-tight">{money(s.price, mk)}</span>
              <Change pct={s.changePct} className="text-[15px] font-medium" />
              {mk === "US" && s.priceKrw != null && (
                <span className="num text-sm text-muted">₩{Math.round(s.priceKrw).toLocaleString("ko-KR")}</span>
              )}
            </div>
            <p className="mt-3 text-[15px] font-medium">{zoneFinding(s)}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">현재가를 불러오지 못했어요.</p>
        )}

        <BuyZoneStrip s={s} />

        <table className="mb-5 mt-4 w-full text-[15px]">
          <caption className="sr-only">고점과 매수존 가격</caption>
          <tbody>
            <tr className="border-t border-rule">
              <th scope="row" className="py-2 text-left font-normal text-muted">
                고점 ({s.highSource === "sheet" ? "직접 지정" : "52주"})
              </th>
              <td className="num py-2 text-right">{money(s.high, mk)}</td>
            </tr>
            {s.zones.map((z) => (
              <tr key={z.pct} className="border-t border-rule">
                <th scope="row" className="py-2 text-left font-normal">
                  <span className="mr-2">−{z.pct}% 매수존</span>
                  {z.reached && <Pill tone="cold-2">진입</Pill>}
                </th>
                <td className="num py-2 text-right">{money(z.price, mk)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 넓은 화면에서 옆 열보다 짧으면 남는 높이는 이 행동 위로 간다 */}
        <Link
          href={`/reader?view=stock&ticker=${encodeURIComponent(s.ticker)}`}
          className="mt-5 flex h-12 items-center justify-between rounded-card bg-ink px-5 text-[15px] font-semibold text-ground transition-opacity hover:opacity-90 md:mt-auto"
        >
          적정주가 계산하고 판독하기
          <span aria-hidden>→</span>
        </Link>
      </Panel>

      <div className="grid content-start gap-4">
        <Panel className="px-5 py-3">
          <h3 className="pt-1 text-sm font-semibold text-muted">가격 흐름</h3>
          <ul>
            <Row
              label="RSI (14일)"
              sub="70 이상 과열, 30 이하 침체"
              value={s.rsi14 != null ? s.rsi14.toFixed(0) : "—"}
              pill={s.rsi14 != null ? <Pill tone={rsiWord(s.rsi14).tone}>{rsiWord(s.rsi14).label}</Pill> : null}
            />
            {s.sma50 != null && (
              <Row
                label="50일선과의 거리"
                sub={`50일 평균 ${money(s.sma50, mk)}`}
                value={s.disparity50 != null ? `${s.disparity50 >= 0 ? "+" : ""}${s.disparity50.toFixed(1)}%` : "—"}
                pill={s.signal50 ? <Pill tone={SIGNAL[s.signal50].tone}>{SIGNAL[s.signal50].label}</Pill> : null}
              />
            )}
            {s.sma200 != null && (
              <Row
                label="200일선과의 거리"
                sub={`200일 평균 ${money(s.sma200, mk)}`}
                value={s.disparity200 != null ? `${s.disparity200 >= 0 ? "+" : ""}${s.disparity200.toFixed(1)}%` : "—"}
                pill={s.signal200 ? <Pill tone={SIGNAL[s.signal200].tone}>{SIGNAL[s.signal200].label}</Pill> : null}
              />
            )}
            <Row
              label="추세"
              sub={s.crossFreshDays != null ? `${s.crossFreshDays}일 전에 교차` : "50일선과 200일선의 위치"}
              value={s.crossState === "golden" ? "골든크로스" : s.crossState === "death" ? "데드크로스" : "—"}
            />
            {s.range52wPct != null && (
              <Row
                label="52주 범위 안 위치"
                sub="0% 최저가 · 100% 최고가"
                value={`${s.range52wPct.toFixed(0)}%`}
              />
            )}
            {s.volumeSpike != null && (
              <Row label="거래량" sub="최근 20일 평균 대비" value={`${s.volumeSpike.toFixed(1)}배`} />
            )}
          </ul>
        </Panel>

        {mk === "US" && hasValuation && (
          <Panel className="px-5 py-3">
            <div className="flex items-baseline justify-between pt-1">
              <h3 className="text-sm font-semibold text-muted">밸류에이션</h3>
              <span className="num text-xs text-muted">기준 4개 중 {passed}개 충족</span>
            </div>
            <dl className="mt-2 grid grid-cols-4 divide-x divide-rule">
              {entries.map(([k, b, v, unit]) => {
                const st = VALUATION[b];
                return (
                  <div key={k} className="px-2 py-1 first:pl-0">
                    <dt className="text-xs text-muted">{k}</dt>
                    <dd className="num mt-0.5 text-[15px] font-medium">
                      {v != null ? `${v.toFixed(1)}` : <span className="text-faint">—</span>}
                      {v != null && <span className="ml-0.5 text-xs text-muted">{unit}</span>}
                    </dd>
                    <dd className="mt-1 h-6">{st && <Pill tone={st.tone}>{st.label}</Pill>}</dd>
                  </div>
                );
              })}
            </dl>
          </Panel>
        )}

      </div>
    </div>
  );
}

# 주식 워치리스트 웹앱 — 설계 문서 (Design Spec)

- **작성일**: 2026-05-31
- **상태**: 설계 확정 (구현 계획 작성 전)
- **한 줄 요약**: 구글 시트로 관리하던 미국 주식 관심종목을, 시세·지표를 자동으로 채워 보여주는 **모바일 우선 PWA**로 재구성한다. 데이터는 무료 API에서 실시간으로 읽고, 저장소(DB)는 두지 않는다.

---

## 1. 목적 & 배경

현재 사용자는 구글 시트에서 ~20개 미국 종목을 추적한다. 시트에는 (1) **사용자의 분석**(종목 선정, 매수논리, 리스크, 테마 플래그, 점수)과 (2) **시장 숫자**(현재가, 고점, RSI, 매수구간, 매크로 지표)가 섞여 있고, 숫자를 수기로 갱신해야 하는 불편이 있다.

**목표**: 시장 숫자는 전부 자동으로 채우고, 사용자는 분석만 시트에서 관리하며, 모바일에서 한눈에 "오늘 살 만한 게 있나"를 파악한다.

### 성공 기준
- 시트의 모든 종목이 **수기 입력 없이** 실시간 시세/지표와 함께 표시된다.
- 시트의 핵심 로직(매수구간 -10~-25%, 점수)이 프론트에서 동일하게 재현된다.
- 모바일에서 2~3초 안에 "지금 매수존에 든 종목"을 파악할 수 있다.
- DB·로그인 없이 동작하고, 무료 API 한도 안에서 안정적으로 돌아간다.

---

## 2. 확정된 핵심 결정 (브레인스토밍 합의)

| 항목 | 결정 |
|------|------|
| 종목 목록 출처 | **구글 시트 읽기 전용** (추가/삭제/매수논리/테마는 시트에서, 앱은 읽기만) |
| 시장 데이터 | 무료 API에서 실시간 + 파생 지표는 코드 계산 |
| 저장소 | **없음 (DB 0)**. 시트 + API를 읽어 렌더링. 캐싱만 사용 |
| 백엔드 | **얇은 Next.js API 라우트**(키 숨김·캐싱·헤더주입·crumb 처리). 저장이 아니라 중계 |
| v1 범위 | MVP + 자동 시그널 + 인앱 알림 |
| 알림 | v1은 인앱(앱 열렸을 때)만. 새벽 푸시는 백엔드 필요 → 향후 |
| 스택 | Next.js(App Router) + TypeScript + Tailwind, Vercel 무료 배포, PWA |

---

## 3. 데이터 소스 & API (2026-05-31 검증 완료)

> 단일 무료 API로는 전부 못 한다. 각 API의 **무료로 잘 되는 부분만** 조합한다. 대부분 CORS 차단이라 **얇은 프록시 경유가 필수**이며, 이 프록시가 키 은닉·캐싱·CNN 헤더주입·Yahoo crumb를 함께 처리한다.

| 데이터 | 소스 | 엔드포인트 / 라이브러리 | 키 | 비고 |
|--------|------|------------------------|-----|------|
| 현재가 + 과거 일봉(RSI·MA 계산용) | **Yahoo (비공식)** | `yahoo-finance2` → `chart(sym, {range:'2y', interval:'1d'})` | 불필요 | crumb 불필요(chart). 워크호스 |
| 밸류에이션 PER/PSR/PBR/ROE | **Finnhub** | `/stock/metric?metric=all` (`peTTM`,`psTTM`,`pbAnnual`,`roeTTM`) | 무료키 | 공식·CORS=* |
| 실적일 (v2) | **Finnhub** | `/calendar/earnings?symbol=` | 무료키 | v2 |
| 10년 금리 / 하이일드 스프레드 | **FRED** | `series/observations?series_id=DGS10` / `BAMLH0A0HYM2` | 무료키 | CORS 없음→프록시 |
| 공포탐욕지수 | **CNN (비공식)** | `production.dataviz.cnn.io/index/fearandgreed/graphdata` | 불필요 | 봇차단→`Accept`/`Referer` 헤더 주입 필요 |
| USD/KRW 환율 | **frankfurter.dev** | `/v1/latest?base=USD&symbols=KRW` | 불필요 | CORS OK, ECB 기반, 일 1회 갱신 |
| 🛟 Yahoo 폴백(시세·과거) | **Twelve Data** | `/quote`, `/time_series` | 무료키 | 8회/분 제한. 선택적 |

**필요한 무료 가입**: Finnhub 키, FRED 키 (각 1분). Yahoo·CNN·frankfurter는 키 없음.

### 검증에서 배제된 것 (함정)
- **Finnhub `/stock/candle`(과거)**: 2024~25 유료 전환 → RSI/MA 불가. 그래서 과거는 Yahoo로.
- **Twelve Data `/statistics`(펀더멘털)**: 유료(Grow $79). 그래서 밸류에이션은 Finnhub로.
- **Alpha Vantage**: 25회/일 → 20종목 1회 갱신도 초과. 배제.
- **Polygon/FMP 무료**: 실시간 시세·펀더멘털 막힘. 배제.
- **exchangerate.host**: 키 요구로 바뀜 → frankfurter.dev 사용.

---

## 4. 아키텍처

```
┌──────────────────────────────────────────────────────────┐
│  프론트 (Next.js Client, 모바일 PWA)                        │
│  WatchlistScreen · SummaryHeader · StockRow ·             │
│  StockDetailCard · MacroDial                              │
│         │  앱 자체 API(/api/*)만 호출                       │
└─────────┼────────────────────────────────────────────────┘
          ▼
┌──────────────────────────────────────────────────────────┐
│  Next.js API 라우트 (얇은 프록시, Vercel, 무상태)           │
│  /api/watchlist  /api/macro                               │
│  · 외부 키 은닉  · 응답 캐싱(revalidate)                    │
│  · CNN 헤더 주입  · Yahoo crumb 처리                       │
└──┬──────────┬──────────┬──────────┬──────────┬───────────┘
   ▼          ▼          ▼          ▼          ▼
 Google     Yahoo     Finnhub      FRED      CNN /
 Sheet    (시세/과거) (밸류)    (금리/HY)  frankfurter
 (gviz csv)                               (공포/환율)
```

### 레이어와 책임 (단위 분리)
순수 계산 로직(부수효과 없음, 테스트 쉬움)과 I/O 로직을 명확히 분리한다.

| 파일 | 책임 | 의존 |
|------|------|------|
| `lib/sheet.ts` | 시트 CSV fetch + 파싱 → `WatchlistConfig` | 외부(시트) |
| `lib/providers/yahoo.ts` | `quote`, `dailyCloses(sym)` | 외부(Yahoo) |
| `lib/providers/finnhub.ts` | `valuation(sym)`, (v2)`nextEarnings(sym)` | 외부(Finnhub) |
| `lib/providers/macro.ts` | `tenYearYield()`, `hySpread()`, `fearGreed()`, `usdKrw()` | 외부(FRED/CNN/FX) |
| `lib/indicators.ts` | **순수**: `rsi14()`, `sma()`, `crossState()`, `range52w()`, `volumeSpike()` | 없음 |
| `lib/buyzones.ts` | **순수**: `zones()`, `zoneStatus()`, `distanceToNextZone()` | 없음 |
| `lib/scoring.ts` | **순수**: `themeScore()`, `valuationBadges()`, `macroRegime()` | 없음 |
| `app/api/watchlist/route.ts` | 오케스트레이션: 시트→각 종목 enrich→`EnrichedStock[]` | 위 전부 |
| `app/api/macro/route.ts` | 매크로 패널 데이터 | macro |
| `components/*` | 표시 전용(프레젠테이셔널) | API 응답 |

---

## 5. 데이터 모델

### 5.1 시트 → `WatchlistConfig` 매핑
시트 1행은 헤더, 2행부터 종목. `No`가 숫자이고 `티커`가 비지 않은 행만 종목으로 인정하고, 빈 행에서 종목 영역을 종료한다. 이후 키-값 블록은 매크로/밸류에이션 기준으로 파싱한다.

앱이 **읽는** 컬럼:
```
티커        → ticker        (예: TSLA)   [필수]
종목        → name          (예: 테슬라)
키워드(매수) → buyThesis      (예: 자율주행/로봇)
리스크(매도) → sellRisk       (예: 미중/관세)
AI 인프라   → theme.aiInfra  (O/X → bool)
트럼프트레이딩→ theme.trump    (O/X → bool)
관세피난처   → theme.tariff   (O/X → bool)
고점        → highOverride   [선택] 비어있으면 52주 최고가 사용
```
앱이 **무시**하는 컬럼(자동 계산/실시간으로 대체): 현재가, RSI, -10~-25%, 점수.

시트 하단 블록에서 **선택적으로** 읽는 사용자 기준(없으면 기본값):
```
ROE  → roeRange   기본 [15, 20]   (%)
PER  → perMax     기본 15
PSR  → psrRange   기본 [1.5, 3]
PBR  → pbrMax     기본 1.5
```
매크로 값(10년 금리·공포지수·하이일드)은 시트의 정적 복사본을 **무시하고** 실시간 API로 가져온다.

시트 접근: `https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&gid={GID}` 를 프록시에서 fetch(캐시). 시트는 "링크가 있는 사람 읽기 가능"(현재 상태) 유지 필요.

### 5.2 `EnrichedStock` (API → 프론트)
```ts
type EnrichedStock = {
  ticker: string; name: string;
  // 실시간
  price: number | null;            // Yahoo 현재가(또는 전일종가, 장상태로 구분)
  priceKrw: number | null;         // price * usdKrw
  isStale: boolean;                // 캐시/장마감/실패 표시
  // 고점 & 매수구간
  high: number;                    // highOverride ?? 52주 최고가
  highSource: 'sheet' | '52w';
  zones: { pct: 10|15|20|25; price: number; reached: boolean }[];
  nearestUnreached: { pct: number; price: number; distancePct: number } | null;
  drawdownPct: number;             // 고점 대비 현재 낙폭
  // 지표
  rsi14: number | null;
  sma50: number | null; sma200: number | null;
  crossState: 'golden' | 'death' | 'none';
  crossFreshDays: number | null;   // 최근 교차가 N일 전(<=5면 신선)
  range52wPct: number | null;      // 52주 레인지 내 위치 0~100
  volumeSpike: number | null;      // 당일/20일평균 배수
  // 밸류에이션
  valuation: { per?: number; psr?: number; pbr?: number; roe?: number };
  valuationBadges: Record<'per'|'psr'|'pbr'|'roe', 'pass'|'warn'|'fail'|'na'>;
  // 분석(시트)
  buyThesis: string; sellRisk: string;
  theme: { aiInfra: boolean; trump: boolean; tariff: boolean };
  score: 0|1|2|3;
  // 표시 상태
  zoneStatus: 'in-zone' | 'near' | 'far' | 'unknown';
};
```

---

## 6. 계산 로직 (시트 재현 + 자동 시그널)

전부 `lib/` 순수 함수. 단위 테스트 대상.

### 6.1 매수구간 & 위치 (`buyzones.ts`)
- `high = highOverride ?? max(closes_52w)`
- `zone_x.price = high * (1 - x)`, `x ∈ {0.10, 0.15, 0.20, 0.25}`
- `reached = price <= zone.price`
- `nearestUnreached` = reached가 아닌 zone 중 가장 가까운 것, `distancePct = (price - zone.price)/price * 100`
- `drawdownPct = (high - price)/high * 100`
- `zoneStatus`: 하나라도 reached → `in-zone`; 가장 얕은 미도달 존까지 +2% 이내 → `near`; 그 외 → `far`

### 6.2 RSI(14) — Wilder (`indicators.ts`)
일봉 종가 배열에서 계산.
1. `delta[i] = close[i] - close[i-1]`, `gain=max(delta,0)`, `loss=max(-delta,0)`
2. 첫 평균: 최초 14개 단순평균 `avgGain0, avgLoss0`
3. Wilder 평활: `avgGain = (prevAvgGain*13 + gain)/14` (loss 동일)
4. `RS = avgGain/avgLoss`; `RSI = 100 - 100/(1+RS)`; `avgLoss=0`이면 `RSI=100`
5. 종가 < 15개면 `null`. 안정성 위해 ~250개(=range 1~2y) 사용.

### 6.3 이동평균 & 교차 (`indicators.ts`)
- `sma(closes, n)` = 최근 n개 평균 (`closes.length < n` → null)
- `crossState`: `sma50 > sma200` → golden 영역, `<` → death 영역
- `crossFreshDays`: 최근 5세션 내 부호 전환 발생 시 며칠 전인지, 없으면 null

### 6.4 52주 위치 & 거래량 (`indicators.ts`)
- `range52wPct = (price - low52)/(high52 - low52) * 100`
- `volumeSpike = todayVolume / avg(volume[-20:])`; ≥1.5 경고, ≥2.0 강조

### 6.5 점수 (`scoring.ts`)
- `score = (aiInfra?1:0) + (trump?1:0) + (tariff?1:0)` → 0~3 (시트 점수와 일치)

### 6.6 밸류에이션 배지 (`scoring.ts`)
사용자 기준(시트 또는 기본값) 대비 pass/warn/fail/na. 값 없으면(예: ETF) `na`.
- PER: `<= perMax` pass / `<= perMax*1.2` warn / else fail / `null|음수` na
- PSR: 범위 `[psrMin, psrMax]` 안 pass / 경계 ±20% warn / else fail
- PBR: `<= pbrMax` pass / `<= pbrMax*1.2` warn / else fail
- ROE: 범위 `[roeMin, roeMax]` 안 pass / `> roeMax` warn(과열·레버리지 주의, 사용자 룰이 상한을 둠) / `< roeMin` fail
- 요약 배지: "n/4 pass"

### 6.7 매크로 레짐 다이얼 (`scoring.ts`) — v1 휴리스틱(튜닝 가능)
입력: 공포탐욕(F&G 0~100), 10년 금리, 하이일드 스프레드(+1년 퍼센타일).

기본 레짐 = F&G 구간:
| F&G | 레짐 | 강조 매수존(“지금 행동”) |
|-----|------|------------------------|
| ≤25 (극공포) | Risk-Off(역발상 적극) | -10 / -15 |
| 26–44 (공포) | Caution-Buy | -15 |
| 45–55 (중립) | Neutral | -15 / -20 |
| 56–74 (탐욕) | Risk-On(보수적 매수) | -20 |
| ≥75 (극탐욕) | Greed | -25만 |

보정: 하이일드 스프레드가 최근 1년 **상위 10%** 이고 상승 중이면 한 칸 보수적으로(신용 스트레스 = 공포 딥도 더 빠질 수 있음). 각 입력은 자체 서브배지로 "왜 이 레짐인지" 표시.

---

## 7. UI / UX 명세 (모바일 우선)

### 7.1 메인 — 워치리스트 화면
- **상단 고정 요약 헤더 (`SummaryHeader`)**: "매수존 N개 · RSI<30 M개 · 오늘의 무버 X" + **US장 상태를 KST로** (`장마감 · 다음 개장 22:30 KST` 카운트다운) + 공포탐욕 칩 + 레짐 다이얼 요약. 장 마감 시 가격은 "전일 종가"로 흐리게 표기.
- **신호등 리스트 (`StockRow` × N)**: 행마다 큰 색상 칩 — 🟢 매수존 진입(어느 존인지) / 🟡 근접(+2% 이내) / ⚪ 멀리. 칩 텍스트에 거리 표시(`-15%존까지 +1.8%` 또는 `-20%존 진입`). RSI<30이면 RSI 배지 적색. 점수(0~3) 표시.
- **정렬/그룹**: 기본 = 다음 매수존까지 거리 오름차순(행동할 종목이 위로). 탭으로 점수순/RSI순 토글, 테마별 그룹 토글.

### 7.2 상세 카드 (`StockDetailCard`)
탭하면 펼침/이동. 시트의 종목 블록을 모바일로 재현:
- **매수존 사다리(`BuyZoneLadder`)**: 고점과 -10/-15/-20/-25 가격을 세로 사다리로, 현재가 위치 마커. (고점 출처 sheet/52w 표기)
- **RSI 게이지(`RsiGauge`)** + 이동평균 배지(`200일선 위, 골든크로스 3일전`) + 52주 위치 + 거래량 배수
- **밸류에이션 배지**(PER/PSR/PBR/ROE pass/warn/fail) + 요약
- 매수논리 / 리스크(시트) + 테마 칩 + 점수
- 가격 **USD/KRW 동시** 표기

### 7.3 매크로 패널 (`MacroDial`)
레짐 다이얼 + 3개 입력(공포탐욕·10년물·하이일드)을 퍼센타일 막대와 함께. "왜 이 레짐인지" 한 줄.

### 7.4 인앱 알림 (v1)
앱이 열려 있는 동안, 새 데이터에서 **매수존 신규 진입 / RSI<30 진입**을 감지하면 화면 상단 토스트 + 요약 헤더 강조. (백그라운드 푸시는 향후.)

### 7.5 PWA / 테마
- manifest + 서비스워커: 홈화면 설치, 풀스크린 실행.
- 다크모드: OS 설정 따름(`prefers-color-scheme`) + 수동 토글. (한국 새벽 사용 고려)
- 오프라인: 마지막 성공 스냅샷 표시 + `오프라인 · 14:32 KST 데이터` 배너.
- Pull-to-refresh: 전체 재조회, "갱신 14:32 KST" 타임스탬프, 실패 행 stale-dot, 과호출 방지 쿨다운.

---

## 8. 캐싱 & 레이트리밋 전략

무상태 서버리스이므로 **DB 없이** Next.js Route Handler 캐시(`revalidate`)/`fetch` 데이터 캐시/CDN으로 처리.

| 데이터 | 캐시 TTL |
|--------|----------|
| 시트 config | 5~10분 (수동 새로고침 시 무효화) |
| 시세(quote) | 장중 ~60초 / 장마감 더 길게 |
| 과거 일봉(RSI/MA) | 1일 (종가는 하루 1회 변경) |
| 밸류에이션(Finnhub) | 1일 |
| 매크로(FRED/CNN) | 1~6시간 |
| 환율 | 1일 |

- Yahoo: `query2` 우선, `query1` 실패시 폴백, IP 스로틀(429) 시 백오프+캐시 서빙.
- Finnhub: 30콜/초 — 20종목은 무리 없음.
- 캐싱 덕분에 무료 한도 내에서 안정.

---

## 9. 에러 처리 & 폴백

| 상황 | 처리 |
|------|------|
| 특정 종목 시세 실패 | 그 행만 마지막 캐시 + stale 표시, 리스트 전체는 정상 |
| Yahoo 전체 다운/429 | 백오프 후 캐시 서빙, (옵션) Twelve Data 폴백 |
| 밸류에이션 없음(ETF 등) | 배지 `na`, 크래시 없음 |
| 실적/펀더멘털 음수·결측 | 정상적으로 `na`/`n/a` |
| 시트 접근 실패 | 에러 배너 + 마지막 캐시 config |
| CNN 418 / FRED 다운 | 매크로 패널만 "불러오지 못함", 나머지 정상 |
| 장 마감 | 가격을 "전일 종가"로 라벨, 신선도 흐리게 |

원칙: **부분 실패가 전체를 막지 않는다.** 각 위젯은 독립적으로 degrade.

---

## 10. v1 비범위 (향후)
- 🌙 **백그라운드 푸시 알림**(앱 닫힘 상태): Vercel Cron + 저장소 필요 → 별도 단계.
- 📝 매매 저널 / 규율 스코어카드 / 포지션 사이징: 보유·매매 기록 저장 필요.
- 🔔 Sell-risk 트립와이어, 📅 실적 D-day: v2.
- 다기기 동기화: 시트가 단일 출처라 사실상 자동 동기화(편집은 시트), 별도 불필요.

---

## 11. 테스트 전략
- **순수 로직 단위 테스트(우선·TDD)**: `rsi14`, `sma`, `crossState`, `range52w`, `volumeSpike`, `zones/zoneStatus/distance`, `themeScore`, `valuationBadges`, `macroRegime` — 고정 fixture로 정확값 검증(특히 RSI는 알려진 예제로).
- **시트 파서 테스트**: 실제 시트 CSV(현 20종목 + 빈행 + 매크로 블록 + ETF 결측)를 fixture로 → `WatchlistConfig` 검증.
- **프로바이더 어댑터 테스트**: 외부 응답 목킹 → 모델 정규화 검증.
- **E2E(향후)**: Playwright 모바일 뷰포트 스모크(리스트 렌더·정렬·상세 열기).

---

## 12. 환경 변수
```
GOOGLE_SHEET_ID=13ZUwAPFd-NMSX485xq9jW4e1ANVkGY2Q4Z2dQXn69Zg
GOOGLE_SHEET_GID=0
FINNHUB_API_KEY=...
FRED_API_KEY=...        # 또는 키리스 fredgraph.csv 폴백
# Yahoo / CNN / frankfurter: 키 없음
```

---

## 13. 결정 사항 (2026-05-31 사용자 승인 — 잠금)
1. **고점 정의**: 시트 `고점` 값 있으면 우선, 없으면 52주 최고가. ✅
2. **시트 접근**: 현재 "링크 읽기 가능" 공개 상태 유지, gviz CSV로 읽음. ✅
3. **ETF 종목**(QQQM·ARKK·XLU·SHLD·BLOK 등): 밸류에이션/실적 `na` 처리. ✅
4. **매크로 레짐 규칙**(§6.7): 제안 휴리스틱으로 시작, 이후 튜닝. ✅
5. **ROE 룰**: 15~20% 범위 pass, 상한 초과(`>20%`)는 `warn`(레버리지 주의), `<15%` fail. ✅
6. **Twelve Data 폴백**: v1은 Yahoo만으로 시작, 폴백은 향후. ✅

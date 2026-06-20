# 단기/장기 매매신호 (이격도 기반) — 설계

- 작성일: 2026-06-20
- 상태: 승인됨 (구현 계획 작성 단계로 진행)

## 배경

popol은 검색한 미국 주식의 RSI·이동평균(50/200)·매수존·밸류에이션을 Yahoo 일봉으로
그때그때 계산하는 검색 기반 PWA다. 현재 코드는 `sma50`/`sma200`과 골든/데드크로스까지는
계산하지만, **이격도(disparity)** 와 그에 따른 **과열/과매도 매매신호**는 없다.

기존 구글 시트(더 이상 사용 안 함)에는 50일/200일 각각의 이격도와 7단계 매매신호
컬럼이 있었다. 그 신호 체계를 코드에 내장하여 **검색한 어떤 티커에든 동일하게** 적용한다.

## 목표

검색한 티커의 현재가와 50/200일 이동평균으로 이격도를 계산하고, ±5/±10/±15% 대칭
임계값에 따라 단기(50일)·장기(200일) 매매신호를 부여해 카드의 "추세" 블록에 노출한다.

비목표(YAGNI): 새 API·외부 호출 추가 없음. 시트 연동 없음(고정값을 읽지 않고 실시간 계산).
임계값 사용자 설정 없음(코드 내장 고정).

## 신호 체계

이격도 정의:

```
이격도(%) = (현재가 − 이동평균) / 이동평균 × 100
```

7단계 레벨 (시트와 동일, 0 기준 대칭, 경계는 하한 포함):

| 이격도 구간 | 레벨 키 | 표시(이모지 · 라벨) |
|---|---|---|
| ≥ +15% | `strong-overheated` | 🔴 강과열 · 매도 고려 |
| +10% ~ +15% | `overheated` | 🟠 과열 |
| +5% ~ +10% | `weak-overheated` | 🟡 약과열 |
| −5% ~ +5% | `normal` | 🟢 정상 |
| −5% ~ −10% | `weak-oversold` | 🟡 약과매도 |
| −10% ~ −15% | `oversold` | 🟠 과매도 |
| ≤ −15% | `strong-oversold` | 🔴 강과매도 · 매수 고려 |

경계 규칙: 절댓값 기준 `|d| < 5` 정상, `5 ≤ |d| < 10` 약, `10 ≤ |d| < 15` 중,
`|d| ≥ 15` 강. (예: 정확히 −5%면 약과매도, −4.9%면 정상.)

데이터 부족 처리: 50일 미만이면 `sma50`=null, 200일 미만이면 `sma200`=null → 해당
이격도/신호도 null → UI에서 "—". (예: 상장 이력 짧은 종목.)

## 아키텍처 / 변경 단위

순수 계산 로직과 표시(라벨/이모지/색)를 분리한다. 로직은 라이브러리에 두어 단위테스트하고,
표시 매핑은 컴포넌트가 소유한다.

### 1. `src/lib/indicators.ts` — 순수 함수 추가

```ts
export type MaSignalLevel =
  | "strong-overheated" | "overheated" | "weak-overheated"
  | "normal"
  | "weak-oversold" | "oversold" | "strong-oversold";

/** 이격도(%) = (price − sma)/sma × 100. sma가 null/0이면 null. */
export function disparity(price: number | null, sma: number | null): number | null;

/** 이격도(%) → 7단계 레벨. 입력 null이면 null. */
export function maSignal(disparityPct: number | null): MaSignalLevel | null;
```

- `disparity`: `sma == null || sma === 0 || price == null` → null. 아니면 `(price-sma)/sma*100`.
- `maSignal`: null 입력 → null. 그 외 절댓값 구간으로 레벨 매핑.

### 2. `src/lib/types.ts` — `EnrichedStock` 확장

`MaSignalLevel`을 재노출(또는 import)하고 4개 필드 추가:

```ts
disparity50: number | null;
disparity200: number | null;
signal50: MaSignalLevel | null;
signal200: MaSignalLevel | null;
```

라벨/이모지/색상은 타입에 넣지 않는다(표시 책임은 컴포넌트).

### 3. `src/lib/enrich.ts` — 조립

이미 계산된 `price`, `sma50`, `sma200`으로 4필드를 채운다. 추가 입력·외부 호출 없음.

```ts
const disparity50 = disparity(price, sma50);
const disparity200 = disparity(price, sma200);
// ... signal50 = maSignal(disparity50), signal200 = maSignal(disparity200)
```

### 4. `src/components/StockAnalysis.tsx` — "추세" 블록 강화

레벨 키 → `{ emoji, label, className }` 매핑 헬퍼를 컴포넌트 파일에 둔다. 색상은 기존
Tailwind 팔레트(green/amber/orange/red, zinc 폴백)와 일관되게.

표시 형태:

```
추세
단기(50일)  402.49 · −0.50%   🟢 정상
장기(200일) 416.96 · −3.95%   🟢 정상
골든크로스 영역 (3일 전 교차)        ← 기존 보조 라인 유지
52주 위치 35% / 거래량 1.2배          ← 기존대로 유지
```

신호/이격도가 null이면 해당 줄은 이평선 값만 표시하거나 생략(기존 null 가드 패턴 따름).

## 데이터 흐름

```
Yahoo 일봉 closes ─► sma50/sma200 (기존)
                         │ + price
                         ▼
                 disparity50/200 ─► maSignal ─► signal50/200
                         │
                         ▼
                 EnrichedStock ─► StockAnalysis "추세" 블록 표시
```

## 에러 / 엣지 케이스

- 이력 부족(closes < 50 또는 < 200): 해당 sma null → 이격도/신호 null → "—".
- sma가 0인 비정상 데이터: disparity가 0 나눗셈을 피해 null 반환.
- price null(시세 실패): 두 이격도 모두 null.
- 경계값(±5/±10/±15 정확히): 하한 포함 규칙으로 결정적 처리.

## 테스트 — `src/lib/indicators.test.ts`

- `disparity`: 양/음 이격, sma null → null, sma 0 → null, price null → null.
- `maSignal` 경계값: 0→normal, ±4.9→normal, ±5→약, ±9.9→약, ±10→중, ±15→강,
  큰 값(±30)→강, null→null. 부호별 over/under 양쪽 검증.
- (선택) 시트 실제 표본 일부로 회귀 검증: 예) −0.50%→normal, −7.20%→weak-oversold,
  −19.66%→strong-oversold, +20.21%→strong-overheated.

## 변경 범위 요약

- 수정: `indicators.ts`, `types.ts`, `enrich.ts`, `StockAnalysis.tsx`
- 추가/갱신: `indicators.test.ts`
- 새 API·외부 호출·시트 연동: 없음

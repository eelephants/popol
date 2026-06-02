# 관심종목 (popol)

구글 시트로 관리하던 **미국 주식 관심종목**을, 시세·지표를 무료 API에서 자동으로 채워 보여주는 **모바일 우선 PWA**입니다. 시트의 매수구간·점수 로직을 그대로 재현하고, RSI·이동평균·밸류에이션·매크로 레짐까지 한 화면에서 확인합니다.

> 종목 목록과 매수논리·테마는 **구글 시트**에서 관리하고(앱은 읽기 전용), 가격·RSI 같은 숫자는 전부 자동으로 채워집니다. **별도 DB 없음.**

## 주요 기능

- **신호등 워치리스트** — 매수존(-10/-15/-20/-25%) 진입 여부를 색상 칩으로, "다음 존까지 N%" 거리순/점수순/RSI순 정렬
- **자동 계산 시그널** — RSI(14)·50/200일 이동평균(골든/데드크로스)·52주 위치·비정상 거래량·일일 등락률
- **밸류에이션 배지** — PER/PSR/PBR/ROE를 내 기준과 자동 대조 (pass/warn/fail)
- **매크로 레짐 다이얼** — 공포탐욕지수 + 10년 금리 + 하이일드 스프레드 → 어떤 매수존을 적극 공략할지 제안
- **상세 카드** — 매수존 사다리·RSI 게이지·테마/매수논리·USD/KRW 동시 표시
- **오늘의 요약** — 매수존 진입/과매도 개수, 오늘의 무버, 미국장 상태(KST), 테마 집중도
- **모바일 UX** — PWA 설치, 다크모드 토글, 풀투리프레시, 오프라인 배너, 인앱 알림(매수존/RSI<30 진입)

## 기술 스택

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Vitest · Vercel 배포

## 데이터 소스 (모두 무료)

| 데이터 | 소스 | 키 |
|--------|------|-----|
| 종목 목록 · 매수논리 · 테마 · 밸류 기준 | 구글 시트 (`/export` CSV) | 불필요 |
| 현재가 · 과거 일봉(RSI/이동평균) | Yahoo Finance v8 chart (서버 직접 호출) | 불필요 |
| 밸류에이션 (PER/PSR/PBR/ROE) | Finnhub `/stock/metric` | 무료 |
| 10년 금리 · 하이일드 스프레드 | FRED (DGS10 · BAMLH0A0HYM2) | 무료 |
| 공포탐욕지수 | CNN Fear & Greed | 불필요 |
| USD/KRW 환율 | frankfurter.dev | 불필요 |

외부 API는 모두 **서버 라우트(`/api/*`)에서만** 호출해 키를 노출하지 않고 캐싱합니다.

## 시작하기

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 설정
cp .env.local.example .env.local
# GOOGLE_SHEET_ID 는 이미 채워져 있습니다.
# (선택) 밸류에이션 배지 + 금리/HY 를 켜려면 무료 키 2개 추가:
#   FINNHUB_API_KEY  → https://finnhub.io
#   FRED_API_KEY     → https://fred.stlouisfed.org

# 3) 개발 서버
npm run dev          # http://localhost:3000

# 테스트 / 빌드
npm test
npm run build
```

키가 없어도 **가격·RSI·매수구간·점수·공포지수·환율**은 동작합니다. 밸류에이션 배지와 금리/HY 지표만 위 두 키가 필요합니다.

## 환경변수

```
GOOGLE_SHEET_ID=<구글 시트 ID>
GOOGLE_SHEET_GID=0
FINNHUB_API_KEY=        # 선택
FRED_API_KEY=           # 선택
```

## 아키텍처

```
[브라우저 PWA] ──/api/*──> [Next.js 서버 라우트(키 은닉·캐싱)] ──> 구글시트 / Yahoo / Finnhub / FRED / CNN / FX
```

- `src/lib/*` — 순수 계산 로직 (매수구간·RSI·이동평균·점수·밸류에이션·매크로 레짐·시트 파서). 단위 테스트로 검증.
- `src/lib/providers/*` — 외부 데이터 어댑터.
- `src/app/api/*` — 워치리스트/매크로 오케스트레이션 라우트.
- `src/components/*` — 표시 전용 컴포넌트.

설계·구현 계획 문서는 `docs/superpowers/` 에 있습니다.

## 배포 (Vercel)

1. 이 저장소를 Vercel 프로젝트에 연결
2. 환경변수 4개 등록 (`GOOGLE_SHEET_ID`, `GOOGLE_SHEET_GID`, `FINNHUB_API_KEY`, `FRED_API_KEY`)
3. 배포 후 모바일에서 "홈 화면에 추가"로 PWA 설치

## 참고

- 구글 시트는 "링크가 있는 사람 읽기 가능" 상태를 유지해야 합니다(앱이 CSV로 읽음).
- 매수구간의 기준 고점은 시트의 `고점` 값이 있으면 우선 사용하고, 없으면 52주 최고가를 씁니다.

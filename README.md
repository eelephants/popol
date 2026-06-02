# 종목 분석 (popol)

미국 주식을 **검색**하면 RSI·이동평균(50/200일)·매수존(-10~-25%)·밸류에이션을 자동 계산해 보여주는 **모바일 우선 PWA**. 시세·과거 데이터는 무료 API에서 실시간으로 가져오고, 계산 공식은 코드에 내장되어 어떤 종목이든 동일하게 적용됩니다. 별도 DB 없음.

## 주요 기능

- **종목 검색** — 티커/회사명 자동완성(Yahoo), 아무 미국 주식이나 즉시 분석
- **매수존 분석** — 52주 최고가 기준 -10/-15/-20/-25% 가격과 현재가까지의 거리
- **자동 시그널** — RSI(14)·50/200일 이동평균(골든/데드크로스)·52주 위치·거래량·일일 등락률
- **밸류에이션 배지** — PER/PSR/PBR/ROE를 기준값과 자동 대조 (pass/warn/fail)
- **매크로 헤더** — 공포탐욕지수 + 10년 금리 + 하이일드 스프레드 → 레짐(시장 분위기)
- **모바일 UX** — PWA 설치, 다크모드 토글, 최근 검색, USD/KRW 동시 표시

## 기술 스택

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Vitest · Vercel 배포

## 데이터 소스 (모두 무료)

| 데이터 | 소스 | 키 |
|--------|------|-----|
| 종목 검색 | Yahoo Finance search | 불필요 |
| 현재가 · 과거 일봉(RSI/이동평균) | Yahoo Finance v8 chart | 불필요 |
| 밸류에이션 (PER/PSR/PBR/ROE) | Finnhub `/stock/metric` | 무료(선택) |
| 10년 금리 · 하이일드 스프레드 | FRED | 무료(선택) |
| 공포탐욕지수 | CNN Fear & Greed | 불필요 |
| USD/KRW 환율 | frankfurter.dev | 불필요 |

외부 API는 모두 서버 라우트(`/api/*`)에서만 호출합니다.

## 시작하기

```bash
npm install
cp .env.local.example .env.local   # (선택) Finnhub/FRED 키 입력 — 없어도 대부분 동작
npm run dev                         # http://localhost:3000
npm test
npm run build
```

키가 전혀 없어도 **검색·시세·RSI·이동평균·매수존·환율·공포지수**가 동작합니다. 밸류에이션 배지는 `FINNHUB_API_KEY`, 금리/HY 지표는 `FRED_API_KEY`가 있을 때 채워집니다.

## 계산 공식

- 매수존 = 52주 최고가 × (1 − x%), x ∈ {10, 15, 20, 25}
- RSI = Wilder 14
- 이동평균 = 단순 50일 / 200일
- 모두 코드에 내장 — 검색한 어떤 종목이든 동일하게 적용

## 배포 (Vercel)

이 저장소를 Vercel에 연결하면 `main` push마다 자동 배포됩니다. (선택) 환경변수 `FINNHUB_API_KEY`·`FRED_API_KEY` 등록.

설계/구현 문서는 `docs/superpowers/` 참고 (초기 버전은 시트 기반 워치리스트였고, 이후 검색형으로 전환).

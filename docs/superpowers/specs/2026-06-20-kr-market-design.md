# 국장(국내 증시) 탭 — 설계

- 작성일: 2026-06-20
- 상태: 승인됨 (구현 계획 작성 단계로 진행)
- 브랜치: feat/kr-market (develop 기반)

## 배경 / 목표

현재 popol은 미국 주식만 검색·분석한다. 같은 키리스 Yahoo v8 chart 엔드포인트가
한국 종목(`.KS` 코스피, `.KQ` 코스닥)도 KRW로 완전히 지원함을 확인했다(삼성전자
005930.KS → price 354,000 KRW, 일봉 485개). RSI·이동평균·매수존·이격도/매매신호는
가격 시계열 기반이라 시장 무관하게 동작한다.

목표: **US / 국장 탭**으로 시장을 구분하고, 국장에서는 **공포지수·금리·밸류에이션을
숨긴다.** 한국 종목은 ₩ 네이티브로 표시한다. 한글명 검색을 지원한다.

비목표(YAGNI): 한국장 장중 세션 시간 계산, 한국 매크로 지표(코스피 F&G 등), 전 종목
한글명 커버리지, 새 외부 API/키.

## 핵심 접근: 하이브리드

- **탭(US/국장)** → 검색 범위 + 매크로 카드(공포지수·금리·환율) 노출 여부를 결정.
- **종목의 통화(Yahoo `meta.currency`)** → 가격 표시 형식 + 밸류에이션 숨김을 결정.
  `/stock/[ticker]` 직접 진입 시에도 시장을 올바로 판별하기 위함(탭 상태가 없는 경로).

## 시장 판별 규칙

- `meta.currency === "KRW"` → `market = "KR"`, 그 외 → `market = "US"`.
- 보조: 티커가 `.KS`/`.KQ`로 끝나면 KR(검색/Finnhub 생략 판단에 사용). 최종 판별은 통화 기준.

## 컴포넌트 설계

### 1. `src/lib/types.ts`
- `Quote`에 `currency: string` 추가.
- `EnrichedStock`에 `market: "US" | "KR"` 추가.

### 2. `src/lib/providers/yahoo.ts`
- `meta.currency`를 `Quote.currency`에 담는다(없으면 `"USD"` 기본).

### 3. `src/lib/enrich.ts`
- `market = d.quote?.currency === "KRW" ? "KR" : "US"`.
- `priceKrw`: **US만** `price * usdKrw`. KR이면 `null`(이미 원화, UI가 price를 ₩로 표시).
- 나머지 계산(RSI/SMA/zones/disparity/signal/range52w/volumeSpike) 변경 없음.

### 4. `src/lib/krStocks.ts` (신규)
- 코스피/코스닥 **주요 종목** `{ ticker: string; krName: string; aliases?: string[] }[]` 큐레이션 테이블.
- `resolveKrName(query: string): SymbolMatch[]` — 공백/대소문자/영문동의어 정규화 후 부분일치 조회.
  반환은 기존 `SymbolMatch {symbol,name,exchange}` 형태(exchange는 접미사에서 `.KS`→"코스피", `.KQ`→"코스닥").
- 시드(아래)는 구현 시 **각 코드를 Yahoo 차트로 검증**(KRW 반환 + 이름 일치)하고 불일치는 수정/제거.
  대형주 중심 시드(.KS=코스피, .KQ=코스닥): 삼성전자 005930.KS, SK하이닉스 000660.KS,
  현대차 005380.KS, 기아 000270.KS, LG에너지솔루션 373220.KS, 삼성바이오로직스 207940.KS,
  셀트리온 068270.KS, NAVER 035420.KS, 카카오 035720.KS, 현대모비스 012330.KS,
  POSCO홀딩스 005490.KS, KB금융 105560.KS, 신한지주 055550.KS, 삼성SDI 006400.KS,
  LG화학 051910.KS, 삼성물산 028260.KS, 한국전력 015760.KS, 삼성생명 032830.KS,
  하나금융지주 086790.KS, LG전자 066570.KS, 에코프로비엠 247540.KQ, 에코프로 086520.KQ,
  알테오젠 196170.KQ, 카카오게임즈 293490.KQ, 펄어비스 263750.KQ, 리노공업 058470.KQ,
  JYP Ent. 035900.KQ. (확장 가능 — 테이블 밖 종목은 코드/영문으로 Yahoo 검색.)

### 5. `src/lib/providers/search.ts` + `src/app/api/search/route.ts`
- `searchSymbols(query, market: "US" | "KR")`:
  - **KR**: ① `resolveKrName(query)` 히트가 있으면 그 결과 우선. ② 그리고/또는 Yahoo 검색
    결과 중 **한국 거래소(symbol이 `.KS`/`.KQ`로 끝나거나 exchange가 한국)**만 남긴다.
    한글 쿼리는 Yahoo가 0건이므로 ①이 담당, 영문/코드는 ②가 담당. 중복은 symbol로 dedupe.
  - **US**: Yahoo 검색에서 `.KS`/`.KQ`(한국) 제외.
- `/api/search`는 `market` 쿼리파라미터(기본 "US")를 받아 전달.

### 6. `src/components/SearchBox.tsx`
- `market: "US" | "KR"` prop 추가 → `/api/search?...&market=` 전달, placeholder를 시장별로
  (US: "AAPL, tesla, NVDA" / KR: "삼성전자, 005930, SK하이닉스").

### 7. `src/app/page.tsx`
- `market` 상태("US" 기본) + 상단 `US / 국장` 토글 탭.
- **국장 탭: `MacroDial` 미렌더**(공포지수·금리·환율 숨김).
- `SearchBox`에 `market` 전달.
- 인기종목·최근검색을 **탭별 분리**: `POPULAR_KR`(신규) 표시, 최근검색은 시장별 localStorage 키
  (`recent-tickers-us` / `recent-tickers-kr`).
- 미국장 세션 라벨은 US 탭에서만(국장 탭 숨김).

### 8. `src/components/StockAnalysis.tsx`
- `market === "KR"`: 가격 `₩{price.toLocaleString()}` 네이티브, `$`/환산 라인 없음;
  **`ValuationBadges` 미렌더**.
- `market === "US"`: 기존 동작($ + ₩ 환산 + 밸류에이션).
- RSI·매수존·이동평균·매매신호는 양쪽 공통.

### 9. `src/lib/stockData.ts`
- KR 종목(티커 `.KS`/`.KQ`)이면 Finnhub `getValuation` 호출 생략(어차피 숨김) — `null` 밸류에이션.

### 10. `src/lib/popular.ts`
- `POPULAR_KR` 추가(주요 한국 종목, krStocks 시드에서 선별). 기존 `POPULAR_TICKERS`는 US로 유지.

## 데이터 흐름

```
탭(market) ──► SearchBox ──► /api/search?market ──► searchSymbols(q, market)
                                                       │  KR: resolveKrName + Yahoo(.KS/.KQ)
                                                       │  US: Yahoo(한국 제외)
   선택 ticker ──► /api/stock ──► getEnrichedStock
                                    │ getYahooData → meta.currency
                                    │ KR이면 Finnhub 생략
                                    ▼
                             enrichStock → market, priceKrw(US만)
                                    ▼
   page: market==="US"이면 MacroDial 렌더
   StockAnalysis: market로 가격형식 + ValuationBadges 노출 분기
```

## 엣지 케이스

- `meta.currency` 누락 → "USD"로 간주(기존 US 동작).
- KR 종목 데이터 부족(상장 이력 짧음) → 기존 null 가드대로 해당 지표 "—".
- 한글 검색 무매칭 + Yahoo 0건 → 빈 결과(기존 처리).
- 6자리 코드 입력 → Yahoo 검색이 `.KS`/`.KQ` 자동 부여(코드 검색 동작 확인됨).
- `/stock/[ticker]` 직접 진입 KR 종목 → 통화 기준으로 ₩ 표시·밸류에이션 숨김(탭 무관).

## 테스트 (Vitest, test/ 디렉터리)

- `enrich`: currency "KRW" → `market:"KR"`, `priceKrw` null; "USD" → `market:"US"`, priceKrw 환산.
- `krStocks`: `resolveKrName` — 정확명/별칭/공백·대소문자 정규화 → 올바른 symbol; 무매칭 → [].
- `search` 순수 필터: KR 결과에서 비한국 제외 / US 결과에서 `.KS`·`.KQ` 제외 (네트워크 분리, 필터 함수 단위 테스트).

## 변경 범위 요약

- 수정: types, yahoo, enrich, stockData, search(provider+route), SearchBox, page, StockAnalysis, popular
- 신규: krStocks.ts (+ 테스트: enrich 보강, krStocks, search 필터)
- 새 외부 API·키: 없음

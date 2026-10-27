# popol — 관심종목 워치리스트

미국·한국 주식의 RSI·이동평균(50/200)·이격도(MA 매매신호)·매수존(-10~-25%)·밸류에이션을 자동 계산하는 모바일 PWA. UI는 US/국장 탭으로 분리. 계산 공식은 코드 내장(검색한 어떤 종목이든 동일 적용), 데이터는 무료 API 실시간. 구글 시트는 더 이상 사용 안 함. 설계/계획 문서는 docs/superpowers/.

- 스택: Next.js 15 (App Router) · TypeScript · Tailwind · Vitest
- 데이터: Yahoo v8 chart · Finnhub · FRED · CNN F&G(풋콜비율·VIX 원값 포함) · frankfurter · SEC EDGAR(10-K 희석 EPS, 키 없음·User-Agent 필수) · Nasdaq 애널리스트 API(연간 EPS 컨센서스, 키 없음·브라우저 헤더 필요) · AAII 결과 페이지(주간 심리 설문 HTML)
- 외부 호출은 전부 서버 라우트(`/api/*`)에서만 (키 은닉 + 캐싱). 예외: AdSense 광고 스크립트(브라우저 직접 로드). `public/sw.js`는 같은 출처 GET만 캐시
- `/privacy` 개인정보처리방침(AdSense 심사용 쿠키 고지 포함) — 데이터 소스·저장 방식이 바뀌면 함께 고친다
- 페이지: `/` 종목 분석 · `/reader` 판독기(역발상·차트·주가 판독기, 적정주가 계산기, 몰빵지수 — 규칙은 `src/lib/readers.ts`·`fairPrice.ts`·`concentration.ts`, 업종표는 생성 데이터 `sectorMap.ts`. 지표 쉬운 설명은 `readers.ts`의 `help`·`LEVEL_HINTS`. 자동: 향후 2년 EPS·장기 성장률(Nasdaq 컨센서스, 마지막 실적→가장 먼 예상 CAGR)·Bull-Bear(AAII). 무료 소스가 없는 지표(FINRA 신용융자·시장 P/E·S&P 이평선 위 비율)는 직접 입력, 입력값은 localStorage) · `/allocate` 자산 분배(총자산·비율 → 배분금액·매수 주수, 소수점 6자리 매수 기준). 하단 탭바(`src/components/NavBar.tsx`, layout에 상주)로 이동. 분배 계산은 원화 정본 + 표시 통화(₩/$) 토글 — 미국 종목은 `EnrichedStock.priceKrw`(= price × usdKrw)를 원화 단가로 쓰므로 환율 코드가 따로 없음.
- 시장 구분: Yahoo `meta.currency === "KRW"` → 국장(KR). 국장은 ₩ 표시·환율변환 없음·공포지수/금리/환율 카드 숨김·Finnhub 밸류에이션 스킵. `/stock/[ticker]` 직접 진입도 동일. 한글명 검색은 `src/lib/krStocks.ts` 매핑(주요 종목, Yahoo 검색은 한글 0건이라 필요). 계산(RSI·이평선·이격도)은 시장 무관.
- SEO: 공용 상수·OpenGraph 규칙은 `src/lib/site.ts` 주석 참고(SITE_URL/OG_BASE/OG_IMAGE). 라우트별 metadata가 필요한 클라이언트 페이지는 서버 `layout.tsx`로 분리(`/allocate/layout.tsx`). 사이트맵 종목은 `src/lib/popular.ts`의 `SEED_TICKERS`.

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://stock-budget.site (가비아 DNS → Vercel. www와 popol-topaz.vercel.app은 308로 이 도메인에 리다이렉트)
- Branch workflow: feature → `develop`(통합) → `develop`→`main` 머지 → `main` 기준 운영배포. 피처를 main에 직접 머지하지 않음.
- Deploy workflow: auto-deploy on push (main → production, PR → preview)
- Deploy status command: HTTP health check
- Merge method: feature→develop은 squash, develop→main은 merge commit (히스토리 연결 유지 — squash로 하면 두 브랜치가 영구 divergence)
- Project type: web app (Next.js PWA)
- Post-deploy health check: {PROD_URL}/api/macro  (키 없이도 200 + usdKrw 반환)

### Custom deploy hooks
- Pre-merge: npm test && npm run build
- Deploy trigger: automatic on push to main (Vercel GitHub integration)
- Deploy status: poll {PROD_URL}/api/macro until 200
- Health check: {PROD_URL}/api/macro

### Env vars (Vercel Project → Settings → Environment Variables) — 모두 선택
- FINNHUB_API_KEY (optional — valuation badges PER/PSR/PBR/ROE; 국장 종목에는 호출 안 함)
- FRED_API_KEY (optional — 10yr yield / HY spread)
- GOOGLE_SITE_VERIFICATION (optional — Search Console HTML-tag 인증. stock-budget.site는 가비아 DNS TXT로 도메인 속성 인증 가능)
- ADSENSE_CLIENT (optional — Google AdSense 게시자 ID `ca-pub-` + 숫자 16자리. 있으면 head에 자동 광고 스크립트·`google-adsense-account` 메타, `/ads.txt` 응답. 형식이 틀리면 무시. 빌드 시 읽으므로 설정 후 재배포 필요. 고정 하단 탭바와 겹치므로 AdSense 자동 광고의 앵커 광고는 끈다)
- NAVER_SITE_VERIFICATION (optional — 네이버 서치어드바이저 HTML-tag 인증. 빌드 시 읽으므로 설정 후 재배포 필요)
# 검색·시세·RSI·매수존·환율·공포지수는 키 없이 동작. 구글 시트 더 이상 사용 안 함.

## CI (`.github/workflows/ci.yml`)
- PR + main/develop push 시 `npm ci → npm test → npm run build` 실행. 품질 게이트 전용 — **배포 안 함**(배포는 Vercel 담당).
- main·develop 브랜치 보호: `test` 체크 통과해야 머지 가능.
- 로컬에서 `npm run build` 금지 권장 — 실행 중인 `next dev`의 `.next`를 깨뜨려 dev 서버가 500을 냄. 빌드는 CI가 함.

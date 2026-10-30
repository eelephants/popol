# popol — 관심종목 워치리스트

미국·한국 주식의 RSI·이동평균(50/200)·이격도(MA 매매신호)·매수존(-10~-25%)·밸류에이션을 자동 계산하는 모바일 PWA. UI는 US/국장 탭으로 분리. 계산 공식은 코드 내장(검색한 어떤 종목이든 동일 적용), 데이터는 무료 API 실시간. 구글 시트는 더 이상 사용 안 함. 설계/계획 문서는 docs/superpowers/.

- 스택: Next.js 15 (App Router) · TypeScript · Tailwind · Vitest
- 데이터: Yahoo v8 chart · Finnhub · FRED · CNN F&G(풋콜비율·VIX 원값 포함) · frankfurter · SEC EDGAR(10-K 희석 EPS, 키 없음·User-Agent 필수) · Nasdaq 애널리스트 API(연간 EPS 컨센서스, 키 없음·브라우저 헤더 필요) · AAII 결과 페이지(주간 심리 설문 HTML)
- 외부 호출은 전부 서버 라우트(`/api/*`)에서만 (키 은닉 + 캐싱). 예외: AdSense 광고 스크립트(브라우저 직접 로드). `public/sw.js`는 같은 출처 GET만 캐시
- `/privacy` 개인정보처리방침(AdSense 심사용 쿠키 고지 포함) — 데이터 소스·저장 방식이 바뀌면 함께 고친다
- 페이지: `/` 종목 분석 · `/reader` 판독기(역발상·차트·주가 판독기, 적정주가 계산기, 몰빵지수 — 규칙은 `src/lib/readers.ts`·`fairPrice.ts`·`concentration.ts`, 업종표는 생성 데이터 `sectorMap.ts`. 지표 쉬운 설명은 `readers.ts`의 `help`·`LEVEL_HINTS`. 자동: 향후 2년 EPS·장기 성장률(Nasdaq 컨센서스, 마지막 실적→가장 먼 예상 CAGR)·Bull-Bear(AAII). 무료 소스가 없는 지표(FINRA 신용융자·시장 P/E·S&P 이평선 위 비율)는 직접 입력, 입력값은 localStorage) · `/allocate` 자산 분배(총자산·비율 → 배분금액·매수 주수, 소수점 6자리 매수 기준). · `/guide` 지표 가이드(글 원고 `src/lib/guides.ts`, 숫자 기준은 계산 코드와 같아야 함 — 규칙을 바꾸면 글도 고친다. `/guide/[slug]` 정적 생성) · `/about` 소개 · `/terms` 이용약관 · `/contact` 문의(GitHub 이슈). 종목 페이지의 "지금 지표 읽기"는 `src/lib/stockNarrative.ts`가 계산값을 문장으로 푼다. AdSense '가치가 별로 없는 콘텐츠' 반려(2026-10-30) 대응으로 넣은 것이라 도구 화면 아래 `GuideLinks`와 푸터 링크를 빼지 않는다. 하단 탭바(`src/components/NavBar.tsx`, layout에 상주)로 이동. 분배 계산은 원화 정본 + 표시 통화(₩/$) 토글 — 미국 종목은 `EnrichedStock.priceKrw`(= price × usdKrw)를 원화 단가로 쓰므로 환율 코드가 따로 없음.
- 시장 구분: Yahoo `meta.currency === "KRW"` → 국장(KR). 국장은 ₩ 표시·환율변환 없음·공포지수/금리/환율 카드 숨김·Finnhub 밸류에이션 스킵. `/stock/[ticker]` 직접 진입도 동일. 한글명 검색은 `src/lib/krStocks.ts` 매핑(주요 종목, Yahoo 검색은 한글 0건이라 필요). 계산(RSI·이평선·이격도)은 시장 무관.
- SEO: 공용 상수·OpenGraph 규칙은 `src/lib/site.ts` 주석 참고(SITE_URL/OG_BASE/OG_IMAGE). 라우트별 metadata가 필요한 클라이언트 페이지는 서버 `layout.tsx`로 분리(`/allocate/layout.tsx`). 사이트맵 종목은 `src/lib/popular.ts`의 `SEED_TICKERS`.

## UI·디자인 시스템 (2026-10 리디자인, #35)
- 스타일: design-taste-frontend 앱 스타일 **achromatic-ledger**(무채색 장부, seed 2102142778). 크롬(틀·메뉴·버튼)은 잉크와 회색, 색은 데이터에만 쓴다.
- 색: `src/app/globals.css`의 CSS 변수(라이트 `:root`, 다크 `.dark`) → `tailwind.config.ts` 색 이름(`ground`·`surface`·`raised`·`line`·`rule`·`control`·`ink`·`muted`·`faint`·`accent`·`up`·`down`, 판정용 `cold-2`·`cold-1`·`flat`·`hot-1`·`hot-2`·`warn`). 컴포넌트에 `zinc`·`emerald`·`red-500` 같은 원색 클래스나 hex를 직접 쓰지 않는다.
- 의미 규칙: 등락은 국내 관례(상승 `up` 빨강 ▲ · 하락 `down` 파랑 ▼, 부호도 글자로). 신호·판정은 온도(과매도·공포 = 차가운 `cold-*`, 과열·광기 = 뜨거운 `hot-*`, 정상 `flat`). 판독기 게이지 다섯 칸은 `--temp-1~5`. 이모지 금지.
- 글꼴: Pretendard Variable(jsDelivr CDN, `layout.tsx`) 하나. 바뀌는 숫자에는 `.num`(tabular-nums). 화면 제목 24px, 화면의 답이 되는 숫자 34px(현재가·판독 점수·목표주가)가 가장 크다.
- 부품: `src/components/ui.tsx`(`Panel`·`Segmented`·`Pill`·`Change`·`PageTitle`·`inputCls`·`money`). 카드 반지름 8px·컨트롤 6px, 쉬는 요소에 그림자 없음(떠 있는 검색 메뉴만 예외).
- 틀: `NavBar.tsx`가 상단 워드마크(+넓은 화면 메뉴·테마 전환)와 휴대폰 하단 탭바를 함께 그린다. 페이지 본문은 `mx-auto max-w-5xl px-4 md:px-8`, 넓은 화면에서 2열.
- 대표 요소: 종목 분석의 **매수존 띠**(`StockAnalysis.tsx` `BuyZoneStrip`, 52주 고점~−30% 위 매수존 네 칸과 현재가).
- 검사: `node ~/.claude/skills/design-taste-frontend/scripts/inspect.mjs <url> --app`(1440·768·390px, 결과는 gitignore된 `.taste-skill/`)와 `lint.mjs --app src`. FAIL 0을 유지한다.
- `tailwind.config.ts`를 바꾸면 dev 서버를 재시작해야 새 클래스가 생긴다.

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

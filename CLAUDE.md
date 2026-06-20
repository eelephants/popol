# popol — 관심종목 워치리스트

미국·한국 주식의 RSI·이동평균(50/200)·이격도(MA 매매신호)·매수존(-10~-25%)·밸류에이션을 자동 계산하는 모바일 PWA. UI는 US/국장 탭으로 분리. 계산 공식은 코드 내장(검색한 어떤 종목이든 동일 적용), 데이터는 무료 API 실시간. 구글 시트는 더 이상 사용 안 함. 설계/계획 문서는 docs/superpowers/.

- 스택: Next.js 15 (App Router) · TypeScript · Tailwind · Vitest
- 데이터: Yahoo v8 chart · Finnhub · FRED · CNN F&G · frankfurter
- 외부 호출은 전부 서버 라우트(`/api/*`)에서만 (키 은닉 + 캐싱)
- 시장 구분: Yahoo `meta.currency === "KRW"` → 국장(KR). 국장은 ₩ 표시·환율변환 없음·공포지수/금리/환율 카드 숨김·Finnhub 밸류에이션 스킵. `/stock/[ticker]` 직접 진입도 동일. 한글명 검색은 `src/lib/krStocks.ts` 매핑(주요 종목, Yahoo 검색은 한글 0건이라 필요). 계산(RSI·이평선·이격도)은 시장 무관.

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://popol-topaz.vercel.app
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
- GOOGLE_SITE_VERIFICATION (optional — Search Console HTML-tag 인증. URL 접두어 속성 사용; vercel.app 서브도메인은 DNS 인증 불가)
# 검색·시세·RSI·매수존·환율·공포지수는 키 없이 동작. 구글 시트 더 이상 사용 안 함.

## CI (`.github/workflows/ci.yml`)
- PR + main/develop push 시 `npm ci → npm test → npm run build` 실행. 품질 게이트 전용 — **배포 안 함**(배포는 Vercel 담당).
- main·develop 브랜치 보호: `test` 체크 통과해야 머지 가능.
- 로컬에서 `npm run build` 금지 권장 — 실행 중인 `next dev`의 `.next`를 깨뜨려 dev 서버가 500을 냄. 빌드는 CI가 함.

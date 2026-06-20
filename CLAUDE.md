# popol — 관심종목 워치리스트

검색한 미국 주식의 RSI·이동평균(50/200)·매수존(-10~-25%)·밸류에이션을 자동 계산하는 모바일 PWA. 계산 공식은 코드 내장(검색한 어떤 종목이든 동일 적용), 데이터는 무료 API 실시간. 구글 시트는 더 이상 사용 안 함. 설계/계획 문서는 docs/superpowers/.

- 스택: Next.js 15 (App Router) · TypeScript · Tailwind · Vitest
- 데이터: Yahoo v8 chart · Finnhub · FRED · CNN F&G · frankfurter
- 외부 호출은 전부 서버 라우트(`/api/*`)에서만 (키 은닉 + 캐싱)

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://popol-topaz.vercel.app
- Deploy workflow: auto-deploy on push (main → production, PR → preview)
- Deploy status command: HTTP health check
- Merge method: squash
- Project type: web app (Next.js PWA)
- Post-deploy health check: {PROD_URL}/api/macro  (키 없이도 200 + usdKrw 반환)

### Custom deploy hooks
- Pre-merge: npm test && npm run build
- Deploy trigger: automatic on push to main (Vercel GitHub integration)
- Deploy status: poll {PROD_URL}/api/macro until 200
- Health check: {PROD_URL}/api/macro

### Env vars (Vercel Project → Settings → Environment Variables) — 모두 선택
- FINNHUB_API_KEY (optional — valuation badges PER/PSR/PBR/ROE)
- FRED_API_KEY (optional — 10yr yield / HY spread)
# 검색·시세·RSI·매수존·환율·공포지수는 키 없이 동작. 구글 시트 더 이상 사용 안 함.

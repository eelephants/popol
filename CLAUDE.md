# popol — 관심종목 워치리스트

미국 주식 관심종목 모바일 PWA. 구글 시트에서 종목·매수논리·테마를 읽고, 시세·RSI·이동평균·밸류에이션·매크로 지표는 무료 API에서 자동 수집한다. 별도 DB 없음. 설계/계획 문서는 `docs/superpowers/`.

- 스택: Next.js 15 (App Router) · TypeScript · Tailwind · Vitest
- 데이터: 구글시트(/export CSV) · Yahoo v8 chart · Finnhub · FRED · CNN F&G · frankfurter
- 외부 호출은 전부 서버 라우트(`/api/*`)에서만 (키 은닉 + 캐싱)

## Deploy Configuration (configured by /setup-deploy)
- Platform: Vercel
- Production URL: https://popol.vercel.app  (첫 배포 후 실제 URL로 갱신 필요)
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

### Required env vars (Vercel Project → Settings → Environment Variables)
- GOOGLE_SHEET_ID (runtime, required) = 13ZUwAPFd-NMSX485xq9jW4e1ANVkGY2Q4Z2dQXn69Zg
- GOOGLE_SHEET_GID (runtime, required) = 0
- FINNHUB_API_KEY (optional — valuation badges)
- FRED_API_KEY (optional — 10yr yield / HY spread)

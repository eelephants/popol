# Session Notes

## 2026-10-13 SEO 강화 (feature/seo-boost)
- 완료: /allocate 전용 canonical·메타, 사이트맵에 /allocate + 국장 시드 종목, 미국·한국 문구, WebSite JSON-LD, 종목 페이지 og:image + "다른 종목 분석" 링크, Yahoo 일시 장애 → 500/503(404 아님), NAVER_SITE_VERIFICATION(선택).
- 미검증: 실제 시세가 붙은 /stock/* 와 하단 링크 — 사내망 Yahoo 차단, Vercel 미리보기에서 확인.
- 수동: 서치콘솔 사이트맵 재제출 + 기준 수치 기록(+4/+8주 비교), 네이버 서치어드바이저 등록 → env 설정 → 재배포.
- 후속: 국장 칩의 .KS/.KQ 접미사 정리(P2), 공용 태그라인 상수(P2), viewport maximumScale 제거(a11y, P3), 종목 페이지 error.tsx(장애가 실제로 보이면).

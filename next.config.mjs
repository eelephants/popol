/** @type {import('next').NextConfig} */
const nextConfig = {
  // 예전 운영 주소(vercel.app)로 들어온 요청은 경로를 유지한 채 대표 도메인으로 영구 이동(308).
  // 프리뷰 배포 주소는 host가 달라 영향이 없다.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "popol-topaz.vercel.app" }],
        destination: "https://stock-budget.site/:path*",
        permanent: true,
      },
    ];
  },
  // PWA 설정 파일은 페이지가 아니므로 색인하지 않는다(Search Console "크롤링됨 - 현재 색인이 생성되지 않음" 정리).
  async headers() {
    return ["/manifest.webmanifest", "/sw.js"].map((source) => ({
      source,
      headers: [{ key: "X-Robots-Tag", value: "noindex" }],
    }));
  },
};
export default nextConfig;

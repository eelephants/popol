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
};
export default nextConfig;

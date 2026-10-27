"use client";
import { useEffect, useRef } from "react";

/** 홈 빈 화면의 사용 예시 영상. 소리 없이 반복, 화면에 보일 때만 불러와 재생한다(움직임 줄이기 설정이면 멈춘 채로 둔다). */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    });
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="mx-auto w-full max-w-[240px]">
      <video
        ref={ref}
        src="/media/search-demo.mp4"
        poster="/media/search-demo.jpg"
        width={540}
        height={960}
        muted
        loop
        playsInline
        preload="none"
        aria-label="종목 검색부터 매수존 판정까지 화면 흐름 예시"
        className="aspect-[9/16] w-full rounded-card border border-line bg-ground"
      />
      <figcaption className="mt-2 text-center text-xs text-muted">2026년 10월 28일 삼성전자 실제 데이터 예시</figcaption>
    </figure>
  );
}

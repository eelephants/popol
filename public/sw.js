const CACHE = "popol-v3";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  // 같은 출처 GET만 다룬다. 광고·외부 스크립트까지 캐시하면 저장소가 불어나고 오프라인 때 낡은 광고 코드가 나간다.
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  // 영상은 Range 요청(206 부분 응답)이라 캐시에 넣을 수 없다. 브라우저에 그대로 맡긴다.
  if (request.headers.has("range") || request.destination === "video") return;
  e.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request)),
  );
});

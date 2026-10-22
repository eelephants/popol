"use client";
import { useEffect, useState } from "react";

/** localStorage에 붙은 상태. 저장소가 막혀 있어도(사파리 비공개 모드 등) 화면은 동작한다.
 *  key가 바뀌면(다른 종목) 그 키의 저장분을 다시 읽는다. */
export function useStored<T extends object>(key: string, initial: T) {
  const [state, setState] = useState<T>(initial);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    let next = initial;
    try {
      const raw = localStorage.getItem(key);
      if (raw) next = { ...initial, ...JSON.parse(raw) };
    } catch {}
    setState(next);
    setLoadedKey(key);
    // initial은 호출부마다 새 객체라 의존성에서 뺀다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (loadedKey !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {}
  }, [key, loadedKey, state]);

  return [state, setState, loadedKey === key] as const;
}

"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {}
  };
  return (
    <button
      onClick={toggle}
      aria-label="테마 전환"
      className="rounded-full border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
    >
      {dark ? "☀️ 라이트" : "🌙 다크"}
    </button>
  );
}

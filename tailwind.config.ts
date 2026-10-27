import type { Config } from "tailwindcss";

// 색은 globals.css의 CSS 변수(라이트/다크)를 쓴다. 컴포넌트에 hex를 직접 쓰지 않는다.
const v = (name: string) => `var(--${name})`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Pretendard Variable"', "Pretendard", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      colors: {
        ground: v("ground"),
        surface: v("surface"),
        raised: v("raised"),
        line: v("line"),
        rule: v("rule"),
        control: v("control"),
        ink: v("ink"),
        muted: v("muted"),
        faint: v("faint"),
        accent: v("accent"),
        up: v("up"),
        down: v("down"),
        "cold-2": { DEFAULT: v("cold-2-bg"), ink: v("cold-2-ink") },
        "cold-1": { DEFAULT: v("cold-1-bg"), ink: v("cold-1-ink") },
        flat: { DEFAULT: v("flat-bg"), ink: v("flat-ink") },
        "hot-1": { DEFAULT: v("hot-1-bg"), ink: v("hot-1-ink") },
        "hot-2": { DEFAULT: v("hot-2-bg"), ink: v("hot-2-ink") },
        warn: { DEFAULT: v("warn-bg"), ink: v("warn-ink") },
      },
      borderRadius: { card: "8px", control: "6px" },
    },
  },
  plugins: [],
} satisfies Config;

# 주식 워치리스트 웹앱 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 시트로 관리하던 미국 주식 관심종목을, 시세·지표를 무료 API에서 자동으로 채워 보여주는 모바일 우선 PWA로 구현한다.

**Architecture:** 프론트(Next.js 클라이언트)는 앱 자체 API 라우트(`/api/*`)만 호출한다. 얇은 Next.js API 라우트가 외부 키를 숨기고 캐싱하며 Google Sheet / Yahoo / Finnhub / FRED / CNN / FX를 중계한다. DB는 없다. 파생 지표(RSI·이동평균·매수구간·점수·밸류에이션·매크로 레짐)는 부수효과 없는 순수 함수로 계산하고 단위 테스트로 검증한다.

**Tech Stack:** Next.js 15(App Router) · TypeScript · Tailwind CSS · Vitest · `yahoo-finance2` · Vercel 배포 · PWA(manifest + service worker)

**스펙 원본:** `docs/superpowers/specs/2026-05-31-stock-watchlist-app-design.md`

---

## File Structure

```
popol/
  package.json, tsconfig.json, next.config.mjs, tailwind.config.ts,
  postcss.config.mjs, vitest.config.ts, .env.local.example
  public/manifest.webmanifest, public/sw.js, public/icons/{icon-192.png,icon-512.png}
  src/
    lib/
      types.ts            # 모든 공유 타입 + 기본값 (계약)
      indicators.ts       # rsi14, sma, crossState, crossFreshDays, range52w, volumeSpike (순수)
      buyzones.ts         # buildZones, nearestUnreachedZone, zoneStatusOf, drawdownPct (순수)
      scoring.ts          # themeScore, valuationBadges, macroRegime (순수)
      marketHours.ts      # usSession (순수, Intl 기반)
      sheet.ts            # parseWatchlistCsv(순수) + fetchWatchlistConfig(I/O)
      providers/
        yahoo.ts          # getQuote, getDailyHistory
        finnhub.ts        # getValuation
        macro.ts          # getTenYearYield, getHySpread, getFearGreed, getUsdKrw
      enrich.ts           # enrichStock (config item + 시세/과거/밸류 → EnrichedStock)
    app/
      api/watchlist/route.ts
      api/macro/route.ts
      layout.tsx, page.tsx, globals.css
    components/
      SummaryHeader.tsx, StockList.tsx, StockRow.tsx, StockDetailCard.tsx,
      BuyZoneLadder.tsx, RsiGauge.tsx, ValuationBadges.tsx, MacroDial.tsx,
      ThemeConcentration.tsx
    test/
      indicators.test.ts, buyzones.test.ts, scoring.test.ts,
      marketHours.test.ts, sheet.test.ts, enrich.test.ts
      fixtures/sheet.csv
```

**Layer rule:** `lib/*`(providers 제외)와 `enrich.ts`는 순수/결정적 → TDD 대상. providers·API 라우트는 I/O → 목킹 테스트. components는 표시 전용 → 빌드+수동 검증.

---

## Phase A — Scaffold

### Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.local.example`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`

- [ ] **Step 1: 디렉토리에서 git 초기화**

Run:
```bash
cd /Users/kimsangcho/dev/side-job/popol
git init
```
Expected: `Initialized empty Git repository`

- [ ] **Step 2: `package.json` 작성**

```json
{
  "name": "popol-watchlist",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.1.0",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "yahoo-finance2": "^2.13.3"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.2",
    "vitest": "^2.1.8"
  }
}
```

> 주의: 검증된 `yahoo-finance2`는 v3.x(2026-05-30)도 있으나, 안정 API(`quote`,`chart`)는 v2/v3 동일. 설치 후 실제 버전 확인하고 import가 동작하면 OK.

- [ ] **Step 3: 설정 파일 작성**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

`next.config.mjs`:
```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["yahoo-finance2"],
};
export default nextConfig;
```

`tailwind.config.ts`:
```ts
import type { Config } from "tailwindcss";
export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media",
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

`postcss.config.mjs`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
export default defineConfig({
  test: { environment: "node", include: ["test/**/*.test.ts"] },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
```

`.gitignore`:
```
node_modules
.next
.env.local
*.tsbuildinfo
next-env.d.ts
```

`.env.local.example`:
```
GOOGLE_SHEET_ID=13ZUwAPFd-NMSX485xq9jW4e1ANVkGY2Q4Z2dQXn69Zg
GOOGLE_SHEET_GID=0
FINNHUB_API_KEY=
FRED_API_KEY=
```

- [ ] **Step 4: 최소 앱 셸 작성**

`src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { color-scheme: light dark; }
body { @apply bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100; }
```

`src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "관심종목",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
```

`src/app/page.tsx`:
```tsx
export default function Page() {
  return <main className="p-4">관심종목 (scaffold)</main>;
}
```

- [ ] **Step 5: 설치 & 빌드 확인**

Run:
```bash
npm install && npm run build
```
Expected: 빌드 성공 (`✓ Compiled successfully`). 실패 시 버전/경로 수정.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js + TS + Tailwind + Vitest"
```

---

## Phase B — 순수 계산 라이브러리 (TDD)

### Task 2: 공유 타입 계약 (`types.ts`)

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: 타입 작성** (이후 모든 태스크가 이 시그니처를 따른다)

```ts
export type ThemeFlags = { aiInfra: boolean; trump: boolean; tariff: boolean };
export type Score = 0 | 1 | 2 | 3;

export type ValuationThresholds = {
  roeRange: [number, number]; // percent
  perMax: number;
  psrRange: [number, number];
  pbrMax: number;
};
export const DEFAULT_THRESHOLDS: ValuationThresholds = {
  roeRange: [15, 20], perMax: 15, psrRange: [1.5, 3], pbrMax: 1.5,
};

export type WatchlistItem = {
  ticker: string; name: string;
  buyThesis: string; sellRisk: string;
  theme: ThemeFlags; highOverride: number | null;
};
export type WatchlistConfig = { items: WatchlistItem[]; thresholds: ValuationThresholds };

export const ZONE_PCTS = [10, 15, 20, 25] as const;
export type ZonePct = (typeof ZONE_PCTS)[number];
export type Zone = { pct: ZonePct; price: number; reached: boolean };
export type NearestZone = { pct: ZonePct; price: number; distancePct: number } | null;
export type ZoneStatus = "in-zone" | "near" | "far" | "unknown";

export type CrossState = "golden" | "death" | "none";

export type Valuation = { per: number | null; psr: number | null; pbr: number | null; roe: number | null };
export type BadgeState = "pass" | "warn" | "fail" | "na";
export type ValuationBadges = Record<"per" | "psr" | "pbr" | "roe", BadgeState>;

export type Regime = "extreme-fear" | "fear" | "neutral" | "greed" | "extreme-greed";
export type MacroRegime = {
  regime: Regime;
  activeZones: ZonePct[];
  fng: number;
  tenYear: number | null;
  hySpread: number | null;
  hySpreadPercentile: number | null; // 0..100
  note: string;
};

export type EnrichedStock = {
  ticker: string; name: string;
  price: number | null; priceKrw: number | null; isStale: boolean;
  high: number; highSource: "sheet" | "52w";
  zones: Zone[]; nearestUnreached: NearestZone; drawdownPct: number; zoneStatus: ZoneStatus;
  rsi14: number | null; sma50: number | null; sma200: number | null;
  crossState: CrossState; crossFreshDays: number | null;
  range52wPct: number | null; volumeSpike: number | null;
  valuation: Valuation; valuationBadges: ValuationBadges;
  buyThesis: string; sellRisk: string; theme: ThemeFlags; score: Score;
};

export type MacroData = {
  fearGreed: { score: number; rating: string } | null;
  tenYearYield: number | null;
  hySpread: number | null;
  usdKrw: number | null;
  regime: MacroRegime | null;
};
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts && git commit -m "feat: shared type contract"
```

---

### Task 3: `sma` (이동평균)

**Files:**
- Create: `src/lib/indicators.ts`
- Test: `test/indicators.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/indicators.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { sma } from "@/lib/indicators";

describe("sma", () => {
  it("returns mean of the last `period` closes", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([10, 20, 30, 40], 2)).toBe(35);
  });
  it("returns null when fewer closes than period", () => {
    expect(sma([1, 2], 3)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- indicators`
Expected: FAIL (`sma is not a function`).

- [ ] **Step 3: 구현**

`src/lib/indicators.ts`:
```ts
export function sma(closes: number[], period: number): number | null {
  if (closes.length < period || period <= 0) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- indicators`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/indicators.ts test/indicators.test.ts
git commit -m "feat: sma indicator"
```

---

### Task 4: `rsi14` (Wilder RSI)

**Files:**
- Modify: `src/lib/indicators.ts`
- Test: `test/indicators.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가** (`test/indicators.test.ts`에 append)

```ts
import { rsi14 } from "@/lib/indicators";

describe("rsi14", () => {
  it("is 100 when prices only rise", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi14(closes)).toBe(100);
  });
  it("is 0 when prices only fall", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(rsi14(closes)).toBe(0);
  });
  it("is ~50 for symmetric up/down alternation", () => {
    const closes: number[] = [100];
    for (let i = 0; i < 40; i++) closes.push(closes[closes.length - 1] + (i % 2 === 0 ? 1 : -1));
    expect(rsi14(closes)!).toBeCloseTo(50, 0);
  });
  it("returns null with insufficient data", () => {
    expect(rsi14([1, 2, 3])).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- indicators`
Expected: FAIL (`rsi14 is not a function`).

- [ ] **Step 3: 구현** (`src/lib/indicators.ts`에 append)

```ts
export function rsi14(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const delta = closes[i] - closes[i - 1];
    if (delta >= 0) gain += delta;
    else loss -= delta;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const delta = closes[i] - closes[i - 1];
    const g = delta > 0 ? delta : 0;
    const l = delta < 0 ? -delta : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
  }
  if (avgLoss === 0) return 100;
  if (avgGain === 0) return 0;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- indicators`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/indicators.ts test/indicators.test.ts
git commit -m "feat: Wilder RSI(14)"
```

---

### Task 5: `crossState` + `crossFreshDays` (골든/데드크로스)

**Files:**
- Modify: `src/lib/indicators.ts`
- Test: `test/indicators.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

```ts
import { crossState, crossFreshDays } from "@/lib/indicators";

describe("crossState", () => {
  it("golden when sma50 > sma200", () => expect(crossState(110, 100)).toBe("golden"));
  it("death when sma50 < sma200", () => expect(crossState(90, 100)).toBe("death"));
  it("none when either is null", () => expect(crossState(null, 100)).toBe("none"));
});

describe("crossFreshDays", () => {
  it("returns null when no recent cross within lookback", () => {
    // long steady uptrend: sma50 stays above sma200, no flip
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i);
    expect(crossFreshDays(closes)).toBeNull();
  });
  it("detects a recent flip and reports how many days ago", () => {
    // 250 falling sessions (death) then a sharp rally that flips 50>200 near the end
    const falling = Array.from({ length: 250 }, (_, i) => 400 - i);
    const rally = Array.from({ length: 60 }, (_, i) => 150 + i * 8);
    const days = crossFreshDays([...falling, ...rally]);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThanOrEqual(0);
    expect(days!).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- indicators`
Expected: FAIL.

- [ ] **Step 3: 구현** (append)

```ts
import type { CrossState } from "@/lib/types";

export function crossState(sma50: number | null, sma200: number | null): CrossState {
  if (sma50 == null || sma200 == null) return "none";
  if (sma50 > sma200) return "golden";
  if (sma50 < sma200) return "death";
  return "none";
}

/** 최근 `lookback` 세션 내 50/200일선 부호 전환이 며칠 전인지. 없으면 null. */
export function crossFreshDays(closes: number[], lookback = 5): number | null {
  // 각 시점 t에서의 sign(sma50 - sma200)를, 최신에서 과거로 lookback+1개 비교
  const signAt = (endIndex: number): number | null => {
    const upto = closes.slice(0, endIndex + 1);
    const s50 = sma(upto, 50);
    const s200 = sma(upto, 200);
    if (s50 == null || s200 == null) return null;
    return Math.sign(s50 - s200);
  };
  const last = closes.length - 1;
  const today = signAt(last);
  if (today == null || today === 0) return null;
  for (let d = 1; d <= lookback; d++) {
    const prev = signAt(last - d);
    if (prev == null) return null;
    if (prev !== today) return d - 1; // 전날 부호가 오늘과 다르면 d-1일 전에 교차
  }
  return null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm test -- indicators`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/indicators.ts test/indicators.test.ts
git commit -m "feat: golden/death cross detection"
```

---

### Task 6: `range52w` + `volumeSpike`

**Files:**
- Modify: `src/lib/indicators.ts`
- Test: `test/indicators.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

```ts
import { range52w, volumeSpike } from "@/lib/indicators";

describe("range52w", () => {
  it("is 0 at the low, 100 at the high, 50 in the middle", () => {
    expect(range52w(50, 50, 150)).toBe(0);
    expect(range52w(150, 50, 150)).toBe(100);
    expect(range52w(100, 50, 150)).toBe(50);
  });
  it("returns null on degenerate range", () => {
    expect(range52w(100, 100, 100)).toBeNull();
  });
});

describe("volumeSpike", () => {
  it("returns ratio of today's volume to recent average", () => {
    expect(volumeSpike(200, [100, 100, 100, 100])).toBe(2);
  });
  it("returns null with no history", () => {
    expect(volumeSpike(200, [])).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- indicators`
Expected: FAIL.

- [ ] **Step 3: 구현** (append)

```ts
export function range52w(price: number, low52: number, high52: number): number | null {
  if (high52 <= low52) return null;
  return ((price - low52) / (high52 - low52)) * 100;
}

export function volumeSpike(todayVolume: number, recentVolumes: number[]): number | null {
  if (recentVolumes.length === 0) return null;
  const avg = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  if (avg === 0) return null;
  return todayVolume / avg;
}
```

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- indicators` → PASS
```bash
git add src/lib/indicators.ts test/indicators.test.ts
git commit -m "feat: 52w range position + volume spike"
```

---

### Task 7: 매수구간 (`buyzones.ts`)

**Files:**
- Create: `src/lib/buyzones.ts`
- Test: `test/buyzones.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/buyzones.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buildZones, nearestUnreachedZone, zoneStatusOf, drawdownPct } from "@/lib/buyzones";

describe("buildZones", () => {
  it("computes -10/-15/-20/-25% prices off the high and reached flags", () => {
    const zones = buildZones(100, 86); // price 86 → reached -10(90) & -15(85? no, 86>85)
    expect(zones.map((z) => z.price)).toEqual([90, 85, 80, 75]);
    expect(zones.map((z) => z.reached)).toEqual([true, false, false, false]);
  });
});

describe("nearestUnreachedZone", () => {
  it("returns the closest zone not yet reached with distance %", () => {
    const zones = buildZones(100, 92); // none reached; nearest is -10 (90)
    const n = nearestUnreachedZone(zones, 92);
    expect(n).not.toBeNull();
    expect(n!.pct).toBe(10);
    expect(n!.distancePct).toBeCloseTo(((90 - 92) / 92) * 100, 5); // negative: price must fall
  });
  it("returns null when every zone reached", () => {
    const zones = buildZones(100, 70);
    expect(nearestUnreachedZone(zones, 70)).toBeNull();
  });
});

describe("zoneStatusOf", () => {
  it("in-zone when any zone reached", () => {
    expect(zoneStatusOf(buildZones(100, 88), 88)).toBe("in-zone");
  });
  it("near when within 2% above the shallowest unreached zone", () => {
    expect(zoneStatusOf(buildZones(100, 91), 91)).toBe("near"); // 90 zone, 91 is +1.11%
  });
  it("far otherwise", () => {
    expect(zoneStatusOf(buildZones(100, 99), 99)).toBe("far");
  });
});

describe("drawdownPct", () => {
  it("is percent below the high", () => {
    expect(drawdownPct(100, 80)).toBe(20);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- buyzones`
Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/buyzones.ts`:
```ts
import { ZONE_PCTS, type Zone, type NearestZone, type ZoneStatus } from "@/lib/types";

export function buildZones(high: number, price: number): Zone[] {
  return ZONE_PCTS.map((pct) => {
    const zonePrice = high * (1 - pct / 100);
    return { pct, price: zonePrice, reached: price <= zonePrice };
  });
}

export function nearestUnreachedZone(zones: Zone[], price: number): NearestZone {
  const unreached = zones.filter((z) => !z.reached);
  if (unreached.length === 0) return null;
  // 가장 얕은(가격이 가장 높은) 미도달 존이 가장 가깝다
  const nearest = unreached.reduce((a, b) => (b.price > a.price ? b : a));
  return { pct: nearest.pct, price: nearest.price, distancePct: ((nearest.price - price) / price) * 100 };
}

export function zoneStatusOf(zones: Zone[], price: number): ZoneStatus {
  if (zones.length === 0) return "unknown";
  if (zones.some((z) => z.reached)) return "in-zone";
  const n = nearestUnreachedZone(zones, price);
  if (n && n.distancePct >= -2) return "near"; // 존 가격까지 -2% 이내 (price가 존보다 +2% 이내 위)
  return "far";
}

export function drawdownPct(high: number, price: number): number {
  return ((high - price) / high) * 100;
}
```

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- buyzones` → PASS
```bash
git add src/lib/buyzones.ts test/buyzones.test.ts
git commit -m "feat: buy-zone computation"
```

---

### Task 8: 점수 (`scoring.ts` — themeScore)

**Files:**
- Create: `src/lib/scoring.ts`
- Test: `test/scoring.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/scoring.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { themeScore } from "@/lib/scoring";

describe("themeScore", () => {
  it("sums the three theme flags", () => {
    expect(themeScore({ aiInfra: true, trump: true, tariff: true })).toBe(3);
    expect(themeScore({ aiInfra: true, trump: false, tariff: true })).toBe(2);
    expect(themeScore({ aiInfra: false, trump: false, tariff: false })).toBe(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- scoring`
Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/scoring.ts`:
```ts
import type { ThemeFlags, Score } from "@/lib/types";

export function themeScore(theme: ThemeFlags): Score {
  const n = (theme.aiInfra ? 1 : 0) + (theme.trump ? 1 : 0) + (theme.tariff ? 1 : 0);
  return n as Score;
}
```

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- scoring` → PASS
```bash
git add src/lib/scoring.ts test/scoring.test.ts
git commit -m "feat: theme score"
```

---

### Task 9: 밸류에이션 배지 (`scoring.ts` — valuationBadges)

**Files:**
- Modify: `src/lib/scoring.ts`
- Test: `test/scoring.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

```ts
import { valuationBadges } from "@/lib/scoring";
import { DEFAULT_THRESHOLDS } from "@/lib/types";

describe("valuationBadges", () => {
  const T = DEFAULT_THRESHOLDS; // PER<=15, PSR[1.5,3], PBR<=1.5, ROE[15,20]
  it("passes when all within rule", () => {
    expect(valuationBadges({ per: 12, psr: 2, pbr: 1.2, roe: 17 }, T)).toEqual({
      per: "pass", psr: "pass", pbr: "pass", roe: "pass",
    });
  });
  it("warns near the boundary and on ROE above the cap", () => {
    expect(valuationBadges({ per: 17, psr: 3.4, pbr: 1.7, roe: 25 }, T)).toEqual({
      per: "warn", psr: "warn", pbr: "warn", roe: "warn",
    });
  });
  it("fails when far off and ROE below floor", () => {
    expect(valuationBadges({ per: 40, psr: 6, pbr: 5, roe: 5 }, T)).toEqual({
      per: "fail", psr: "fail", pbr: "fail", roe: "fail",
    });
  });
  it("returns na for missing or negative PER (e.g. ETFs / unprofitable)", () => {
    expect(valuationBadges({ per: null, psr: null, pbr: null, roe: null }, T)).toEqual({
      per: "na", psr: "na", pbr: "na", roe: "na",
    });
    expect(valuationBadges({ per: -8, psr: 2, pbr: 1, roe: 17 }, T).per).toBe("na");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- scoring`
Expected: FAIL.

- [ ] **Step 3: 구현** (append to `src/lib/scoring.ts`)

```ts
import type { Valuation, ValuationThresholds, ValuationBadges, BadgeState } from "@/lib/types";

function maxBadge(value: number | null, max: number): BadgeState {
  if (value == null || value <= 0) return "na";
  if (value <= max) return "pass";
  if (value <= max * 1.2) return "warn";
  return "fail";
}
function rangeBadge(value: number | null, [lo, hi]: [number, number]): BadgeState {
  if (value == null || value <= 0) return "na";
  if (value >= lo && value <= hi) return "pass";
  if (value >= lo * 0.8 && value <= hi * 1.2) return "warn";
  return "fail";
}
function roeBadge(value: number | null, [lo, hi]: [number, number]): BadgeState {
  if (value == null) return "na";
  if (value >= lo && value <= hi) return "pass";
  if (value > hi) return "warn"; // 상한 초과 = 레버리지 주의 (사용자 룰)
  return "fail"; // < lo
}

export function valuationBadges(v: Valuation, t: ValuationThresholds): ValuationBadges {
  return {
    per: maxBadge(v.per, t.perMax),
    psr: rangeBadge(v.psr, t.psrRange),
    pbr: maxBadge(v.pbr, t.pbrMax),
    roe: roeBadge(v.roe, t.roeRange),
  };
}
```

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- scoring` → PASS
```bash
git add src/lib/scoring.ts test/scoring.test.ts
git commit -m "feat: valuation badges vs user thresholds"
```

---

### Task 10: 매크로 레짐 (`scoring.ts` — macroRegime)

**Files:**
- Modify: `src/lib/scoring.ts`
- Test: `test/scoring.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

```ts
import { macroRegime } from "@/lib/scoring";

describe("macroRegime", () => {
  it("extreme fear → aggressive shallow zones", () => {
    const r = macroRegime(18, 4.4, 3.5, 40);
    expect(r.regime).toBe("extreme-fear");
    expect(r.activeZones).toEqual([10, 15]);
  });
  it("extreme greed → only the deepest zone", () => {
    expect(macroRegime(82, 4.4, 3.0, 20).activeZones).toEqual([25]);
  });
  it("high-yield stress bumps one notch more cautious", () => {
    // fear(40) normally [15]; but HY spread in top decile & we mark stressed → shift to [20]
    const r = macroRegime(40, 4.6, 6.0, 95);
    expect(r.activeZones).toEqual([20]);
  });
  it("carries the raw inputs through", () => {
    const r = macroRegime(50, 4.5, 3.2, 55);
    expect(r.fng).toBe(50);
    expect(r.tenYear).toBe(4.5);
    expect(r.hySpread).toBe(3.2);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- scoring`
Expected: FAIL.

- [ ] **Step 3: 구현** (append)

```ts
import type { Regime, MacroRegime, ZonePct } from "@/lib/types";

const REGIME_TABLE: { max: number; regime: Regime; zones: ZonePct[] }[] = [
  { max: 25, regime: "extreme-fear", zones: [10, 15] },
  { max: 44, regime: "fear", zones: [15] },
  { max: 55, regime: "neutral", zones: [15, 20] },
  { max: 74, regime: "greed", zones: [20] },
  { max: 100, regime: "extreme-greed", zones: [25] },
];
const DEEPER: ZonePct[] = [10, 15, 20, 25];

export function macroRegime(
  fng: number,
  tenYear: number | null,
  hySpread: number | null,
  hySpreadPercentile: number | null,
): MacroRegime {
  const base = REGIME_TABLE.find((r) => fng <= r.max) ?? REGIME_TABLE[REGIME_TABLE.length - 1];
  let zones = base.zones;
  let note = `공포탐욕 ${fng} → ${base.regime}`;
  // 신용 스트레스: 하이일드 스프레드 상위 10%면 한 칸 보수적 (가장 깊은 존만)
  if (hySpreadPercentile != null && hySpreadPercentile >= 90) {
    const deepest = zones[zones.length - 1];
    const idx = DEEPER.indexOf(deepest);
    const bumped = DEEPER[Math.min(idx + 1, DEEPER.length - 1)];
    zones = [bumped];
    note += ` · 하이일드 스프레드 상위 ${Math.round(hySpreadPercentile)}% → 한 칸 보수적`;
  }
  return { regime: base.regime, activeZones: zones, fng, tenYear, hySpread, hySpreadPercentile, note };
}
```

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- scoring` → PASS
```bash
git add src/lib/scoring.ts test/scoring.test.ts
git commit -m "feat: macro regime → active buy zones"
```

---

### Task 11: 미국 장 상태 (KST) (`marketHours.ts`)

**Files:**
- Create: `src/lib/marketHours.ts`
- Test: `test/marketHours.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

`test/marketHours.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { usSession } from "@/lib/marketHours";

// 2026-06-01은 월요일. ET는 여름(EDT, UTC-4). 09:30 ET = 13:30 UTC.
const at = (iso: string) => new Date(iso).getTime();

describe("usSession", () => {
  it("open during 09:30–16:00 ET on a weekday", () => {
    expect(usSession(at("2026-06-01T14:00:00Z")).status).toBe("open"); // 10:00 ET
  });
  it("closed before the open", () => {
    expect(usSession(at("2026-06-01T12:00:00Z")).status).toBe("pre-market"); // 08:00 ET
  });
  it("after-hours right after the close", () => {
    expect(usSession(at("2026-06-01T20:30:00Z")).status).toBe("after-hours"); // 16:30 ET
  });
  it("closed on weekends", () => {
    expect(usSession(at("2026-05-31T14:00:00Z")).status).toBe("closed"); // Sunday
  });
  it("emits a KST label", () => {
    expect(usSession(at("2026-06-01T03:00:00Z")).label).toMatch(/KST/);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- marketHours`
Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/marketHours.ts`:
```ts
export type SessionStatus = "pre-market" | "open" | "after-hours" | "closed";

function etParts(ms: number): { weekday: number; minutes: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ms));
  const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = wdMap[parts.find((p) => p.type === "weekday")!.value];
  let hour = Number(parts.find((p) => p.type === "hour")!.value);
  if (hour === 24) hour = 0;
  const minute = Number(parts.find((p) => p.type === "minute")!.value);
  return { weekday, minutes: hour * 60 + minute };
}

function kstClock(ms: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(ms));
}

const OPEN = 9 * 60 + 30; // 09:30 ET
const CLOSE = 16 * 60; // 16:00 ET

export function usSession(nowMs: number): { status: SessionStatus; label: string } {
  const { weekday, minutes } = etParts(nowMs);
  const isWeekday = weekday >= 1 && weekday <= 5;
  let status: SessionStatus;
  if (!isWeekday) status = "closed";
  else if (minutes < OPEN) status = "pre-market";
  else if (minutes < CLOSE) status = "open";
  else status = "after-hours";
  const ko: Record<SessionStatus, string> = {
    "pre-market": "개장 전", open: "장중", "after-hours": "장 마감 후", closed: "휴장",
  };
  const label = `${ko[status]} · 현재 ${kstClock(nowMs)} KST`;
  return { status, label };
}
```

> 한계(스펙 명시): 미국 공휴일은 미반영(주말만 휴장). v1 허용. 정밀 개장/폐장 카운트다운은 향후.

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- marketHours` → PASS
```bash
git add src/lib/marketHours.ts test/marketHours.test.ts
git commit -m "feat: US market session status in KST"
```

---

## Phase C — 데이터 레이어

### Task 12: 시트 파서 (`sheet.ts`)

**Files:**
- Create: `src/lib/sheet.ts`, `test/fixtures/sheet.csv`
- Test: `test/sheet.test.ts`

- [ ] **Step 1: 픽스처 작성** (`test/fixtures/sheet.csv` — 실제 시트 구조 반영: 헤더 1행, 종목, 빈행, 매크로 블록, ETF 결측)

```csv
,,,,,,,,,,,,,,,
No,종목,티커,현재가,고점,RSI,-10%,-15%,-20%,-25%,키워드(매수 기준),리스크(매도기준),AI 인프라,트럼프트레이딩,관세피난처,점수
1,테슬라,TSLA,435.79,498.83,#ERROR!,448.9,424.0,399.0,374.1,자율주행/로봇,미중/관세,O,O,X,2
2,팔란티어,PLTR,156.54,207.52,68.17,186.7,176.3,166.0,155.6,AI/방산,고평가,O,O,O,3
16,QQQM,QQQM,303.96,305.33,80.73,274.7,259.5,244.2,228.9,나스닥,AI 피크아웃,,,,0
20,XLU,XLU, ,47.80,41.80,43.02,40.63,38.24,35.85,원전 르네상스,AI 피크아웃,O,O,O,3
,,,,,,,,,,,,,,,
10년 금리,4.453,,,,,,,,,,,,,,
GreedIndex,28,Fear,,,,,,,,,,,,,
ROE,15% 이상 ~ 20%이하,,,,,,,,,,,,,,
PER,15배 이하,,,,,,,,,,,,,,
PSR,1.5배 이상 3배 이하,,,,,,,,,,,,,,
PBR,1.5배 이하,,,,,,,,,,,,,,
```

- [ ] **Step 2: 실패하는 테스트 작성**

`test/sheet.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseWatchlistCsv } from "@/lib/sheet";

const csv = readFileSync(fileURLToPath(new URL("./fixtures/sheet.csv", import.meta.url)), "utf8");

describe("parseWatchlistCsv", () => {
  const cfg = parseWatchlistCsv(csv);

  it("reads only numbered rows with a ticker, stopping at the blank row", () => {
    expect(cfg.items.map((i) => i.ticker)).toEqual(["TSLA", "PLTR", "QQQM", "XLU"]);
  });
  it("maps thesis, risk and theme flags (O/X → bool)", () => {
    const tsla = cfg.items[0];
    expect(tsla.name).toBe("테슬라");
    expect(tsla.buyThesis).toBe("자율주행/로봇");
    expect(tsla.sellRisk).toBe("미중/관세");
    expect(tsla.theme).toEqual({ aiInfra: true, trump: true, tariff: false });
  });
  it("treats empty theme cells as false (ETF rows)", () => {
    const qqqm = cfg.items.find((i) => i.ticker === "QQQM")!;
    expect(qqqm.theme).toEqual({ aiInfra: false, trump: false, tariff: false });
  });
  it("reads the manual high as override when present", () => {
    expect(cfg.items[0].highOverride).toBe(498.83);
  });
  it("parses user valuation thresholds from the bottom block", () => {
    expect(cfg.thresholds.roeRange).toEqual([15, 20]);
    expect(cfg.thresholds.perMax).toBe(15);
    expect(cfg.thresholds.psrRange).toEqual([1.5, 3]);
    expect(cfg.thresholds.pbrMax).toBe(1.5);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm test -- sheet`
Expected: FAIL.

- [ ] **Step 4: 구현**

`src/lib/sheet.ts`:
```ts
import { DEFAULT_THRESHOLDS, type WatchlistConfig, type WatchlistItem, type ValuationThresholds } from "@/lib/types";

/** 따옴표/콤마를 처리하는 최소 CSV 파서 (gviz/Sheets CSV 형식 대응). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false;
      } else cur += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
    else if (c === "\r") { /* skip */ }
    else cur += c;
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); rows.push(row); }
  return rows;
}

const toBool = (v: string) => v.trim().toUpperCase() === "O";
const num = (v: string): number | null => {
  const n = Number(v.replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

/** "1.5배 이상 3배 이하" / "15% 이상 ~ 20%이하" 등에서 숫자 추출 */
function nums(s: string): number[] {
  return (s.match(/[\d.]+/g) ?? []).map(Number);
}

export function parseWatchlistCsv(text: string): WatchlistConfig {
  const rows = parseCsv(text);
  // 헤더: "No"로 시작하는 행
  const headerIdx = rows.findIndex((r) => r[0]?.trim() === "No");
  const items: WatchlistItem[] = [];
  let i = headerIdx + 1;
  for (; i < rows.length; i++) {
    const r = rows[i];
    const no = num(r[0] ?? "");
    const ticker = (r[2] ?? "").trim();
    if (no == null || ticker === "") break; // 빈 행 → 종목 영역 종료
    items.push({
      name: (r[1] ?? "").trim(),
      ticker,
      buyThesis: (r[10] ?? "").trim(),
      sellRisk: (r[11] ?? "").trim(),
      theme: { aiInfra: toBool(r[12] ?? ""), trump: toBool(r[13] ?? ""), tariff: toBool(r[14] ?? "") },
      highOverride: num(r[4] ?? ""),
    });
  }

  // 하단 키-값 블록에서 밸류에이션 기준 추출
  const thresholds: ValuationThresholds = { ...DEFAULT_THRESHOLDS };
  for (; i < rows.length; i++) {
    const key = (rows[i][0] ?? "").trim();
    const val = rows[i][1] ?? "";
    if (key === "ROE") { const n = nums(val); if (n.length >= 2) thresholds.roeRange = [n[0], n[1]]; }
    else if (key === "PER") { const n = nums(val); if (n[0]) thresholds.perMax = n[0]; }
    else if (key === "PSR") { const n = nums(val); if (n.length >= 2) thresholds.psrRange = [n[0], n[1]]; }
    else if (key === "PBR") { const n = nums(val); if (n[0]) thresholds.pbrMax = n[0]; }
  }

  return { items, thresholds };
}

export async function fetchWatchlistConfig(sheetId: string, gid: string): Promise<WatchlistConfig> {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`sheet fetch failed: ${res.status}`);
  return parseWatchlistCsv(await res.text());
}
```

- [ ] **Step 5: 통과 확인 & Commit**

Run: `npm test -- sheet` → PASS
```bash
git add src/lib/sheet.ts test/sheet.test.ts test/fixtures/sheet.csv
git commit -m "feat: Google Sheet CSV parser"
```

---

### Task 13: Yahoo 프로바이더 (`providers/yahoo.ts`)

**Files:**
- Create: `src/lib/providers/yahoo.ts`

- [ ] **Step 1: 구현** (외부 라이브러리 래퍼 — 단위 테스트 대신 타입체크 + 다음 태스크의 통합으로 검증)

`src/lib/providers/yahoo.ts`:
```ts
import yahooFinance from "yahoo-finance2";

export type Quote = {
  price: number; previousClose: number; volume: number;
  high52: number; low52: number; marketTime: number;
};
export type DailyHistory = { closes: number[]; volumes: number[] };

export async function getQuote(ticker: string): Promise<Quote | null> {
  try {
    const q = await yahooFinance.quote(ticker);
    if (q?.regularMarketPrice == null) return null;
    return {
      price: q.regularMarketPrice,
      previousClose: q.regularMarketPreviousClose ?? q.regularMarketPrice,
      volume: q.regularMarketVolume ?? 0,
      high52: q.fiftyTwoWeekHigh ?? q.regularMarketPrice,
      low52: q.fiftyTwoWeekLow ?? q.regularMarketPrice,
      marketTime: q.regularMarketTime ? new Date(q.regularMarketTime).getTime() : Date.now(),
    };
  } catch {
    return null;
  }
}

export async function getDailyHistory(ticker: string): Promise<DailyHistory | null> {
  try {
    const period1 = new Date();
    period1.setFullYear(period1.getFullYear() - 2);
    const chart = await yahooFinance.chart(ticker, { period1, interval: "1d" });
    const quotes = chart?.quotes ?? [];
    const closes = quotes.map((c) => c.close).filter((v): v is number => v != null);
    const volumes = quotes.map((c) => c.volume).filter((v): v is number => v != null);
    if (closes.length === 0) return null;
    return { closes, volumes };
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 타입체크**

Run: `npx tsc --noEmit`
Expected: 에러 없음. (yahoo-finance2 타입과 맞지 않으면 필드명/옵셔널 조정.)

- [ ] **Step 3: 실제 호출 스모크** (네트워크 필요)

`scripts/smoke-yahoo.mjs`(임시) 대신 빠르게:
```bash
node -e "import('yahoo-finance2').then(async m=>{const y=m.default;const q=await y.quote('AAPL');console.log(q.regularMarketPrice, q.fiftyTwoWeekHigh);})"
```
Expected: 숫자 2개 출력. (Yahoo 차단 시 query2 재시도/추후 폴백.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/providers/yahoo.ts
git commit -m "feat: Yahoo provider (quote + daily history)"
```

---

### Task 14: Finnhub 프로바이더 (`providers/finnhub.ts`)

**Files:**
- Create: `src/lib/providers/finnhub.ts`

- [ ] **Step 1: 구현**

`src/lib/providers/finnhub.ts`:
```ts
import type { Valuation } from "@/lib/types";

export async function getValuation(ticker: string, apiKey: string): Promise<Valuation> {
  const empty: Valuation = { per: null, psr: null, pbr: null, roe: null };
  if (!apiKey) return empty;
  try {
    const url = `https://finnhub.io/api/v1/stock/metric?metric=all&symbol=${encodeURIComponent(ticker)}&token=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return empty;
    const m = (await res.json())?.metric ?? {};
    const pick = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
    return {
      per: pick(m.peTTM ?? m.peBasicExclExtraTTM),
      psr: pick(m.psTTM),
      pbr: pick(m.pbAnnual ?? m.pbQuarterly),
      roe: pick(m.roeTTM), // Finnhub roeTTM = percent (예: 35.8 = 35.8%)
    };
  } catch {
    return empty;
  }
}
```

- [ ] **Step 2: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/lib/providers/finnhub.ts
git commit -m "feat: Finnhub valuation provider"
```

---

### Task 15: 매크로 프로바이더 (`providers/macro.ts`)

**Files:**
- Create: `src/lib/providers/macro.ts`

- [ ] **Step 1: 구현**

`src/lib/providers/macro.ts`:
```ts
async function fredObservations(seriesId: string, key: string, limit: number): Promise<number[]> {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&file_type=json&api_key=${key}&sort_order=desc&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 21600 } });
  if (!res.ok) return [];
  const obs = (await res.json())?.observations ?? [];
  return obs.map((o: { value: string }) => Number(o.value)).filter((n: number) => Number.isFinite(n));
}

export async function getTenYearYield(fredKey: string): Promise<number | null> {
  if (!fredKey) return null;
  const vals = await fredObservations("DGS10", fredKey, 5);
  return vals[0] ?? null;
}

export async function getHySpread(fredKey: string): Promise<{ value: number; percentile1y: number } | null> {
  if (!fredKey) return null;
  const vals = await fredObservations("BAMLH0A0HYM2", fredKey, 260); // ~1년치 (desc)
  if (vals.length === 0) return null;
  const value = vals[0];
  const below = vals.filter((v) => v <= value).length;
  const percentile1y = (below / vals.length) * 100;
  return { value, percentile1y };
}

export async function getFearGreed(): Promise<{ score: number; rating: string } | null> {
  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: "https://www.cnn.com/markets/fear-and-greed",
        "User-Agent": "Mozilla/5.0",
      },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const fg = (await res.json())?.fear_and_greed;
    if (fg?.score == null) return null;
    return { score: Math.round(fg.score), rating: fg.rating ?? "" };
  } catch {
    return null;
  }
}

export async function getUsdKrw(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=KRW", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    return (await res.json())?.rates?.KRW ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/lib/providers/macro.ts
git commit -m "feat: macro providers (FRED, CNN F&G, FX)"
```

---

### Task 16: 종목 인리치 (`enrich.ts`)

**Files:**
- Create: `src/lib/enrich.ts`
- Test: `test/enrich.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성** (순수 함수: config item + 외부 데이터 → EnrichedStock)

`test/enrich.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { enrichStock } from "@/lib/enrich";
import { DEFAULT_THRESHOLDS, type WatchlistItem } from "@/lib/types";

const item: WatchlistItem = {
  ticker: "NVDA", name: "엔비디아", buyThesis: "AI 곡괭이", sellRisk: "미중/관세",
  theme: { aiInfra: true, trump: true, tariff: false }, highOverride: null,
};

// 200일선 계산이 가능하도록 250개 종가 (마지막 가격 85 → 고점 100 대비 -15%)
const closes = Array.from({ length: 250 }, (_, i) => 100 - i * 0.06); // 완만한 하락, 끝 ~85.06
const volumes = Array.from({ length: 250 }, () => 1000);

it("combines config + market data into an EnrichedStock", () => {
  const s = enrichStock(item, {
    quote: { price: 85, previousClose: 86, volume: 2000, high52: 100, low52: 70, marketTime: Date.now() },
    history: { closes, volumes },
    valuation: { per: 30, psr: 20, pbr: 40, roe: 90 },
    usdKrw: 1500,
    thresholds: DEFAULT_THRESHOLDS,
    isStale: false,
  });
  expect(s.ticker).toBe("NVDA");
  expect(s.score).toBe(2);
  expect(s.high).toBe(100);
  expect(s.highSource).toBe("52w");
  expect(s.zones.find((z) => z.pct === 15)!.price).toBe(85);
  expect(s.zoneStatus).toBe("in-zone"); // 85 <= 85
  expect(s.priceKrw).toBe(85 * 1500);
  expect(s.rsi14).toBe(0); // 단조 하락
  expect(s.valuationBadges.per).toBe("fail");
  expect(s.volumeSpike).toBe(2); // 2000 / 1000
});

it("uses sheet high override when provided", () => {
  const s = enrichStock(
    { ...item, highOverride: 120 },
    { quote: { price: 85, previousClose: 86, volume: 1000, high52: 100, low52: 70, marketTime: 0 },
      history: null, valuation: { per: null, psr: null, pbr: null, roe: null },
      usdKrw: null, thresholds: DEFAULT_THRESHOLDS, isStale: false },
  );
  expect(s.high).toBe(120);
  expect(s.highSource).toBe("sheet");
  expect(s.rsi14).toBeNull(); // history 없음
  expect(s.priceKrw).toBeNull();
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm test -- enrich`
Expected: FAIL.

- [ ] **Step 3: 구현**

`src/lib/enrich.ts`:
```ts
import type { EnrichedStock, WatchlistItem, Valuation, ValuationThresholds } from "@/lib/types";
import type { Quote, DailyHistory } from "@/lib/providers/yahoo";
import { rsi14, sma, crossState, crossFreshDays, range52w, volumeSpike } from "@/lib/indicators";
import { buildZones, nearestUnreachedZone, zoneStatusOf, drawdownPct } from "@/lib/buyzones";
import { themeScore, valuationBadges } from "@/lib/scoring";

export type EnrichInput = {
  quote: Quote | null;
  history: DailyHistory | null;
  valuation: Valuation;
  usdKrw: number | null;
  thresholds: ValuationThresholds;
  isStale: boolean;
};

export function enrichStock(item: WatchlistItem, d: EnrichInput): EnrichedStock {
  const price = d.quote?.price ?? null;
  const high = item.highOverride ?? d.quote?.high52 ?? price ?? 0;
  const highSource: "sheet" | "52w" = item.highOverride != null ? "sheet" : "52w";

  const zones = price != null && high > 0 ? buildZones(high, price) : [];
  const nearestUnreached = price != null ? nearestUnreachedZone(zones, price) : null;
  const zoneStatus = price != null ? zoneStatusOf(zones, price) : "unknown";

  const closes = d.history?.closes ?? [];
  const volumes = d.history?.volumes ?? [];
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);

  return {
    ticker: item.ticker, name: item.name,
    price, priceKrw: price != null && d.usdKrw != null ? price * d.usdKrw : null, isStale: d.isStale,
    high, highSource,
    zones, nearestUnreached, zoneStatus,
    drawdownPct: price != null && high > 0 ? drawdownPct(high, price) : 0,
    rsi14: rsi14(closes),
    sma50, sma200,
    crossState: crossState(sma50, sma200),
    crossFreshDays: closes.length >= 200 ? crossFreshDays(closes) : null,
    range52wPct: d.quote ? range52w(d.quote.price, d.quote.low52, d.quote.high52) : null,
    volumeSpike: d.quote && volumes.length > 1 ? volumeSpike(d.quote.volume, volumes.slice(-21, -1)) : null,
    valuation: d.valuation,
    valuationBadges: valuationBadges(d.valuation, d.thresholds),
    buyThesis: item.buyThesis, sellRisk: item.sellRisk, theme: item.theme,
    score: themeScore(item.theme),
  };
}
```

- [ ] **Step 4: 통과 확인 & Commit**

Run: `npm test -- enrich` → PASS
```bash
git add src/lib/enrich.ts test/enrich.test.ts
git commit -m "feat: enrichStock combiner"
```

---

### Task 17: 워치리스트 API 라우트 (`api/watchlist/route.ts`)

**Files:**
- Create: `src/app/api/watchlist/route.ts`

- [ ] **Step 1: 구현** (오케스트레이션: 시트 → 각 종목 병렬 fetch → enrich)

`src/app/api/watchlist/route.ts`:
```ts
import { NextResponse } from "next/server";
import { fetchWatchlistConfig } from "@/lib/sheet";
import { getQuote, getDailyHistory } from "@/lib/providers/yahoo";
import { getValuation } from "@/lib/providers/finnhub";
import { getUsdKrw } from "@/lib/providers/macro";
import { enrichStock } from "@/lib/enrich";

export const revalidate = 60;

export async function GET() {
  try {
    const sheetId = process.env.GOOGLE_SHEET_ID!;
    const gid = process.env.GOOGLE_SHEET_GID ?? "0";
    const finnhubKey = process.env.FINNHUB_API_KEY ?? "";

    const [config, usdKrw] = await Promise.all([fetchWatchlistConfig(sheetId, gid), getUsdKrw()]);

    const stocks = await Promise.all(
      config.items.map(async (item) => {
        const [quote, history, valuation] = await Promise.all([
          getQuote(item.ticker),
          getDailyHistory(item.ticker),
          getValuation(item.ticker, finnhubKey),
        ]);
        return enrichStock(item, {
          quote, history, valuation, usdKrw,
          thresholds: config.thresholds, isStale: quote == null,
        });
      }),
    );

    return NextResponse.json({ stocks, updatedAt: Date.now() });
  } catch (e) {
    return NextResponse.json({ error: String(e), stocks: [] }, { status: 502 });
  }
}
```

- [ ] **Step 2: 로컬 확인** (`.env.local`에 키 채운 뒤)

Run:
```bash
npm run dev &  sleep 5
curl -s localhost:3000/api/watchlist | head -c 400
kill %1
```
Expected: `{"stocks":[{"ticker":"TSLA",...` 형태 JSON.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/watchlist/route.ts
git commit -m "feat: /api/watchlist orchestration route"
```

---

### Task 18: 매크로 API 라우트 (`api/macro/route.ts`)

**Files:**
- Create: `src/app/api/macro/route.ts`

- [ ] **Step 1: 구현**

`src/app/api/macro/route.ts`:
```ts
import { NextResponse } from "next/server";
import { getTenYearYield, getHySpread, getFearGreed, getUsdKrw } from "@/lib/providers/macro";
import { macroRegime } from "@/lib/scoring";
import type { MacroData } from "@/lib/types";

export const revalidate = 3600;

export async function GET() {
  const fredKey = process.env.FRED_API_KEY ?? "";
  const [tenYear, hy, fg, usdKrw] = await Promise.all([
    getTenYearYield(fredKey), getHySpread(fredKey), getFearGreed(), getUsdKrw(),
  ]);
  const regime = fg ? macroRegime(fg.score, tenYear, hy?.value ?? null, hy?.percentile1y ?? null) : null;
  const data: MacroData = {
    fearGreed: fg, tenYearYield: tenYear, hySpread: hy?.value ?? null, usdKrw, regime,
  };
  return NextResponse.json(data);
}
```

- [ ] **Step 2: 로컬 확인 & Commit**

Run: `curl -s localhost:3000/api/macro` → JSON with `regime`
```bash
git add src/app/api/macro/route.ts
git commit -m "feat: /api/macro route"
```

---

## Phase D — 프론트엔드 (모바일 UI)

> UI 태스크는 빌드+수동 검증. 각 컴포넌트는 표시 전용(props in → markup out). 데이터 페칭은 `page.tsx`(클라이언트)에서 `/api/*` 호출.

### Task 19: 신호등 행 + 리스트 (`StockRow`, `StockList`)

**Files:**
- Create: `src/components/StockRow.tsx`, `src/components/StockList.tsx`

- [ ] **Step 1: `StockRow` 작성**

`src/components/StockRow.tsx`:
```tsx
import type { EnrichedStock } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  "in-zone": "bg-green-500 text-white",
  near: "bg-amber-400 text-black",
  far: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  unknown: "bg-zinc-200 text-zinc-500 dark:bg-zinc-800",
};

function zoneLabel(s: EnrichedStock): string {
  const reached = s.zones.filter((z) => z.reached);
  if (reached.length) return `-${reached[reached.length - 1].pct}% 존 진입`;
  if (s.nearestUnreached) return `-${s.nearestUnreached.pct}%존까지 ${s.nearestUnreached.distancePct.toFixed(1)}%`;
  return "—";
}

export function StockRow({ stock, onClick }: { stock: EnrichedStock; onClick?: () => void }) {
  const rsiLow = stock.rsi14 != null && stock.rsi14 < 30;
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 border-b border-zinc-100 px-3 py-3 text-left dark:border-zinc-800"
    >
      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${STATUS_STYLE[stock.zoneStatus]}`}>
        {zoneLabel(stock)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{stock.name}</span>
        <span className="block text-xs text-zinc-500">{stock.ticker}</span>
      </span>
      <span className="text-right">
        <span className="block tabular-nums">{stock.price != null ? `$${stock.price.toFixed(2)}` : "—"}</span>
        <span className="flex items-center justify-end gap-1 text-xs">
          {stock.rsi14 != null && (
            <span className={rsiLow ? "font-semibold text-red-500" : "text-zinc-500"}>RSI {stock.rsi14.toFixed(0)}</span>
          )}
          <span className="text-zinc-400">·</span>
          <span className="text-zinc-500">점수 {stock.score}</span>
        </span>
      </span>
    </button>
  );
}
```

- [ ] **Step 2: `StockList` 작성** (정렬/그룹, 클라이언트 상태)

`src/components/StockList.tsx`:
```tsx
"use client";
import { useState } from "react";
import type { EnrichedStock } from "@/lib/types";
import { StockRow } from "./StockRow";

type Sort = "distance" | "score" | "rsi";

function distanceKey(s: EnrichedStock): number {
  if (s.zones.some((z) => z.reached)) return -Infinity; // 진입 종목 최상단
  return s.nearestUnreached?.distancePct ?? Infinity;
}

export function StockList({ stocks, onSelect }: { stocks: EnrichedStock[]; onSelect: (s: EnrichedStock) => void }) {
  const [sort, setSort] = useState<Sort>("distance");
  const sorted = [...stocks].sort((a, b) => {
    if (sort === "score") return b.score - a.score;
    if (sort === "rsi") return (a.rsi14 ?? 999) - (b.rsi14 ?? 999);
    return distanceKey(a) - distanceKey(b);
  });
  return (
    <div>
      <div className="flex gap-2 px-3 py-2 text-xs">
        {(["distance", "score", "rsi"] as Sort[]).map((s) => (
          <button
            key={s}
            onClick={() => setSort(s)}
            className={`rounded-full px-3 py-1 ${sort === s ? "bg-zinc-900 text-white dark:bg-white dark:text-black" : "bg-zinc-100 dark:bg-zinc-800"}`}
          >
            {s === "distance" ? "매수존 거리" : s === "score" ? "점수" : "RSI"}
          </button>
        ))}
      </div>
      {sorted.map((s) => (
        <StockRow key={s.ticker} stock={s} onClick={() => onSelect(s)} />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/components/StockRow.tsx src/components/StockList.tsx
git commit -m "feat: traffic-light stock row + sortable list"
```

---

### Task 20: 요약 헤더 (`SummaryHeader`)

**Files:**
- Create: `src/components/SummaryHeader.tsx`

- [ ] **Step 1: 작성**

`src/components/SummaryHeader.tsx`:
```tsx
import type { EnrichedStock, MacroData } from "@/lib/types";
import { usSession } from "@/lib/marketHours";

export function SummaryHeader({ stocks, macro }: { stocks: EnrichedStock[]; macro: MacroData | null }) {
  const inZone = stocks.filter((s) => s.zoneStatus === "in-zone").length;
  const oversold = stocks.filter((s) => s.rsi14 != null && s.rsi14 < 30).length;
  const session = usSession(Date.now());
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
      <p className="text-sm">
        매수존 <b className="text-green-600">{inZone}</b>개 · RSI&lt;30 <b className="text-red-500">{oversold}</b>개
      </p>
      <p className="mt-1 text-xs text-zinc-500">
        미국장 {session.label}
        {macro?.fearGreed && <> · 공포탐욕 {macro.fearGreed.score} ({macro.fearGreed.rating})</>}
      </p>
      {macro?.regime && (
        <p className="mt-1 text-xs text-zinc-500">
          레짐: {macro.regime.regime} · 활성 매수존 {macro.regime.activeZones.map((z) => `-${z}%`).join(", ")}
        </p>
      )}
    </header>
  );
}
```

- [ ] **Step 2: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/components/SummaryHeader.tsx
git commit -m "feat: summary header with KST session + regime"
```

---

### Task 21: 상세 위젯 (`BuyZoneLadder`, `RsiGauge`, `ValuationBadges`)

**Files:**
- Create: `src/components/BuyZoneLadder.tsx`, `src/components/RsiGauge.tsx`, `src/components/ValuationBadges.tsx`

- [ ] **Step 1: `BuyZoneLadder` 작성**

`src/components/BuyZoneLadder.tsx`:
```tsx
import type { EnrichedStock } from "@/lib/types";

export function BuyZoneLadder({ stock }: { stock: EnrichedStock }) {
  const rows = [
    { label: `고점 (${stock.highSource === "sheet" ? "시트" : "52주"})`, price: stock.high, marker: false },
    ...stock.zones.map((z) => ({ label: `-${z.pct}%`, price: z.price, marker: z.reached })),
  ];
  return (
    <div className="space-y-1">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between text-sm">
          <span className="text-zinc-500">{r.label}</span>
          <span className={`tabular-nums ${r.marker ? "font-semibold text-green-600" : ""}`}>
            ${r.price.toFixed(2)} {r.marker && "✓"}
          </span>
        </div>
      ))}
      {stock.price != null && (
        <div className="mt-1 flex items-center justify-between border-t border-zinc-200 pt-1 text-sm dark:border-zinc-800">
          <span className="font-medium">현재가</span>
          <span className="tabular-nums font-semibold">
            ${stock.price.toFixed(2)} <span className="text-xs text-red-500">(-{stock.drawdownPct.toFixed(1)}%)</span>
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: `RsiGauge` 작성**

`src/components/RsiGauge.tsx`:
```tsx
export function RsiGauge({ rsi }: { rsi: number | null }) {
  if (rsi == null) return <span className="text-xs text-zinc-400">RSI n/a</span>;
  const color = rsi < 30 ? "bg-red-500" : rsi > 70 ? "bg-amber-500" : "bg-zinc-400";
  return (
    <div className="text-xs">
      <div className="mb-1 flex justify-between"><span>RSI(14)</span><span className="font-semibold">{rsi.toFixed(0)}</span></div>
      <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, rsi))}%` }} />
      </div>
    </div>
  );
}
```

- [ ] **Step 3: `ValuationBadges` 작성**

`src/components/ValuationBadges.tsx`:
```tsx
import type { EnrichedStock, BadgeState } from "@/lib/types";

const STYLE: Record<BadgeState, string> = {
  pass: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  warn: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  fail: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  na: "bg-zinc-100 text-zinc-400 dark:bg-zinc-800",
};

export function ValuationBadges({ stock }: { stock: EnrichedStock }) {
  const entries: [string, BadgeState, number | null][] = [
    ["PER", stock.valuationBadges.per, stock.valuation.per],
    ["PSR", stock.valuationBadges.psr, stock.valuation.psr],
    ["PBR", stock.valuationBadges.pbr, stock.valuation.pbr],
    ["ROE", stock.valuationBadges.roe, stock.valuation.roe],
  ];
  const pass = entries.filter(([, b]) => b === "pass").length;
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-500">밸류에이션 {pass}/4 통과</div>
      <div className="flex flex-wrap gap-1">
        {entries.map(([k, b, v]) => (
          <span key={k} className={`rounded px-2 py-1 text-xs ${STYLE[b]}`}>
            {k} {v != null ? v.toFixed(1) : "n/a"}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/components/BuyZoneLadder.tsx src/components/RsiGauge.tsx src/components/ValuationBadges.tsx
git commit -m "feat: detail widgets (ladder, RSI gauge, valuation badges)"
```

---

### Task 22: 상세 카드 (`StockDetailCard`)

**Files:**
- Create: `src/components/StockDetailCard.tsx`

- [ ] **Step 1: 작성**

`src/components/StockDetailCard.tsx`:
```tsx
"use client";
import type { EnrichedStock } from "@/lib/types";
import { BuyZoneLadder } from "./BuyZoneLadder";
import { RsiGauge } from "./RsiGauge";
import { ValuationBadges } from "./ValuationBadges";

export function StockDetailCard({ stock, onClose }: { stock: EnrichedStock; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end bg-black/40" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl bg-white p-4 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-baseline justify-between">
          <div>
            <h2 className="text-lg font-bold">{stock.name} <span className="text-sm text-zinc-500">{stock.ticker}</span></h2>
            {stock.price != null && (
              <p className="tabular-nums">
                ${stock.price.toFixed(2)}
                {stock.priceKrw != null && <span className="ml-2 text-sm text-zinc-500">₩{Math.round(stock.priceKrw).toLocaleString()}</span>}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-zinc-400">닫기</button>
        </div>

        <section className="mb-4"><BuyZoneLadder stock={stock} /></section>

        <section className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <RsiGauge rsi={stock.rsi14} />
          <div>
            <div className="text-zinc-500">추세</div>
            <div className="font-medium">
              {stock.crossState === "golden" ? "골든크로스 영역" : stock.crossState === "death" ? "데드크로스 영역" : "—"}
              {stock.crossFreshDays != null && ` (${stock.crossFreshDays}일 전 교차)`}
            </div>
            {stock.range52wPct != null && <div className="text-zinc-500">52주 위치 {stock.range52wPct.toFixed(0)}%</div>}
            {stock.volumeSpike != null && stock.volumeSpike >= 1.5 && (
              <div className="text-amber-600">거래량 {stock.volumeSpike.toFixed(1)}배</div>
            )}
          </div>
        </section>

        <section className="mb-4"><ValuationBadges stock={stock} /></section>

        <section className="text-sm">
          <p><span className="text-zinc-500">매수논리:</span> {stock.buyThesis}</p>
          <p><span className="text-zinc-500">리스크:</span> {stock.sellRisk}</p>
          <div className="mt-2 flex gap-1">
            {stock.theme.aiInfra && <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">AI인프라</span>}
            {stock.theme.trump && <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">트럼프</span>}
            {stock.theme.tariff && <span className="rounded bg-zinc-100 px-2 py-1 text-xs dark:bg-zinc-800">관세피난처</span>}
            <span className="ml-auto text-xs text-zinc-500">점수 {stock.score}/3</span>
          </div>
        </section>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/components/StockDetailCard.tsx
git commit -m "feat: stock detail card (bottom sheet)"
```

---

### Task 23: 매크로 다이얼 + 테마 집중도 (`MacroDial`, `ThemeConcentration`)

**Files:**
- Create: `src/components/MacroDial.tsx`, `src/components/ThemeConcentration.tsx`

- [ ] **Step 1: `MacroDial` 작성**

`src/components/MacroDial.tsx`:
```tsx
import type { MacroData } from "@/lib/types";

export function MacroDial({ macro }: { macro: MacroData | null }) {
  if (!macro?.regime) return null;
  const r = macro.regime;
  return (
    <div className="mx-3 my-2 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="font-medium">매크로 레짐</span>
        <span className="rounded-full bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-white dark:text-black">{r.regime}</span>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{r.note}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
        <div><div className="text-zinc-500">공포탐욕</div><div className="font-semibold">{r.fng}</div></div>
        <div><div className="text-zinc-500">10년물</div><div className="font-semibold">{r.tenYear?.toFixed(2) ?? "—"}%</div></div>
        <div><div className="text-zinc-500">HY 스프레드</div><div className="font-semibold">{r.hySpread?.toFixed(2) ?? "—"}{r.hySpreadPercentile != null && ` (${r.hySpreadPercentile.toFixed(0)}%)`}</div></div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: `ThemeConcentration` 작성**

`src/components/ThemeConcentration.tsx`:
```tsx
import type { EnrichedStock } from "@/lib/types";

export function ThemeConcentration({ stocks }: { stocks: EnrichedStock[] }) {
  const total = stocks.length || 1;
  const counts = {
    AI인프라: stocks.filter((s) => s.theme.aiInfra).length,
    트럼프: stocks.filter((s) => s.theme.trump).length,
    관세피난처: stocks.filter((s) => s.theme.tariff).length,
  };
  return (
    <div className="mx-3 my-2 rounded-xl border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="mb-2 font-medium">테마 집중도</div>
      {Object.entries(counts).map(([k, c]) => (
        <div key={k} className="mb-1">
          <div className="flex justify-between text-xs"><span>{k}</span><span>{c}/{total}</span></div>
          <div className="h-1.5 rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(c / total) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 타입체크 & Commit**

Run: `npx tsc --noEmit` → 에러 없음
```bash
git add src/components/MacroDial.tsx src/components/ThemeConcentration.tsx
git commit -m "feat: macro dial + theme concentration"
```

---

### Task 24: 메인 화면 조립 + 인앱 알림 + 새로고침 (`page.tsx`)

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: 작성** (클라이언트 페이지: `/api/*` fetch, 상세 열기, 인앱 알림 토스트)

`src/app/page.tsx`:
```tsx
"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { EnrichedStock, MacroData } from "@/lib/types";
import { SummaryHeader } from "@/components/SummaryHeader";
import { StockList } from "@/components/StockList";
import { StockDetailCard } from "@/components/StockDetailCard";
import { MacroDial } from "@/components/MacroDial";
import { ThemeConcentration } from "@/components/ThemeConcentration";

export default function Page() {
  const [stocks, setStocks] = useState<EnrichedStock[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [selected, setSelected] = useState<EnrichedStock | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const prevInZone = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const [w, m] = await Promise.all([
      fetch("/api/watchlist").then((r) => r.json()),
      fetch("/api/macro").then((r) => r.json()).catch(() => null),
    ]);
    const next: EnrichedStock[] = w.stocks ?? [];
    // 인앱 알림: 새로 매수존에 진입한 종목
    const nowInZone = new Set(next.filter((s) => s.zoneStatus === "in-zone").map((s) => s.ticker));
    const fresh = [...nowInZone].filter((t) => !prevInZone.current.has(t));
    if (prevInZone.current.size > 0 && fresh.length > 0) setToast(`${fresh.join(", ")} 매수존 진입!`);
    prevInZone.current = nowInZone;
    setStocks(next);
    setMacro(m);
    setUpdatedAt(w.updatedAt ?? Date.now());
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000); // 인앱 폴링(앱 열려있을 때만)
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <main className="mx-auto max-w-md pb-10">
      <SummaryHeader stocks={stocks} macro={macro} />
      <MacroDial macro={macro} />
      <StockList stocks={stocks} onSelect={setSelected} />
      <ThemeConcentration stocks={stocks} />
      <div className="px-3 py-4 text-center text-xs text-zinc-400">
        <button onClick={load} className="rounded-full border border-zinc-300 px-4 py-2 dark:border-zinc-700">새로고침</button>
        {updatedAt && <p className="mt-2">갱신 {new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" }).format(updatedAt)} KST</p>}
      </div>
      {selected && <StockDetailCard stock={selected} onClose={() => setSelected(null)} />}
      {toast && (
        <div className="fixed inset-x-0 bottom-4 z-30 mx-auto w-fit rounded-full bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 2: 빌드 & 수동 확인**

Run: `npm run dev` → 브라우저(모바일 뷰포트)에서 리스트/정렬/상세/매크로/새로고침 동작 확인.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: main screen wiring + in-app alerts + refresh"
```

---

### Task 25: PWA (manifest + service worker + 다크모드 마무리)

**Files:**
- Create: `public/manifest.webmanifest`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: `manifest.webmanifest` 작성**

`public/manifest.webmanifest`:
```json
{
  "name": "관심종목",
  "short_name": "관심종목",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: 아이콘 placeholder 생성** (단색 PNG; 추후 디자인 교체)

Run:
```bash
mkdir -p public/icons
# 192/512 단색 placeholder (ImageMagick 있으면). 없으면 임의 PNG 2개를 해당 경로에 배치.
command -v convert >/dev/null && convert -size 192x192 xc:#09090b public/icons/icon-192.png || echo "place icon-192.png manually"
command -v convert >/dev/null && convert -size 512x512 xc:#09090b public/icons/icon-512.png || echo "place icon-512.png manually"
```
Expected: 두 PNG 존재. (없으면 임시로 아무 PNG나 그 이름으로 둔다 — 빌드 통과가 목적.)

- [ ] **Step 3: 서비스워커 작성** (앱 셸 캐싱, 오프라인 시 마지막 화면)

`public/sw.js`:
```js
const CACHE = "popol-v1";
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/"])));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))));
});
self.addEventListener("fetch", (e) => {
  const { request } = e;
  if (request.method !== "GET") return;
  // API: 네트워크 우선, 실패 시 캐시
  if (new URL(request.url).pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(request, copy)); return res; })
        .catch(() => caches.match(request)),
    );
    return;
  }
  // 그 외: 캐시 우선
  e.respondWith(caches.match(request).then((r) => r || fetch(request)));
});
```

- [ ] **Step 4: SW 등록** (`layout.tsx`에 등록 스크립트 추가)

`src/app/layout.tsx`의 `<body>` 안에 추가:
```tsx
<script
  dangerouslySetInnerHTML={{
    __html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}))}`,
  }}
/>
```

- [ ] **Step 5: 빌드 & 전체 테스트 & Commit**

Run:
```bash
npm test && npm run build
```
Expected: 모든 단위 테스트 PASS, 빌드 성공.
```bash
git add public/manifest.webmanifest public/sw.js public/icons src/app/layout.tsx
git commit -m "feat: PWA manifest + service worker"
```

---

### Task 26: 배포 (Vercel)

- [ ] **Step 1: 환경변수 준비** — Finnhub 키(finnhub.io), FRED 키(fred.stlouisfed.org) 발급.
- [ ] **Step 2: Vercel 연결 & 환경변수 등록** — `GOOGLE_SHEET_ID`, `GOOGLE_SHEET_GID`, `FINNHUB_API_KEY`, `FRED_API_KEY`.
- [ ] **Step 3: 배포 & 모바일에서 홈화면 추가 → 동작 확인.**
- [ ] **Step 4:** `git add -A && git commit -m "chore: deploy config"` (변경 있으면)

---

## Self-Review 결과

**1. 스펙 커버리지**: §3 API 조합 → Task 13~15·17·18. §5 데이터모델 → Task 2·12·16. §6 계산로직 → Task 3~10(지표/구간/점수/밸류/레짐). §7 UI → Task 19~25(리스트/요약/상세/다이얼/PWA/인앱알림). §8 캐싱 → 각 fetch `revalidate` + route `revalidate`. §9 에러처리 → provider `try/catch`+null, route 502 폴백, `isStale`. §11 테스트 → Phase B·C TDD. §10 비범위(푸시·저널·실적·폴백)는 의도적으로 태스크 없음. **갭 없음.**

**2. 플레이스홀더 스캔**: "TBD/적절히/나중에" 없음. 아이콘만 placeholder PNG(의도적, 디자인 교체 전 빌드 통과용)로 명시.

**3. 타입 일관성**: `EnrichedStock`/`Valuation`/`ValuationBadges`/`MacroRegime`/`Zone` 등은 Task 2 `types.ts`에서 단일 정의, 이후 import만. provider 반환 `Quote`/`DailyHistory`는 `yahoo.ts`에서 정의, `enrich.ts`·route에서 동일 시그니처 사용. 함수명(`buildZones`,`nearestUnreachedZone`,`zoneStatusOf`,`enrichStock`,`getQuote`,`getDailyHistory`,`getValuation`,`macroRegime`) 전 태스크 일관.

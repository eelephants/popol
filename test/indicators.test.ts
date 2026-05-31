import { describe, it, expect } from "vitest";
import { sma, rsi14, crossState, crossFreshDays, range52w, volumeSpike } from "@/lib/indicators";

describe("sma", () => {
  it("returns mean of the last `period` closes", () => {
    expect(sma([1, 2, 3, 4, 5], 5)).toBe(3);
    expect(sma([10, 20, 30, 40], 2)).toBe(35);
  });
  it("returns null when fewer closes than period", () => {
    expect(sma([1, 2], 3)).toBeNull();
  });
});

describe("rsi14", () => {
  it("is 100 when prices only rise", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 + i);
    expect(rsi14(closes)).toBe(100);
  });
  it("is 0 when prices only fall", () => {
    const closes = Array.from({ length: 30 }, (_, i) => 100 - i);
    expect(rsi14(closes)).toBe(0);
  });
  it("is near 50 (balanced) for symmetric up/down alternation", () => {
    const closes: number[] = [100];
    for (let i = 0; i < 40; i++) closes.push(closes[closes.length - 1] + (i % 2 === 0 ? 1 : -1));
    const v = rsi14(closes)!;
    expect(v).toBeGreaterThan(45);
    expect(v).toBeLessThan(55);
  });
  it("returns null with insufficient data", () => {
    expect(rsi14([1, 2, 3])).toBeNull();
  });
});

describe("crossState", () => {
  it("golden when sma50 > sma200", () => expect(crossState(110, 100)).toBe("golden"));
  it("death when sma50 < sma200", () => expect(crossState(90, 100)).toBe("death"));
  it("none when either is null", () => expect(crossState(null, 100)).toBe("none"));
});

describe("crossFreshDays", () => {
  it("returns null when no cross within lookback (steady uptrend)", () => {
    const closes = Array.from({ length: 260 }, (_, i) => 100 + i);
    expect(crossFreshDays(closes)).toBeNull();
  });
  it("detects a recent flip from death to golden and reports days ago in range", () => {
    const falling = Array.from({ length: 255 }, (_, i) => 300 - i);
    const spikes = [100000, 100000, 100000];
    const days = crossFreshDays([...falling, ...spikes]);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThanOrEqual(0);
    expect(days!).toBeLessThanOrEqual(5);
  });
});

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

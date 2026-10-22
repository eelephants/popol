import { describe, it, expect } from "vitest";
import { annualFromFacts } from "@/lib/providers/sec";

describe("annualFromFacts", () => {
  it("keeps full-year 10-K values and the latest filing per period", () => {
    const facts = [
      { start: "2022-07-01", end: "2023-06-30", val: 9.68, form: "10-K", filed: "2023-07-27" },
      { start: "2022-07-01", end: "2023-06-30", val: 9.7, form: "10-K", filed: "2025-07-30" }, // 재작성
      { start: "2023-07-01", end: "2023-09-30", val: 2.99, form: "10-Q", filed: "2023-10-24" },
      { start: "2023-07-01", end: "2024-03-31", val: 8.1, form: "10-K", filed: "2024-07-30" }, // 9개월 누적
      { start: "2023-07-01", end: "2024-06-30", val: 11.8, form: "10-K", filed: "2024-07-30" },
      { end: "2024-06-30", val: 11.8, form: "10-K", filed: "2024-07-30" }, // 기간 없는 값
    ];
    expect(annualFromFacts(facts)).toEqual([
      { periodEnd: "2023-06-30", value: 9.7 },
      { periodEnd: "2024-06-30", value: 11.8 },
    ]);
  });
});

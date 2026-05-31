import { describe, it, expect } from "vitest";
import { usSession } from "@/lib/marketHours";

// 2026-06-01 is Monday. ET is summer (EDT, UTC-4). 09:30 ET = 13:30 UTC.
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

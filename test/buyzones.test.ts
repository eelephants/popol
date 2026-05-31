import { describe, it, expect } from "vitest";
import { buildZones, nearestUnreachedZone, zoneStatusOf, drawdownPct } from "@/lib/buyzones";

describe("buildZones", () => {
  it("computes -10/-15/-20/-25% prices off the high and reached flags", () => {
    const zones = buildZones(100, 86);
    expect(zones.map((z) => z.price)).toEqual([90, 85, 80, 75]);
    expect(zones.map((z) => z.reached)).toEqual([true, false, false, false]);
  });
});

describe("nearestUnreachedZone", () => {
  it("returns the closest zone not yet reached with distance %", () => {
    const zones = buildZones(100, 92);
    const n = nearestUnreachedZone(zones, 92);
    expect(n).not.toBeNull();
    expect(n!.pct).toBe(10);
    expect(n!.distancePct).toBeCloseTo(((90 - 92) / 92) * 100, 5);
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
    expect(zoneStatusOf(buildZones(100, 91), 91)).toBe("near");
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

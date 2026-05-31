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
  const nearest = unreached.reduce((a, b) => (b.price > a.price ? b : a));
  return { pct: nearest.pct, price: nearest.price, distancePct: ((nearest.price - price) / price) * 100 };
}

export function zoneStatusOf(zones: Zone[], price: number): ZoneStatus {
  if (zones.length === 0) return "unknown";
  if (zones.some((z) => z.reached)) return "in-zone";
  const n = nearestUnreachedZone(zones, price);
  if (n && n.distancePct >= -2) return "near";
  return "far";
}

export function drawdownPct(high: number, price: number): number {
  return ((high - price) / high) * 100;
}

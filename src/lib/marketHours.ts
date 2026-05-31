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

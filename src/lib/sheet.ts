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
  const t = v.replace(/,/g, "").trim();
  if (t === "") return null; // 빈 셀은 null (0이 아님) — highOverride 폴백이 동작하도록
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
};

/** "1.5배 이상 3배 이하" / "15% 이상 ~ 20%이하" 등에서 숫자 추출 */
function nums(s: string): number[] {
  return (s.match(/[\d.]+/g) ?? []).map(Number);
}

export function parseWatchlistCsv(text: string): WatchlistConfig {
  const rows = parseCsv(text);
  const headerIdx = rows.findIndex((r) => r[0]?.trim() === "No");
  const items: WatchlistItem[] = [];
  let i = headerIdx + 1;
  for (; i < rows.length; i++) {
    const r = rows[i];
    const no = num(r[0] ?? "");
    const ticker = (r[2] ?? "").trim();
    if (no == null || ticker === "") break;
    items.push({
      name: (r[1] ?? "").trim(),
      ticker,
      buyThesis: (r[10] ?? "").trim(),
      sellRisk: (r[11] ?? "").trim(),
      theme: { aiInfra: toBool(r[12] ?? ""), trump: toBool(r[13] ?? ""), tariff: toBool(r[14] ?? "") },
      highOverride: num(r[4] ?? ""),
    });
  }

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
  // Server-side fetch (no CORS concern). /export returns the raw CSV with the original
  // "No" header row; gviz/tq blanks numeric-column headers (incl. "No") and breaks parsing.
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: "follow", next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`sheet fetch failed: ${res.status}`);
  return parseWatchlistCsv(await res.text());
}

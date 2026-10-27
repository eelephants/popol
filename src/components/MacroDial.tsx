import type { MacroData, Regime } from "@/lib/types";
import { Pill, type Tone } from "./ui";

const REGIME: Record<Regime, { label: string; tone: Tone }> = {
  "extreme-fear": { label: "극단적 공포", tone: "cold-2" },
  fear: { label: "공포", tone: "cold-1" },
  neutral: { label: "중립", tone: "flat" },
  greed: { label: "탐욕", tone: "hot-1" },
  "extreme-greed": { label: "극단적 탐욕", tone: "hot-2" },
};

function Cell({ label, value, unit, sub }: { label: string; value: string | null; unit?: string; sub?: string }) {
  return (
    <div className="py-3 md:px-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="num mt-1 text-xl font-semibold leading-tight">
        {value ?? <span className="text-base font-normal text-faint">—</span>}
        {value != null && unit && <span className="ml-0.5 text-sm font-normal text-muted">{unit}</span>}
      </div>
      {sub && <div className="num mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

/** 미국장 분위기 한 줄 + 숫자 네 칸. 지금 어느 매수존을 먼저 볼지가 이 블록의 답이다. */
export function MacroDial({ macro }: { macro: MacroData | null }) {
  if (!macro?.regime) return null;
  const r = macro.regime;
  const reg = REGIME[r.regime];
  const zones = r.activeZones.map((z) => `−${z}%`).join("·");
  return (
    <section aria-label="미국장 분위기" className="rounded-card border border-line bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-3">
        <Pill tone={reg.tone}>{reg.label}</Pill>
        <p className="text-sm">
          지금은 <b className="font-semibold">{zones}</b> 매수존을 먼저 볼 때예요.
          {r.hySpreadPercentile != null && r.hySpreadPercentile >= 90 && r.hySpreadRising && (
            <span className="text-muted"> 하이일드 스프레드가 오르는 중이라 한 칸 보수적으로 잡았어요.</span>
          )}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-x-4 px-4 md:grid-cols-4 md:gap-x-0 md:divide-x md:divide-rule md:px-0">
        <Cell label="공포탐욕지수" value={String(r.fng)} sub="0 공포 · 100 탐욕" />
        <Cell label="미국 10년물 금리" value={r.tenYear != null ? r.tenYear.toFixed(2) : null} unit="%" />
        <Cell
          label="하이일드 스프레드"
          value={r.hySpread != null ? r.hySpread.toFixed(2) : null}
          unit="%p"
          sub={r.hySpreadPercentile != null ? `1년 중 상위 ${(100 - r.hySpreadPercentile).toFixed(0)}%` : undefined}
        />
        <Cell
          label="원·달러 환율"
          value={macro.usdKrw != null ? Math.round(macro.usdKrw).toLocaleString("ko-KR") : null}
          unit="원"
        />
      </div>
    </section>
  );
}

// 화면 공용 부품. 색은 tailwind.config의 토큰(ground·surface·ink·muted…)만 쓴다.

export type Tone = "cold-2" | "cold-1" | "flat" | "hot-1" | "hot-2" | "warn";

const TONE: Record<Tone, string> = {
  "cold-2": "bg-cold-2 text-cold-2-ink",
  "cold-1": "bg-cold-1 text-cold-1-ink",
  flat: "bg-flat text-flat-ink",
  "hot-1": "bg-hot-1 text-hot-1-ink",
  "hot-2": "bg-hot-2 text-hot-2-ink",
  warn: "bg-warn text-warn-ink",
};

export function Pill({ tone, children, className = "" }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex h-6 flex-none items-center whitespace-nowrap rounded-control px-2 text-xs font-medium ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function Panel({ children, className = "", as: Tag = "section" }: { children: React.ReactNode; className?: string; as?: "section" | "div" }) {
  return <Tag className={`rounded-card border border-line bg-surface ${className}`}>{children}</Tag>;
}

/** 화면 제목: 24px 한 줄 + 지금 상태를 말하는 한 줄. */
export function PageTitle({ title, sub }: { title: string; sub?: React.ReactNode }) {
  return (
    <div className="pb-4 pt-2">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value, options, onChange, label, className = "",
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="tablist" aria-label={label} className={`inline-flex rounded-card bg-raised p-1 ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`h-9 flex-1 whitespace-nowrap rounded-control px-4 text-sm transition-colors ${
            value === o.id ? "bg-surface font-semibold text-ink" : "text-muted hover:text-ink"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const inputCls =
  "rounded-control border border-control bg-surface px-3 text-base text-ink outline-none transition-colors placeholder:text-faint focus:border-accent";

/** 등락: 국내 관례대로 상승 빨강 ▲, 하락 파랑 ▼, 보합은 회색. 부호도 글자로 남긴다. */
export function Change({ pct, className = "" }: { pct: number | null; className?: string }) {
  if (pct == null || !Number.isFinite(pct)) return <span className={`text-faint ${className}`}>—</span>;
  const flat = Math.abs(pct) < 0.005;
  const up = pct > 0;
  return (
    <span className={`num ${flat ? "text-muted" : up ? "text-up" : "text-down"} ${className}`}>
      {flat ? "" : up ? "▲ " : "▼ "}
      {up ? "+" : ""}
      {pct.toFixed(2)}%
    </span>
  );
}

export function money(v: number | null | undefined, market: "US" | "KR", digits = 2) {
  if (v == null || !Number.isFinite(v)) return "—";
  return market === "KR"
    ? `₩${Math.round(v).toLocaleString("ko-KR")}`
    : `$${v.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
}

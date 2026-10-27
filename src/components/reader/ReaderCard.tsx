import { Gauge } from "./Gauge";

export function ReaderCard({
  title, subtitle, score, filled, total, children, footer,
}: {
  title: string;
  subtitle: string;
  score: number | null;
  filled: number;
  total: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-surface p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mb-4 mt-0.5 text-sm text-muted">{subtitle}</p>
      <Gauge score={score} filled={filled} total={total} />
      <ul className="mt-4">{children}</ul>
      {footer && <div className="mt-3 text-[13px] text-muted">{footer}</div>}
    </section>
  );
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-control underline-offset-2 hover:text-ink">
      {children}
    </a>
  );
}

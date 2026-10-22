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
    <section className="mx-3 my-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      <Gauge score={score} filled={filled} total={total} />
      <ul className="mt-3">{children}</ul>
      {footer && <div className="mt-2 text-xs text-zinc-500">{footer}</div>}
    </section>
  );
}

export function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="underline decoration-zinc-300 underline-offset-2 hover:text-zinc-800 dark:hover:text-zinc-200">
      {children}
    </a>
  );
}

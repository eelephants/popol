// 글 화면(가이드·소개·약관) 공용 부품. 본문 폭은 읽기 좋은 max-w-2xl.

export function ProseSection({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-8 scroll-mt-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-3 text-[15px] leading-relaxed text-ink">{children}</div>
    </section>
  );
}

export const ExtLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a href={href} target="_blank" rel="noreferrer" className="underline decoration-control underline-offset-2">
    {children}
  </a>
);

/** 칸이 모두 숫자·금액·부호로 시작하는 열은 오른쪽 정렬해 자릿수를 맞춘다. */
const isNumericCol = (rows: string[][], j: number) => rows.every((r) => /^[−+\-$₩0-9—]/.test(r[j] ?? ""));

export function ProseTable({ head, rows }: { head: string[]; rows: string[][] }) {
  const right = head.map((_, j) => j > 0 && isNumericCol(rows, j));
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full text-left text-sm">
        <thead className="bg-raised text-muted">
          <tr>
            {head.map((h, j) => (
              <th key={h} scope="col" className={`whitespace-nowrap px-3 py-2 font-medium ${right[j] ? "text-right" : ""}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-rule">
              {r.map((c, j) => (
                <td key={j} className={`num px-3 py-2 ${j === 0 ? "font-medium" : ""} ${right[j] ? "text-right" : ""}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProseNote({ children }: { children: React.ReactNode }) {
  return <p className="rounded-card bg-raised px-4 py-3 text-sm text-muted">{children}</p>;
}

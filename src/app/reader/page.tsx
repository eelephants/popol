import { ReaderApp, type ReaderView } from "@/components/reader/ReaderApp";

const VIEWS: ReaderView[] = ["market", "stock", "concentration"];

export default async function ReaderPage({ searchParams }: { searchParams: Promise<{ view?: string; ticker?: string }> }) {
  const sp = await searchParams;
  const ticker = sp.ticker?.trim().toUpperCase() || undefined;
  const view = VIEWS.includes(sp.view as ReaderView) ? (sp.view as ReaderView) : ticker ? "stock" : "market";
  return <ReaderApp initialView={view} initialTicker={ticker} />;
}

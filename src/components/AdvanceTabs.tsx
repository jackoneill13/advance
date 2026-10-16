import Link from "next/link";

const TABS = [
  ["worklist", "Worklist", ""],
  ["people", "People & access", "/people"],
  ["door", "Door sheet", "/door"],
  ["sheet", "Advance sheet", "/sheet"],
] as const;

export function AdvanceTabs({ id, active }: { id: string; active: (typeof TABS)[number][0] }) {
  return (
    <nav className="no-print mb-4 flex gap-1 overflow-x-auto border-b border-line text-sm">
      {TABS.map(([key, title, path]) => (
        <Link
          key={key}
          href={`/advances/${id}${path}`}
          className={`whitespace-nowrap border-b-2 px-3 py-2 ${active === key ? "border-accent font-semibold text-ink" : "border-transparent text-body hover:text-ink"}`}
        >
          {title}
        </Link>
      ))}
    </nav>
  );
}

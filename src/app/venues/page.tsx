import Link from "next/link";
import { listVenues } from "@/lib/queries";
import { PageTitle, btnAccent, Empty } from "@/components/ui";
import { SPEC_SECTIONS } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export default async function VenuesPage() {
  const venues = await listVenues();
  return (
    <div>
      <PageTitle
        eyebrow="Spec packs"
        title="Venues"
        right={
          <Link href="/venues/new" className={btnAccent}>
            Add a venue
          </Link>
        }
      />
      {venues.length === 0 ? (
        <Empty>No venues yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {venues.map((v) => {
            const filled = SPEC_SECTIONS.filter(([k]) => (v.specPack.sections[k] ?? "").trim().length > 0).length;
            return (
              <li key={v.id}>
                <Link href={`/venues/${v.id}/spec-pack`} className="block rounded-xl border border-line bg-white p-4 hover:border-ink">
                  <p className="text-lg font-semibold">{v.name}</p>
                  <p className="text-sm text-body">
                    {v.city ?? "City not set"} · {v.capacity.toLocaleString()} cap · spec pack {filled}/{SPEC_SECTIONS.length} sections
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

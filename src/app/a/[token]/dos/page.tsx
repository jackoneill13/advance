import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdvanceByToken } from "@/lib/queries";
import { DosSheet } from "@/components/DosSheet";
import { PrintButton } from "@/components/PrintButton";
import { btnGhost } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ArtistDosPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const full = await getAdvanceByToken(token);
  if (!full) notFound();
  return (
    <div className="max-w-3xl">
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Link href={`/a/${token}`} className={btnGhost}>
          ← Back to your advance
        </Link>
        <PrintButton>Print / save PDF</PrintButton>
      </div>
      <div className="rounded-xl border border-line bg-white p-5 print:border-0 print:p-0">
        <DosSheet full={full} audience="artist" />
      </div>
    </div>
  );
}

export function isPastCutoff(showDate: string | null, doorsTime: string | null, cutoffHours: number): boolean {
  if (!showDate) return false;
  const doors = new Date(`${showDate}T${doorsTime ?? "19:00"}:00`);
  if (Number.isNaN(doors.getTime())) return false;
  return Date.now() > doors.getTime() - cutoffHours * 3600_000;
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "Date TBD";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function fmtStamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.includes("T") ? iso : iso.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

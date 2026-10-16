"use client";

import { btnGhost } from "./ui";

export function PrintButton({ children = "Print" }: { children?: React.ReactNode }) {
  return (
    <button type="button" className={`${btnGhost} no-print`} onClick={() => window.print()}>
      {children}
    </button>
  );
}

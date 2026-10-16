import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Advance",
  description: "Your half of the advance, done.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Advance", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#15171a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;600&family=Public+Sans:wght@400;600&display=swap"
        />
      </head>
      <body>
        <header className="no-print sticky top-0 z-20 border-b border-ink-2 bg-ink text-paper">
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="font-display text-lg font-semibold uppercase tracking-[0.2em] text-accent">
              Advance
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/" className="hover:text-accent">
                Advances
              </Link>
              <Link href="/venues" className="hover:text-accent">
                Venues
              </Link>
              <Link href="/advances/new" className="rounded-md bg-accent px-3 py-1.5 font-semibold text-ink hover:brightness-95">
                New advance
              </Link>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6 pb-24">{children}</main>
      </body>
    </html>
  );
}

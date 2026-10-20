import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Earmark",
  description: "Send money home that can only be spent on what you meant it for.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line bg-white">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 text-sm">
            <Link href="/" className="text-lg font-semibold text-brand">
              Earmark
            </Link>
            <Link href="/send" className="text-muted hover:text-ink">
              Send
            </Link>
            <Link href="/dashboard" className="text-muted hover:text-ink">
              Dashboard
            </Link>
            <Link href="/provider" className="text-muted hover:text-ink">
              Provider portal
            </Link>
            <span className="ml-auto rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">PayPal sandbox</span>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}

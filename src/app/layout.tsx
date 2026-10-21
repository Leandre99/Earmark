import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { NavLinks } from "@/components/NavLinks";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", axes: ["opsz"] });

export const metadata: Metadata = {
  title: "Earmark · Money sent home, spent as intended",
  description: "Send money home that can only be spent on what you meant it for.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <header className="sticky top-0 z-20 border-b border-line/80 bg-cream/85 backdrop-blur">
          <nav className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
            <Link href="/" aria-label="Earmark home">
              <Logo />
            </Link>
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <NavLinks />
              <span className="hidden items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent sm:inline-flex">
                <span className="size-1.5 rounded-full bg-accent" />
                Sandbox
              </span>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:py-10">{children}</main>
        <footer className="border-t border-line/80">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted">
            <span>Earmark · built for the PayPal AI Hackathon 2026</span>
            <span>Payments run on the PayPal sandbox. No real money moves.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}

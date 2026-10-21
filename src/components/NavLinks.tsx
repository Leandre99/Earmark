"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/send", label: "Send money" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/provider", label: "Provider portal" },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-1 overflow-x-auto">
      {LINKS.map(({ href, label }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
              active ? "bg-brand-soft text-brand" : "text-muted hover:bg-black/[0.03] hover:text-ink"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}

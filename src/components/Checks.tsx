import type { CheckDTO } from "@/lib/types";

export function Checks({ checks }: { checks: CheckDTO[] }) {
  return (
    <ul className="space-y-1 text-sm">
      {checks.map((c, i) => (
        <li key={i} className="flex gap-2">
          <span className={c.severity === "info" ? "text-muted" : c.ok ? "text-ok" : c.severity === "block" ? "text-bad" : "text-warn"}>
            {c.severity === "info" ? "ℹ" : c.ok ? "✓" : c.severity === "block" ? "✕" : "!"}
          </span>
          <span className={c.ok || c.severity === "info" ? "" : "font-medium"}>{c.message}</span>
        </li>
      ))}
    </ul>
  );
}

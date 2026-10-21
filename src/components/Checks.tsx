import type { CheckDTO } from "@/lib/types";
import { AlertIcon, CheckIcon, InfoIcon, XIcon } from "./Icons";

function style(c: CheckDTO) {
  if (c.severity === "info") return { Icon: InfoIcon, className: "bg-line/60 text-muted" };
  if (c.ok) return { Icon: CheckIcon, className: "bg-green-50 text-ok" };
  if (c.severity === "block") return { Icon: XIcon, className: "bg-red-50 text-bad" };
  return { Icon: AlertIcon, className: "bg-amber-50 text-warn" };
}

export function Checks({ checks }: { checks: CheckDTO[] }) {
  return (
    <ul className="space-y-2 text-sm">
      {checks.map((c, i) => {
        const { Icon, className } = style(c);
        return (
          <li key={i} className="flex items-start gap-2.5">
            <span className={`mt-px grid size-5 shrink-0 place-items-center rounded-full ${className}`}>
              <Icon className="size-3" />
            </span>
            <span className={c.ok || c.severity === "info" ? "text-ink/80" : "font-medium"}>{c.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

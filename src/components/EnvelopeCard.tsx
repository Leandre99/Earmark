import { formatUsd, formatXof } from "@/lib/money";
import type { EnvelopeDTO } from "@/lib/types";
import { CategoryBadge, categoryMeta } from "./categories";

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "Awaiting payment", className: "bg-accent-soft text-accent" },
  FUNDED: { label: "Active", className: "bg-brand-soft text-brand" },
  CLOSED: { label: "Closed", className: "bg-line text-muted" },
};

export function EnvelopeCard({ envelope, children }: { envelope: EnvelopeDTO; children?: React.ReactNode }) {
  const status = STATUS_STYLE[envelope.status] ?? STATUS_STYLE.DRAFT;
  const spent = envelope.allocations.reduce((s, a) => s + a.spentCents, 0);

  return (
    <div className="card animate-rise space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-muted">Envelope for {envelope.beneficiaryName}</div>
          <div className="font-display text-3xl font-semibold tracking-tight">{formatUsd(envelope.totalCents)}</div>
          <div className="text-xs text-muted">≈ {formatXof(envelope.totalCents)}</div>
        </div>
        <div className="space-y-2 text-right">
          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
            {status.label}
          </span>
          <div className="text-xs text-muted">
            Code{" "}
            <span className="rounded-md bg-cream px-1.5 py-0.5 font-mono text-sm font-semibold tracking-wider text-ink">
              {envelope.code}
            </span>
          </div>
        </div>
      </div>

      {/* Stacked bar: how the total is split across categories. */}
      <div className="flex h-2.5 overflow-hidden rounded-full bg-line/60">
        {envelope.allocations.map((a) => (
          <div
            key={a.id}
            className={categoryMeta(a.category).bar}
            style={{ width: `${(a.budgetCents / envelope.totalCents) * 100}%` }}
            title={`${categoryMeta(a.category).label}: ${formatUsd(a.budgetCents)}`}
          />
        ))}
      </div>

      <ul className="space-y-3.5">
        {envelope.allocations.map((a) => {
          const pct = a.budgetCents ? Math.min(100, (a.spentCents / a.budgetCents) * 100) : 0;
          return (
            <li key={a.id} className="flex items-center gap-3">
              <CategoryBadge category={a.category} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate font-medium">{a.label}</span>
                  <span className="shrink-0 text-muted tabular-nums">
                    {formatUsd(a.spentCents)} <span className="text-muted/60">/ {formatUsd(a.budgetCents)}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-line/60">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${categoryMeta(a.category).bar}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-line pt-4 text-xs text-muted">
        <span>
          {formatUsd(spent)} delivered of {formatUsd(envelope.totalCents)}
        </span>
        <span>
          Expires {new Date(envelope.expiresAt).toLocaleDateString()} ·{" "}
          {envelope.remainderPolicy === "REFUND" ? "unspent refunded" : "unspent released"}
        </span>
      </div>
      {children}
    </div>
  );
}

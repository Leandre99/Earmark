import { formatUsd, formatXof } from "@/lib/money";
import type { EnvelopeDTO } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  FUNDED: "bg-green-100 text-green-800",
  CLOSED: "bg-slate-200 text-slate-600",
};

export function EnvelopeCard({ envelope, children }: { envelope: EnvelopeDTO; children?: React.ReactNode }) {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-muted">For {envelope.beneficiaryName}</div>
          <div className="text-2xl font-semibold">{formatUsd(envelope.totalCents)}</div>
          <div className="text-xs text-muted">≈ {formatXof(envelope.totalCents)}</div>
        </div>
        <div className="text-right">
          <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[envelope.status] ?? ""}`}>
            {envelope.status}
          </span>
          <div className="mt-2 text-xs text-muted">
            Code <span className="font-mono font-semibold text-ink">{envelope.code}</span>
          </div>
        </div>
      </div>

      <ul className="space-y-3">
        {envelope.allocations.map((a) => {
          const pct = a.budgetCents ? Math.min(100, (a.spentCents / a.budgetCents) * 100) : 0;
          return (
            <li key={a.id}>
              <div className="flex justify-between text-sm">
                <span>
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs">{a.category}</span>
                  {a.label}
                </span>
                <span className="text-muted">
                  {formatUsd(a.spentCents)} / {formatUsd(a.budgetCents)}
                </span>
              </div>
              <div className="mt-1 h-1.5 rounded bg-slate-100">
                <div className="h-1.5 rounded bg-brand" style={{ width: `${pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <div className="text-xs text-muted">
        Unspent earmarked money at expiry ({new Date(envelope.expiresAt).toLocaleDateString()}):{" "}
        {envelope.remainderPolicy === "REFUND" ? "refunded to sender" : "released to beneficiary"}
      </div>
      {children}
    </div>
  );
}

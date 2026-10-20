import type { Allocation, Envelope, Provider } from "@prisma/client";
import type { ExtractedInvoice } from "./gemini";
import { formatUsd, toCents } from "./money";

// Deterministic checks. The AI only reads the document; it never decides on its own to move money.

export type Check = { ok: boolean; severity: "block" | "ask" | "info"; message: string };
export type Decision = "PAY" | "ASK_SENDER" | "REJECT";

const XOF_PER_USD = Number(process.env.NEXT_PUBLIC_XOF_PER_USD ?? 600);
const AUTO_APPROVE_CENTS = toCents(Number(process.env.AUTO_APPROVE_LIMIT_USD ?? 200));

export function invoiceAmountUsdCents(inv: ExtractedInvoice) {
  const cur = inv.currency.toUpperCase();
  if (cur === "XOF" || cur === "FCFA") return toCents(inv.totalAmount / XOF_PER_USD);
  return toCents(inv.totalAmount);
}

function similar(a: string, b: string) {
  const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[^a-z0-9 ]/g, "").split(/\s+/).filter((w) => w.length > 2);
  const wa = new Set(norm(a));
  return norm(b).some((w) => wa.has(w));
}

export function verifyInvoice(input: {
  envelope: Envelope & { allocations: Allocation[] };
  provider: Provider;
  extracted: ExtractedInvoice;
  isDuplicate: boolean;
}): { decision: Decision; amountCents: number; allocation?: Allocation; checks: Check[] } {
  const { envelope, provider, extracted, isDuplicate } = input;
  const amountCents = invoiceAmountUsdCents(extracted);
  const allocation = envelope.allocations.find((a) => a.category === provider.category);
  const remaining = allocation ? allocation.budgetCents - allocation.spentCents : 0;

  const checks: Check[] = [
    { ok: envelope.status === "FUNDED", severity: "block", message: `Envelope is ${envelope.status.toLowerCase()}` },
    { ok: envelope.expiresAt > new Date(), severity: "block", message: "Envelope has not expired" },
    { ok: provider.verified, severity: "block", message: `${provider.name} is a verified provider` },
    {
      ok: !!allocation,
      severity: "block",
      message: allocation ? `Budget exists for ${provider.category}` : `No budget for ${provider.category} in this envelope`,
    },
    { ok: !isDuplicate, severity: "block", message: isDuplicate ? "Duplicate invoice" : "Invoice not seen before" },
    { ok: amountCents > 0, severity: "block", message: `Invoice total ${formatUsd(amountCents)}` },
    {
      ok: amountCents <= remaining,
      severity: "ask",
      message: `Within remaining budget (${formatUsd(remaining)} left)`,
    },
    {
      ok: similar(provider.name, extracted.providerName),
      severity: "ask",
      message: `Name on invoice "${extracted.providerName}" matches the registered provider`,
    },
    { ok: extracted.confidence >= 0.7, severity: "ask", message: `AI confidence ${Math.round(extracted.confidence * 100)}%` },
    {
      ok: amountCents <= AUTO_APPROVE_CENTS,
      severity: "ask",
      message: `Under auto-approve limit (${formatUsd(AUTO_APPROVE_CENTS)})`,
    },
  ];
  if (extracted.notes) checks.push({ ok: true, severity: "info", message: `AI notes: ${extracted.notes}` });

  const failed = checks.filter((c) => !c.ok);
  const decision: Decision = failed.some((c) => c.severity === "block")
    ? "REJECT"
    : failed.some((c) => c.severity === "ask")
      ? "ASK_SENDER"
      : "PAY";

  return { decision, amountCents, allocation, checks };
}

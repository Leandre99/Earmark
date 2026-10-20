import { z } from "zod";
import { logEvent, prisma } from "./db";
import { CATEGORIES, formatUsd, shortCode, toCents } from "./money";
import { captureOrder, refundCapture, sendPayout } from "./paypal";

export const DraftInput = z.object({
  senderName: z.string().default("Sender"),
  beneficiaryName: z.string().min(1),
  beneficiaryEmail: z.string().email(),
  totalUsd: z.number().positive().max(10_000),
  remainderPolicy: z.enum(["REFUND", "RELEASE"]).default("REFUND"),
  allocations: z
    .array(z.object({ category: z.enum(CATEGORIES), label: z.string(), amountUsd: z.number().nonnegative() }))
    .min(1),
});

const ENVELOPE_DAYS = 30;

export const envelopeInclude = {
  allocations: true,
  invoices: { include: { provider: true }, orderBy: { createdAt: "desc" as const } },
  events: { orderBy: { createdAt: "desc" as const } },
};

export async function createDraft(raw: unknown) {
  const input = DraftInput.parse(raw);
  const totalCents = toCents(input.totalUsd);
  const allocations = input.allocations.map((a) => ({ ...a, budgetCents: toCents(a.amountUsd) }));
  const sum = allocations.reduce((s, a) => s + a.budgetCents, 0);
  if (sum > totalCents) throw new Error(`Allocations (${formatUsd(sum)}) exceed the total (${formatUsd(totalCents)})`);

  // Whatever is not earmarked becomes free-use money for the beneficiary.
  if (sum < totalCents) {
    const free = allocations.find((a) => a.category === "FREE");
    if (free) free.budgetCents += totalCents - sum;
    else allocations.push({ category: "FREE", label: "Free use", amountUsd: 0, budgetCents: totalCents - sum });
  }

  const envelope = await prisma.envelope.create({
    data: {
      code: shortCode(),
      senderName: input.senderName,
      beneficiaryName: input.beneficiaryName,
      beneficiaryEmail: input.beneficiaryEmail,
      totalCents,
      remainderPolicy: input.remainderPolicy,
      expiresAt: new Date(Date.now() + ENVELOPE_DAYS * 86_400_000),
      allocations: {
        create: allocations.map((a) => ({ category: a.category, label: a.label, budgetCents: a.budgetCents })),
      },
    },
    include: { allocations: true },
  });
  await logEvent(envelope.id, "CREATED", `Draft created for ${envelope.beneficiaryName} (${formatUsd(totalCents)})`);
  return envelope;
}

// Called after the sender approves the PayPal Checkout popup.
export async function fundEnvelope(envelopeId: string, orderId: string) {
  const envelope = await prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId }, include: { allocations: true } });
  if (envelope.status !== "DRAFT") return envelope;
  if (envelope.paypalOrderId !== orderId) throw new Error("Order does not belong to this envelope");

  const { status, captureId } = await captureOrder(orderId);
  if (status !== "COMPLETED" || !captureId) throw new Error(`Capture not completed (${status})`);

  await prisma.envelope.update({ where: { id: envelopeId }, data: { status: "FUNDED", paypalCaptureId: captureId } });
  await logEvent(envelopeId, "FUNDED", `PayPal payment captured (${formatUsd(envelope.totalCents)})`);

  // Free-use portion goes straight to the beneficiary, no invoice needed.
  const free = envelope.allocations.find((a) => a.category === "FREE");
  if (free && free.budgetCents > 0) {
    await payOut({
      envelopeId,
      allocationId: free.id,
      cents: free.budgetCents,
      receiverEmail: envelope.beneficiaryEmail,
      batchId: `free-${envelopeId}`,
      note: `Free-use money from ${envelope.senderName}`,
    });
    await logEvent(envelopeId, "PAYOUT", `${formatUsd(free.budgetCents)} sent to ${envelope.beneficiaryName} (free use)`);
  }
  return prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId }, include: envelopeInclude });
}

// Reserves budget atomically before calling PayPal, so two invoices can't overspend the same allocation.
export async function payOut(opts: {
  envelopeId: string;
  allocationId: string;
  cents: number;
  receiverEmail: string;
  batchId: string;
  note: string;
}) {
  const allocation = await prisma.allocation.findUniqueOrThrow({ where: { id: opts.allocationId } });
  const reserved = await prisma.allocation.updateMany({
    where: { id: opts.allocationId, spentCents: { lte: allocation.budgetCents - opts.cents } },
    data: { spentCents: { increment: opts.cents } },
  });
  if (reserved.count === 0) throw new Error("Not enough budget left in this category");

  try {
    return await sendPayout({
      batchId: opts.batchId,
      receiverEmail: opts.receiverEmail,
      cents: opts.cents,
      currency: "USD",
      note: opts.note,
    });
  } catch (e) {
    await prisma.allocation.update({ where: { id: opts.allocationId }, data: { spentCents: { decrement: opts.cents } } });
    throw e;
  }
}

// Pays an invoice that passed checks or was approved by the sender. Capped at the remaining budget.
export async function payInvoice(invoiceId: string) {
  const invoice = await prisma.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    include: { provider: true, envelope: { include: { allocations: true } } },
  });
  const allocation = invoice.envelope.allocations.find((a) => a.category === invoice.provider.category);
  if (!allocation) throw new Error("No budget for this provider's category");
  const cents = Math.min(invoice.amountCents, allocation.budgetCents - allocation.spentCents);
  if (cents <= 0) throw new Error("Budget for this category is used up");

  const batch = await payOut({
    envelopeId: invoice.envelopeId,
    allocationId: allocation.id,
    cents,
    receiverEmail: invoice.provider.paypalEmail,
    batchId: `inv-${invoice.id}`,
    note: `Payment for invoice ${invoice.invoiceNumber ?? invoice.id} (${invoice.envelope.beneficiaryName})`,
  });
  await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", payoutBatchId: batch.payout_batch_id } });
  const partial = cents < invoice.amountCents ? ` (partial: budget cap, invoice was ${formatUsd(invoice.amountCents)})` : "";
  await logEvent(invoice.envelopeId, "PAYOUT", `${formatUsd(cents)} paid to ${invoice.provider.name}${partial}`);
}

// Ends an envelope early or at expiry: unspent earmarked money is refunded or released.
export async function closeEnvelope(envelopeId: string) {
  const envelope = await prisma.envelope.findUniqueOrThrow({ where: { id: envelopeId }, include: { allocations: true } });
  if (envelope.status !== "FUNDED" || !envelope.paypalCaptureId) throw new Error("Only funded envelopes can be closed");
  const unspent = envelope.allocations.reduce((s, a) => s + (a.budgetCents - a.spentCents), 0);

  if (unspent > 0) {
    if (envelope.remainderPolicy === "REFUND") {
      await refundCapture(envelope.paypalCaptureId, unspent, envelope.currency, `refund-${envelopeId}`);
      await logEvent(envelopeId, "REFUND", `${formatUsd(unspent)} refunded to ${envelope.senderName}`);
    } else {
      await sendPayout({
        batchId: `release-${envelopeId}`,
        receiverEmail: envelope.beneficiaryEmail,
        cents: unspent,
        currency: envelope.currency,
        note: `Remaining balance from ${envelope.senderName}`,
      });
      await logEvent(envelopeId, "PAYOUT", `${formatUsd(unspent)} released to ${envelope.beneficiaryName}`);
    }
  }
  await prisma.envelope.update({ where: { id: envelopeId }, data: { status: "CLOSED" } });
  await logEvent(envelopeId, "CLOSED", "Envelope closed");
}

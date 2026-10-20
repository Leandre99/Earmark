import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { logEvent, prisma } from "@/lib/db";
import { payInvoice } from "@/lib/envelopes";
import { extractInvoice } from "@/lib/gemini";
import { fail } from "@/lib/http";
import { formatUsd } from "@/lib/money";
import { verifyInvoice } from "@/lib/verify";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Provider submits an invoice photo against an envelope code.
export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const code = String(form.get("code") ?? "").trim().toUpperCase();
    const providerId = String(form.get("providerId") ?? "");
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("Invoice file is required");
    if (!ALLOWED.includes(file.type)) throw new Error("Upload a JPG, PNG, WEBP or PDF");
    if (file.size > 6 * 1024 * 1024) throw new Error("File too large (max 6 MB)");

    const [envelope, provider] = await Promise.all([
      prisma.envelope.findUnique({ where: { code }, include: { allocations: true } }),
      prisma.provider.findUnique({ where: { id: providerId } }),
    ]);
    if (!envelope) throw new Error("Unknown envelope code");
    if (!provider) throw new Error("Unknown provider");

    const bytes = Buffer.from(await file.arrayBuffer());
    const imageHash = createHash("sha256").update(bytes).digest("hex");
    const extracted = await extractInvoice(bytes.toString("base64"), file.type);

    const duplicate = await prisma.invoice.findFirst({
      where: {
        status: { not: "REJECTED" },
        OR: [
          { imageHash },
          ...(extracted.invoiceNumber ? [{ providerId, invoiceNumber: extracted.invoiceNumber }] : []),
        ],
      },
    });

    const result = verifyInvoice({ envelope, provider, extracted, isDuplicate: !!duplicate });
    const status = result.decision === "REJECT" ? "REJECTED" : "PENDING_APPROVAL";

    const invoice = await prisma.invoice.create({
      data: {
        envelopeId: envelope.id,
        providerId,
        amountCents: result.amountCents,
        invoiceNumber: extracted.invoiceNumber,
        invoiceDate: extracted.invoiceDate,
        imageHash,
        extractedJson: JSON.stringify(extracted),
        status,
        reasons: JSON.stringify(result.checks),
      },
    });
    await logEvent(
      envelope.id,
      "INVOICE",
      `${provider.name} submitted ${formatUsd(result.amountCents)}: ${result.decision.replace("_", " ").toLowerCase()}`,
    );

    // If the payout fails, the invoice stays pending so the sender can retry by approving it.
    let payoutError: string | null = null;
    if (result.decision === "PAY") {
      await payInvoice(invoice.id).catch((e: Error) => (payoutError = e.message));
    }

    return NextResponse.json({
      decision: result.decision,
      payoutError,
      checks: result.checks,
      extracted,
      invoice: await prisma.invoice.findUnique({ where: { id: invoice.id } }),
    });
  } catch (e) {
    return fail(e);
  }
}

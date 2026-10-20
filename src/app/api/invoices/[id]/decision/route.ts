import { NextResponse } from "next/server";
import { z } from "zod";
import { logEvent, prisma } from "@/lib/db";
import { payInvoice } from "@/lib/envelopes";
import { fail, type IdParams } from "@/lib/http";

// Sender approves or rejects an invoice the agent flagged.
export async function POST(req: Request, { params }: IdParams) {
  try {
    const { id } = await params;
    const { approve } = z.object({ approve: z.boolean() }).parse(await req.json());
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id }, include: { provider: true } });
    if (invoice.status !== "PENDING_APPROVAL") throw new Error("Invoice is not waiting for approval");

    if (approve) {
      await logEvent(invoice.envelopeId, "APPROVED", `Sender approved invoice from ${invoice.provider.name}`);
      await payInvoice(id);
    } else {
      await prisma.invoice.update({ where: { id }, data: { status: "REJECTED" } });
      await logEvent(invoice.envelopeId, "REJECTED", `Sender rejected invoice from ${invoice.provider.name}`);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

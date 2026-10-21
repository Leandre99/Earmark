import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { envelopeInclude } from "@/lib/envelopes";
import { fail, type IdParams } from "@/lib/http";

export async function GET(_req: Request, { params }: IdParams) {
  try {
    const { id } = await params;
    const envelope = await prisma.envelope.findUnique({ where: { id }, include: envelopeInclude });
    if (!envelope) return fail("Envelope not found", 404);
    return NextResponse.json(envelope);
  } catch (e) {
    return fail(e, 500);
  }
}

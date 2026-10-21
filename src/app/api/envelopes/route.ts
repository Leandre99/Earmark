import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { envelopeInclude } from "@/lib/envelopes";
import { fail } from "@/lib/http";

export async function GET() {
  try {
    const envelopes = await prisma.envelope.findMany({ include: envelopeInclude, orderBy: { createdAt: "desc" } });
    return NextResponse.json(envelopes);
  } catch (e) {
    return fail(e, 500);
  }
}

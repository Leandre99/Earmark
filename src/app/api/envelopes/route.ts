import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { envelopeInclude } from "@/lib/envelopes";

export async function GET() {
  const envelopes = await prisma.envelope.findMany({ include: envelopeInclude, orderBy: { createdAt: "desc" } });
  return NextResponse.json(envelopes);
}

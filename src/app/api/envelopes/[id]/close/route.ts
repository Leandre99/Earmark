import { NextResponse } from "next/server";
import { closeEnvelope } from "@/lib/envelopes";
import { fail, type IdParams } from "@/lib/http";

export async function POST(_req: Request, { params }: IdParams) {
  try {
    const { id } = await params;
    await closeEnvelope(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}

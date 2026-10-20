import { NextResponse } from "next/server";
import { z } from "zod";
import { fundEnvelope } from "@/lib/envelopes";
import { fail, type IdParams } from "@/lib/http";

export async function POST(req: Request, { params }: IdParams) {
  try {
    const { id } = await params;
    const { orderId } = z.object({ orderId: z.string() }).parse(await req.json());
    return NextResponse.json(await fundEnvelope(id, orderId));
  } catch (e) {
    return fail(e);
  }
}

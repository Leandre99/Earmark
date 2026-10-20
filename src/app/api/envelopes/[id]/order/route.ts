import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fail, type IdParams } from "@/lib/http";
import { createOrder } from "@/lib/paypal";

// Creates the PayPal order for the PayPal Buttons' createOrder callback.
export async function POST(_req: Request, { params }: IdParams) {
  try {
    const { id } = await params;
    const envelope = await prisma.envelope.findUniqueOrThrow({ where: { id } });
    if (envelope.status !== "DRAFT") throw new Error("Envelope already paid");
    const order = await createOrder(envelope.id, envelope.totalCents, envelope.currency);
    await prisma.envelope.update({ where: { id }, data: { paypalOrderId: order.id } });
    return NextResponse.json({ id: order.id });
  } catch (e) {
    return fail(e);
  }
}

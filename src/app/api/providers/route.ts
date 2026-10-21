import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fail } from "@/lib/http";

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json(providers);
  } catch (e) {
    return fail(e, 500);
  }
}

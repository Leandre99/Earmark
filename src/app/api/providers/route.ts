import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const providers = await prisma.provider.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(providers);
}

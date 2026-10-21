import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

function describe(e: unknown) {
  // A missing or unreachable database is the most common setup mistake on a fresh deploy.
  if (e instanceof Prisma.PrismaClientInitializationError || (e instanceof Error && e.message.includes("DATABASE_URL"))) {
    return {
      status: 503,
      message: "Database not configured. Set DATABASE_URL, run `npm run db:push` and `npm run db:seed`, then redeploy.",
    };
  }
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2021") {
    return { status: 503, message: "Database tables are missing. Run `npm run db:push` and `npm run db:seed`." };
  }
  return { status: 0, message: e instanceof Error ? e.message : String(e) };
}

export function fail(e: unknown, status = 400) {
  const d = describe(e);
  console.error(e);
  return NextResponse.json({ error: d.message }, { status: d.status || status });
}

export type IdParams = { params: Promise<{ id: string }> };

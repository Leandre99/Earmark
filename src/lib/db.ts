import path from "node:path";
import { PrismaClient } from "@prisma/client";

// Resolve relative SQLite paths against prisma/ (where the CLI puts the file), so the
// app, the seed script and `prisma db push` always open the same database.
function databaseUrl() {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  if (url.startsWith("file:./")) return `file:${path.join(process.cwd(), "prisma", url.slice("file:./".length))}`;
  return url;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function logEvent(envelopeId: string, type: string, message: string) {
  await prisma.event.create({ data: { envelopeId, type, message } });
}

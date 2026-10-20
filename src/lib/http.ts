import { NextResponse } from "next/server";

export function fail(e: unknown, status = 400) {
  const message = e instanceof Error ? e.message : String(e);
  console.error(message);
  return NextResponse.json({ error: message }, { status });
}

export type IdParams = { params: Promise<{ id: string }> };

import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createDraft } from "@/lib/envelopes";
import { runAgent } from "@/lib/gemini";
import { fail } from "@/lib/http";

const Body = z.object({
  history: z.array(z.object({ role: z.enum(["user", "model"]), text: z.string() })).min(1),
});

export async function POST(req: Request) {
  try {
    const { history } = Body.parse(await req.json());
    let draftId: string | null = null;

    const reply = await runAgent(history, async (name, args) => {
      if (name === "list_providers") {
        const providers = await prisma.provider.findMany({ where: { verified: true } });
        return providers.map((p) => ({ name: p.name, category: p.category, city: p.city }));
      }
      if (name === "propose_envelope") {
        const envelope = await createDraft(args);
        draftId = envelope.id;
        return {
          envelopeId: envelope.id,
          allocations: envelope.allocations.map((a) => ({ category: a.category, label: a.label, cents: a.budgetCents })),
        };
      }
      throw new Error(`Unknown tool ${name}`);
    });

    return NextResponse.json({ reply, draftId });
  } catch (e) {
    return fail(e);
  }
}

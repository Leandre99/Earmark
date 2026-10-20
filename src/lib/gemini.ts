import { GoogleGenAI, Type, type Content, type FunctionDeclaration } from "@google/genai";
import { z } from "zod";

const MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY missing in .env");
  return new GoogleGenAI({ apiKey });
}

// ---------- Invoice extraction (vision) ----------

export const ExtractedInvoice = z.object({
  providerName: z.string(),
  invoiceNumber: z.string().nullable(),
  invoiceDate: z.string().nullable(),
  currency: z.string(),
  totalAmount: z.number(),
  lineItems: z.array(z.object({ description: z.string(), amount: z.number() })),
  confidence: z.number().min(0).max(1),
  notes: z.string(),
});
export type ExtractedInvoice = z.infer<typeof ExtractedInvoice>;

export async function extractInvoice(imageBase64: string, mimeType: string): Promise<ExtractedInvoice> {
  const res = await client().models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: imageBase64 } },
          {
            text:
              "Extract this invoice or quote. Amounts as plain numbers in the invoice's own currency " +
              "(ISO code, use XOF for FCFA). confidence is how sure you are the total is correct and " +
              "the document is a genuine invoice (0-1). Put anything suspicious (edits, missing stamp, " +
              "totals that don't add up) in notes.",
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          providerName: { type: Type.STRING },
          invoiceNumber: { type: Type.STRING, nullable: true },
          invoiceDate: { type: Type.STRING, nullable: true },
          currency: { type: Type.STRING },
          totalAmount: { type: Type.NUMBER },
          lineItems: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { description: { type: Type.STRING }, amount: { type: Type.NUMBER } },
              required: ["description", "amount"],
            },
          },
          confidence: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ["providerName", "currency", "totalAmount", "lineItems", "confidence", "notes"],
      },
    },
  });
  return ExtractedInvoice.parse(JSON.parse(res.text ?? "{}"));
}

// ---------- Sender agent (function calling) ----------

export type ChatTurn = { role: "user" | "model"; text: string };

const SYSTEM = `You are Earmark, an assistant that helps people abroad send money home that is earmarked
for specific needs and paid directly to verified providers (clinics, pharmacies, schools, grocery stores).
- Understand what the sender wants to fund and for whom. Ask short follow-up questions only when the
  beneficiary name, the beneficiary's PayPal email, or the total is missing.
- Call list_providers to see which categories have verified providers before proposing a split.
- Any amount not tied to a provider category goes to category FREE, paid straight to the beneficiary.
- Allocations must add up exactly to the total. Then call propose_envelope.
- After proposing, tell the sender to review and pay with PayPal. Never claim money has moved before that.
- Reply in the sender's language. Be brief.`;

const tools: FunctionDeclaration[] = [
  {
    name: "list_providers",
    description: "List verified providers grouped by category.",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: "propose_envelope",
    description: "Create a draft earmarked envelope the sender will review and pay.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        senderName: { type: Type.STRING },
        beneficiaryName: { type: Type.STRING },
        beneficiaryEmail: { type: Type.STRING, description: "Beneficiary PayPal email for the FREE portion" },
        totalUsd: { type: Type.NUMBER },
        remainderPolicy: {
          type: Type.STRING,
          enum: ["REFUND", "RELEASE"],
          description: "What happens to unspent earmarked money at expiry: refund sender or release to beneficiary",
        },
        allocations: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              category: { type: Type.STRING, enum: ["HEALTH", "PHARMACY", "SCHOOL", "GROCERY", "HOUSING", "FREE"] },
              label: { type: Type.STRING },
              amountUsd: { type: Type.NUMBER },
            },
            required: ["category", "label", "amountUsd"],
          },
        },
      },
      required: ["beneficiaryName", "beneficiaryEmail", "totalUsd", "allocations"],
    },
  },
];

export type ToolHandler = (name: string, args: Record<string, unknown>) => Promise<unknown>;

// Runs the model, executing tool calls until it produces a text reply (bounded to avoid loops).
export async function runAgent(history: ChatTurn[], handleTool: ToolHandler) {
  const contents: Content[] = history.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  const ai = client();

  for (let step = 0; step < 5; step++) {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM, tools: [{ functionDeclarations: tools }] },
    });
    const calls = res.functionCalls ?? [];
    if (calls.length === 0) return res.text ?? "";

    contents.push(res.candidates?.[0]?.content ?? { role: "model", parts: calls.map((c) => ({ functionCall: c })) });
    const responses = [];
    for (const call of calls) {
      let output: unknown;
      try {
        output = await handleTool(call.name ?? "", (call.args ?? {}) as Record<string, unknown>);
      } catch (e) {
        output = { error: e instanceof Error ? e.message : String(e) };
      }
      responses.push({ functionResponse: { id: call.id, name: call.name, response: { output } } });
    }
    contents.push({ role: "user", parts: responses });
  }
  return "Sorry, I couldn't finish that. Could you rephrase?";
}

"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { ArrowRightIcon, SendIcon, ShieldIcon, SparkIcon } from "@/components/Icons";
import type { EnvelopeDTO } from "@/lib/types";

type Turn = { role: "user" | "model"; text: string };

const SUGGESTIONS = [
  "Hi, I'm Ama. Send $500 to my mum Akosua (akosua@example.com): her malaria treatment at the clinic, her medicine, $150 for my brother Kofi's school fees, and the rest is for her.",
  "Je veux envoyer 300 $ à mon père Koffi (koffi@example.com) pour ses médicaments et les courses du mois, le reste pour lui.",
  "Send $200 to my sister Efua (efua@example.com) for her school fees. If anything is left, refund me.",
];

function AgentAvatar() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand text-white">
      <SparkIcon className="size-4" />
    </span>
  );
}

export default function SendPage() {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<EnvelopeDTO | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" }), [history, busy]);

  async function loadEnvelope(id: string) {
    const res = await fetch(`/api/envelopes/${id}`);
    if (res.ok) setEnvelope(await res.json());
  }

  async function send(text = input) {
    if (!text.trim() || busy) return;
    const next: Turn[] = [...history, { role: "user", text: text.trim() }];
    setHistory(next);
    setInput("");
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: next }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setHistory([...next, { role: "model", text: json.reply }]);
      if (json.draftId) await loadEnvelope(json.draftId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="eyebrow">Send money</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Tell the agent what it&apos;s for</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        <section className="card flex h-[68vh] min-h-[520px] flex-col p-0">
          <div className="flex items-center gap-3 border-b border-line px-5 py-4">
            <AgentAvatar />
            <div>
              <div className="text-sm font-semibold">Earmark agent</div>
              <div className="text-xs text-muted">Splits your transfer into budgets paid directly to providers</div>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
            {history.length === 0 && (
              <div className="mx-auto max-w-lg space-y-5 py-6 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand">
                  <SparkIcon className="size-6" />
                </span>
                <div className="space-y-1">
                  <h2 className="font-display text-xl font-semibold">Who are you sending money to?</h2>
                  <p className="text-sm text-muted">
                    Say who it&apos;s for, their PayPal email, the total and what it should cover. Any language works.
                  </p>
                </div>
                <div className="space-y-2 text-left">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="w-full rounded-xl border border-line bg-cream/60 px-4 py-3 text-left text-sm text-ink/80 transition hover:border-brand/40 hover:bg-brand-soft/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((t, i) =>
              t.role === "user" ? (
                <div key={i} className="animate-rise flex justify-end">
                  <p className="max-w-[80%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
                    {t.text}
                  </p>
                </div>
              ) : (
                <div key={i} className="animate-rise flex items-end gap-2.5">
                  <AgentAvatar />
                  <p className="max-w-[80%] rounded-2xl rounded-bl-md bg-cream px-4 py-2.5 text-sm whitespace-pre-wrap">
                    {t.text}
                  </p>
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-end gap-2.5">
                <AgentAvatar />
                <span className="typing flex gap-1 rounded-2xl rounded-bl-md bg-cream px-4 py-3.5">
                  <span className="size-1.5 rounded-full bg-muted" />
                  <span className="size-1.5 rounded-full bg-muted" />
                  <span className="size-1.5 rounded-full bg-muted" />
                </span>
              </div>
            )}
            <div ref={bottom} />
          </div>

          {error && (
            <p className="mx-5 mb-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>
          )}
          <form
            className="flex items-end gap-2 border-t border-line p-3"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <textarea
              className="input h-12 max-h-32 min-h-12 resize-none"
              placeholder="e.g. $300 for my dad's medicine and groceries, the rest for him"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button className="btn size-12 shrink-0 p-0" disabled={busy || !input.trim()} aria-label="Send">
              <SendIcon />
            </button>
          </form>
        </section>

        <aside className="space-y-4">
          {!envelope && (
            <div className="card flex flex-col items-center gap-3 border-dashed py-10 text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-cream text-muted">
                <ShieldIcon className="size-6" />
              </span>
              <div className="space-y-1">
                <div className="font-medium">Your envelope will appear here</div>
                <p className="mx-auto max-w-xs text-sm text-muted">
                  Review the split before paying. Nothing moves until you approve it with PayPal.
                </p>
              </div>
            </div>
          )}
          {envelope && (
            <EnvelopeCard envelope={envelope}>
              {envelope.status === "DRAFT" && (
                <div className="space-y-2">
                  <PayPalScriptProvider
                    options={{
                      clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "",
                      currency: "USD",
                      intent: "capture",
                    }}
                  >
                    <PayPalButtons
                      style={{ layout: "vertical", label: "pay", shape: "rect", borderRadius: 12 }}
                      createOrder={async () => {
                        const res = await fetch(`/api/envelopes/${envelope.id}/order`, { method: "POST" });
                        const json = await res.json();
                        if (!res.ok) throw new Error(json.error);
                        return json.id;
                      }}
                      onApprove={async (data) => {
                        const res = await fetch(`/api/envelopes/${envelope.id}/capture`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ orderId: data.orderID }),
                        });
                        const json = await res.json();
                        if (!res.ok) return setError(json.error);
                        setEnvelope(json);
                      }}
                      onError={(err) => setError(String(err))}
                    />
                  </PayPalScriptProvider>
                  <p className="text-center text-xs text-muted">
                    Free-use money is sent right away. The rest waits for verified invoices.
                  </p>
                </div>
              )}
              {envelope.status === "FUNDED" && (
                <div className="space-y-3 rounded-xl bg-brand-soft p-4 text-sm text-brand">
                  <p>
                    Funded. Share code <b className="font-mono tracking-wider">{envelope.code}</b> with the clinic,
                    pharmacy and school so they can bill this envelope.
                  </p>
                  <Link href="/dashboard" className="inline-flex items-center gap-1.5 font-semibold">
                    Track spending <ArrowRightIcon className="size-4" />
                  </Link>
                </div>
              )}
            </EnvelopeCard>
          )}
        </aside>
      </div>
    </div>
  );
}

"use client";

import { PayPalButtons, PayPalScriptProvider } from "@paypal/react-paypal-js";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import type { EnvelopeDTO } from "@/lib/types";

type Turn = { role: "user" | "model"; text: string };

const EXAMPLE =
  "Hi, I'm Ama. I want to send $500 to my mum Akosua (akosua@example.com): her malaria treatment at the clinic, her medicine, $150 for my brother Kofi's school fees, and the rest is for her.";

export default function SendPage() {
  const [history, setHistory] = useState<Turn[]>([]);
  const [input, setInput] = useState(EXAMPLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [envelope, setEnvelope] = useState<EnvelopeDTO | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [history]);

  async function loadEnvelope(id: string) {
    const res = await fetch(`/api/envelopes/${id}`);
    if (res.ok) setEnvelope(await res.json());
  }

  async function send() {
    if (!input.trim() || busy) return;
    const next: Turn[] = [...history, { role: "user", text: input.trim() }];
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
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="card flex h-[70vh] flex-col">
        <h2 className="mb-3 font-semibold">Earmark agent</h2>
        <div className="flex-1 space-y-3 overflow-y-auto pr-1">
          {history.length === 0 && (
            <p className="text-sm text-muted">
              Describe who you're sending money to and what it's for. The agent will propose an earmarked split.
            </p>
          )}
          {history.map((t, i) => (
            <div
              key={i}
              className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${
                t.role === "user" ? "ml-auto bg-brand text-white" : "bg-slate-100"
              }`}
            >
              {t.text}
            </div>
          ))}
          {busy && <div className="text-sm text-muted">Agent is thinking…</div>}
          <div ref={bottom} />
        </div>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        <div className="mt-3 flex gap-2">
          <textarea
            className="input h-20 resize-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
          />
          <button className="btn self-end" onClick={send} disabled={busy}>
            Send
          </button>
        </div>
      </section>

      <aside className="space-y-4">
        {!envelope && <div className="card text-sm text-muted">The proposed envelope will appear here.</div>}
        {envelope && (
          <EnvelopeCard envelope={envelope}>
            {envelope.status === "DRAFT" && (
              <PayPalScriptProvider
                options={{ clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID ?? "", currency: "USD", intent: "capture" }}
              >
                <PayPalButtons
                  style={{ layout: "vertical", label: "pay" }}
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
            )}
            {envelope.status === "FUNDED" && (
              <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
                Funded. Share code <b className="font-mono">{envelope.code}</b> with the clinic, pharmacy and school.{" "}
                <Link href="/dashboard" className="underline">
                  Track spending →
                </Link>
              </div>
            )}
          </EnvelopeCard>
        )}
      </aside>
    </div>
  );
}

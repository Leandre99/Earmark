"use client";

import { useEffect, useState } from "react";
import { Checks } from "@/components/Checks";
import { formatUsd } from "@/lib/money";
import type { CheckDTO, ProviderDTO } from "@/lib/types";

type Result = {
  decision: "PAY" | "ASK_SENDER" | "REJECT";
  payoutError: string | null;
  checks: CheckDTO[];
  extracted: { providerName: string; currency: string; totalAmount: number; lineItems: { description: string; amount: number }[] };
  invoice: { amountCents: number; status: string };
};

const DECISION_TEXT = {
  PAY: ["Paid", "bg-green-50 text-green-800"],
  ASK_SENDER: ["Waiting for the sender's approval", "bg-amber-50 text-amber-800"],
  REJECT: ["Rejected", "bg-red-50 text-red-800"],
} as const;

export default function ProviderPage() {
  const [providers, setProviders] = useState<ProviderDTO[]>([]);
  const [providerId, setProviderId] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((list: ProviderDTO[]) => {
        setProviders(list);
        if (list[0]) setProviderId(list[0].id);
      });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    const form = new FormData();
    form.set("code", code);
    form.set("providerId", providerId);
    form.set("file", file);
    try {
      const res = await fetch("/api/invoices", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setResult(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="card space-y-4">
        <h2 className="font-semibold">Submit an invoice</h2>
        <label className="block space-y-1 text-sm">
          <span>Provider (demo: pick who you are)</span>
          <select className="input" value={providerId} onChange={(e) => setProviderId(e.target.value)}>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.category}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 text-sm">
          <span>Envelope code given by the family</span>
          <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} required />
        </label>
        <label className="block space-y-1 text-sm">
          <span>Invoice or quote (photo or PDF)</span>
          <input
            className="input"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </label>
        <button className="btn w-full" disabled={busy || !file}>
          {busy ? "Reading and verifying…" : "Submit invoice"}
        </button>
        {error && <p className="text-sm text-bad">{error}</p>}
      </form>

      {result && (
        <div className="card space-y-4">
          <div className={`rounded-lg p-3 text-sm font-medium ${DECISION_TEXT[result.decision][1]}`}>
            {DECISION_TEXT[result.decision][0]} · {formatUsd(result.invoice?.amountCents ?? 0)}
            {result.payoutError && <div className="mt-1 font-normal text-bad">Payout failed: {result.payoutError}</div>}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">What the AI read</h3>
            <div className="text-sm">
              {result.extracted.providerName} · {result.extracted.totalAmount.toLocaleString()} {result.extracted.currency}
            </div>
            <ul className="mt-1 text-sm text-muted">
              {result.extracted.lineItems.map((l, i) => (
                <li key={i}>
                  {l.description}: {l.amount.toLocaleString()}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Checks</h3>
            <Checks checks={result.checks} />
          </div>
        </div>
      )}
    </div>
  );
}

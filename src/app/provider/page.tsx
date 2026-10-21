"use client";

import { useEffect, useState } from "react";
import { CategoryBadge, categoryMeta } from "@/components/categories";
import { Checks } from "@/components/Checks";
import { AlertIcon, CheckIcon, ReceiptIcon, UploadIcon, XIcon } from "@/components/Icons";
import { formatUsd } from "@/lib/money";
import type { CheckDTO, ProviderDTO } from "@/lib/types";

type Result = {
  decision: "PAY" | "ASK_SENDER" | "REJECT";
  payoutError: string | null;
  checks: CheckDTO[];
  extracted: {
    providerName: string;
    currency: string;
    totalAmount: number;
    invoiceNumber: string | null;
    lineItems: { description: string; amount: number }[];
  };
  invoice: { amountCents: number; status: string };
};

const DECISION = {
  PAY: { title: "Paid", text: "The money was sent to your PayPal account.", Icon: CheckIcon, className: "bg-green-50 text-ok" },
  ASK_SENDER: {
    title: "Waiting for the sender",
    text: "Some checks need the sender's approval. You'll be paid once they confirm.",
    Icon: AlertIcon,
    className: "bg-amber-50 text-warn",
  },
  REJECT: { title: "Rejected", text: "This invoice can't be paid from this envelope.", Icon: XIcon, className: "bg-red-50 text-bad" },
} as const;

export default function ProviderPage() {
  const [providers, setProviders] = useState<ProviderDTO[]>([]);
  const [providerId, setProviderId] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    fetch("/api/providers")
      .then((r) => r.json())
      .then((list: ProviderDTO[]) => {
        setProviders(list);
        if (list[0]) setProviderId(list[0].id);
      })
      .catch(() => setError("Couldn't load providers"));
  }, []);

  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const provider = providers.find((p) => p.id === providerId);

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
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="eyebrow">Provider portal</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Bill a family&apos;s envelope</h1>
        <p className="text-muted">Upload your invoice. You&apos;re paid directly to your PayPal account once it&apos;s verified.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <form onSubmit={submit} className="card space-y-5">
          <div className="space-y-2">
            <span className="text-sm font-medium">You are</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {providers.map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setProviderId(p.id)}
                  className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${
                    p.id === providerId ? "border-brand bg-brand-soft/50 ring-4 ring-brand/10" : "border-line hover:border-brand/40"
                  }`}
                >
                  <CategoryBadge category={p.category} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block text-xs text-muted">
                      {categoryMeta(p.category).label} · {p.city}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-medium">Envelope code</span>
            <input
              className="input font-mono text-base tracking-[0.3em] uppercase"
              placeholder="ABC123"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
            />
            <span className="block text-xs text-muted">The 6-character code the family shared with you.</span>
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium">Invoice or quote</span>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                setFile(e.dataTransfer.files?.[0] ?? null);
              }}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                dragging ? "border-brand bg-brand-soft/50" : "border-line hover:border-brand/40 hover:bg-cream/60"
              }`}
            >
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Invoice preview" className="max-h-48 rounded-lg shadow-sm" />
              ) : (
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand">
                  <UploadIcon />
                </span>
              )}
              <span className="text-sm font-medium">{file ? file.name : "Drop a photo or PDF, or click to browse"}</span>
              <span className="text-xs text-muted">JPG, PNG, WEBP or PDF, up to 6 MB</span>
              <input
                type="file"
                className="sr-only"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <button className="btn w-full py-3" disabled={busy || !file || code.length < 6}>
            {busy ? "Reading and verifying…" : `Submit invoice${provider ? ` as ${provider.name}` : ""}`}
          </button>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}
        </form>

        <div className="space-y-4">
          {!result && !busy && (
            <div className="card flex h-full min-h-72 flex-col items-center justify-center gap-3 border-dashed text-center">
              <span className="grid size-12 place-items-center rounded-2xl bg-cream text-muted">
                <ReceiptIcon className="size-6" />
              </span>
              <div className="font-medium">The verification result will appear here</div>
              <p className="max-w-xs text-sm text-muted">
                AI reads your invoice, then the rules check it against the family&apos;s budget.
              </p>
            </div>
          )}

          {busy && (
            <div className="card space-y-4">
              <div className="h-5 w-40 animate-pulse rounded bg-line/70" />
              <div className="h-16 animate-pulse rounded-xl bg-line/50" />
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="h-4 animate-pulse rounded bg-line/50" style={{ width: `${80 - i * 12}%` }} />
                ))}
              </div>
            </div>
          )}

          {result && (
            <>
              {(() => {
                const d = DECISION[result.decision];
                return (
                  <div className={`card animate-rise flex items-center gap-4 ${d.className} border-transparent`}>
                    <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white/70">
                      <d.Icon className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-xl font-semibold">{d.title}</div>
                      <div className="text-sm opacity-80">{d.text}</div>
                      {result.payoutError && <div className="mt-1 text-sm text-bad">Payout failed: {result.payoutError}</div>}
                    </div>
                    <div className="font-display text-2xl font-semibold tabular-nums">
                      {formatUsd(result.invoice?.amountCents ?? 0)}
                    </div>
                  </div>
                );
              })()}

              <div className="card animate-rise space-y-3">
                <h3 className="text-sm font-semibold">What the AI read</h3>
                <div className="rounded-xl bg-cream/70 p-4">
                  <div className="flex justify-between text-sm font-medium">
                    <span>{result.extracted.providerName}</span>
                    <span>{result.extracted.invoiceNumber ?? "No number"}</span>
                  </div>
                  <ul className="mt-3 divide-y divide-line text-sm">
                    {result.extracted.lineItems.map((l, i) => (
                      <li key={i} className="flex justify-between py-1.5">
                        <span className="text-ink/80">{l.description}</span>
                        <span className="tabular-nums">{l.amount.toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 flex justify-between border-t border-ink/10 pt-2 text-sm font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">
                      {result.extracted.totalAmount.toLocaleString()} {result.extracted.currency}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card animate-rise space-y-3">
                <h3 className="text-sm font-semibold">Checks</h3>
                <Checks checks={result.checks} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

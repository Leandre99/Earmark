"use client";

import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type ICellRendererParams,
} from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CategoryBadge, categoryMeta } from "@/components/categories";
import { Checks } from "@/components/Checks";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { AlertIcon, ArrowRightIcon, ReceiptIcon, ShieldIcon, WalletIcon, GlobeIcon } from "@/components/Icons";
import { formatUsd } from "@/lib/money";
import type { CheckDTO, EnvelopeDTO, InvoiceDTO } from "@/lib/types";

ModuleRegistry.registerModules([AllCommunityModule]);

const gridTheme = themeQuartz.withParams({
  accentColor: "#0f5c4a",
  fontFamily: "inherit",
  headerBackgroundColor: "#faf7f0",
  headerFontWeight: 600,
  borderColor: "#e7e3d9",
  rowHoverColor: "#e4f1ec66",
  wrapperBorderRadius: 12,
  browserColorScheme: "light",
});

const STATUS_PILL: Record<string, string> = {
  PAID: "bg-green-50 text-ok",
  PENDING_APPROVAL: "bg-amber-50 text-warn",
  REJECTED: "bg-red-50 text-bad",
};

const EVENT_DOT: Record<string, string> = {
  PAYOUT: "bg-brand",
  FUNDED: "bg-brand",
  REFUND: "bg-accent",
  REJECTED: "bg-bad",
  INVOICE: "bg-amber-500",
};

function Stat({ label, value, hint, Icon }: { label: string; value: string; hint: string; Icon: typeof WalletIcon }) {
  return (
    <div className="card space-y-3">
      <div className="flex items-center justify-between text-sm text-muted">
        {label}
        <span className="grid size-8 place-items-center rounded-lg bg-brand-soft text-brand">
          <Icon className="size-4" />
        </span>
      </div>
      <div className="font-display text-3xl font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="text-xs text-muted">{hint}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [envelopes, setEnvelopes] = useState<EnvelopeDTO[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/envelopes");
      const json = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(json)) throw new Error(json?.error ?? "Couldn't load envelopes");
      const list = json as EnvelopeDTO[];
      setEnvelopes(list);
      setSelectedId((id) => id ?? list[0]?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setEnvelopes((prev) => prev ?? []);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const selected = envelopes?.find((e) => e.id === selectedId) ?? null;
  const pending = selected?.invoices?.filter((i) => i.status === "PENDING_APPROVAL") ?? [];

  const stats = useMemo(() => {
    const funded = (envelopes ?? []).filter((e) => e.status !== "DRAFT");
    const all = funded.flatMap((e) => e.allocations);
    const sum = (xs: { spentCents: number }[]) => xs.reduce((s, a) => s + a.spentCents, 0);
    return {
      sent: funded.reduce((s, e) => s + e.totalCents, 0),
      providers: sum(all.filter((a) => a.category !== "FREE")),
      free: sum(all.filter((a) => a.category === "FREE")),
      pending: funded.flatMap((e) => e.invoices ?? []).filter((i) => i.status === "PENDING_APPROVAL").length,
    };
  }, [envelopes]);

  async function act(url: string, body?: unknown) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  // Every invoice across every envelope, for the sender's spending overview.
  const rows = useMemo(
    () =>
      (envelopes ?? []).flatMap((e) =>
        (e.invoices ?? []).map((i) => ({ ...i, beneficiary: e.beneficiaryName, envelopeCode: e.code })),
      ),
    [envelopes],
  );

  const columns = useMemo<ColDef<(typeof rows)[number]>[]>(
    () => [
      { field: "createdAt", headerName: "Date", width: 170, sort: "desc", valueFormatter: (p) => new Date(p.value).toLocaleString() },
      {
        field: "provider.name",
        headerName: "Provider",
        flex: 1,
        minWidth: 220,
        cellRenderer: (p: ICellRendererParams) => (
          <span className="flex h-full items-center gap-2.5">
            <CategoryBadge category={p.data.provider.category} size="sm" />
            {p.value}
          </span>
        ),
      },
      {
        field: "provider.category",
        headerName: "Category",
        width: 140,
        filter: true,
        valueFormatter: (p) => categoryMeta(p.value).label,
      },
      { field: "beneficiary", headerName: "For", width: 130 },
      { field: "envelopeCode", headerName: "Envelope", width: 115, cellClass: "font-mono" },
      { field: "invoiceNumber", headerName: "Invoice #", width: 130 },
      { field: "amountCents", headerName: "Amount", width: 120, type: "rightAligned", valueFormatter: (p) => formatUsd(p.value) },
      {
        field: "status",
        width: 150,
        filter: true,
        cellRenderer: (p: ICellRendererParams) => (
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_PILL[p.value] ?? ""}`}>
            {String(p.value).replace("_", " ").toLowerCase()}
          </span>
        ),
      },
    ],
    [],
  );

  if (envelopes === null) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="card h-32 animate-pulse" />
        ))}
      </div>
    );
  }

  if (envelopes.length === 0) {
    return (
      <div className="card mx-auto flex max-w-lg flex-col items-center gap-4 py-14 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand-soft text-brand">
          <WalletIcon className="size-7" />
        </span>
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-semibold">No envelopes yet</h1>
          <p className="text-sm text-muted">Send your first earmarked transfer and track every payment here.</p>
        </div>
        {error && <p className="text-sm text-bad">{error}</p>}
        <Link href="/send" className="btn">
          Send money <ArrowRightIcon className="size-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <p className="eyebrow">Dashboard</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Where your money went</h1>
        </div>
        <Link href="/send" className="btn">
          New envelope <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-bad">{error}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total sent" value={formatUsd(stats.sent)} hint="Across funded envelopes" Icon={GlobeIcon} />
        <Stat label="Paid to providers" value={formatUsd(stats.providers)} hint="Clinics, pharmacies, schools" Icon={ShieldIcon} />
        <Stat label="Free-use money" value={formatUsd(stats.free)} hint="Sent straight to family" Icon={WalletIcon} />
        <Stat label="Awaiting your OK" value={String(stats.pending)} hint="Invoices flagged by the agent" Icon={AlertIcon} />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {envelopes.map((e) => (
          <button
            key={e.id}
            onClick={() => setSelectedId(e.id)}
            className={`shrink-0 rounded-xl border px-4 py-2 text-left text-sm transition ${
              e.id === selectedId ? "border-brand bg-brand-soft/60" : "border-line bg-paper hover:border-brand/40"
            }`}
          >
            <span className="block font-medium">{e.beneficiaryName}</span>
            <span className="block text-xs text-muted">
              <span className="font-mono">{e.code}</span> · {formatUsd(e.totalCents)}
            </span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
          <EnvelopeCard envelope={selected}>
            {selected.status === "FUNDED" && (
              <button className="btn-ghost w-full" disabled={busy} onClick={() => act(`/api/envelopes/${selected.id}/close`)}>
                Close now · {selected.remainderPolicy === "REFUND" ? "refund" : "release"} unspent money
              </button>
            )}
          </EnvelopeCard>

          <div className="space-y-4">
            {pending.map((inv: InvoiceDTO) => (
              <div key={inv.id} className="card animate-rise space-y-4 border-amber-200 bg-amber-50/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CategoryBadge category={inv.provider.category} />
                    <div>
                      <div className="text-xs font-semibold tracking-wide text-warn uppercase">Needs your approval</div>
                      <div className="font-medium">
                        {inv.provider.name} · <span className="tabular-nums">{formatUsd(inv.amountCents)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost" disabled={busy} onClick={() => act(`/api/invoices/${inv.id}/decision`, { approve: false })}>
                      Reject
                    </button>
                    <button className="btn" disabled={busy} onClick={() => act(`/api/invoices/${inv.id}/decision`, { approve: true })}>
                      Approve &amp; pay
                    </button>
                  </div>
                </div>
                <Checks checks={JSON.parse(inv.reasons) as CheckDTO[]} />
              </div>
            ))}

            <div className="card">
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <ReceiptIcon className="size-4 text-muted" /> Activity
              </h2>
              {selected.events?.length ? (
                <ol className="relative max-h-80 space-y-4 overflow-y-auto border-l border-line pl-5">
                  {selected.events.map((ev) => (
                    <li key={ev.id} className="relative">
                      <span
                        className={`absolute top-1.5 -left-[25px] size-2.5 rounded-full ring-4 ring-paper ${EVENT_DOT[ev.type] ?? "bg-muted"}`}
                      />
                      <div className="text-sm">{ev.message}</div>
                      <div className="text-xs text-muted">{new Date(ev.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted">Nothing yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">All invoices</h2>
          <span className="text-xs text-muted">Sort, filter and resize columns</span>
        </div>
        <div style={{ height: 380 }}>
          <AgGridReact
            theme={gridTheme}
            rowData={rows}
            columnDefs={columns}
            rowHeight={52}
            defaultColDef={{ sortable: true, resizable: true }}
            overlayNoRowsTemplate="No invoices yet. Providers bill envelopes from the provider portal."
          />
        </div>
      </div>
    </div>
  );
}

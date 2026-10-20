"use client";

import { AllCommunityModule, ModuleRegistry, type ColDef, type ICellRendererParams } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Checks } from "@/components/Checks";
import { EnvelopeCard } from "@/components/EnvelopeCard";
import { formatUsd } from "@/lib/money";
import type { CheckDTO, EnvelopeDTO, InvoiceDTO } from "@/lib/types";

ModuleRegistry.registerModules([AllCommunityModule]);

const STATUS_COLOR: Record<string, string> = {
  PAID: "text-ok",
  PENDING_APPROVAL: "text-warn",
  REJECTED: "text-bad",
};

export default function DashboardPage() {
  const [envelopes, setEnvelopes] = useState<EnvelopeDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const list: EnvelopeDTO[] = await fetch("/api/envelopes").then((r) => r.json());
    setEnvelopes(list);
    setSelectedId((id) => id ?? list[0]?.id ?? null);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const selected = envelopes.find((e) => e.id === selectedId) ?? null;
  const pending = selected?.invoices?.filter((i) => i.status === "PENDING_APPROVAL") ?? [];

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
      envelopes.flatMap((e) =>
        (e.invoices ?? []).map((i) => ({ ...i, beneficiary: e.beneficiaryName, envelopeCode: e.code })),
      ),
    [envelopes],
  );

  const columns = useMemo<ColDef<(typeof rows)[number]>[]>(
    () => [
      { field: "createdAt", headerName: "Date", valueFormatter: (p) => new Date(p.value).toLocaleString(), sort: "desc" },
      { field: "envelopeCode", headerName: "Envelope", width: 110 },
      { field: "beneficiary", headerName: "For" },
      { field: "provider.name", headerName: "Provider", flex: 1 },
      { field: "provider.category", headerName: "Category", width: 120, filter: true },
      { field: "invoiceNumber", headerName: "Invoice #" },
      { field: "amountCents", headerName: "Amount", width: 120, valueFormatter: (p) => formatUsd(p.value) },
      {
        field: "status",
        width: 160,
        filter: true,
        cellRenderer: (p: ICellRendererParams) => (
          <span className={`font-medium ${STATUS_COLOR[p.value] ?? ""}`}>{String(p.value).replace("_", " ")}</span>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <select className="input w-auto" value={selectedId ?? ""} onChange={(e) => setSelectedId(e.target.value)}>
          {envelopes.map((e) => (
            <option key={e.id} value={e.id}>
              {e.code} · {e.beneficiaryName} · {formatUsd(e.totalCents)} · {e.status}
            </option>
          ))}
        </select>
        {error && <span className="text-sm text-bad">{error}</span>}
      </div>

      {selected && (
        <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
          <EnvelopeCard envelope={selected}>
            {selected.status === "FUNDED" && (
              <button className="btn-ghost w-full" disabled={busy} onClick={() => act(`/api/envelopes/${selected.id}/close`)}>
                Close envelope now ({selected.remainderPolicy === "REFUND" ? "refund" : "release"} unspent)
              </button>
            )}
          </EnvelopeCard>

          <div className="space-y-4">
            {pending.map((inv: InvoiceDTO) => (
              <div key={inv.id} className="card space-y-3 border-amber-300">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-warn">Needs your approval</div>
                    <div className="font-medium">
                      {inv.provider.name} · {formatUsd(inv.amountCents)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn-ghost" disabled={busy} onClick={() => act(`/api/invoices/${inv.id}/decision`, { approve: false })}>
                      Reject
                    </button>
                    <button className="btn" disabled={busy} onClick={() => act(`/api/invoices/${inv.id}/decision`, { approve: true })}>
                      Approve & pay
                    </button>
                  </div>
                </div>
                <Checks checks={JSON.parse(inv.reasons) as CheckDTO[]} />
              </div>
            ))}

            <div className="card">
              <h2 className="mb-3 font-semibold">Activity</h2>
              <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
                {selected.events?.map((ev) => (
                  <li key={ev.id} className="flex gap-3">
                    <span className="w-36 shrink-0 text-muted">{new Date(ev.createdAt).toLocaleString()}</span>
                    <span>{ev.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="mb-3 font-semibold">All invoices</h2>
        <div style={{ height: 360 }}>
          <AgGridReact rowData={rows} columnDefs={columns} defaultColDef={{ sortable: true, resizable: true }} />
        </div>
      </div>
    </div>
  );
}

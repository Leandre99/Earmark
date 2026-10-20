// Client-side shapes of the API responses (dates arrive as strings).

export type AllocationDTO = {
  id: string;
  category: string;
  label: string;
  budgetCents: number;
  spentCents: number;
};

export type ProviderDTO = { id: string; name: string; category: string; city: string; paypalEmail: string };

export type InvoiceDTO = {
  id: string;
  amountCents: number;
  invoiceNumber: string | null;
  invoiceDate: string | null;
  status: string;
  reasons: string;
  createdAt: string;
  provider: ProviderDTO;
};

export type EventDTO = { id: string; type: string; message: string; createdAt: string };

export type EnvelopeDTO = {
  id: string;
  code: string;
  senderName: string;
  beneficiaryName: string;
  beneficiaryEmail: string;
  totalCents: number;
  status: string;
  remainderPolicy: string;
  expiresAt: string;
  allocations: AllocationDTO[];
  invoices?: InvoiceDTO[];
  events?: EventDTO[];
};

export type CheckDTO = { ok: boolean; severity: "block" | "ask" | "info"; message: string };

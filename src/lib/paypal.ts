import { toPayPalValue } from "./money";

// Thin server-side client for the PayPal REST API (sandbox).
// The app's own business account is the platform: buyers pay it, and it pays providers via Payouts.

const BASE = process.env.PAYPAL_API_BASE ?? "https://api-m.sandbox.paypal.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function accessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value;
  const { PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET } = process.env;
  if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) throw new Error("PayPal credentials missing in .env");

  const res = await fetch(`${BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cachedToken.value;
}

async function call<T>(path: string, init: { method: string; body?: unknown; idempotencyKey?: string }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: init.method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "PayPal-Request-Id": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PayPal ${init.method} ${path} failed: ${res.status} ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

export async function createOrder(envelopeId: string, totalCents: number, currency: string) {
  return call<{ id: string }>("/v2/checkout/orders", {
    method: "POST",
    idempotencyKey: `order-${envelopeId}`,
    body: {
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: envelopeId,
          description: "Earmark envelope",
          amount: { currency_code: currency, value: toPayPalValue(totalCents) },
        },
      ],
    },
  });
}

export async function captureOrder(orderId: string) {
  const order = await call<{
    status: string;
    purchase_units: { payments: { captures: { id: string; status: string }[] } }[];
  }>(`/v2/checkout/orders/${orderId}/capture`, { method: "POST", idempotencyKey: `capture-${orderId}` });
  const capture = order.purchase_units[0]?.payments.captures[0];
  return { status: order.status, captureId: capture?.id };
}

// One payout to one receiver. sender_batch_id doubles as an idempotency key.
export async function sendPayout(opts: {
  batchId: string;
  receiverEmail: string;
  cents: number;
  currency: string;
  note: string;
}) {
  const res = await call<{ batch_header: { payout_batch_id: string; batch_status: string } }>(
    "/v1/payments/payouts",
    {
      method: "POST",
      body: {
        sender_batch_header: {
          sender_batch_id: opts.batchId,
          email_subject: "You received an Earmark payment",
          email_message: opts.note,
        },
        items: [
          {
            recipient_type: "EMAIL",
            receiver: opts.receiverEmail,
            amount: { value: toPayPalValue(opts.cents), currency: opts.currency },
            note: opts.note,
            sender_item_id: opts.batchId,
          },
        ],
      },
    },
  );
  return res.batch_header;
}

export async function refundCapture(captureId: string, cents: number, currency: string, key: string) {
  return call<{ id: string; status: string }>(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    idempotencyKey: key,
    body: { amount: { value: toPayPalValue(cents), currency_code: currency } },
  });
}

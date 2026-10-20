# Earmark

**Money sent home, spent as intended.**

Families abroad send money home for a specific need (a hospital bill, medicine, school fees), but once it
arrives as cash, there is no guarantee it is used for that. Earmark is an AI agent that turns one PayPal
payment into earmarked budgets and pays **verified providers directly**, only against **verified invoices**.
Whatever is not earmarked stays free for the family to use.

Built for the PayPal AI Hackathon (2026).

## How it works

1. **Sender ↔ agent (Gemini, function calling).** "Send $500 to Mum: the clinic, her medicine, Kofi's school
   fees, the rest for her." The agent checks which provider categories exist and proposes an envelope.
2. **One PayPal payment** (Orders v2 via PayPal JS SDK). The platform holds the funds.
3. **Free-use portion** is paid immediately to the beneficiary (Payouts).
4. **Providers upload invoices** against the envelope code. Gemini vision extracts provider, amount, items and
   flags anything suspicious.
5. **Deterministic rules decide**, not the model: registered provider, matching category, remaining budget,
   duplicate detection, AI confidence, auto-approve limit. Outcome: pay, ask the sender, or reject.
6. **Payouts to the provider's own PayPal account**, never to the family. That, not the AI, is what prevents
   diversion.
7. **Unspent money** at expiry is refunded to the sender (Refunds API) or released to the beneficiary.
8. **Dashboard** (AG Grid) with every invoice, status and the audit trail.

## PayPal APIs used

| API | Where |
| --- | --- |
| Orders v2 (create, capture) + JS SDK Buttons | `src/lib/paypal.ts`, `src/app/send/page.tsx` |
| Payouts | `src/lib/paypal.ts` → `src/lib/envelopes.ts` |
| Refunds (captures) | `closeEnvelope` in `src/lib/envelopes.ts` |

## AI used

- **Google Gemini** (`@google/genai`, default `gemini-2.5-flash`)
  - Agent with function calling: `src/lib/gemini.ts` → `runAgent`
  - Invoice extraction with vision + JSON schema: `extractInvoice`

## Run locally

Requirements: Node 20+, a Postgres database (a free [Neon](https://neon.tech) database works), a PayPal
developer account, a Gemini API key.

```bash
npm install
cp .env.example .env      # fill in the values
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000.

### Deploy on Vercel

1. Import the GitHub repo in Vercel.
2. In Project Settings → Environment Variables, add every variable from `.env.example`.
3. Run `npm run db:push` and `npm run db:seed` once from your machine against the same `DATABASE_URL`.

### PayPal sandbox setup

1. developer.paypal.com → Apps & Credentials → Sandbox → create an app. Copy the client ID and secret to
   `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
2. Sandbox → Accounts: create one **personal** account (the sender, to pay at checkout) and a few
   **business** accounts (clinic, pharmacy, school). Put the business emails in `prisma/seed.ts` and re-run
   `npm run db:seed`.
3. Payouts must be enabled on the app's sandbox business account (it usually is in sandbox).

### Demo script

1. `/send`: send the pre-filled message, review the envelope, pay with the sandbox personal account.
2. `/provider`: pick "Clinique Saint-Luc", enter the envelope code, upload an invoice photo → paid.
3. Upload a pharmacy invoice above the remaining budget → goes to the sender for approval.
4. `/dashboard`: approve or reject, see the AG Grid table and the activity log, close the envelope.

## Limitations and next steps

- Holding funds before disbursing is an escrow-like role. In production it needs a licensed partner or
  PayPal's platform/marketplace offering (delayed disbursement) and provider KYC.
- Receiving PayPal is limited in several West African countries. Next step: a Mobile Money bridge for
  providers (MTN MoMo, Moov, Wave).
- XOF amounts are converted at a fixed display rate.

## License

MIT

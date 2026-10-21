# Earmark

**Money sent home, spent as intended.**

Families abroad send money home for a specific need: a hospital bill, medicine, school fees. Once it arrives as
cash, there is no guarantee it is used for that. **Earmark** is an AI agent that turns one PayPal payment into
earmarked budgets and pays **verified providers directly**, only against **verified invoices**. Whatever is not
earmarked stays free for the family to use.

Built for the **PayPal AI Hackathon 2026**.

- Live demo: _add your Vercel URL here_
- Demo video: _add your YouTube link here_

---

## Table of contents

1. [The problem](#the-problem)
2. [How it works](#how-it-works)
3. [Architecture](#architecture)
4. [PayPal integration](#paypal-integration)
5. [AI integration](#ai-integration)
6. [Tech stack](#tech-stack)
7. [Project structure](#project-structure)
8. [Environment variables](#environment-variables)
9. [Run locally](#run-locally)
10. [Deploy on Vercel](#deploy-on-vercel)
11. [Deployment checklist](#deployment-checklist)
12. [Demo script](#demo-script)
13. [Testing guide for judges](#testing-guide-for-judges)
14. [Limitations and roadmap](#limitations-and-roadmap)
15. [License](#license)

---

## The problem

Diaspora families regularly send money home for something specific. The sender has no way to know whether the
money reached the clinic or the school, and the family is often pressured to spend it elsewhere. Existing
transfer apps move money fast, but they stop at the recipient's account.

Earmark keeps the intent attached to the money:

- The sender says **what** the money is for, in plain language.
- Providers (clinic, pharmacy, school) are paid **directly**, never through the family.
- Every payment is backed by an **invoice** that AI reads and rules verify.
- A part can stay **free to use**, so families keep their dignity and flexibility.
- Unspent earmarked money is **refunded** to the sender, or released to the family, at expiry.

## How it works

1. **The sender talks to the agent.** "Send $500 to Mum: her malaria treatment at the clinic, her medicine,
   $150 for Kofi's school fees, the rest for her." The Gemini agent checks which provider categories exist and
   proposes an **envelope**: one budget per category, plus a free-use portion.
2. **One PayPal payment.** The sender reviews the split and pays with PayPal Checkout. The platform account
   holds the funds.
3. **The free-use portion is paid immediately** to the beneficiary with PayPal Payouts.
4. **Providers bill the envelope.** The clinic enters the envelope's 6-character code and uploads a photo of
   its invoice. Gemini vision extracts the provider name, invoice number, line items and total, and flags
   anything suspicious.
5. **Rules decide, not the model.** Deterministic checks run on the extraction:

   | Check | If it fails |
   | --- | --- |
   | Envelope is funded and not expired | Reject |
   | Provider is registered and verified | Reject |
   | The envelope has a budget for the provider's category | Reject |
   | Invoice not seen before (image hash, invoice number) | Reject |
   | Amount is within the remaining budget | Ask the sender |
   | Name on the invoice matches the registered provider | Ask the sender |
   | AI confidence is at least 70% | Ask the sender |
   | Amount is under the auto-approve limit | Ask the sender |

   Every check passes → paid automatically. A soft check fails → the sender approves or rejects in one click.
6. **The provider is paid** to its own PayPal account with Payouts. Paying the provider, never the family, is
   what prevents diversion. The AI is a convenience, not the safeguard.
7. **Unspent money** is refunded to the sender (Refunds API) or released to the beneficiary when the envelope
   is closed.
8. **The dashboard** (AG Grid) shows every invoice, its status, the budget per category and a full audit trail.

## Architecture

```mermaid
flowchart LR
  S[Sender abroad] -->|chat| UI[Next.js app]
  P[Provider: clinic / pharmacy / school] -->|invoice photo| UI
  UI --> API[Next.js API routes]
  API -->|function calling| AG[Gemini agent]
  API -->|vision + JSON schema| EX[Gemini invoice extraction]
  API --> RULES[Deterministic checks]
  API --> DB[(Postgres via Prisma)]
  API -->|Orders v2: create, capture| PP[PayPal REST API]
  API -->|Payouts| PP
  API -->|Refunds| PP
  PP -->|free-use money| B[Beneficiary]
  PP -->|invoice payment| P
```

Data model (see `prisma/schema.prisma`):

- **Provider**: registered clinic, pharmacy, school or store, with its PayPal email.
- **Envelope**: one earmarked transfer (sender, beneficiary, total, status, PayPal order and capture IDs).
- **Allocation**: one budget per category inside an envelope (budget, spent).
- **Invoice**: what a provider submitted, the raw AI extraction, the check results and the payout ID.
- **Event**: append-only audit trail shown in the dashboard.

## PayPal integration

All calls go through the PayPal REST API in **sandbox** mode.

| PayPal capability | What Earmark uses it for | Code |
| --- | --- | --- |
| OAuth 2.0 client credentials | Server-side access token, cached until expiry | `src/lib/paypal.ts` → `accessToken` |
| Orders v2: create | One order per envelope, for the full amount | `createOrder`, `src/app/api/envelopes/[id]/order` |
| Orders v2: capture | Funds the envelope after the buyer approves | `captureOrder`, `src/app/api/envelopes/[id]/capture` |
| JavaScript SDK (PayPal Buttons) | Checkout UI on the send page | `src/app/send/page.tsx` |
| Payouts | Free-use money to the family, invoice payments to providers | `sendPayout`, `src/lib/envelopes.ts` |
| Refunds | Returns unspent earmarked money to the sender | `refundCapture`, `closeEnvelope` |

Safety details:

- `PayPal-Request-Id` idempotency keys on order creation, capture and refunds, and a deterministic
  `sender_batch_id` per payout, so a retry never pays twice.
- Budget is **reserved in the database before** calling Payouts (conditional update), and released if the
  payout fails, so two invoices can't overspend the same category.

## AI integration

**Google Gemini** through the official `@google/genai` SDK (default model `gemini-2.5-flash`).

| Use | How | Code |
| --- | --- | --- |
| Conversational agent | Function calling with two tools: `list_providers` and `propose_envelope`. The agent asks follow-up questions when the beneficiary, their email or the total is missing, and replies in the sender's language. | `src/lib/gemini.ts` → `runAgent`, `src/app/api/chat/route.ts` |
| Invoice reading | Vision on the uploaded photo or PDF, constrained to a JSON schema (provider, number, date, currency, line items, total, confidence, notes). FCFA (XOF) invoices are converted to USD. | `src/lib/gemini.ts` → `extractInvoice` |
| Decision support | The extraction feeds the deterministic checks. The model never decides on its own to move money. | `src/lib/verify.ts` |

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 15 (App Router) + React 19 + TypeScript |
| Styling | Tailwind CSS 4, Fraunces + Inter fonts |
| Data grid | AG Grid Community 34 |
| Database | PostgreSQL (Neon) via Prisma 6 |
| AI | Google Gemini (`@google/genai`) |
| Payments | PayPal REST API + `@paypal/react-paypal-js` |
| Validation | Zod |
| Hosting | Vercel |

## Project structure

```
prisma/
  schema.prisma          Data model
  seed.ts                Demo providers
src/
  app/
    page.tsx             Landing page
    send/                Sender: chat with the agent, pay with PayPal
    provider/            Provider portal: submit an invoice
    dashboard/           Sender dashboard: approvals, activity, AG Grid
    api/
      chat/              Agent endpoint
      providers/         List providers
      envelopes/         List, read, create order, capture, close
      invoices/          Submit invoice, approve or reject
  components/            EnvelopeCard, Checks, icons, logo, navigation
  lib/
    paypal.ts            PayPal REST client
    gemini.ts            Agent + invoice extraction
    verify.ts            Deterministic invoice checks
    envelopes.ts         Business logic: drafts, funding, payouts, refunds
    db.ts, money.ts      Prisma client, money helpers
```

## Environment variables

Copy `.env.example` to `.env` for local development. Set the same variables in Vercel for production.
**Never commit `.env`**: it is already in `.gitignore`.

| Variable | Required | Secret | Where to get it | Example |
| --- | --- | --- | --- | --- |
| `DATABASE_URL` | Yes | **Yes** | [Neon](https://neon.tech) → your project → Connection string | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `GEMINI_API_KEY` | Yes | **Yes** | [Google AI Studio](https://aistudio.google.com/apikey) → Create API key | `AIza...` |
| `GEMINI_MODEL` | No | No | Any Gemini model with vision and function calling | `gemini-2.5-flash` (default) |
| `PAYPAL_CLIENT_ID` | Yes | No | [PayPal Developer](https://developer.paypal.com/dashboard/applications/sandbox) → Apps & Credentials → Sandbox → your app | `AXxx...` |
| `PAYPAL_CLIENT_SECRET` | Yes | **Yes** | Same app page, "Secret" | `EKxx...` |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Yes | No | Same value as `PAYPAL_CLIENT_ID` (used by the browser checkout button) | `AXxx...` |
| `PAYPAL_API_BASE` | No | No | Sandbox API URL | `https://api-m.sandbox.paypal.com` (default) |
| `AUTO_APPROVE_LIMIT_USD` | No | No | Invoices at or below this amount that pass every check are paid without asking the sender | `200` (default) |
| `NEXT_PUBLIC_XOF_PER_USD` | No | No | Fixed rate used to show FCFA amounts and convert FCFA invoices | `600` (default) |

Notes:

- Variables starting with `NEXT_PUBLIC_` are embedded in the browser bundle **at build time**. After changing
  one in Vercel, you must **redeploy**.
- `PAYPAL_CLIENT_SECRET`, `GEMINI_API_KEY` and `DATABASE_URL` are only used on the server. Never prefix them
  with `NEXT_PUBLIC_`.

## Run locally

Requirements: **Node.js 20+**, a **Postgres database** (a free Neon database works), a **PayPal developer
account** and a **Gemini API key**.

### 1. Install

```bash
git clone https://github.com/Leandre99/Earmark.git
cd Earmark
npm install
cp .env.example .env
```

### 2. Get a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey) and sign in with a Google account.
2. Click **Create API key** and copy it into `GEMINI_API_KEY` in `.env`.

### 3. Create the database (Neon)

1. Sign up at [neon.tech](https://neon.tech) and create a project (any region close to your Vercel region).
2. Copy the **connection string** (it starts with `postgresql://` and ends with `?sslmode=require`) into
   `DATABASE_URL` in `.env`.
3. Create the tables and the demo providers:

```bash
npm run db:push
npm run db:seed
```

### 4. Set up the PayPal sandbox

1. Sign in at [developer.paypal.com](https://developer.paypal.com) (any PayPal account works).
2. **Apps & Credentials → Sandbox → Create App** (type: Merchant). Copy the **Client ID** into
   `PAYPAL_CLIENT_ID` and `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, and the **Secret** into `PAYPAL_CLIENT_SECRET`.
   This app's sandbox business account acts as the Earmark platform that holds and disburses funds.
3. **Testing Tools → Sandbox Accounts → Create account**:
   - one **Personal** account: the sender, used to log in at checkout;
   - three **Business** accounts: the clinic, the pharmacy and the school, which receive payouts.
4. Put the business accounts' emails in `prisma/seed.ts` (replace the `@example.com` addresses), then run
   `npm run db:seed` again.
5. Payouts are enabled by default on sandbox business accounts. If a payout fails with an authorization error,
   check the app's features on its settings page.

### 5. Start

```bash
npm run dev
```

Open http://localhost:3000.

### Useful scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Generate the Prisma client and build for production |
| `npm run db:push` | Create or update the database tables from the schema |
| `npm run db:seed` | Replace the providers with the demo providers |
| `npm run db:reset` | Wipe the database, recreate the tables and reseed (deletes all envelopes) |

## Deploy on Vercel

1. **Import the repository**: [vercel.com/new](https://vercel.com/new) → import `Leandre99/Earmark`. Vercel
   detects Next.js. Keep the default build command (`npm run build`, which also runs `prisma generate`).
2. **Add the environment variables**: Project → **Settings → Environment Variables**. Add every variable
   from the [table above](#environment-variables) for the **Production** and **Preview** environments.
3. **Create the tables in the production database** (once, from your machine, with `DATABASE_URL` in your
   local `.env` pointing to the same Neon database):

   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Redeploy**: Deployments → latest → **Redeploy**, so the new variables are picked up.
5. **Check**: open `/api/providers` on your Vercel URL. It should return the four demo providers as JSON.

## Deployment checklist

Current status of the production deployment. Update it as you go.

| Step | Status |
| --- | --- |
| Next.js upgraded to a patched version (15.5.28, React 19.1.10) | ✅ Done |
| Code pushed to GitHub, Vercel builds from `main` | ✅ Done |
| Neon database created | ⬜ To do |
| `DATABASE_URL` added in Vercel | ⬜ To do |
| `npm run db:push` and `npm run db:seed` run against Neon | ⬜ To do |
| `GEMINI_API_KEY` and `GEMINI_MODEL` added in Vercel | ⬜ To do |
| PayPal sandbox app created | ⬜ To do |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `PAYPAL_API_BASE` added in Vercel | ⬜ To do |
| Sandbox personal account (sender) and 3 business accounts (providers) created | ⬜ To do |
| Business account emails set in `prisma/seed.ts` and reseeded | ⬜ To do |
| `AUTO_APPROVE_LIMIT_USD` (optional) added in Vercel | ⬜ To do |
| Redeployed after adding the variables | ⬜ To do |
| `/api/providers` returns the providers on the live URL | ⬜ To do |
| Full demo run end to end on the live URL | ⬜ To do |
| Live URL, video link and judge credentials added to this README | ⬜ To do |

## Demo script

1. **`/send`**: click the first suggestion (Ama sending $500 to her mother). The agent proposes an envelope:
   clinic, medicine, school fees and a free-use portion. Pay with the sandbox **personal** account. The
   free-use money is paid out immediately, and the envelope gets a 6-character code.
2. **`/provider`**: choose "Clinique Saint-Luc", enter the code, upload a clinic invoice in FCFA. The AI reads
   it, every check passes, and the clinic is paid.
3. **`/provider`** again: choose "Pharmacie du Port" and upload an invoice **above** the medicine budget. It is
   held for the sender's approval.
4. **`/dashboard`**: approve or reject the pharmacy invoice, browse the AG Grid table and the activity
   timeline, then **Close now** to refund the unspent school budget.
5. Upload the **same** clinic invoice again: it is rejected as a duplicate.

## Testing guide for judges

- **Live app**: _add your Vercel URL here_
- **Checkout login** (PayPal sandbox personal account): _add the sandbox email and password here_
- No real money moves: everything runs on the PayPal sandbox.
- To run it yourself, follow [Run locally](#run-locally) with your own free PayPal sandbox, Neon and Gemini
  credentials.

## Limitations and roadmap

- **Escrow role.** Holding funds before disbursing them is a regulated activity. In production this needs a
  licensed partner or PayPal's platform offering (delayed disbursement), plus KYC for providers.
- **Payout coverage.** Receiving PayPal is limited in several West African countries. Next step: a Mobile Money
  bridge for providers (MTN MoMo, Moov Money, Wave).
- **Exchange rate.** FCFA amounts use a fixed rate (`NEXT_PUBLIC_XOF_PER_USD`). Next step: live rates.
- **Authentication.** The demo uses a provider picker and a single sender view. Next step: real accounts for
  senders and providers.
- **Webhooks.** Payout status is taken from the API response. Next step: PayPal webhooks to confirm completion.

## License

[MIT](LICENSE)

import Link from "next/link";
import { CategoryBadge, categoryMeta } from "@/components/categories";
import { ArrowRightIcon, GlobeIcon, ReceiptIcon, ShieldIcon, SparkIcon } from "@/components/Icons";

const PREVIEW_SPLIT = [
  { category: "HEALTH", label: "Malaria treatment", amount: 180, spent: 180 },
  { category: "PHARMACY", label: "Medicine", amount: 45, spent: 38 },
  { category: "SCHOOL", label: "Kofi's school fees", amount: 150, spent: 0 },
  { category: "FREE", label: "For Mum", amount: 125, spent: 125 },
];

const STEPS = [
  {
    Icon: SparkIcon,
    title: "Tell the agent",
    text: "Describe who the money is for and what it should cover, in your own words.",
  },
  {
    Icon: GlobeIcon,
    title: "Pay once with PayPal",
    text: "One checkout. The agent splits it into earmarked budgets, plus money that's free to use.",
  },
  {
    Icon: ReceiptIcon,
    title: "Providers send invoices",
    text: "The clinic, pharmacy or school uploads its bill. AI reads it, rules verify it.",
  },
  {
    Icon: ShieldIcon,
    title: "Paid directly, never diverted",
    text: "Money goes to the verified provider's account. You see every payment as it happens.",
  },
];

function ProductPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-brand-soft via-cream to-accent-soft" />
      <div className="card space-y-4 p-5 sm:p-6">
        <div className="flex justify-end">
          <p className="max-w-[85%] rounded-2xl rounded-br-md bg-brand px-4 py-2.5 text-sm text-white">
            $500 for Mum: her malaria treatment, her medicine, Kofi&apos;s school fees, the rest for her.
          </p>
        </div>
        <div className="rounded-2xl border border-line bg-cream/60 p-4">
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-sm font-medium">Envelope for Akosua</span>
            <span className="font-display text-xl font-semibold">$500</span>
          </div>
          <ul className="space-y-3">
            {PREVIEW_SPLIT.map((row) => (
              <li key={row.category} className="flex items-center gap-3">
                <CategoryBadge category={row.category} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between text-sm">
                    <span className="truncate">{row.label}</span>
                    <span className="text-muted">${row.amount}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-line/70">
                    <div
                      className={`h-1.5 rounded-full ${categoryMeta(row.category).bar}`}
                      style={{ width: `${(row.spent / row.amount) * 100}%` }}
                    />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand">
          <ShieldIcon className="size-5 shrink-0" />
          <span>
            <b>Clinique Saint-Luc</b> invoice verified · $180 paid directly
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="space-y-20 sm:space-y-24">
      <section className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
        <div className="animate-rise space-y-6">
          <p className="eyebrow">For families who send money home</p>
          <h1 className="font-display text-4xl leading-[1.05] font-semibold tracking-tight sm:text-6xl">
            Money sent home,
            <br />
            <span className="text-brand">spent as intended.</span>
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted">
            Earmark turns one PayPal payment into budgets for healthcare, medicine and school fees. An AI agent pays
            verified providers directly against real invoices, and the rest stays free for your family to use.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/send" className="btn px-5 py-3 text-base">
              Send money <ArrowRightIcon className="size-4" />
            </Link>
            <Link href="/provider" className="btn-ghost px-5 py-3 text-base">
              I&apos;m a provider
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-muted">
            <li className="flex items-center gap-2">
              <ShieldIcon className="size-4 text-brand" /> Verified providers only
            </li>
            <li className="flex items-center gap-2">
              <ReceiptIcon className="size-4 text-brand" /> Paid against invoices
            </li>
            <li className="flex items-center gap-2">
              <SparkIcon className="size-4 text-brand" /> Unspent money refunded
            </li>
          </ul>
        </div>
        <ProductPreview />
      </section>

      <section className="space-y-8">
        <div className="max-w-2xl space-y-3">
          <p className="eyebrow">How it works</p>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Not just sent. Delivered where it&apos;s needed.
          </h2>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ Icon, title, text }, i) => (
            <li key={title} className="card relative space-y-3">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
                  <Icon />
                </span>
                <span className="font-display text-3xl font-semibold text-line">{i + 1}</span>
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted">{text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="overflow-hidden rounded-3xl bg-brand px-6 py-10 text-white sm:px-10 sm:py-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-3">
            <h2 className="font-display text-3xl font-semibold tracking-tight">The AI reads. The rules decide.</h2>
            <p className="max-w-xl leading-relaxed text-white/80">
              Gemini extracts the provider, amount and items from a photo of the invoice. Then deterministic checks
              (registered provider, matching category, remaining budget, duplicates) decide whether to pay, ask you,
              or reject. The model never moves money on its own.
            </p>
          </div>
          <div className="flex lg:justify-end">
            <Link href="/send" className="btn bg-white px-5 py-3 text-base text-brand hover:bg-cream">
              Try the agent <ArrowRightIcon className="size-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

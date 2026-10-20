import Link from "next/link";

const steps = [
  ["Tell the agent", "“$500 for Mum: the clinic, her medicine, Kofi's school fees, the rest for her.”"],
  ["Pay once with PayPal", "Funds are held by the platform, split into earmarked budgets."],
  ["Providers bill, AI checks", "The clinic uploads its invoice. AI reads it, rules verify it."],
  ["Paid directly", "Money goes to the verified provider's account, never diverted."],
];

export default function Home() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Money sent home, spent as intended.</h1>
        <p className="max-w-2xl text-lg text-muted">
          Earmark lets families abroad fund healthcare, medicine and school fees back home. An AI agent pays verified
          providers directly via PayPal, only against verified invoices, and the rest stays free to use.
        </p>
        <div className="flex gap-3">
          <Link href="/send" className="btn">
            Send money
          </Link>
          <Link href="/provider" className="btn-ghost">
            I'm a provider
          </Link>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {steps.map(([title, text], i) => (
          <div key={title} className="card">
            <div className="mb-2 text-sm font-semibold text-brand">Step {i + 1}</div>
            <div className="font-medium">{title}</div>
            <p className="mt-1 text-sm text-muted">{text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}

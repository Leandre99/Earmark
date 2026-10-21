// Earmark mark: an envelope whose flap folds into a check, i.e. money that arrives where intended.
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="#0f5c4a" />
        <path d="M8 11.5h16v10a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 8 21.5v-10Z" fill="none" stroke="#faf7f0" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="m8.5 12 7.5 6 7.5-6" fill="none" stroke="#d9772b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="font-display text-xl font-semibold tracking-tight text-ink">Earmark</span>
    </span>
  );
}

import { BasketIcon, HeartPulseIcon, HomeIcon, PillIcon, SchoolIcon, WalletIcon } from "./Icons";

// Visual identity of each earmark category. Class strings are literal so Tailwind picks them up.
export const CATEGORY_META: Record<
  string,
  { label: string; Icon: (p: { className?: string }) => React.ReactElement; tile: string; bar: string; hex: string }
> = {
  HEALTH: { label: "Health care", Icon: HeartPulseIcon, tile: "bg-teal-50 text-teal-700", bar: "bg-teal-600", hex: "#0d9488" },
  PHARMACY: { label: "Medicine", Icon: PillIcon, tile: "bg-violet-50 text-violet-700", bar: "bg-violet-600", hex: "#7c3aed" },
  SCHOOL: { label: "School", Icon: SchoolIcon, tile: "bg-amber-50 text-amber-700", bar: "bg-amber-500", hex: "#f59e0b" },
  GROCERY: { label: "Groceries", Icon: BasketIcon, tile: "bg-lime-50 text-lime-700", bar: "bg-lime-600", hex: "#65a30d" },
  HOUSING: { label: "Housing", Icon: HomeIcon, tile: "bg-sky-50 text-sky-700", bar: "bg-sky-600", hex: "#0284c7" },
  FREE: { label: "Free to use", Icon: WalletIcon, tile: "bg-rose-50 text-rose-700", bar: "bg-rose-500", hex: "#f43f5e" },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category] ?? CATEGORY_META.FREE;
}

export function CategoryBadge({ category, size = "md" }: { category: string; size?: "sm" | "md" }) {
  const { Icon, tile } = categoryMeta(category);
  const box = size === "sm" ? "size-8 rounded-lg" : "size-10 rounded-xl";
  return (
    <span className={`grid shrink-0 place-items-center ${box} ${tile}`}>
      <Icon className={size === "sm" ? "size-4" : "size-5"} />
    </span>
  );
}

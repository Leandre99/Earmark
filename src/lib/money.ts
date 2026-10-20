export const CATEGORIES = ["HEALTH", "PHARMACY", "SCHOOL", "GROCERY", "HOUSING", "FREE"] as const;
export type Category = (typeof CATEGORIES)[number];

// Display-only conversion for the West African CFA franc (pegged to the euro).
const XOF_PER_USD = Number(process.env.NEXT_PUBLIC_XOF_PER_USD ?? 600);

export const toCents = (amount: number) => Math.round(amount * 100);
export const toPayPalValue = (cents: number) => (cents / 100).toFixed(2);

export function formatUsd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatXof(cents: number) {
  return `${Math.round((cents / 100) * XOF_PER_USD).toLocaleString("fr-FR")} FCFA`;
}

export function shortCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

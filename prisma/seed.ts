import { prisma } from "../src/lib/db";

// Demo providers. Replace the emails with sandbox *business* accounts you create in
// developer.paypal.com > Sandbox accounts, so Payouts land somewhere you can inspect.
const providers = [
  { name: "Clinique Saint-Luc", category: "HEALTH", city: "Cotonou", paypalEmail: "clinic@example.com" },
  { name: "Pharmacie du Port", category: "PHARMACY", city: "Cotonou", paypalEmail: "pharmacy@example.com" },
  { name: "Complexe Scolaire Les Lauriers", category: "SCHOOL", city: "Porto-Novo", paypalEmail: "school@example.com" },
  { name: "Marché Dantokpa Alimentation", category: "GROCERY", city: "Cotonou", paypalEmail: "grocery@example.com" },
];

async function main() {
  await prisma.provider.deleteMany();
  for (const p of providers) await prisma.provider.create({ data: p });
  console.log(`Seeded ${providers.length} providers`);
}

main().finally(() => prisma.$disconnect());

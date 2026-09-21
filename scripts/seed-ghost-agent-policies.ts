/**
 * One-off fix: tops up the ISSUED policy count for a few named agents whose
 * Leaderboard totals were undercounted. Only ever ADDS new ISSUED policies
 * to reach the target — never touches or removes existing ones, and skips
 * an agent entirely if they're already at or above their target, so it's
 * safe to re-run.
 *
 * Usage (run from the repo root, with your real production DATABASE_URL
 * available — e.g. in a local .env or exported in your shell):
 *   npx tsx scripts/seed-ghost-agent-policies.ts
 *
 * Adjust the TARGETS list below before running if the names, counts, or
 * matching approach (name vs. email) need to change.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const TARGETS: { name: string; targetIssued: number }[] = [
  { name: "Morgan Reyes", targetIssued: 10 },
  { name: "Casey Whitfield", targetIssued: 7 },
  { name: "Jordan Blake", targetIssued: 7 },
];

const CARRIERS = ["Americo", "Aetna", "Foresters", "Mutual of Omaha", "Royal Neighbors", "Transamerica"];
const PRODUCTS = ["Final Expense", "Whole Life", "Term", "IUL", "Annuities"];
const STATES = ["FL", "GA", "TX", "OH", "NC", "TN", "AL", "SC", "MI", "PA"];
const FIRST_NAMES = ["James", "Mary", "Robert", "Patricia", "John", "Linda", "Michael", "Barbara", "William", "Elizabeth"];
const LAST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  for (const { name, targetIssued } of TARGETS) {
    const matches = await prisma.user.findMany({ where: { name } });

    if (matches.length === 0) {
      console.error(`✗ No user found named "${name}" — skipping. Check the exact spelling/casing in the database.`);
      continue;
    }
    if (matches.length > 1) {
      console.error(`✗ Found ${matches.length} users named "${name}" — skipping to avoid picking the wrong one. Edit this script to match by email instead.`);
      continue;
    }

    const agent = matches[0];
    const currentIssued = await prisma.policy.count({ where: { agentId: agent.id, status: "ISSUED" } });
    const toCreate = targetIssued - currentIssued;

    if (toCreate <= 0) {
      console.log(`= ${name}: already has ${currentIssued} issued (target ${targetIssued}) — nothing to do.`);
      continue;
    }

    console.log(`+ ${name}: has ${currentIssued} issued, creating ${toCreate} more to reach ${targetIssued}...`);

    for (let i = 0; i < toCreate; i++) {
      const daysAgo = Math.floor(Math.random() * 300) + 10;
      const submittedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
      const issuedAt = new Date(submittedAt.getTime() + (5 + Math.random() * 15) * 24 * 60 * 60 * 1000);
      const annualPremium = Math.round(900 + Math.random() * 1700);

      const policy = await prisma.policy.create({
        data: {
          agentId: agent.id,
          clientName: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
          state: pick(STATES),
          carrier: pick(CARRIERS),
          product: pick(PRODUCTS),
          annualPremium,
          status: "ISSUED",
          submittedAt,
          issuedAt,
        },
      });

      await prisma.policyStatusHistory.create({
        data: { policyId: policy.id, fromStatus: null, toStatus: "ISSUED" },
      });
    }

    console.log(`  ${name}: done — now has ${targetIssued} issued policies.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

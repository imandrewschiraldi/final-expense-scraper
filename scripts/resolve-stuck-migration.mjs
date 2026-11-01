// One-time, self-healing guard that runs before `prisma migrate deploy` on
// every build. Production has a migration (20260925000000_carrier_resources)
// that Prisma's `_prisma_migrations` table marked as started-but-never-
// finished, which makes `migrate deploy` refuse to apply anything else
// (P3009) until it's resolved. This checks whether that migration's tables
// actually exist and tells Prisma the true outcome, then becomes a no-op on
// every later build once the row is resolved.
import { Client } from "pg";
import { execSync } from "node:child_process";

const MIGRATION_NAME = "20260925000000_carrier_resources";

async function main() {
  if (!process.env.DATABASE_URL) return;

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const stuck = await client.query(
      `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL`,
      [MIGRATION_NAME],
    );
    if (stuck.rowCount === 0) return;

    const tables = await client.query(
      `SELECT to_regclass('public.carrier_contacts') AS t1, to_regclass('public.carrier_links') AS t2`,
    );
    const applied = tables.rows[0].t1 !== null && tables.rows[0].t2 !== null;

    console.log(
      `[resolve-stuck-migration] ${MIGRATION_NAME} is marked failed; its tables ${applied ? "already exist" : "do not exist"} — resolving as --${applied ? "applied" : "rolled-back"}.`,
    );

    execSync(`npx prisma migrate resolve --${applied ? "applied" : "rolled-back"} ${MIGRATION_NAME}`, {
      stdio: "inherit",
    });
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("[resolve-stuck-migration] failed:", err);
  process.exit(1);
});

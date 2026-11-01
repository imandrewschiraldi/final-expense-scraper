// Self-healing guard that runs before `prisma migrate deploy` on every build.
//
// This pipeline never ran `prisma migrate deploy` against production until
// now, so `_prisma_migrations` was out of sync with the live schema — some
// migrations' tables/columns already existed (created some other way, or by
// an earlier partial run) while Prisma had no record of them, which makes
// `migrate deploy` mark them "failed" and refuse to apply anything after
// them (P3009). This finds whichever migration is currently stuck, checks
// whether ITS tables/columns/types already exist in the live database, and
// tells Prisma the true outcome via `prisma migrate resolve` — then retries
// `migrate deploy`, repeating until it succeeds or hits a migration it can't
// safely judge on its own. Once the whole chain is resolved, every later
// build is a fast no-op.
import { Client } from "pg";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, "..", "prisma", "migrations");
const MAX_ITERATIONS = 60;

async function withClient(fn) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

async function getStuckMigration(client) {
  const { rows } = await client.query(
    `SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL ORDER BY started_at ASC LIMIT 1`,
  );
  return rows[0]?.migration_name ?? null;
}

// Looks only for the additive DDL Prisma actually generates (CREATE TABLE,
// ADD COLUMN, CREATE TYPE) and checks whether those specific objects already
// exist. Anything it can't find a clear signal for (all exist / none exist)
// it refuses to guess on, so a genuinely broken migration fails loudly
// instead of silently resolved the wrong way.
async function decideOutcome(client, migrationName) {
  const sql = readFileSync(path.join(MIGRATIONS_DIR, migrationName, "migration.sql"), "utf8");

  const tables = [...new Set([...sql.matchAll(/CREATE TABLE "([^"]+)"/gi)].map((m) => m[1]))];
  const columns = [...sql.matchAll(/ALTER TABLE "([^"]+)" ADD COLUMN "([^"]+)"/gi)].map((m) => ({
    table: m[1],
    column: m[2],
  }));
  const types = [...new Set([...sql.matchAll(/CREATE TYPE "([^"]+)"/gi)].map((m) => m[1]))];

  if (tables.length === 0 && columns.length === 0 && types.length === 0) return null;

  const checks = [];
  for (const t of tables) {
    const { rows } = await client.query(`SELECT to_regclass($1) IS NOT NULL AS exists`, [`public.${t}`]);
    checks.push(rows[0].exists);
  }
  for (const { table, column } of columns) {
    const { rows } = await client.query(
      `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS exists`,
      [table, column],
    );
    checks.push(rows[0].exists);
  }
  for (const t of types) {
    const { rows } = await client.query(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = $1) AS exists`, [t]);
    checks.push(rows[0].exists);
  }

  if (checks.every(Boolean)) return "applied";
  if (checks.every((c) => !c)) return "rolled-back";
  return "mixed";
}

function tryDeploy() {
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    return true;
  } catch {
    return false;
  }
}

function bail(message) {
  console.error(`[resolve-stuck-migration] ${message}`);
  console.error("[resolve-stuck-migration] see https://pris.ly/d/migrate-resolve for manual resolution.");
  process.exit(1);
}

async function main() {
  if (!process.env.DATABASE_URL) return;

  const retriedAsNew = new Set();

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const stuck = await withClient(getStuckMigration);
    if (stuck) {
      if (retriedAsNew.has(stuck)) {
        bail(`${stuck} failed again after being retried as a real (--rolled-back) apply — this is a genuine migration error, not a stale record. Check the build log above for the actual SQL error.`);
      }

      const outcome = await withClient((c) => decideOutcome(c, stuck));
      if (outcome === null || outcome === "mixed") {
        bail(
          `${stuck} is marked failed and ${outcome === null ? "its migration.sql has no table/column/type creation I can verify automatically" : "only some of its target objects exist"} — stopping rather than guessing.`,
        );
      }

      console.log(
        `[resolve-stuck-migration] ${stuck} is marked failed; its objects ${outcome === "applied" ? "already exist" : "do not exist"} — resolving as --${outcome}.`,
      );
      execSync(`npx prisma migrate resolve --${outcome} ${stuck}`, { stdio: "inherit" });
      if (outcome === "rolled-back") retriedAsNew.add(stuck);
    }

    if (tryDeploy()) return;
  }

  bail("hit the safety iteration limit without `migrate deploy` succeeding.");
}

main().catch((err) => {
  console.error("[resolve-stuck-migration] failed:", err);
  process.exit(1);
});

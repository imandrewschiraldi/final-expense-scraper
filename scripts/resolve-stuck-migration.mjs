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

// Looks for the DDL Prisma actually generates — CREATE/DROP TABLE, CREATE
// TYPE, ALTER TYPE ADD VALUE, CREATE/DROP INDEX, and (scoped per ALTER TABLE
// statement) ADD/DROP COLUMN, ALTER COLUMN (DROP|SET) NOT NULL/DEFAULT, ADD/
// DROP CONSTRAINT — and checks whether those specific objects already
// exist. A data backfill alongside one of those (INSERT/UPDATE/DELETE) is
// NOT separately checked or bailed on: Prisma runs each migration.sql as one
// transaction by default, so the schema either committed together with its
// backfill or neither did — the schema-level signal alone tells us which.
// Plain RENAMEs and column-type casts aren't safe to infer this way (the
// old and new names/types both "exist" in a sense), so a migration
// containing one is left for manual review — except the one recognized
// idiom for narrowing/widening an enum (CREATE TYPE "<Enum>_new" AS ENUM
// (...) ... ALTER TYPE "<Enum>_new" RENAME TO "<Enum>"), which is verified
// by checking whether any of the enum's old-only values (found in the
// migration's own CASE-mapping) are still present. Anything that still
// isn't a clear, unanimous signal (all exist / none exist) is refused
// rather than guessed at, so a genuinely broken migration fails loudly
// instead of being silently resolved the wrong way.
async function decideOutcome(client, migrationName) {
  let sql = readFileSync(path.join(MIGRATIONS_DIR, migrationName, "migration.sql"), "utf8");

  const checks = [];
  const push = async (query, params) => {
    const { rows } = await client.query(query, params);
    checks.push(rows[0].exists);
  };

  const enumSwap = sql.match(/CREATE TYPE "(\w+)_new" AS ENUM \(([^)]*)\)[\s\S]*?ALTER TYPE "\1_new" RENAME TO "\1"/);
  if (enumSwap) {
    const [whole, typeName, newValuesRaw] = enumSwap;
    const newValues = new Set([...newValuesRaw.matchAll(/'([^']+)'/g)].map((m) => m[1]));
    const oldOnlyValues = [...new Set([...sql.matchAll(/WHEN '([^']+)' THEN/gi)].map((m) => m[1]))].filter(
      (v) => !newValues.has(v),
    );
    if (oldOnlyValues.length > 0) {
      await push(
        `SELECT NOT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1 AND e.enumlabel = ANY($2)) AS exists`,
        [typeName, oldOnlyValues],
      );
    }
    sql = sql.slice(0, enumSwap.index) + sql.slice(enumSwap.index + whole.length);
  }

  if (/\bRENAME\b/i.test(sql)) return null;
  if (/ALTER COLUMN\s+"[^"]+"\s+TYPE\b/i.test(sql)) return null;

  for (const m of sql.matchAll(/CREATE TABLE "([^"]+)"/gi)) {
    await push(`SELECT to_regclass($1) IS NOT NULL AS exists`, [`public.${m[1]}`]);
  }
  for (const m of sql.matchAll(/DROP TABLE(?: IF EXISTS)? "([^"]+)"/gi)) {
    await push(`SELECT to_regclass($1) IS NULL AS exists`, [`public.${m[1]}`]);
  }
  for (const m of sql.matchAll(/CREATE TYPE "([^"]+)"/gi)) {
    await push(`SELECT EXISTS (SELECT 1 FROM pg_type WHERE typname = $1) AS exists`, [m[1]]);
  }
  for (const m of sql.matchAll(/ALTER TYPE "([^"]+)" ADD VALUE '([^']+)'/gi)) {
    await push(
      `SELECT EXISTS (SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid WHERE t.typname = $1 AND e.enumlabel = $2) AS exists`,
      [m[1], m[2]],
    );
  }
  for (const m of sql.matchAll(/CREATE (?:UNIQUE )?INDEX "([^"]+)"/gi)) {
    await push(`SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = $1) AS exists`, [m[1]]);
  }
  for (const m of sql.matchAll(/DROP INDEX(?: IF EXISTS)? "([^"]+)"/gi)) {
    await push(`SELECT NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = $1) AS exists`, [m[1]]);
  }
  for (const m of sql.matchAll(/DROP TYPE(?: IF EXISTS)? "([^"]+)"/gi)) {
    await push(`SELECT NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = $1) AS exists`, [m[1]]);
  }

  for (const block of sql.matchAll(/ALTER TABLE "([^"]+)"([\s\S]*?);/g)) {
    const [, table, body] = block;

    for (const m of body.matchAll(/ADD COLUMN\s+"([^"]+)"/gi)) {
      await push(
        `SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS exists`,
        [table, m[1]],
      );
    }
    for (const m of body.matchAll(/DROP COLUMN\s+"([^"]+)"/gi)) {
      await push(
        `SELECT NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2) AS exists`,
        [table, m[1]],
      );
    }
    for (const m of body.matchAll(/ALTER COLUMN\s+"([^"]+)"\s+DROP NOT NULL/gi)) {
      await push(
        `SELECT COALESCE((SELECT is_nullable = 'YES' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2), false) AS exists`,
        [table, m[1]],
      );
    }
    for (const m of body.matchAll(/ALTER COLUMN\s+"([^"]+)"\s+SET NOT NULL/gi)) {
      await push(
        `SELECT COALESCE((SELECT is_nullable = 'NO' FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2), false) AS exists`,
        [table, m[1]],
      );
    }
    for (const m of body.matchAll(/ADD CONSTRAINT\s+"([^"]+)"/gi)) {
      await push(`SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS exists`, [m[1]]);
    }
    for (const m of body.matchAll(/DROP CONSTRAINT\s+(?:IF EXISTS\s+)?"([^"]+)"/gi)) {
      await push(`SELECT NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = $1) AS exists`, [m[1]]);
    }
    for (const m of body.matchAll(/ALTER COLUMN\s+"([^"]+)"\s+DROP DEFAULT/gi)) {
      await push(
        `SELECT COALESCE((SELECT column_default IS NULL FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2), false) AS exists`,
        [table, m[1]],
      );
    }
    for (const m of body.matchAll(/ALTER COLUMN\s+"([^"]+)"\s+SET DEFAULT/gi)) {
      await push(
        `SELECT COALESCE((SELECT column_default IS NOT NULL FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2), false) AS exists`,
        [table, m[1]],
      );
    }
  }

  if (checks.length === 0) return null;
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

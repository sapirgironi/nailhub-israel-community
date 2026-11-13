import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { productionBlockers, schemaFingerprint } from "./staged-schema.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "drizzle", "migrations");
const expected = {
  manifest: "ea83ae1ed1aaf2ab9c7caf392550ac23775f196990ad48992dc270f56df302c1",
  baseline: "db1111f404aa381d27e98a6040d818e96c9274c5bf7e13c6a2c3116ecd461a88",
  a: "2ae5109bad6c6cc0ac711a3053a3c7fa9368847109036b1522bff883bc8e25cb",
  b: "8a4ad1f50030f987a043dd8cc1643f9e856be7eba951452862f35d88209611ca",
};
const projects = {
  production: {
    host: "aws-0-eu-west-1.pooler.supabase.com",
    user: "postgres.xharmtpftxebhwvmokxt",
  },
  test: { host: "aws-0-ap-northeast-2.pooler.supabase.com", user: "postgres.rqywralfcazetwqdsqww" },
};
const history = [
  { version: "20261107071141", name: "batch_0000_0004" },
  { version: "20261107071158", name: "batch_0005_0009" },
  { version: "20261107071222", name: "batch_0010_0014" },
  { version: "20261107071240", name: "batch_0020_0026" },
];

function options(args) {
  const result = {};
  for (const arg of args) {
    const match = /^--(target|stage|confirm)=(.+)$/.exec(arg);
    if (match) {
      if (result[match[1]] !== undefined) throw new Error(`Duplicate option: ${match[1]}`);
      result[match[1]] = match[2];
    } else if (
      [
        "--check",
        "--backup-verified",
        "--backup-integrity-verified",
        "--restore-risk-accepted",
        "--writes-paused",
        "--code-verified",
      ].includes(arg)
    ) {
      const key = arg.slice(2);
      if (result[key]) throw new Error(`Duplicate option: ${key}`);
      result[key] = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }
  if (!Object.hasOwn(projects, result.target) || !["a", "b"].includes(result.stage)) {
    throw new Error("Specify --target=test|production and --stage=a|b");
  }
  if (!result.check && result.confirm !== `${result.target}-${result.stage}`) {
    throw new Error(`Execution requires --confirm=${result.target}-${result.stage}`);
  }
  if (
    !result.check &&
    result.target === "production" &&
    (!result["writes-paused"] ||
      (!result["backup-verified"] &&
        !(result["backup-integrity-verified"] && result["restore-risk-accepted"])))
  ) {
    throw new Error(
      "Production requires a write pause and either a verified restorable backup or verified backup integrity with explicit restore-risk acceptance",
    );
  }
  if (!result.check && result.stage === "b" && !result["code-verified"]) {
    throw new Error("Stage b requires --code-verified after deployment and verification");
  }
  return result;
}

function connection(target) {
  const raw = process.env.NAILHUB_MIGRATION_DATABASE_URL;
  if (!raw)
    throw new Error(
      "Set NAILHUB_MIGRATION_DATABASE_URL in the environment, not on the command line",
    );
  const url = new URL(raw);
  const project = projects[target];
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    url.hostname !== project.host ||
    decodeURIComponent(url.username) !== project.user ||
    url.pathname !== "/postgres" ||
    (url.port && url.port !== "5432") ||
    !url.password
  ) {
    throw new Error("Database URL does not match the explicitly selected project");
  }
  return postgres({
    host: project.host,
    port: 5432,
    database: "postgres",
    username: project.user,
    password: decodeURIComponent(url.password),
    ssl: "verify-full",
    max: 1,
    connect_timeout: 15,
    onnotice: () => {},
  });
}

async function loadMigrations() {
  const journal = JSON.parse(await readFile(join(root, "meta", "_journal.json"), "utf8"));
  const migrations = readMigrationFiles({ migrationsFolder: root });
  if (journal.entries.length !== 38 || migrations.length !== 38)
    throw new Error("Unexpected migration journal length");
  const manifest = migrations.map((migration, i) => ({
    tag: journal.entries[i].tag,
    hash: migration.hash,
    when: migration.folderMillis,
  }));
  const digest = createHash("sha256").update(JSON.stringify(manifest)).digest("hex");
  if (digest !== expected.manifest)
    throw new Error("Migration files or journal differ from the reviewed manifest");
  return migrations;
}

async function preflight(tx, stage, target, migrations) {
  const [identity] = await tx`SELECT current_user AS role, current_database() AS database,
    current_setting('server_version_num')::int AS version`;
  if (
    identity.role !== "postgres" ||
    identity.database !== "postgres" ||
    Math.floor(identity.version / 10000) !== 17
  ) {
    throw new Error("Unexpected database role, name or PostgreSQL major version");
  }
  const [journals] =
    await tx`SELECT to_regclass('supabase_migrations.schema_migrations') IS NOT NULL AS supabase,
    to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS drizzle`;
  if (!journals.supabase) throw new Error("Supabase migration history is missing");
  const actualHistory =
    await tx`SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version`;
  if (JSON.stringify(actualHistory) !== JSON.stringify(history))
    throw new Error("Supabase migration history differs from the reviewed four batches");
  if (stage === "a" && journals.drizzle)
    throw new Error("Stage a requires the Drizzle journal to be absent");
  if (stage === "b" && !journals.drizzle) throw new Error("Stage b requires a completed stage a");
  if (stage === "b") await verifyJournal(tx, migrations.slice(0, 36));
  const actualSchema = await schemaFingerprint(tx);
  if (actualSchema !== (stage === "a" ? expected.baseline : expected.a)) {
    throw new Error("Database schema or grants differ from the reviewed stage fingerprint");
  }
  if (target === "production") {
    const blockers = await productionBlockers(tx);
    if (blockers.length) throw new Error("Production is blocked: " + blockers.join("; "));
    console.warn(
      "Approved exception: supabase_admin public-schema table defaults for anon and authenticated remain unchanged",
    );
  }
}

async function verifyJournal(tx, migrations) {
  const rows =
    await tx`SELECT hash, created_at::text AS created_at FROM drizzle.__drizzle_migrations ORDER BY id`;
  if (
    rows.length !== migrations.length ||
    rows.some(
      (row, i) =>
        row.hash !== migrations[i].hash || row.created_at !== String(migrations[i].folderMillis),
    )
  ) {
    throw new Error("Drizzle migration history is incomplete, altered or out of order");
  }
}

async function applyMigrations(tx, migrations) {
  for (const migration of migrations) {
    for (const statement of migration.sql) await tx.unsafe(statement);
    await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${migration.hash}, ${migration.folderMillis})`;
  }
}

async function run() {
  const args = options(process.argv.slice(2));
  if (
    !args.check &&
    args.target === "production" &&
    !args["backup-verified"] &&
    args["restore-risk-accepted"]
  ) {
    console.warn("Approved risk: backup restoration has not been verified");
  }
  const migrations = await loadMigrations();
  const db = connection(args.target);
  try {
    await db.begin(
      args.check ? "isolation level serializable read only" : "isolation level serializable",
      async (tx) => {
        await tx`SET LOCAL lock_timeout = '10s'`;
        await tx`SET LOCAL statement_timeout = '60s'`;
        if (!args.check)
          await tx`SELECT pg_advisory_xact_lock(hashtext('nailhub.staged-migrations'))`;
        await preflight(tx, args.stage, args.target, migrations);
        if (args.check) {
          console.log(`Read-only preflight passed for ${args.target}, stage ${args.stage}`);
          return;
        }
        if (args.stage === "a") {
          await tx`CREATE SCHEMA IF NOT EXISTS drizzle`;
          await tx`CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint)`;
          for (const migration of migrations.slice(0, 34)) {
            await tx`INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES (${migration.hash}, ${migration.folderMillis})`;
          }
          await applyMigrations(tx, migrations.slice(34, 36));
          await verifyJournal(tx, migrations.slice(0, 36));
        } else {
          await tx`SET LOCAL nailhub.lockdown_approved = 'yes'`;
          await applyMigrations(tx, migrations.slice(36, 38));
          await verifyJournal(tx, migrations);
        }
        if ((await schemaFingerprint(tx)) !== expected[args.stage]) {
          throw new Error(
            "Resulting schema differs from the reviewed fingerprint; transaction rolled back",
          );
        }
        console.log(`Stage ${args.stage} verified inside the transaction; committing`);
      },
    );
    console.log(args.check ? "No database changes made" : `Stage ${args.stage} committed`);
  } finally {
    await db.end({ timeout: 2 });
  }
}

run().catch((error) => {
  console.error(`Staged migration failed: ${error.message}`);
  process.exitCode = 1;
});

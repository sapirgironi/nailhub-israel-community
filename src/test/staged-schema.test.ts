import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { productionBlockers } from "../../scripts/staged-schema.mjs";

const db = new PGlite();

async function query(strings: TemplateStringsArray, ...values: unknown[]) {
  const text = strings.reduce(
    (result, part, index) => result + (index ? `$${index}` : "") + part,
    "",
  );
  return (await db.query<Record<string, unknown>>(text, values)).rows;
}

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE supabase_admin NOLOGIN;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, public boolean NOT NULL);
    INSERT INTO storage.buckets VALUES ('story-stickers', false);
    CREATE TABLE storage.objects (bucket_id text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "allow all uploads and reads 1rma4z_0" ON storage.objects FOR SELECT TO authenticated USING (false);
    CREATE POLICY "allow all uploads and reads 1rma4z_1" ON storage.objects FOR INSERT TO authenticated WITH CHECK (false);
    CREATE POLICY "allow all uploads and reads 1rma4z_2" ON storage.objects FOR UPDATE TO authenticated USING (false) WITH CHECK (false);
    CREATE POLICY "allow all uploads and reads 1rma4z_3" ON storage.objects FOR DELETE TO authenticated USING (false);
    CREATE TABLE public.test_records (id integer);
  `);
});

afterAll(async () => {
  await db.close();
});

describe("production readiness default privileges exception", () => {
  it("accepts only the approved supabase_admin public defaults for the two API roles", async () => {
    await db.exec(`
      BEGIN;
      ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public
        GRANT ALL ON TABLES TO anon, authenticated;
    `);
    expect(await productionBlockers(query)).toEqual([]);
    await db.exec("ROLLBACK");
  });

  it.each([
    ["another creator", "FOR ROLE postgres IN SCHEMA public", "authenticated"],
    ["global defaults", "FOR ROLE supabase_admin", "authenticated"],
    ["PUBLIC grants", "FOR ROLE supabase_admin IN SCHEMA public", "PUBLIC"],
  ])("still blocks dangerous default grants for %s", async (_label, target, grantee) => {
    await db.exec(
      `BEGIN; ALTER DEFAULT PRIVILEGES ${target} GRANT MAINTAIN ON TABLES TO ${grantee}`,
    );
    expect(await productionBlockers(query)).toContain(
      "Unsafe default table privileges for client roles must be revoked",
    );
    await db.exec("ROLLBACK");
  });

  it("still blocks effective MAINTAIN on existing tables", async () => {
    await db.exec("BEGIN; GRANT MAINTAIN ON public.test_records TO anon");
    expect(await productionBlockers(query)).toContain(
      "Client MAINTAIN privileges on existing public tables must be reviewed and revoked",
    );
    await db.exec("ROLLBACK");
  });
});

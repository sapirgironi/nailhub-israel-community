import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
let migration: string;

beforeAll(async () => {
  migration = await readFile(
    join(process.cwd(), "scripts", "predeploy-storage-security.sql"),
    "utf8",
  );
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets (id text PRIMARY KEY, name text NOT NULL, public boolean NOT NULL);
    CREATE TABLE storage.objects (bucket_id text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "allow all uploads and reads 1rma4z_0" ON storage.objects FOR SELECT TO authenticated USING (true);
    CREATE POLICY "allow all uploads and reads 1rma4z_1" ON storage.objects FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "allow all uploads and reads 1rma4z_2" ON storage.objects FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "allow all uploads and reads 1rma4z_3" ON storage.objects FOR DELETE TO authenticated USING (true);
    CREATE TABLE public.test_records (id integer);
    GRANT MAINTAIN ON public.test_records TO anon, authenticated;
  `);
});

afterAll(async () => {
  await db.close();
});

describe("pre-deployment Storage and privilege remediation", () => {
  it("fails before making changes without explicit approval", async () => {
    await db.exec("BEGIN");
    await expect(db.exec(migration)).rejects.toThrow("require explicit approval");
    await db.exec("ROLLBACK");
    expect((await db.query("SELECT * FROM storage.buckets")).rows).toHaveLength(0);
    expect(
      (
        await db.query<{ allowed: boolean }>(
          "SELECT has_table_privilege('authenticated', 'public.test_records', 'MAINTAIN') AS allowed",
        )
      ).rows[0]?.allowed,
    ).toBe(true);
  });

  it("creates a private bucket, narrows the reviewed policies, and revokes MAINTAIN idempotently", async () => {
    await db.exec("BEGIN; SET LOCAL nailhub.predeploy_security_approved = 'yes'");
    await db.exec(migration);
    await db.exec(migration);
    expect((await db.query("SELECT id, public FROM storage.buckets")).rows).toEqual([
      { id: "story-stickers", public: false },
    ]);
    const policies = await db.query<{
      cmd: string;
      qual: string | null;
      with_check: string | null;
    }>(
      "SELECT cmd, qual, with_check FROM pg_policies WHERE schemaname = 'storage' ORDER BY policyname",
    );
    expect(policies.rows).toEqual([
      { cmd: "SELECT", qual: "false", with_check: null },
      { cmd: "INSERT", qual: null, with_check: "false" },
      { cmd: "UPDATE", qual: "false", with_check: "false" },
      { cmd: "DELETE", qual: "false", with_check: null },
    ]);
    const grants = await db.query<{ anon: boolean; authenticated: boolean }>(
      `SELECT has_table_privilege('anon', 'public.test_records', 'MAINTAIN') AS anon,
        has_table_privilege('authenticated', 'public.test_records', 'MAINTAIN') AS authenticated`,
    );
    expect(grants.rows[0]).toEqual({ anon: false, authenticated: false });
    await db.exec("ROLLBACK");
  });

  it("rejects a public existing bucket without changing policies", async () => {
    await db.exec(`
      BEGIN;
      INSERT INTO storage.buckets VALUES ('story-stickers', 'story-stickers', true);
      SET LOCAL nailhub.predeploy_security_approved = 'yes';
    `);
    await expect(db.exec(migration)).rejects.toThrow("not the expected private bucket");
    await db.exec("ROLLBACK");
    const policy = await db.query<{ qual: string }>(
      `SELECT qual FROM pg_policies WHERE schemaname='storage' AND policyname='allow all uploads and reads 1rma4z_0'`,
    );
    expect(policy.rows[0]?.qual).toBe("true");
  });

  it("rejects a policy whose existing definition was not reviewed", async () => {
    await db.exec(`
      BEGIN;
      ALTER POLICY "allow all uploads and reads 1rma4z_0" ON storage.objects USING (bucket_id = 'other');
      SET LOCAL nailhub.predeploy_security_approved = 'yes';
    `);
    await expect(db.exec(migration)).rejects.toThrow("policies differ");
    await db.exec("ROLLBACK");
  });
});

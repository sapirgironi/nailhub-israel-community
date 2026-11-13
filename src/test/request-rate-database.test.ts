import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const techId = "10000000-0000-4000-8000-000000000001";
const source = "a".repeat(64);
const token = "b".repeat(64);

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA storage;
    GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
    CREATE TABLE storage.objects (bucket_id text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Admins delete sticker files" ON storage.objects FOR DELETE TO authenticated USING (true);
    CREATE POLICY "Unrestricted delete" ON storage.objects FOR DELETE TO authenticated USING (true);
    CREATE POLICY "Unrestricted update" ON storage.objects FOR UPDATE TO authenticated USING (true);
    CREATE POLICY "Read sticker files" ON storage.objects FOR SELECT TO authenticated USING (true);
    GRANT SELECT, UPDATE, DELETE ON storage.objects TO anon, authenticated, service_role;
    INSERT INTO storage.objects VALUES ('story-stickers'), ('community-work');
    CREATE TABLE public.posts (id uuid);
    CREATE TABLE public.stories (id uuid);
    CREATE TABLE public.post_comments (id uuid);
    CREATE TABLE public.story_stickers (id uuid);
    GRANT DELETE ON public.posts, public.stories, public.post_comments, public.story_stickers TO authenticated;
    CREATE TABLE public.client_requests (
      id uuid PRIMARY KEY, tech_id uuid NOT NULL, full_name text NOT NULL, phone text NOT NULL,
      request_type text NOT NULL, description text NOT NULL, claim_token text NOT NULL
    );
    GRANT INSERT (id, tech_id, full_name, phone, request_type, description, claim_token)
      ON public.client_requests TO anon, authenticated;
    CREATE FUNCTION public.is_public_request_tech(id uuid) RETURNS boolean LANGUAGE sql
      AS $$ SELECT id = '10000000-0000-4000-8000-000000000001'::uuid $$;
  `);
  await db.exec(await readFile(join(process.cwd(), "drizzle", "migrations", "0039_server_mutations_and_request_rate.sql"), "utf8"));
});
afterAll(async () => { await db.close(); });

async function submit(sourceHash: string, fingerprint: string, technician = techId) {
  const result = await db.query<{ result: string }>(
    `SELECT public.submit_client_request_guarded($1, $2, 'Name', '0501234567', 'other',
      'description', $3, $4, $5) AS result`,
    [randomUUID(), technician, token, sourceHash, fingerprint],
  );
  return result.rows[0]?.result;
}

describe("guarded client requests and direct permissions", () => {
  it("keeps client access until explicitly approved late migrations", async () => {
    const storageMigration = await readFile(join(process.cwd(), "drizzle", "migrations", "0041_restrict_sticker_storage_delete.sql"), "utf8");
    const mutationMigration = await readFile(join(process.cwd(), "drizzle", "migrations", "0042_restrict_direct_client_mutations.sql"), "utf8");
    const privileges = () => db.query<{
      anon_insert: boolean; authenticated_insert: boolean; all_direct_delete: boolean; any_direct_delete: boolean;
    }>(`
      SELECT has_column_privilege('anon', 'public.client_requests', 'id', 'INSERT') AS anon_insert,
        has_column_privilege('authenticated', 'public.client_requests', 'id', 'INSERT') AS authenticated_insert,
        (has_table_privilege('authenticated', 'public.posts', 'DELETE')
          AND has_table_privilege('authenticated', 'public.stories', 'DELETE')
          AND has_table_privilege('authenticated', 'public.post_comments', 'DELETE')
          AND has_table_privilege('authenticated', 'public.story_stickers', 'DELETE')) AS all_direct_delete,
        (has_table_privilege('authenticated', 'public.posts', 'DELETE')
          OR has_table_privilege('authenticated', 'public.stories', 'DELETE')
          OR has_table_privilege('authenticated', 'public.post_comments', 'DELETE')
          OR has_table_privilege('authenticated', 'public.story_stickers', 'DELETE')) AS any_direct_delete
    `);
    expect((await privileges()).rows[0]).toEqual({
      anon_insert: true, authenticated_insert: true, all_direct_delete: true, any_direct_delete: true,
    });
    await db.exec("BEGIN; SET LOCAL ROLE authenticated");
    expect((await db.query("DELETE FROM storage.objects RETURNING bucket_id")).rows).toHaveLength(2);
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; SET LOCAL ROLE authenticated");
    expect((await db.query("UPDATE storage.objects SET bucket_id = 'community-work' WHERE bucket_id = 'story-stickers' RETURNING bucket_id")).rows).toHaveLength(1);
    await db.exec("ROLLBACK");

    await expect(db.exec(storageMigration)).rejects.toThrow("Late lockdown requires explicit deployment approval");
    await expect(db.exec(mutationMigration)).rejects.toThrow("Late lockdown requires explicit deployment approval");
    expect((await privileges()).rows[0]).toEqual({
      anon_insert: true, authenticated_insert: true, all_direct_delete: true, any_direct_delete: true,
    });
    await db.exec("SELECT set_config('nailhub.lockdown_approved', 'yes', false)");
    await db.exec(storageMigration);
    expect((await privileges()).rows[0]?.all_direct_delete).toBe(true);
    await db.exec("BEGIN; SET LOCAL ROLE authenticated");
    expect((await db.query("DELETE FROM storage.objects RETURNING bucket_id")).rows).toEqual([{ bucket_id: "community-work" }]);
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; SET LOCAL ROLE authenticated");
    expect((await db.query("UPDATE storage.objects SET bucket_id = 'community-work' WHERE bucket_id = 'story-stickers' RETURNING bucket_id")).rows).toHaveLength(0);
    expect((await db.query("UPDATE storage.objects SET bucket_id = 'other' WHERE bucket_id = 'community-work' RETURNING bucket_id")).rows).toEqual([{ bucket_id: "other" }]);
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; INSERT INTO storage.objects VALUES (NULL); SET LOCAL ROLE authenticated");
    expect((await db.query("DELETE FROM storage.objects WHERE bucket_id IS NULL RETURNING bucket_id")).rows).toEqual([{ bucket_id: null }]);
    await db.exec("ROLLBACK");
    await db.exec('CREATE POLICY "Future anonymous access" ON storage.objects FOR ALL TO anon USING (true)');
    await db.exec("BEGIN; SET LOCAL ROLE anon");
    expect((await db.query("DELETE FROM storage.objects RETURNING bucket_id")).rows).toEqual([{ bucket_id: "community-work" }]);
    expect((await db.query("UPDATE storage.objects SET bucket_id = 'other' WHERE bucket_id = 'story-stickers' RETURNING bucket_id")).rows).toHaveLength(0);
    await db.exec("ROLLBACK");
    await db.exec("BEGIN; SET LOCAL ROLE service_role");
    expect((await db.query("DELETE FROM storage.objects WHERE bucket_id = 'story-stickers' RETURNING bucket_id")).rows)
      .toEqual([{ bucket_id: "story-stickers" }]);
    await db.exec("ROLLBACK");
    await db.exec(mutationMigration);
    await db.exec("SELECT set_config('nailhub.lockdown_approved', '', false)");
    expect((await privileges()).rows[0]).toEqual({
      anon_insert: false, authenticated_insert: false, all_direct_delete: false, any_direct_delete: false,
    });
  });

  it("limits the guarded request RPC to the service role", async () => {
    const result = await db.query<{
      public_rpc: boolean; service_rpc: boolean;
    }>(`
      SELECT has_function_privilege('anon', 'public.submit_client_request_guarded(uuid,uuid,text,text,text,text,text,text,text)', 'EXECUTE') AS public_rpc,
        has_function_privilege('service_role', 'public.submit_client_request_guarded(uuid,uuid,text,text,text,text,text,text,text)', 'EXECUTE') AS service_rpc
    `);
    expect(result.rows[0]).toEqual({ public_rpc: false, service_rpc: true });
  });

  it("rejects duplicates and the sixth request in an hour without consuming a slot for duplicates", async () => {
    expect(await submit(source, "1".repeat(64))).toBe("submitted");
    expect(await submit(source, "1".repeat(64))).toBe("duplicate");
    for (const digit of ["2", "3", "4", "5"]) {
      expect(await submit(source, digit.repeat(64))).toBe("submitted");
    }
    expect(await submit(source, "6".repeat(64))).toBe("rate_limited");
    expect(await submit("c".repeat(64), "1".repeat(64))).toBe("submitted");
    expect(await submit("d".repeat(64), "6".repeat(64), randomUUID())).toBe("invalid_technician");
    expect(await submit("d".repeat(64), "6".repeat(64))).toBe("submitted");
  });

  it("permits requests again after the one-hour window", async () => {
    await db.query("UPDATE public.client_request_rate_events SET created_at = now() - interval '61 minutes' WHERE source_hash = $1", [source]);
    expect(await submit(source, "1".repeat(64))).toBe("submitted");
  });
});

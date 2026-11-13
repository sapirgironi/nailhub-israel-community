import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const db = new PGlite();
const admin = "10000000-0000-4000-8000-000000000001";
const member = "10000000-0000-4000-8000-000000000002";
const author = "10000000-0000-4000-8000-000000000003";
const banned = "10000000-0000-4000-8000-000000000004";

beforeAll(async () => {
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE SCHEMA auth;
    GRANT USAGE ON SCHEMA public, auth TO authenticated;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
      AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);
    CREATE TABLE public.profiles (id uuid PRIMARY KEY, display_name text, business_name text, account_role text, account_status text, avatar_url text);
    CREATE TABLE public.posts (id uuid PRIMARY KEY, author_id uuid, created_at timestamptz, image_url text, visible boolean);
    CREATE TABLE public.user_follows (follower_id uuid, followed_id uuid);
    CREATE TABLE public.blocked_words (word text);
    CREATE TABLE public.stories (media_url text);
    CREATE TABLE public.nail_trade_items (photos text[]);
    CREATE TABLE public.community_credit_ledger (user_id uuid, amount integer);
    CREATE FUNCTION public.has_role(user_id uuid, role_name text) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT user_id IN ('${admin}'::uuid, '${banned}'::uuid) $$;
    CREATE FUNCTION public.is_account_banned(user_id uuid) RETURNS boolean LANGUAGE sql STABLE
      AS $$ SELECT user_id = '${banned}'::uuid $$;
    GRANT SELECT ON public.profiles, public.posts, public.user_follows, public.blocked_words, public.stories, public.nail_trade_items TO authenticated;
    ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
    CREATE POLICY visible_posts ON public.posts FOR SELECT TO authenticated USING (visible);
    ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_follows ON public.user_follows FOR SELECT TO authenticated USING (follower_id = auth.uid());
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY own_profile ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
    INSERT INTO auth.users VALUES ('${admin}', 'admin@example.invalid'), ('${member}', 'member@example.invalid'), ('${author}', 'artist@example.invalid');
    INSERT INTO public.profiles VALUES
      ('${admin}', 'Admin', '', 'nail_tech', 'active', NULL),
      ('${member}', 'Member', '', 'client', 'active', NULL),
      ('${author}', 'Artist', '', 'supplier', 'active', NULL);
    INSERT INTO public.community_credit_ledger VALUES ('${author}', 10), ('${author}', -3);
    INSERT INTO public.user_follows VALUES ('${member}', '${author}');
    INSERT INTO public.posts VALUES
      ('20000000-0000-4000-8000-000000000001', '${author}', '2026-01-01', 'visible-url', true),
      ('20000000-0000-4000-8000-000000000002', '${author}', '2026-01-02', 'hidden-url', false),
      ('20000000-0000-4000-8000-000000000003', '${author}', '2026-01-03', 'new-url', true);
    INSERT INTO public.blocked_words SELECT 'word-' || n FROM generate_series(1, 1200) n;
    INSERT INTO public.blocked_words VALUES ('Blocked');
  `);
  await db.exec(await readFile(join(process.cwd(), "drizzle", "migrations", "0040_paged_performance_functions.sql"), "utf8"));
  await db.exec(`SET ROLE authenticated; SELECT set_config('request.jwt.claim.sub', '${member}', false);`);
});
afterAll(async () => { await db.close(); });

describe("bounded performance functions", () => {
  it("finds blocked words beyond the ordinary response row limit", async () => {
    const result = await db.query<{ words: string[] }>("SELECT public.blocked_comment_words('contains BLOCKED') AS words");
    expect(result.rows[0]?.words).toEqual(["Blocked"]);
  });
  it("pages followed posts while respecting row security", async () => {
    const first = await db.query<{ id: string }>("SELECT id FROM public.following_feed_page(page_size => 1)");
    expect(first.rows.map(row => row.id)).toEqual(["20000000-0000-4000-8000-000000000003"]);
    const next = await db.query<{ id: string }>("SELECT id FROM public.following_feed_page('2026-01-03', '20000000-0000-4000-8000-000000000003', 1)");
    expect(next.rows.map(row => row.id)).toEqual(["20000000-0000-4000-8000-000000000001"]);
  });
  it("does not reveal media belonging only to hidden rows", async () => {
    const result = await db.query<{ url: string }>("SELECT * FROM public.visible_media_urls(ARRAY['visible-url','hidden-url'])");
    expect(result.rows).toEqual([{ url: "visible-url" }]);
  });
  it("restricts email and balance lookup to an active administrator", async () => {
    await expect(db.query("SELECT * FROM public.admin_supplier_page()")).rejects.toThrow();
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [admin]);
    const result = await db.query<{ email: string; balance: number }>("SELECT email, balance FROM public.admin_supplier_page('ARTIST')");
    expect(result.rows).toEqual([{ email: "artist@example.invalid", balance: 7 }]);
    await expect(db.query("SELECT * FROM public.admin_supplier_page('', NULL, NULL)")).rejects.toThrow();
    await db.query("SELECT set_config('request.jwt.claim.sub', $1, false)", [banned]);
    await expect(db.query("SELECT * FROM public.admin_supplier_page()")).rejects.toThrow();
  });
});

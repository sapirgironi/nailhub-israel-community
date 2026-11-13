import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";

const migrations = fileURLToPath(new URL("../drizzle/migrations/", import.meta.url));
const journal = JSON.parse(await readFile(path.join(migrations, "meta", "_journal.json"), "utf8"));
const alice = "10000000-0000-4000-8000-000000000001";
const bob = "10000000-0000-4000-8000-000000000002";
const admin = "10000000-0000-4000-8000-000000000003";
const banned = "10000000-0000-4000-8000-000000000004";
const instructor = "10000000-0000-4000-8000-000000000005";
const supplier = "10000000-0000-4000-8000-000000000006";
const client = "10000000-0000-4000-8000-000000000007";
const model = "10000000-0000-4000-8000-000000000008";
const post = "20000000-0000-4000-8000-000000000001";
const request = "30000000-0000-4000-8000-000000000001";
const token = "b".repeat(64);

async function run(priorManualRepair, targetSignupDrift) {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon NOLOGIN;
      CREATE ROLE authenticated NOLOGIN;
      CREATE ROLE service_role NOLOGIN BYPASSRLS;
      CREATE SCHEMA auth;
      GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE
        AS $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE
        AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}'::jsonb);
      CREATE SCHEMA storage;
      GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
      CREATE TABLE storage.objects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bucket_id text, name text);
      ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
      CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE
        AS $$ SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1)-1] $$;
      CREATE FUNCTION storage.extension(name text) RETURNS text LANGUAGE sql IMMUTABLE
        AS $$ SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1)) $$;
      ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
      CREATE SCHEMA drizzle;
      CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);
    `);
    const apply = async (entry) => {
      const source = await readFile(path.join(migrations, `${entry.tag}.sql`), "utf8");
      await db.exec(source);
      await db.query("INSERT INTO drizzle.__drizzle_migrations(hash,created_at) VALUES ($1,$2)", [
        createHash("sha256").update(source).digest("hex"),
        entry.when,
      ]);
    };
    if (priorManualRepair || targetSignupDrift) {
      for (const entry of journal.entries.slice(0, 27)) await apply(entry);
    }
    if (priorManualRepair) {
      for (const file of [
        "0030_repair_feed_schema.sql",
        "0031_story_fonts_for_text_posts.sql",
        "0032_limit_styled_text_post_length.sql",
      ])
        await db.exec(await readFile(path.join(migrations, file), "utf8"));
      await db.exec(
        "CREATE TRIGGER posts_safe_text BEFORE INSERT OR UPDATE OF caption ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_application_text()",
      );
    }
    if (targetSignupDrift) {
      await db.exec(`
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
        BEGIN
          INSERT INTO public.profiles (id, display_name, account_role, city)
          VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'new user'), 'nail_tech', 'city')
          ON CONFLICT (id) DO UPDATE SET display_name = excluded.display_name;
          RETURN new;
        END; $$;
      `);
    }

    const last = Number(
      (
        await db.query(
          "SELECT coalesce(max(created_at), 0) AS last FROM drizzle.__drizzle_migrations",
        )
      ).rows[0].last,
    );
    await db.exec("BEGIN");
    try {
      await db.exec("SELECT set_config('nailhub.lockdown_approved', 'yes', true)");
      for (const entry of journal.entries) if (entry.when > last) await apply(entry);
      await db.exec("COMMIT");
    } catch (error) {
      await db.exec("ROLLBACK");
      throw error;
    }

    for (const [id, name] of [
      [alice, "Alice"],
      [bob, "Bob"],
      [admin, "Admin"],
      [banned, "Banned"],
    ]) {
      await db.query(
        "INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)",
        [id, `${name.toLowerCase()}@example.invalid`, JSON.stringify({ display_name: name })],
      );
    }
    await db.query("INSERT INTO public.user_roles (user_id,role) VALUES ($1,'admin')", [admin]);
    await db.query(
      "INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ($1,'teacher@example.invalid',$2::jsonb)",
      [instructor, JSON.stringify({ display_name: "Teacher", account_role: "instructor" })],
    );
    await db.query(
      "INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ($1,'supplier@example.invalid',$2::jsonb)",
      [
        supplier,
        JSON.stringify({
          display_name: "Supplier",
          account_role: "supplier",
          business_name: "Test business",
          specialties: ["manicure"],
          additional_services: ["repair"],
        }),
      ],
    );
    for (const [id, role] of [
      [client, "client"],
      [model, "model"],
    ]) {
      await db.query(
        "INSERT INTO auth.users (id,email,raw_user_meta_data) VALUES ($1,$2,$3::jsonb)",
        [id, `${role}@example.invalid`, JSON.stringify({ display_name: role, account_role: role })],
      );
    }
    await db.query(
      "INSERT INTO public.user_sanctions (user_id,kind,reason) VALUES ($1,'ban','test')",
      [banned],
    );
    await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [admin]);
    await db.query(
      "INSERT INTO public.posts(id,author_id,image_url,caption) VALUES($1,$2,'test-image','test')",
      [post, alice],
    );
    await db.query("SELECT set_config('request.jwt.claim.sub','',false)");
    await db.query(
      "INSERT INTO public.client_requests(id,tech_id,full_name,phone,request_type,description,claim_token) VALUES($1,$2,'Test','0501234567','new_appointment','Test request',$3)",
      [request, alice, token],
    );

    async function asRole(role, id, callback) {
      await db.exec(`BEGIN; SET LOCAL ROLE ${role}`);
      try {
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,true)", [id ?? ""]);
        return await callback();
      } finally {
        await db.exec("ROLLBACK");
      }
    }
    const asUser = (id, sql, args = []) => asRole("authenticated", id, () => db.query(sql, args));
    const denied = (operation, codes = ["42501"]) =>
      assert.rejects(operation, (error) => codes.includes(error.code));
    const checks = [
      [
        "signup profile and trusted role",
        async () => {
          const profile = (
            await db.query("SELECT display_name, account_role FROM public.profiles WHERE id=$1", [
              instructor,
            ])
          ).rows[0];
          assert.equal(profile.display_name, "Teacher");
          assert.equal(profile.account_role, "instructor");
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS count FROM public.user_roles WHERE user_id=$1 AND role='user'",
                [instructor],
              )
            ).rows[0].count,
            1,
          );
          const supplierProfile = (
            await db.query(
              "SELECT display_name, business_name, account_role, account_status, specialties, additional_services FROM public.profiles WHERE id=$1",
              [supplier],
            )
          ).rows[0];
          assert.deepEqual(supplierProfile, {
            display_name: "Supplier",
            business_name: "Test business",
            account_role: "supplier",
            account_status: "pending_approval",
            specialties: ["manicure"],
            additional_services: ["repair"],
          });
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS count FROM public.user_roles WHERE user_id=$1 AND role='user'",
                [supplier],
              )
            ).rows[0].count,
            1,
          );
        },
      ],
      [
        "feed and story publication roles",
        async () => {
          for (const id of [alice, instructor]) {
            assert.equal(
              (
                await asUser(
                  id,
                  "INSERT INTO public.posts(author_id,image_url,caption) VALUES($1,'test-image','test') RETURNING id",
                  [id],
                )
              ).rows.length,
              1,
            );
            assert.equal(
              (
                await asUser(
                  id,
                  "INSERT INTO public.stories(user_id,media_url) VALUES($1,'test-image') RETURNING id",
                  [id],
                )
              ).rows.length,
              1,
            );
          }
          for (const id of [client, model, supplier]) {
            await denied(
              () =>
                asUser(
                  id,
                  "INSERT INTO public.posts(author_id,image_url,caption) VALUES($1,'test-image','test')",
                  [id],
                ),
              ["42501", "22023"],
            );
            await denied(() =>
              asUser(id, "INSERT INTO public.stories(user_id,media_url) VALUES($1,'test-image')", [
                id,
              ]),
            );
          }
          assert.equal(
            (await asUser(client, "SELECT id FROM public.posts WHERE id=$1", [post])).rows.length,
            1,
          );
        },
      ],
      [
        "profile privacy",
        async () => {
          assert.equal(
            (await asUser(alice, "SELECT id FROM public.profiles WHERE id=$1", [bob])).rows.length,
            0,
          );
          assert.equal(
            (await asUser(admin, "SELECT id FROM public.profiles WHERE id=$1", [bob])).rows.length,
            1,
          );
          assert.equal(
            (await asUser(banned, "SELECT id FROM public.profiles WHERE id=$1", [banned])).rows
              .length,
            0,
          );
          assert.equal(
            (
              await asUser(
                alice,
                "UPDATE public.profiles SET display_name='Changed' WHERE id=$1 RETURNING id",
                [alice],
              )
            ).rows.length,
            1,
          );
          assert.equal(
            (
              await asUser(
                alice,
                "UPDATE public.profiles SET display_name='Changed' WHERE id=$1 RETURNING id",
                [bob],
              )
            ).rows.length,
            0,
          );
          assert.equal(
            (
              await asUser(
                alice,
                "UPDATE public.profiles SET account_role='supplier' WHERE id=$1 RETURNING account_role",
                [alice],
              )
            ).rows[0].account_role,
            "nail_tech",
          );
        },
      ],
      [
        "following authorization",
        async () => {
          assert.equal(
            (
              await asUser(
                alice,
                "INSERT INTO public.user_follows(follower_id,followed_id) VALUES($1,$2) RETURNING follower_id",
                [alice, bob],
              )
            ).rows.length,
            1,
          );
          await denied(
            () =>
              asUser(
                alice,
                "INSERT INTO public.user_follows(follower_id,followed_id) VALUES($1,$1)",
                [alice],
              ),
            ["42501", "23514"],
          );
          await denied(() =>
            asUser(
              alice,
              "INSERT INTO public.user_follows(follower_id,followed_id) VALUES($1,$2)",
              [bob, admin],
            ),
          );
          await denied(() =>
            asUser(
              alice,
              "INSERT INTO public.user_follows(follower_id,followed_id) VALUES($1,$2)",
              [alice, banned],
            ),
          );
          await denied(() =>
            asUser(
              banned,
              "INSERT INTO public.user_follows(follower_id,followed_id) VALUES($1,$2)",
              [banned, alice],
            ),
          );
        },
      ],
      [
        "post ownership and protected fields",
        async () => {
          const inserted = await asUser(
            alice,
            "INSERT INTO public.posts(author_id,image_url,caption) VALUES($1,'test-image','test') RETURNING id",
            [alice],
          );
          assert.equal(inserted.rows.length, 1);
          await asRole("authenticated", alice, async () => {
            const created = await db.query(
              "INSERT INTO public.posts(author_id,image_url,caption) VALUES($1,'test-image','test') RETURNING id",
              [alice],
            );
            await denied(() => db.query("DELETE FROM public.posts WHERE id=$1", [created.rows[0].id]));
          });
          await denied(
            () =>
              asUser(
                banned,
                "INSERT INTO public.posts(author_id,image_url,caption) VALUES($1,'test-image','test')",
                [banned],
              ),
            ["42501", "22023"],
          );
          await denied(() => asUser(bob, "DELETE FROM public.posts WHERE id=$1", [post]));
          assert.equal(
            (
              await asUser(
                alice,
                "UPDATE public.posts SET caption='changed' WHERE id=$1 RETURNING id",
                [post],
              )
            ).rows.length,
            1,
          );
          for (const change of [
            "is_pinned=true",
            "likes_count=999",
            "status='hidden'",
            "created_at=now()-interval '2 days'",
          ]) {
            await denied(() =>
              asUser(alice, `UPDATE public.posts SET ${change} WHERE id=$1`, [post]),
            );
          }
          await denied(() =>
            asUser(
              alice,
              "INSERT INTO public.posts(author_id,image_url,is_pinned) VALUES ($1,'test-image',true)",
              [alice],
            ),
          );
          await denied(() =>
            asUser(
              alice,
              "INSERT INTO public.posts(author_id,image_url,created_at) VALUES ($1,'test-image',now()-interval '2 days')",
              [alice],
            ),
          );
          assert.equal(
            (
              await asUser(
                admin,
                "UPDATE public.posts SET is_pinned=true WHERE id=$1 RETURNING id",
                [post],
              )
            ).rows.length,
            1,
          );
          await denied(() => asUser(admin, "DELETE FROM public.posts WHERE id=$1", [post]));
        },
      ],
      [
        "likes and moderated comments",
        async () => {
          await asRole("authenticated", bob, async () => {
            await db.query("INSERT INTO public.post_likes(post_id,user_id) VALUES($1,$2)", [
              post,
              bob,
            ]);
            assert.equal(
              (await db.query("SELECT likes_count FROM public.posts WHERE id=$1", [post])).rows[0]
                .likes_count,
              1,
            );
            await db.query("DELETE FROM public.post_likes WHERE post_id=$1 AND user_id=$2", [
              post,
              bob,
            ]);
            assert.equal(
              (await db.query("SELECT likes_count FROM public.posts WHERE id=$1", [post])).rows[0]
                .likes_count,
              0,
            );
          });
          await denied(() =>
            asUser(
              bob,
              "INSERT INTO public.post_comments(post_id,user_id,body) VALUES($1,$2,'test')",
              [post, bob],
            ),
          );
        },
      ],
      [
        "client request submission and privacy",
        async () => {
          await denied(() => asRole("anon", null, () =>
            db.query(
              "INSERT INTO public.client_requests(id,tech_id,full_name,phone,request_type,description,claim_token) VALUES($1,$2,'Test','0501234567','new_appointment','Test request',$3)",
              ["30000000-0000-4000-8000-000000000002", alice, "a".repeat(64)],
            ),
          ));
          await denied(() => asUser(
            bob,
            "INSERT INTO public.client_requests(id,tech_id,full_name,phone,request_type,description,claim_token) VALUES($1,$2,'Test','0501234567','new_appointment','Test request',$3)",
            ["30000000-0000-4000-8000-000000000004", alice, "e".repeat(64)],
          ));
          assert.equal(
            (await asRole("service_role", null, () => db.query(
              "SELECT public.submit_client_request_guarded($1,$2,'Test','0501234567','new_appointment','Test request',$3,$4,$5) AS result",
              ["30000000-0000-4000-8000-000000000002", alice, "a".repeat(64), "b".repeat(64), "c".repeat(64)],
            ))).rows[0].result,
            "submitted",
          );
          await denied(() =>
            asRole("anon", null, () =>
              db.query(
                "INSERT INTO public.client_requests(id,tech_id,full_name,phone,request_type,description,claim_token) VALUES($1,$2,'Test','0501234567','new_appointment','Test request',$3)",
                ["30000000-0000-4000-8000-000000000005", banned, "f".repeat(64)],
              ),
            ),
          );
          await denied(() =>
            asRole("anon", null, () => db.query("SELECT id FROM public.client_requests")),
          );
          assert.equal(
            (await asUser(alice, "SELECT id FROM public.client_requests WHERE id=$1", [request]))
              .rows.length,
            1,
          );
          assert.equal(
            (await asUser(bob, "SELECT id FROM public.client_requests WHERE id=$1", [request])).rows
              .length,
            0,
          );
          assert.equal(
            (await asUser(admin, "SELECT id FROM public.client_requests WHERE id=$1", [request]))
              .rows.length,
            1,
          );
          await denied(() =>
            asUser(
              banned,
              "INSERT INTO public.client_requests(id,tech_id,full_name,phone,request_type,description,claim_token) VALUES($1,$2,'Test','0501234567','new_appointment','Test request',$3)",
              ["30000000-0000-4000-8000-000000000003", alice, "d".repeat(64)],
            ),
          );
        },
      ],
      [
        "client request linking",
        async () => {
          assert.equal(
            (
              await asUser(bob, "SELECT public.claim_client_request($1,$2) AS claimed", [
                request,
                "c".repeat(64),
              ])
            ).rows[0].claimed,
            false,
          );
          await asRole("authenticated", bob, async () => {
            assert.equal(
              (
                await db.query("SELECT public.claim_client_request($1,$2) AS claimed", [
                  request,
                  token,
                ])
              ).rows[0].claimed,
              true,
            );
            const row = (
              await db.query(
                "SELECT customer_id,claim_token FROM public.client_requests WHERE id=$1",
                [request],
              )
            ).rows[0];
            assert.equal(row.customer_id, bob);
            assert.equal(row.claim_token, null);
            assert.equal(
              (
                await db.query(
                  "SELECT followed_id FROM public.user_follows WHERE follower_id=$1 AND followed_id=$2",
                  [bob, alice],
                )
              ).rows.length,
              1,
            );
          });
        },
      ],
      [
        "academy import, ownership and publication privacy",
        async () => {
          const courseId = "40000000-0000-4000-8000-000000000001";
          const legacy = {
            id: courseId,
            userId: admin,
            isPublished: true,
            publicId: courseId,
            title: "Test",
            category: "beginner",
            pricingInput: { privateCost: 42 },
            pricingOutput: { pricingTiers: { recommendedPrice: 100 }, privateProfit: 99 },
            content: {
              syllabusOverview: "overview",
              targetAudience: "students",
              prerequisites: "",
              studentKitIncluded: [],
              sessionsForStudent: [{ title: "lesson", secret: "hidden" }],
              instructorLessons: ["private"],
              certificationTerms: "",
              cancellationPolicy: "",
            },
            branding: { faqs: [], galleryImages: [] },
            landingProfile: { phone: "private-phone", businessName: "Studio" },
          };
          await denied(() =>
            asUser(alice, "SELECT public.import_academy_courses($1::jsonb)", [
              JSON.stringify([legacy]),
            ]),
          );
          await asRole("authenticated", admin, async () => {
            const imported = await db.query(
              "SELECT public.import_academy_courses($1::jsonb) AS count",
              [JSON.stringify([legacy])],
            );
            assert.equal(imported.rows[0].count, 1);
            const saved = (
              await db.query("SELECT course_data FROM public.academy_courses WHERE id=$1", [
                courseId,
              ])
            ).rows[0].course_data;
            assert.equal(saved.isPublished, undefined);
            assert.equal(saved.landingProfile.phone, "private-phone");
            assert.equal(
              (await db.query("SELECT public.public_academy_course($1) AS course", [courseId]))
                .rows[0].course,
              null,
            );
            await db.query("DELETE FROM public.academy_courses WHERE id=$1", [courseId]);
            assert.equal(
              (
                await db.query("SELECT public.import_academy_courses($1::jsonb) AS count", [
                  JSON.stringify([legacy]),
                ])
              ).rows[0].count,
              0,
            );
            assert.equal(
              (await db.query("SELECT id FROM public.academy_courses WHERE id=$1", [courseId])).rows
                .length,
              0,
            );
          });
          await denied(() =>
            asRole("anon", null, () => db.query("SELECT * FROM public.academy_courses")),
          );
          await denied(() =>
            asUser(banned, "SELECT public.import_academy_courses($1::jsonb)", [JSON.stringify([])]),
          );
          await denied(
            () =>
              asUser(
                instructor,
                "INSERT INTO public.academy_courses(id,owner_id,course_data) VALUES($1,$2,$3::jsonb)",
                [
                  "40000000-0000-4000-8000-000000000003",
                  instructor,
                  JSON.stringify({ content: { title: "<script>unsafe" } }),
                ],
              ),
            ["22023"],
          );
          await asRole("authenticated", instructor, async () => {
            const ownCourse = {
              ...legacy,
              id: "40000000-0000-4000-8000-000000000002",
              userId: instructor,
            };
            const result = await db.query(
              "INSERT INTO public.academy_courses(id,owner_id,course_data) VALUES($1,$2,$3::jsonb) RETURNING id",
              [ownCourse.id, instructor, JSON.stringify(ownCourse)],
            );
            assert.equal(result.rows.length, 1);
            assert.notEqual(
              (await db.query("SELECT public.public_academy_course($1) AS course", [ownCourse.id]))
                .rows[0].course,
              null,
            );
            await db.query(
              "UPDATE public.academy_courses SET course_data=course_data-'isPublished' WHERE id=$1",
              [ownCourse.id],
            );
            assert.equal(
              (await db.query("SELECT public.public_academy_course($1) AS course", [ownCourse.id]))
                .rows[0].course,
              null,
            );
            assert.equal(
              (
                await db.query("DELETE FROM public.academy_courses WHERE id=$1 RETURNING id", [
                  ownCourse.id,
                ])
              ).rows.length,
              1,
            );
          });
          await db.query(
            "INSERT INTO public.academy_courses(id,owner_id,course_data) VALUES ($1,$2,$3::jsonb)",
            [courseId, admin, JSON.stringify(legacy)],
          );
          try {
            assert.equal(
              (await asUser(alice, "SELECT id FROM public.academy_courses WHERE id=$1", [courseId]))
                .rows.length,
              0,
            );
            assert.equal(
              (
                await asUser(alice, "DELETE FROM public.academy_courses WHERE id=$1 RETURNING id", [
                  courseId,
                ])
              ).rows.length,
              0,
            );
            const exposed = (
              await asRole("anon", null, () =>
                db.query("SELECT public.public_academy_course($1) AS course", [courseId]),
              )
            ).rows[0].course;
            assert.equal(exposed.landingProfile.phone, "");
            assert.equal(exposed.pricingInput, undefined);
            assert.equal(exposed.pricingOutput, undefined);
            assert.equal(exposed.content.instructorLessons, undefined);
            assert.equal(exposed.content.sessionsForStudent[0].secret, undefined);
            assert.equal(
              (
                await asUser(banned, "SELECT public.public_academy_course($1) AS course", [
                  courseId,
                ])
              ).rows[0].course,
              null,
            );
          } finally {
            await db.query("DELETE FROM public.academy_courses WHERE id=$1", [courseId]);
          }
        },
      ],
      [
        "client roles cannot truncate",
        async () => {
          const { rows } = await db.query(`
            SELECT c.relname, r.rolname FROM pg_class c
            JOIN pg_namespace n ON n.oid=c.relnamespace AND n.nspname='public'
            CROSS JOIN (VALUES ('anon'),('authenticated')) r(rolname)
            WHERE c.relkind IN ('r','p')
              AND (has_table_privilege(r.rolname,c.oid,'TRUNCATE')
                OR has_table_privilege(r.rolname,c.oid,'REFERENCES')
                OR has_table_privilege(r.rolname,c.oid,'TRIGGER'))`);
          assert.deepEqual(rows, []);
          assert.equal(
            (
              await db.query(
                "SELECT has_table_privilege('authenticated','public.posts','INSERT') AS ok",
              )
            ).rows[0].ok,
            true,
          );
        },
      ],
      [
        "premium access and trigger cleanup",
        async () => {
          await denied(() =>
            asUser(
              alice,
              "INSERT INTO public.premium_subscriptions(user_id,status,expires_at) VALUES($1,'active',now()+interval '1 day')",
              [alice],
            ),
          );
          assert.equal(
            (
              await db.query(
                "SELECT count(*)::int AS count FROM pg_trigger WHERE tgrelid='public.posts'::regclass AND tgname IN ('posts_safe_text','validate_plain_text') AND NOT tgisinternal",
              )
            ).rows[0].count,
            1,
          );
        },
      ],
    ];
    for (const [name, check] of checks) {
      await check();
      const scenario = targetSignupDrift
        ? "target signup drift upgrade"
        : priorManualRepair
          ? "manual-repair upgrade"
          : "fresh database";
      console.log(`PASS ${scenario}: ${name}`);
    }
  } finally {
    await db.close();
  }
}

await run(
  process.argv.includes("--prior-manual-feed"),
  process.argv.includes("--target-signup-drift"),
);

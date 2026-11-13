import { createHash } from "node:crypto";

const knownTestPolicies = [
  "allow all uploads and reads 1rma4z_0",
  "allow all uploads and reads 1rma4z_1",
  "allow all uploads and reads 1rma4z_2",
  "allow all uploads and reads 1rma4z_3",
];

export async function schemaFingerprint(tx, detailed = false) {
  const tables = await tx`SELECT c.relname AS key, c.relkind AS kind, c.relrowsecurity AS rls,
      c.relforcerowsecurity AS forced, pg_get_userbyid(c.relowner) AS owner,
      ARRAY[
        has_table_privilege('anon', c.oid, 'SELECT'), has_table_privilege('anon', c.oid, 'INSERT'),
        has_table_privilege('anon', c.oid, 'UPDATE'), has_table_privilege('anon', c.oid, 'DELETE'),
        has_table_privilege('anon', c.oid, 'TRUNCATE'), has_table_privilege('anon', c.oid, 'TRIGGER'),
        has_table_privilege('anon', c.oid, 'REFERENCES'),
        has_table_privilege('authenticated', c.oid, 'SELECT'), has_table_privilege('authenticated', c.oid, 'INSERT'),
        has_table_privilege('authenticated', c.oid, 'UPDATE'), has_table_privilege('authenticated', c.oid, 'DELETE'),
        has_table_privilege('authenticated', c.oid, 'TRUNCATE'), has_table_privilege('authenticated', c.oid, 'TRIGGER'),
        has_table_privilege('authenticated', c.oid, 'REFERENCES'),
        has_table_privilege('service_role', c.oid, 'SELECT'), has_table_privilege('service_role', c.oid, 'INSERT'),
        has_table_privilege('service_role', c.oid, 'UPDATE'), has_table_privilege('service_role', c.oid, 'DELETE')
      ]::text AS grants
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') ORDER BY 1`;
  const columns =
    await tx`SELECT c.relname || '.' || a.attname AS key, format_type(a.atttypid,a.atttypmod) AS type,
      a.attnotnull AS not_null, pg_get_expr(d.adbin,d.adrelid) AS default_value,
      a.attidentity AS identity, a.attgenerated AS generated,
      ARRAY[
        has_column_privilege('anon',c.oid,a.attnum,'SELECT'), has_column_privilege('anon',c.oid,a.attnum,'INSERT'),
        has_column_privilege('anon',c.oid,a.attnum,'UPDATE'),
        has_column_privilege('authenticated',c.oid,a.attnum,'SELECT'), has_column_privilege('authenticated',c.oid,a.attnum,'INSERT'),
        has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE'),
        has_column_privilege('service_role',c.oid,a.attnum,'SELECT'), has_column_privilege('service_role',c.oid,a.attnum,'INSERT'),
        has_column_privilege('service_role',c.oid,a.attnum,'UPDATE')
      ]::text AS grants
    FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
    WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m') AND a.attnum>0 AND NOT a.attisdropped ORDER BY 1`;
  const constraints = await tx`SELECT c.relname || '.' || k.conname AS key, k.contype AS type,
      k.convalidated AS validated, pg_get_constraintdef(k.oid) AS definition
    FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' ORDER BY 1`;
  const indexes =
    await tx`SELECT t.relname || '.' || c.relname AS key, pg_get_indexdef(c.oid) AS definition,
      i.indisvalid AS valid, i.indisready AS ready, i.indislive AS live
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    JOIN pg_index i ON i.indexrelid=c.oid JOIN pg_class t ON t.oid=i.indrelid
    WHERE n.nspname='public' ORDER BY 1`;
  const policies = await tx`SELECT schemaname || '.' || tablename || '.' || policyname AS key,
      permissive, roles::text, cmd, qual, with_check
    FROM pg_policies WHERE schemaname='public' OR
      (schemaname='storage' AND tablename='objects' AND NOT (policyname = ANY(${knownTestPolicies})))
    ORDER BY 1`;
  const functions =
    await tx`SELECT p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS key,
      p.prosecdef AS definer, pg_get_userbyid(p.proowner) AS owner, p.proconfig::text AS config,
      pg_get_functiondef(p.oid) AS definition,
      has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
      has_function_privilege('authenticated',p.oid,'EXECUTE') AS auth_execute,
      has_function_privilege('service_role',p.oid,'EXECUTE') AS service_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.prokind='f' ORDER BY 1`;
  for (const fn of functions) {
    if (fn.key === "validate_feed_metadata()") {
      fn.definition = fn.definition.replace(/^ {3}IF /gm, "  IF ");
    }
  }
  const triggers = await tx`SELECT n.nspname || '.' || c.relname || '.' || t.tgname AS key,
      t.tgenabled AS enabled, pg_get_triggerdef(t.oid) AS definition
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE NOT t.tgisinternal AND (n.nspname='public' OR (n.nspname='auth' AND c.relname='users')) ORDER BY 1`;
  const views =
    await tx`SELECT c.relname AS key, pg_get_viewdef(c.oid,true) AS definition, c.reloptions::text AS options
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('v','m') ORDER BY 1`;
  const enums =
    await tx`SELECT t.typname AS key, array_agg(e.enumlabel ORDER BY e.enumsortorder)::text AS values
    FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace JOIN pg_enum e ON e.enumtypid=t.oid
    WHERE n.nspname='public' GROUP BY t.typname ORDER BY 1`;
  const sequences = await tx`SELECT c.relname AS key, pg_get_userbyid(c.relowner) AS owner,
      format_type(s.seqtypid,NULL) AS type, s.seqstart AS start_value, s.seqincrement AS increment,
      s.seqmin AS min_value, s.seqmax AS max_value, s.seqcache AS cache, s.seqcycle AS cycle,
      has_sequence_privilege('anon',c.oid,'USAGE') AS anon_usage,
      has_sequence_privilege('authenticated',c.oid,'USAGE') AS auth_usage,
      has_sequence_privilege('service_role',c.oid,'USAGE') AS service_usage
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_sequence s ON s.seqrelid=c.oid
    WHERE n.nspname='public' ORDER BY 1`;
  const data = {
    tables,
    columns,
    constraints,
    indexes,
    policies,
    functions,
    triggers,
    views,
    enums,
    sequences,
  };
  for (const rows of Object.values(data)) {
    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === "string") row[key] = value.replace(/\r\n/g, "\n");
      }
    }
  }
  if (detailed === "rows") return data;
  if (detailed) {
    return Object.fromEntries(
      Object.entries(data).map(([name, rows]) => [
        name,
        createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
      ]),
    );
  }
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
}

export async function productionBlockers(tx) {
  const [storage] = await tx`SELECT count(*)::int AS n FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND permissive='PERMISSIVE' AND roles=ARRAY['authenticated']::name[]
      AND (
        (policyname=${knownTestPolicies[0]} AND cmd='SELECT' AND qual='false' AND with_check IS NULL)
        OR (policyname=${knownTestPolicies[1]} AND cmd='INSERT' AND qual IS NULL AND with_check='false')
        OR (policyname=${knownTestPolicies[2]} AND cmd='UPDATE' AND qual='false' AND with_check='false')
        OR (policyname=${knownTestPolicies[3]} AND cmd='DELETE' AND qual='false' AND with_check IS NULL)
      )`;
  const [defaults] = await tx`SELECT count(*)::int AS n FROM pg_default_acl d
    LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace CROSS JOIN LATERAL aclexplode(d.defaclacl) a
    WHERE (n.nspname='public' OR d.defaclnamespace=0) AND d.defaclobjtype='r'
      AND (a.grantee=0 OR pg_get_userbyid(a.grantee) IN ('anon','authenticated'))
      AND (d.defaclrole <> 'supabase_admin'::regrole
        OR d.defaclnamespace <> 'public'::regnamespace
        OR a.grantee NOT IN ('anon'::regrole, 'authenticated'::regrole))
      AND a.privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')`;
  const [maintain] =
    await tx`SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','p')
      AND (has_table_privilege('anon',c.oid,'MAINTAIN') OR has_table_privilege('authenticated',c.oid,'MAINTAIN'))`;
  const [bucket] =
    await tx`SELECT count(*)::int AS n FROM storage.buckets WHERE id='story-stickers' AND NOT public`;
  const blockers = [];
  if (storage.n !== 4)
    blockers.push("Four known broad Storage policies must be remediated and reviewed");
  if (defaults.n) blockers.push("Unsafe default table privileges for client roles must be revoked");
  if (maintain.n)
    blockers.push(
      "Client MAINTAIN privileges on existing public tables must be reviewed and revoked",
    );
  if (bucket.n !== 1) blockers.push("The private story-stickers bucket must exist");
  return blockers;
}

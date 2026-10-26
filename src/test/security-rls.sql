SELECT t AS test,
  NOT has_table_privilege('anon', 'public.' || t, 'SELECT')
  AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='SELECT' AND qual LIKE '%auth.uid()%' AND qual LIKE '%has_role%' AND roles='{authenticated}')
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd IN ('SELECT','ALL') AND qual='true')
  AS passed
FROM unnest(ARRAY['profiles','health_declarations','insurance_leads','model_calls','job_posts','nail_trade_items']) t;
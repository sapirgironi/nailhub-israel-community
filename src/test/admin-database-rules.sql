-- Run as a privileged, read-only schema regression check after migrations.
SELECT 'new trade submissions await approval' AS test,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='nail_trade_items' AND column_name='status' AND column_default='''pending''::text')
  AND EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.nail_trade_items'::regclass AND tgname='trade_approval' AND tgenabled='O') AS passed;
SELECT 'administrators can approve and reject pending items' AS test,
  EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='nail_trade_items' AND cmd='UPDATE' AND qual LIKE '%has_role%admin%')
  AND EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.nail_trade_items'::regclass AND pg_get_constraintdef(oid) LIKE '%pending%approved%rejected%') AS passed;
SELECT 'permanent bans deny every application table' AS test,
  NOT EXISTS (SELECT 1 FROM pg_tables t WHERE t.schemaname='public' AND t.rowsecurity AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname=t.schemaname AND p.tablename=t.tablename AND p.permissive='RESTRICTIVE' AND p.cmd='ALL' AND p.qual LIKE '%is_account_banned%')) AS passed;
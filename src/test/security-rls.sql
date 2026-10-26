-- Run through the project database query CLI; all changes roll back.
BEGIN;
SELECT set_config('request.jwt.claim.sub', (SELECT id::text FROM public.profiles ORDER BY created_at LIMIT 1), true);
SET LOCAL ROLE authenticated;
SELECT 'owner_visible' AS test, count(*) = 1 AS passed FROM public.profiles WHERE id = auth.uid();
SELECT 'other_profiles_hidden' AS test, count(*) = 0 AS passed FROM public.profiles WHERE id <> auth.uid();
SELECT 'other_health_hidden' AS test, count(*) = 0 AS passed FROM public.health_declarations WHERE user_id IS DISTINCT FROM auth.uid();
SELECT 'other_insurance_hidden' AS test, count(*) = 0 AS passed FROM public.insurance_leads WHERE user_id IS DISTINCT FROM auth.uid();
SELECT 'other_jobs_hidden' AS test, count(*) = 0 AS passed FROM public.job_posts WHERE user_id IS DISTINCT FROM auth.uid();
SELECT 'other_models_hidden' AS test, count(*) = 0 AS passed FROM public.model_calls WHERE user_id IS DISTINCT FROM auth.uid();
SELECT 'other_trade_hidden' AS test, count(*) = 0 AS passed FROM public.nail_trade_items WHERE seller_id <> auth.uid();
ROLLBACK;
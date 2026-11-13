-- RLS does not protect TRUNCATE, so client roles must never hold it (or REFERENCES/TRIGGER).
REVOKE TRUNCATE, REFERENCES, TRIGGER ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon, authenticated;
--> statement-breakpoint
-- The target project had profiles policies defined while RLS itself was disabled.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

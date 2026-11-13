CREATE TABLE public.client_request_rate_events (
  source_hash text NOT NULL,
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_request_rate_source_hash_valid CHECK (source_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT client_request_rate_fingerprint_valid CHECK (fingerprint ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE INDEX client_request_rate_source_created_idx ON public.client_request_rate_events (source_hash, created_at);
--> statement-breakpoint
CREATE INDEX client_request_rate_created_idx ON public.client_request_rate_events (created_at);
--> statement-breakpoint
ALTER TABLE public.client_request_rate_events ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
REVOKE ALL ON public.client_request_rate_events FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT ALL ON public.client_request_rate_events TO service_role;
--> statement-breakpoint
CREATE FUNCTION public.submit_client_request_guarded(
  p_request_id uuid, p_tech_id uuid, p_full_name text, p_phone text,
  p_request_type text, p_description text, p_claim_token text,
  p_source_hash text, p_fingerprint text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recent_count integer;
BEGIN
  IF p_source_hash !~ '^[0-9a-f]{64}$' OR p_fingerprint !~ '^[0-9a-f]{64}$'
     OR p_source_hash IS NULL OR p_fingerprint IS NULL THEN
    RAISE EXCEPTION 'Invalid request identity' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_source_hash, 0));
  DELETE FROM public.client_request_rate_events WHERE ctid IN (
    SELECT ctid FROM public.client_request_rate_events
    WHERE created_at <= now() - interval '1 hour' ORDER BY created_at LIMIT 100
  );
  SELECT count(*) INTO recent_count FROM public.client_request_rate_events
  WHERE source_hash = p_source_hash AND created_at > now() - interval '1 hour';
  IF recent_count >= 5 THEN RETURN 'rate_limited'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.client_request_rate_events
    WHERE source_hash = p_source_hash AND fingerprint = p_fingerprint
      AND created_at > now() - interval '1 hour'
  ) THEN RETURN 'duplicate'; END IF;
  IF NOT public.is_public_request_tech(p_tech_id) THEN RETURN 'invalid_technician'; END IF;
  INSERT INTO public.client_requests (id, tech_id, full_name, phone, request_type, description, claim_token)
  VALUES (p_request_id, p_tech_id, p_full_name, p_phone, p_request_type, p_description, p_claim_token);
  INSERT INTO public.client_request_rate_events (source_hash, fingerprint)
  VALUES (p_source_hash, p_fingerprint);
  RETURN 'submitted';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.submit_client_request_guarded(uuid, uuid, text, text, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.submit_client_request_guarded(uuid, uuid, text, text, text, text, text, text, text) TO service_role;

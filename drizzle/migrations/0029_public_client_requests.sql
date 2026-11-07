CREATE TABLE public.client_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tech_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 120),
  phone text NOT NULL CHECK (phone ~ '^\+?[0-9 ()-]{7,30}$'),
  request_type text NOT NULL CHECK (
    request_type IN ('urgent_repair', 'reschedule', 'new_appointment', 'other')
  ),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 2 AND 1000),
  claim_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_requests_claim_token_valid CHECK (
    claim_token IS NULL OR claim_token ~ '^[0-9a-f]{64}$'
  )
);

CREATE INDEX client_requests_tech_created_idx
  ON public.client_requests (tech_id, created_at DESC);
CREATE INDEX client_requests_customer_idx
  ON public.client_requests (customer_id)
  WHERE customer_id IS NOT NULL;

REVOKE ALL ON public.client_requests FROM PUBLIC, anon, authenticated;
GRANT INSERT (id, tech_id, full_name, phone, request_type, description, claim_token)
  ON public.client_requests TO anon, authenticated;
GRANT SELECT ON public.client_requests TO authenticated;
GRANT ALL ON public.client_requests TO service_role;
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.is_public_request_tech(target_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles technician
    WHERE technician.id = target_user
      AND technician.account_role IN ('nail_tech', 'instructor')
      AND coalesce(technician.account_status, 'active') = 'active'
      AND NOT public.is_account_banned(technician.id)
  );
$$;

REVOKE ALL ON FUNCTION public.is_public_request_tech(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_request_tech(uuid) TO anon, authenticated;

CREATE POLICY "Public client requests can be submitted to active technicians"
  ON public.client_requests FOR INSERT TO anon, authenticated
  WITH CHECK (
    customer_id IS NULL
    AND claim_token IS NOT NULL
    AND (auth.uid() IS NULL OR NOT public.is_account_banned(auth.uid()))
    AND public.is_public_request_tech(tech_id)
  );

CREATE POLICY "Technicians and linked clients read their own requests"
  ON public.client_requests FOR SELECT TO authenticated
  USING (
    NOT public.is_account_banned(auth.uid())
    AND (
      tech_id = auth.uid()
      OR customer_id = auth.uid()
      OR public.has_role(auth.uid(), 'admin'::public.app_role)
    )
  );

CREATE TRIGGER client_requests_plain_text
  BEFORE INSERT OR UPDATE ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.validate_application_text();

CREATE FUNCTION public.claim_client_request(p_request_id uuid, p_claim_token text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_tech_id uuid;
BEGIN
  IF auth.uid() IS NULL OR public.is_account_banned(auth.uid()) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles customer
    WHERE customer.id = auth.uid()
      AND coalesce(customer.account_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Active customer profile required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.client_requests request
  SET customer_id = auth.uid(), claim_token = NULL
  WHERE request.id = p_request_id
    AND request.claim_token = p_claim_token
    AND request.customer_id IS NULL
    AND request.tech_id <> auth.uid()
    AND public.is_public_request_tech(request.tech_id)
  RETURNING request.tech_id INTO request_tech_id;

  IF request_tech_id IS NULL THEN
    SELECT request.tech_id
    INTO request_tech_id
    FROM public.client_requests request
    WHERE request.id = p_request_id
      AND request.customer_id = auth.uid();
  END IF;

  IF request_tech_id IS NULL THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_follows (follower_id, followed_id)
  VALUES (auth.uid(), request_tech_id)
  ON CONFLICT (follower_id, followed_id) DO NOTHING;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_client_request(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_client_request(uuid, text) TO authenticated;

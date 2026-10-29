CREATE OR REPLACE FUNCTION public.prevent_sensitive_profile_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  oauth_profile_completion boolean;
BEGIN
  oauth_profile_completion :=
    auth.uid() = OLD.id
    AND coalesce(auth.jwt()->'app_metadata'->>'provider', '') IN ('google', 'apple')
    AND coalesce(OLD.business_name, '') = ''
    AND coalesce(NEW.business_name, '') <> '';
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    IF oauth_profile_completion THEN
      NEW.account_status := CASE WHEN NEW.account_role = 'supplier' THEN 'pending_approval' ELSE 'active' END;
    ELSE
      NEW.account_role := OLD.account_role;
      NEW.account_status := OLD.account_status;
    END IF;
    NEW.is_verified := OLD.is_verified;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TABLE public.price_list_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(), service_name text NOT NULL, price_nis numeric NOT NULL CHECK (price_nis >= 0), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.price_list_items TO authenticated;
GRANT ALL ON public.price_list_items TO service_role;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin read" ON public.price_list_items FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Owner write" ON public.price_list_items FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE TRIGGER validate_plain_text BEFORE INSERT OR UPDATE ON public.price_list_items FOR EACH ROW EXECUTE FUNCTION public.validate_application_text();
CREATE FUNCTION public.validate_tool_inputs() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
IF TG_TABLE_NAME='health_declarations' AND (NEW.id_number !~ '^[0-9]{9}$' OR length(NEW.signature_image)>500000 OR NEW.signature_image !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$') THEN RAISE EXCEPTION 'Invalid identity or signature' USING ERRCODE='22023'; END IF;
IF TG_TABLE_NAME='insurance_leads' AND (NEW.id_number !~ '^[0-9]{9}$' OR NEW.equipment_value_nis<0 OR NEW.email !~ '^[^ @]+@[^ @]+\.[^ @]+$') THEN RAISE EXCEPTION 'Invalid insurance input' USING ERRCODE='22023'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER validate_tool_inputs BEFORE INSERT OR UPDATE ON public.health_declarations FOR EACH ROW EXECUTE FUNCTION public.validate_tool_inputs();
CREATE TRIGGER validate_tool_inputs BEFORE INSERT OR UPDATE ON public.insurance_leads FOR EACH ROW EXECUTE FUNCTION public.validate_tool_inputs();
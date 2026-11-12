import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";

export async function signInWithOAuth(provider: "google" | "apple", redirectTo: string) {
  const mode = import.meta.env["VITE_SUPABASE_OAUTH_MODE"];
  if (!mode || mode === "lovable") {
    return lovable.auth.signInWithOAuth(provider, { redirect_uri: redirectTo });
  }
  if (mode !== "supabase") {
    throw new Error("Invalid OAuth configuration");
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) return { redirected: false, error };
  if (!data.url) return { redirected: false, error: new Error("Missing OAuth redirect URL") };
  return { redirected: true, error: null };
}

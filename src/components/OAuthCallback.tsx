import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    let finished = false;
    const finish = () => {
      if (!active || finished) return;
      finished = true;
      void navigate({ to: "/feed", search: { compose: false }, replace: true });
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish();
    });

    void supabase.auth
      .getSession()
      .then(({ error }) => {
        if (error) console.error("Could not complete OAuth callback", error);
        finish();
      })
      .catch((error: unknown) => {
        console.error("Could not complete OAuth callback", error);
        finish();
      });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main dir="rtl" className="min-h-screen grid place-items-center text-muted-foreground">
      <p role="status">משלימה את ההתחברות...</p>
    </main>
  );
}

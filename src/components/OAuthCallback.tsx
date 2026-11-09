import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export function OAuthCallback() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let finished = false;
    const finish = () => {
      if (!active || finished) return;
      finished = true;
      void navigate({ to: "/feed", search: { compose: false }, replace: true });
    };
    const fail = (error?: unknown) => {
      if (error) console.error("Could not complete OAuth callback", error);
      if (active && !finished) setFailed(true);
    };
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setFailed(false);
        finish();
      }
    });

    void supabase.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (sessionData.session) finish();
        else fail(error);
      })
      .catch(fail);

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <main dir="rtl" className="min-h-screen grid place-items-center text-muted-foreground">
      {failed ? (
        <div className="text-center space-y-3">
          <p role="alert">ההתחברות לא הושלמה. נסי שוב.</p>
          <Link to="/" className="underline">
            חזרה למסך ההתחברות
          </Link>
        </div>
      ) : (
        <p role="status">משלימה את ההתחברות...</p>
      )}
    </main>
  );
}

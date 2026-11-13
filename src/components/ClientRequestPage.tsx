import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signInWithOAuth } from "@/lib/oauth";
import {
  clientRequestSchema,
  CLIENT_REQUEST_TYPES,
  newClientRequestClaimToken,
} from "@/lib/client-request";
import { hebrewError } from "@/lib/hebrew-errors";
import { submitClientRequest } from "@/lib/client-request.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "./ui/button";
import { ClientConfirmationScreen } from "./ClientConfirmationScreen";

type PendingRequest = { requestId: string; claimToken: string; techId: string };
const REQUEST_PENDING_KEY = "nailhub_pending_client_request";
const REQUEST_CONFIRMATION_PREFIX = "nailhub_client_request_confirmation_";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ClientRequestPage({ techId }: { techId: string }) {
  const navigate = useNavigate();
  const submitRequest = useServerFn(submitClientRequest);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    requestType: "new_appointment" as (typeof CLIENT_REQUEST_TYPES)[number]["value"],
    description: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [linked, setLinked] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const linkingToken = useRef<string | null>(null);

  useEffect(() => {
    if (!uuidPattern.test(techId)) return;
    try {
      setSubmitted(Boolean(localStorage.getItem(`${REQUEST_CONFIRMATION_PREFIX}${techId}`)));
    } catch (error) {
      setMessage(hebrewError(error, "לא ניתן לשחזר את מצב הפנייה במכשיר הזה."));
    }

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) {
          setMessage(hebrewError(error, "לא ניתן לבדוק את מצב ההתחברות."));
          return;
        }
        setUserId(data.session?.user.id ?? null);
      })
      .catch((error: unknown) => {
        setMessage(hebrewError(error, "לא ניתן לבדוק את מצב ההתחברות."));
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [techId]);

  useEffect(() => {
    if (!userId || !submitted) return;
    const pending = readPendingRequest(techId);
    if (!pending) return;
    void claimRequest(pending);
  }, [submitted, techId, userId]);

  async function claimRequest(pending: PendingRequest) {
    if (linkingToken.current === pending.claimToken) return;
    linkingToken.current = pending.claimToken;
    setMessage("");
    try {
      const { data, error } = await supabase.rpc("claim_client_request", {
        p_request_id: pending.requestId,
        p_claim_token: pending.claimToken,
      });
      if (error) throw error;
      if (!data) throw new Error("לא ניתן לקשר את הפנייה לחשבון הזה.");
      setLinked(true);
      setMessage("");
      try {
        localStorage.removeItem(REQUEST_PENDING_KEY);
      } catch (storageError) {
        console.error("Could not clear claimed public request state", storageError);
        setMessage("הפנייה קושרה לחשבון, אך פרטי הקישור לא נמחקו מהמכשיר.");
      }
    } catch (error) {
      setMessage(hebrewError(error, "הפנייה נשלחה, אך קישור החשבון לא הושלם. נסי שוב."));
    } finally {
      linkingToken.current = null;
      setAuthLoading(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    const parsed = clientRequestSchema.safeParse(form);
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "בדקי את הפרטים שהזנת.");
      return;
    }
    if (!uuidPattern.test(techId)) {
      setErrorMessage("קישור הטכנאית אינו תקין.");
      return;
    }

    setBusy(true);
    try {
      const claimToken = newClientRequestClaimToken();
      const requestId = crypto.randomUUID();
      const result = await submitRequest({ data: { ...parsed.data, techId, requestId, claimToken } });
      if (result !== "submitted") {
        setErrorMessage(
          result === "rate_limited" ? "נשלחו יותר מדי פניות ממקור זה. נסי שוב בעוד שעה."
            : result === "duplicate" ? "פנייה זהה כבר נשלחה לאחרונה."
            : "לא ניתן לשלוח פנייה לטכנאית הזו כרגע.",
        );
        return;
      }

      const pending: PendingRequest = { requestId, claimToken, techId };
      setSubmitted(true);
      try {
        localStorage.setItem(`${REQUEST_CONFIRMATION_PREFIX}${techId}`, requestId);
        localStorage.setItem(REQUEST_PENDING_KEY, JSON.stringify(pending));
      } catch (storageError) {
        setMessage(
          hebrewError(storageError, "הפנייה נשמרה, אך לא ניתן לשמור את פרטי קישור החשבון במכשיר."),
        );
      }
      setForm((current) => ({ ...current, description: "" }));
    } catch (error) {
      setErrorMessage(hebrewError(error, "שליחת הפנייה נכשלה. נסי שוב."));
    } finally {
      setBusy(false);
    }
  }

  async function connectWithGoogle() {
    setMessage("");
    setAuthLoading(true);
    try {
      if (userId) {
        const pending = readPendingRequest(techId);
        if (!pending) {
          setMessage("הפנייה כבר נשלחה, אך פרטי הקישור אינם זמינים במכשיר הזה.");
          setAuthLoading(false);
          return;
        }
        await claimRequest(pending);
        return;
      }

      const result = await signInWithOAuth(
        "google",
        `${window.location.origin}/request/${encodeURIComponent(techId)}`,
      );
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUserId(data.session?.user.id ?? null);
        if (!data.session) {
          setMessage("ההתחברות לא הושלמה. נסי שוב.");
          setAuthLoading(false);
        }
      }
    } catch (error) {
      setMessage(hebrewError(error, "לא ניתן להתחבר באמצעות Google כרגע. נסי שוב."));
      setAuthLoading(false);
    }
  }

  async function dismiss() {
    try {
      localStorage.removeItem(`${REQUEST_CONFIRMATION_PREFIX}${techId}`);
      localStorage.removeItem(REQUEST_PENDING_KEY);
    } catch (error) {
      console.error("Could not clear public request state", error);
    }
    await navigate({ to: "/" });
  }

  if (!uuidPattern.test(techId)) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center" dir="rtl">
        <h1 className="text-xl font-bold">קישור הפנייה אינו תקין</h1>
        <Button asChild className="mt-4">
          <Link to="/">
            <ArrowRight />
            לעמוד הבית
          </Link>
        </Button>
      </main>
    );
  }

  if (submitted) {
    return (
      <ClientConfirmationScreen
        onGoogleLogin={() => void connectWithGoogle()}
        onDismiss={() => void dismiss()}
        authLoading={authLoading}
        linked={linked}
        message={message}
      />
    );
  }

  return (
    <main
      className="min-h-screen bg-gradient-to-b from-primary/5 to-background px-4 py-10"
      dir="rtl"
    >
      <section className="mx-auto max-w-xl rounded-3xl border border-border bg-card p-5 shadow-soft sm:p-8">
        <header className="mb-6">
          <p className="text-sm font-bold text-primary">NailHub · פנייה אישית</p>
          <h1 className="mt-2 text-2xl font-black">איך אפשר לעזור לך?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            מלאי את הפרטים והטכנאית תחזור אלייך בהקדם.
          </p>
        </header>

        <form onSubmit={submit} className="space-y-5">
          <label className="block space-y-1.5 text-sm font-semibold">
            שם מלא
            <input
              required
              autoComplete="name"
              maxLength={120}
              value={form.fullName}
              onChange={(event) =>
                setForm((current) => ({ ...current, fullName: event.target.value }))
              }
              className="w-full rounded-xl border border-input bg-card px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block space-y-1.5 text-sm font-semibold">
            טלפון
            <input
              required
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={30}
              value={form.phone}
              onChange={(event) =>
                setForm((current) => ({ ...current, phone: event.target.value }))
              }
              className="w-full rounded-xl border border-input bg-card px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold">סוג הבקשה</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {CLIENT_REQUEST_TYPES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={form.requestType === value}
                  onClick={() => setForm((current) => ({ ...current, requestType: value }))}
                  className={`min-h-12 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                    form.requestType === value
                      ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                      : "border-border bg-muted/30 hover:bg-accent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block space-y-1.5 text-sm font-semibold">
            תיאור קצר
            <textarea
              required
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
              }
              className="w-full resize-y rounded-xl border border-input bg-card px-3 py-3 font-normal outline-none focus:ring-2 focus:ring-ring"
              placeholder="כתבי בקצרה במה מדובר..."
            />
          </label>
          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}
          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl py-6 text-base font-bold"
          >
            <Send aria-hidden="true" />
            {busy ? "שולחת..." : "שליחת פנייה"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            הפרטים ישמשו למענה על הפנייה בלבד.
          </p>
        </form>
      </section>
    </main>
  );
}

function readPendingRequest(techId: string): PendingRequest | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(REQUEST_PENDING_KEY) ?? "null");
    if (
      typeof value === "object" &&
      value !== null &&
      "requestId" in value &&
      "claimToken" in value &&
      "techId" in value &&
      typeof value.requestId === "string" &&
      uuidPattern.test(value.requestId) &&
      typeof value.claimToken === "string" &&
      /^[0-9a-f]{64}$/.test(value.claimToken) &&
      value.techId === techId
    ) {
      return value as PendingRequest;
    }
    return null;
  } catch (error) {
    console.error("Could not read public request state", error);
    return null;
  }
}

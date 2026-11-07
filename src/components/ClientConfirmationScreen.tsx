import { Check } from "lucide-react";
import { Button } from "./ui/button";

export function ClientConfirmationScreen({
  onGoogleLogin,
  onDismiss,
  authLoading,
  linked,
  message,
}: {
  onGoogleLogin: () => void;
  onDismiss: () => void;
  authLoading: boolean;
  linked: boolean;
  message: string;
}) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4 text-foreground"
      dir="rtl"
    >
      <section className="w-full max-w-md space-y-6 rounded-3xl border border-border bg-card p-6 text-center shadow-soft sm:p-8">
        <div className="mx-auto grid size-20 place-items-center rounded-full bg-rose-glam text-primary-foreground shadow-glow">
          <Check aria-hidden="true" className="size-10" strokeWidth={3} />
        </div>
        <div>
          <h1 className="text-2xl font-black">הפנייה נשלחה בהצלחה! ✨</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            הטכנאית קיבלה את ההודעה ותחזור אלייך בהקדם.
          </p>
        </div>

        <div className="border-t border-border" />

        <div className="space-y-3 rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 to-orange-50/60 p-5 text-right">
          <h2 className="flex items-center gap-2 font-bold">
            <span aria-hidden="true" className="text-xl">
              💅
            </span>
            רוצה להישאר מחוברת?
          </h2>
          <p className="text-xs leading-relaxed text-muted-foreground">
            פתחי אזור אישי בחינם כדי לשמור השראות ולהתעדכן. אם תבחרי ב־Google, הפנייה הזו תקושר
            לפרופיל שלך וגם לפרופיל הטכנאית.
          </p>
          {linked ? (
            <p
              role="status"
              className="rounded-xl bg-success-soft p-3 text-sm font-bold text-success"
            >
              הפנייה קושרה לחשבון שלך ולטכנאית.
            </p>
          ) : (
            <Button
              type="button"
              onClick={onGoogleLogin}
              disabled={authLoading}
              className="mt-2 w-full bg-card text-foreground shadow-soft hover:bg-accent"
              variant="outline"
            >
              <GoogleIcon />
              {authLoading ? "מתחברת..." : "פתיחת אזור אישי מהיר עם Google"}
            </Button>
          )}
          {message && (
            <p role="status" className="text-xs text-muted-foreground">
              {message}
            </p>
          )}
        </div>

        <Button type="button" variant="ghost" onClick={onDismiss}>
          לא עכשיו, תודה
        </Button>
      </section>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" className="size-5">
      <path
        fill="#4285F4"
        d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15Z"
      />
      <path
        fill="#34A853"
        d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4 1.9-6.9 1.9-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44Z"
      />
      <path fill="#FBBC05" d="M12.6 27.5a12 12 0 0 1 0-7V15H5.8a20 20 0 0 0 0 18l6.8-5.5Z" />
      <path
        fill="#EA4335"
        d="M24 12.1c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 6 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.5C14.2 15.7 18.7 12.1 24 12.1Z"
      />
    </svg>
  );
}

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "nailhub-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    if (dismissed) return;
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setDeferred(null);
  };

  const install = async () => {
    const event = deferred;
    setDeferred(null);
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === "dismissed") dismiss();
  };

  return (
    <div
      dir="rtl"
      role="region"
      aria-label="התקנת האפליקציה"
      className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-card p-3 text-right shadow-soft md:bottom-4"
    >
      <p className="flex-1 text-sm font-bold text-foreground">
        התקיני את NailHub לגישה מהירה מהנייד
      </p>
      <Button type="button" size="sm" onClick={() => void install()}>
        <Download className="h-4 w-4" />
        התקנה
      </Button>
      <button type="button" aria-label="סגירה" onClick={dismiss} className="p-1 text-muted-foreground">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

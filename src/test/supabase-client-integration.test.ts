import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  localStorage.clear();
});

describe("Supabase authentication requests", () => {
  it("sends login and signup to the configured project using the public key", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(
        new Response(
          JSON.stringify({ code: "invalid_credentials", msg: "Invalid login credentials" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", "X-Supabase-Api-Version": "2024-01-01" },
          },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetch);
    const { supabase } = await import("@/integrations/supabase/client");
    const credentials = { email: "example@example.test", password: "example-password" };
    const { error } = await supabase.auth.signInWithPassword(credentials);
    expect(error?.code).toBe("invalid_credentials");
    await supabase.auth.signUp(credentials);
    expect(fetch.mock.calls.map(([url]) => String(url))).toEqual([
      "https://example.supabase.co/auth/v1/token?grant_type=password",
      "https://example.supabase.co/auth/v1/signup",
    ]);
    for (const [, init] of fetch.mock.calls) {
      const headers = new Headers(init?.headers);
      const key = headers.get("apikey");
      expect(key).toBe("sb_publishable_test");
      expect(headers.get("authorization")).toBeNull();
    }
  });
});

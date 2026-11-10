import { afterEach, describe, expect, it, vi } from "vitest";

const createClient = vi.hoisted(() =>
  vi.fn((_url: string, _key: string, _options: { global: { fetch: typeof globalThis.fetch } }) => ({
    marker: true,
  })),
);
vi.mock("@supabase/supabase-js", () => ({ createClient }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
  createClient.mockClear();
});

describe("Supabase client configuration", () => {
  it("accepts the anon key alias and retains user authorization for profile requests", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "sb_publishable_test");
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response()),
    );
    vi.stubGlobal("fetch", fetch);
    const { supabase } = await import("@/integrations/supabase/client");
    expect(Reflect.get(supabase, "marker")).toBe(true);
    expect(createClient).toHaveBeenCalledWith(
      "https://example.supabase.co",
      "sb_publishable_test",
      expect.any(Object),
    );
    const options = createClient.mock.calls[0]![2];
    await options.global.fetch("https://example.supabase.co/auth/v1/token", {
      headers: { Authorization: "Bearer sb_publishable_test" },
    });
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get("authorization")).toBeNull();
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get("apikey")).toBe("sb_publishable_test");
    await options.global.fetch("https://example.supabase.co/rest/v1/profiles", {
      headers: { Authorization: "Bearer user.jwt.token" },
    });
    expect(new Headers(fetch.mock.calls[1]![1]?.headers).get("authorization")).toBe(
      "Bearer user.jwt.token",
    );
  }, 30000);

  it("prefers the publishable key when both public variables are set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_preferred");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "legacy-anon");
    const { supabase } = await import("@/integrations/supabase/client");
    expect(Reflect.get(supabase, "marker")).toBe(true);
    expect(createClient.mock.calls[0]![1]).toBe("sb_publishable_preferred");
  });

  it("preserves the bearer header for legacy anon keys", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "legacy-anon");
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response()),
    );
    vi.stubGlobal("fetch", fetch);
    const { supabase } = await import("@/integrations/supabase/client");
    Reflect.get(supabase, "marker");
    await createClient.mock.calls[0]![2].global.fetch("https://example.supabase.co/auth/v1/token", {
      headers: { Authorization: "Bearer legacy-anon" },
    });
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get("authorization")).toBe(
      "Bearer legacy-anon",
    );
  });
});

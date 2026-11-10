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
  it("uses the browser environment and preserves authenticated requests", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-fallback");
    vi.stubEnv("SUPABASE_URL", "https://wrong.example");
    vi.stubEnv("SUPABASE_ANON_KEY", "wrong");
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response()),
    );
    vi.stubGlobal("fetch", fetch);
    const { supabase } = await import("@/integrations/supabase/client");
    expect(Reflect.get(supabase, "marker")).toBe(true);
    const [url, key, options] = createClient.mock.calls[0]!;
    expect(url).toBe("https://example.supabase.co");
    expect(key).toBe("sb_publishable_test");
    await options.global.fetch(`${url}/auth/v1/token`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get("authorization")).toBeNull();
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get("apikey")).toBe(key);
    await options.global.fetch(`${url}/rest/v1/profiles`, {
      headers: { Authorization: "Bearer user.jwt.token" },
    });
    expect(new Headers(fetch.mock.calls[1]![1]?.headers).get("authorization")).toBe(
      "Bearer user.jwt.token",
    );
  });

  it("falls back to the anon key and preserves its bearer header", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "legacy-anon");
    const fetch = vi.fn((_input: RequestInfo | URL, _init?: RequestInit) =>
      Promise.resolve(new Response()),
    );
    vi.stubGlobal("fetch", fetch);
    const { supabase } = await import("@/integrations/supabase/client");
    Reflect.get(supabase, "marker");
    const [url, key, options] = createClient.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:54321");
    expect(key).toBe("legacy-anon");
    await options.global.fetch(`${url}/auth/v1/token`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    expect(new Headers(fetch.mock.calls[0]![1]?.headers).get("authorization")).toBe(
      `Bearer ${key}`,
    );
  });

  it.each([
    "wrong_ub-two.vercel.app",
    "https://wrong_ub-two.vercel.app",
    "https://example.supabase.co/rest/v1",
  ])("rejects an invalid URL: %s", async (url) => {
    vi.stubEnv("VITE_SUPABASE_URL", url);
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
    const { supabase } = await import("@/integrations/supabase/client");
    expect(() => Reflect.get(supabase, "marker")).toThrow("Invalid Supabase configuration");
  });

  it("rejects privileged keys and JWTs for another project", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "sb_secret_test");
    const { supabase } = await import("@/integrations/supabase/client");
    expect(() => Reflect.get(supabase, "marker")).toThrow("secret key");
    vi.stubEnv(
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      `eyJ.${btoa(JSON.stringify({ role: "anon", ref: "wrong" }))}.signature`,
    );
    expect(() => Reflect.get(supabase, "marker")).toThrow("different projects");
    vi.stubEnv(
      "VITE_SUPABASE_PUBLISHABLE_KEY",
      `eyJ.${btoa(JSON.stringify({ role: "service_role" }))}.signature`,
    );
    expect(() => Reflect.get(supabase, "marker")).toThrow("requires an anon key");
  });
});

import type { FormEvent, ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  getUser: vi.fn(),
  rpc: vi.fn(),
  maybeSingle: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: mocks,
    rpc: mocks.rpc,
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.maybeSingle }) }) }),
  },
}));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@/components/HubShell", () => ({ HubShell: () => <div>Hub</div> }));
vi.mock("@/components/HubWorkspace", () => ({ HubWorkspace: () => null }));
vi.mock("@/components/AdminPanel", () => ({ AdminPanel: () => null }));
vi.mock("@/components/RegistrationForm", () => ({
  RegistrationForm: ({
    onChange,
    onEmail,
    onPassword,
    onSubmit,
  }: {
    onChange: (value: object) => void;
    onEmail: (value: string) => void;
    onPassword: (value: string) => void;
    onSubmit: (event: FormEvent) => void;
  }) => (
    <form onSubmit={onSubmit}>
      <button
        type="button"
        onClick={() => {
          onChange({
            fullName: "Test",
            businessName: "Test",
            phone: "0501234567",
            city: "Test",
            role: "nail_tech",
            specialties: [],
            additionalServices: [],
          });
          onEmail("test@example.com");
          onPassword("password123");
        }}
      >
        מילוי פרטים
      </button>
      <button type="submit">הרשמה</button>
    </form>
  ),
}));

import { NailHubApp } from "@/components/NailHubApp";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  mocks.navigate.mockResolvedValue(undefined);
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "user-1", app_metadata: {}, user_metadata: {} } },
    error: null,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

function renderApp() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NailHubApp />
    </QueryClientProvider>,
  );
}

async function login() {
  fireEvent.change(await screen.findByLabelText("אימייל או טלפון *"), {
    target: { value: "test@example.com" },
  });
  fireEvent.change(screen.getByLabelText("סיסמה *"), { target: { value: "password123" } });
  fireEvent.click(screen.getByRole("button", { name: "התחברי לחשבון" }));
}

describe("authentication flow", () => {
  it("hides Apple sign-in only when explicitly disabled", async () => {
    vi.stubEnv("VITE_APPLE_SIGNIN_ENABLED", "false");
    renderApp();
    expect(await screen.findByRole("button", { name: "התחברי באמצעות Google" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "התחברי באמצעות Apple" })).not.toBeInTheDocument();
  });

  it("keeps Apple sign-in available by default", async () => {
    vi.stubEnv("VITE_APPLE_SIGNIN_ENABLED", "");
    renderApp();
    expect(await screen.findByRole("button", { name: "התחברי באמצעות Apple" })).toBeVisible();
  });

  it("asks for email confirmation instead of attempting a password login without a session", async () => {
    mocks.signUp.mockResolvedValue({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    });
    renderApp();
    fireEvent.click(await screen.findByRole("button", { name: "להרשמה לחצי כאן" }));
    fireEvent.click(screen.getByRole("button", { name: "מילוי פרטים" }));
    fireEvent.click(screen.getByRole("button", { name: "הרשמה" }));
    expect(await screen.findByRole("status")).toHaveTextContent("אמתי את הכתובת");
    expect(mocks.signInWithPassword).not.toHaveBeenCalled();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not navigate on a profile permission error after login", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({ data: null, error: { code: "42501" } });
    renderApp();
    await login();
    expect(await screen.findByRole("alert")).toHaveTextContent("אין לך הרשאה");
    expect(mocks.getUser).toHaveBeenCalled();
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("navigates only after verifying the session and loading the owner's profile", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    mocks.maybeSingle.mockResolvedValue({
      data: {
        id: "user-1",
        display_name: "Test",
        business_name: "Test",
        account_role: "nail_tech",
        city: "",
        specialties: [],
        additional_services: [],
        phone: "",
        hide_phone: false,
        is_verified: false,
        avatar_url: null,
      },
      error: null,
    });
    renderApp();
    await login();
    await waitFor(() =>
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/feed", search: { compose: false } }),
    );
    expect(mocks.getUser.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.rpc.mock.invocationCallOrder[0]!,
    );
    expect(mocks.maybeSingle).toHaveBeenCalled();
  });

  it("does not query protected data without a verified session", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: { user: { id: "user-1" } } },
      error: null,
    });
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: { status: 401 } });
    renderApp();
    await login();
    expect(await screen.findByRole("alert")).toHaveTextContent("החיבור לחשבון הסתיים");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.maybeSingle).not.toHaveBeenCalled();
  });

  it("shows configuration errors instead of claiming the password is wrong", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: "Invalid API key", status: 401 },
    });
    renderApp();
    await login();
    expect(await screen.findByRole("alert")).toHaveTextContent("אינו מוגדר כראוי");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("reports actual invalid credentials distinctly", async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { code: "invalid_credentials", status: 401 },
    });
    renderApp();
    await login();
    expect(await screen.findByRole("alert")).toHaveTextContent("פרטי ההתחברות אינם נכונים");
  });

  it("shows initialization errors rather than leaving the access screen stuck", async () => {
    mocks.getSession.mockImplementation(() => {
      throw new Error("Missing Supabase environment variable(s)");
    });
    renderApp();
    expect(await screen.findByRole("alert")).toHaveTextContent("אינו מוגדר כראוי");
  });

  it("defers session-dependent queries outside the auth state callback", async () => {
    renderApp();
    await screen.findByRole("button", { name: "התחברי לחשבון" });
    const callback = mocks.onAuthStateChange.mock.calls[0]![0];
    callback("SIGNED_IN", { user: { id: "user-1" } });
    expect(mocks.rpc).not.toHaveBeenCalled();
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await waitFor(() =>
      expect(mocks.rpc).toHaveBeenCalledWith("is_account_banned", { target_user: "user-1" }),
    );
  });
});

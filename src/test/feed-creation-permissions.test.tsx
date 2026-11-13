import type { ReactNode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-router")>(),
  useNavigate: () => vi.fn(),
  useSearch: () => ({ compose: true }),
  Link: ({ children }: { children: ReactNode }) => <>{children}</>,
}));
vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-query")>(),
  useQuery: () => ({ data: undefined }),
  useInfiniteQuery: () => ({ data: { pages: [] } }),
  useQueries: () => [],
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));
vi.mock("@tanstack/react-start", async (importOriginal) => ({
  ...await importOriginal<typeof import("@tanstack/react-start")>(),
  useServerFn: (fn: unknown) => fn,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/lib/use-follows", () => ({
  useIsFollowing: () => ({ data: false, isSuccess: true }),
}));
vi.mock("@/components/NotificationsBell", () => ({ NotificationsBell: () => null }));
vi.mock("@/components/FeedPostComposer", () => ({
  FeedPostComposer: () => <div>עורך פוסט</div>,
}));

import { HubShell } from "@/components/HubShell";
import { HubWorkspace } from "@/components/HubWorkspace";

afterEach(cleanup);

describe("feed creation controls", () => {
  it.each([
    ["nail_tech", true],
    ["instructor", true],
    ["supplier", false],
    ["model", false],
    ["client", false],
  ])("shows post and story controls according to the actual %s role", (role, allowed) => {
    render(
      <HubShell section="feed" accountRole={role}>
        <HubWorkspace
          section="feed"
          user={{ id: "member", fullName: "שם", businessName: "", phone: "", city: "", role }}
        />
      </HubShell>,
    );

    expect(screen.queryAllByRole("button", { name: "פרסום עבודה חדשה" })).toHaveLength(allowed ? 2 : 0);
    expect(Boolean(screen.queryByRole("button", { name: "הוספת סטורי חדש" }))).toBe(allowed);
    expect(Boolean(screen.queryByLabelText("העלאת סטורי"))).toBe(allowed);
    expect(Boolean(screen.queryByText("עורך פוסט"))).toBe(allowed);
    expect(screen.getByLabelText("סטוריז מהקהילה")).toBeTruthy();
  });
});

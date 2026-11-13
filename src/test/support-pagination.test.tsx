import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ range: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const query = { select: () => query, eq: () => query, order: () => query, range: mocks.range };
      return query;
    },
  },
}));
import { SupportForm } from "@/components/SupportForm";

it("loads only the requested support page and makes older tickets reachable", async () => {
  const rows = Array.from({ length: 27 }, (_, i) => ({
    id: `${i}`, subject: `פנייה ${i + 1}`, category: "bug", status: "new", created_at: "2026-01-01",
  }));
  mocks.range.mockImplementation(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><SupportForm user={{ id: "owner", fullName: "שם", phone: "" }} /></QueryClientProvider>);
  expect(await screen.findByText("פנייה 25")).toBeTruthy();
  expect(screen.queryByText("פנייה 26")).toBeNull();
  expect(mocks.range).toHaveBeenCalledWith(0, 25);
  fireEvent.click(screen.getByRole("button", { name: "הבא" }));
  expect(await screen.findByText("פנייה 27")).toBeTruthy();
  await waitFor(() => expect(mocks.range).toHaveBeenCalledWith(25, 50));
  expect(screen.queryByText("פנייה 1")).toBeNull();
});

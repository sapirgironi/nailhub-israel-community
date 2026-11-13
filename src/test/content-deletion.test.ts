import { createClient } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/integrations/supabase/types";

const mocks = vi.hoisted(() => ({
  filters: [] as [string, string][],
  tables: [] as string[],
  removed: vi.fn(),
  rowOwner: "owner",
  admin: false,
}));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (table: string) => {
      mocks.tables.push(table);
      const builder = {
        delete: () => builder,
        select: () => builder,
        eq: (column: string, value: string) => { mocks.filters.push([column, value]); return builder; },
        maybeSingle: async () => ({
          data: mocks.filters.some(([column, value]) => (column === "user_id" || column === "author_id") && value !== mocks.rowOwner)
            ? null : { id: "item", image_path: "file.png" },
          error: null,
        }),
      };
      return builder;
    },
    storage: { from: () => ({ remove: mocks.removed }) },
  },
}));

import { deleteContentOnServer } from "@/lib/content-deletion.server";

function context(userId = "owner") {
  return {
    userId,
    supabase: createClient<Database>("http://localhost:54321", "test-key", {
      global: { fetch: async () => new Response(JSON.stringify(mocks.admin), { status: 200 }) },
    }),
  };
}
beforeEach(() => {
  mocks.filters = [];
  mocks.tables = [];
  mocks.admin = false;
  mocks.removed.mockReset();
  mocks.removed.mockResolvedValue({ error: null });
});

describe("server content deletion authorization", () => {
  it.each([
    ["post", "posts", "author_id"],
    ["story", "stories", "user_id"],
    ["comment", "post_comments", "user_id"],
  ] as const)("limits %s deletion to its owner", async (kind, table, ownerColumn) => {
    await expect(deleteContentOnServer({ kind, id: "item" }, context())).resolves.toBeUndefined();
    expect(mocks.tables).toContain(table);
    expect(mocks.filters).toContainEqual([ownerColumn, "owner"]);
    mocks.filters = [];
    await expect(deleteContentOnServer({ kind, id: "item" }, context("other"))).rejects.toThrow();
    expect(mocks.filters).toContainEqual([ownerColumn, "other"]);
  });
  it("allows an administrator to remove another member's content", async () => {
    mocks.admin = true;
    await expect(deleteContentOnServer({ kind: "post", id: "item" }, context("admin"))).resolves.toBeUndefined();
    expect(mocks.filters.some(([column]) => column === "author_id")).toBe(false);
  });
  it("denies sticker deletion to non-admins and does not touch storage", async () => {
    await expect(deleteContentOnServer({ kind: "sticker", id: "item" }, context())).rejects.toThrow();
    expect(mocks.removed).not.toHaveBeenCalled();
  });
  it("does not delete the sticker row when file removal fails", async () => {
    mocks.admin = true;
    mocks.removed.mockResolvedValue({ error: { message: "failed" } });
    await expect(deleteContentOnServer({ kind: "sticker", id: "item" }, context())).rejects.toThrow();
    expect(mocks.tables).toEqual(["story_stickers"]);
  });
  it("deletes the sticker row only after its file is removed by an administrator", async () => {
    mocks.admin = true;
    await expect(deleteContentOnServer({ kind: "sticker", id: "item" }, context())).resolves.toBeUndefined();
    expect(mocks.removed).toHaveBeenCalledWith(["file.png"]);
    expect(mocks.tables).toEqual(["story_stickers", "story_stickers"]);
  });
});

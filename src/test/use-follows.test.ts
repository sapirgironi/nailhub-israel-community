import { describe, expect, it } from "vitest";
import { isMissingUserFollowsTable } from "@/lib/use-follows";

describe("missing user_follows table handling", () => {
  it("recognizes PostgREST and PostgreSQL missing-table errors", () => {
    expect(isMissingUserFollowsTable({ code: "PGRST205" })).toBe(true);
    expect(isMissingUserFollowsTable({ code: "42P01" })).toBe(true);
  });

  it("does not suppress unrelated database errors", () => {
    expect(isMissingUserFollowsTable({ code: "42501" })).toBe(false);
    expect(isMissingUserFollowsTable(null)).toBe(false);
  });
});

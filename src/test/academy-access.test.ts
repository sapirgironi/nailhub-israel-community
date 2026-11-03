import { describe, expect, it } from "vitest";
import { hasAcademyAccess } from "@/lib/academy-access";

describe("academy calculator access", () => {
  it("allows instructors", () => {
    expect(hasAcademyAccess(false, "instructor")).toBe(true);
  });

  it("allows admins regardless of their professional profile role", () => {
    expect(hasAcademyAccess(true, "nail_tech")).toBe(true);
  });

  it("does not grant access to other members", () => {
    expect(hasAcademyAccess(false, "nail_tech")).toBe(false);
    expect(hasAcademyAccess(false, undefined)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { canAccessSection, getRoleForAccountRole, type PreviewRole } from "@/lib/role-preview";

describe("role-based navigation", () => {
  const expectedSections: Record<PreviewRole, string[]> = {
    SUPER_ADMIN: [
      "feed",
      "directory",
      "boards",
      "nailtrade",
      "insurance",
      "calculator",
      "profit_calculator",
      "academy_pricing",
      "academy_syllabus",
      "academy_courses",
      "academy_hub",
      "health_form",
      "pricelist",
      "saved",
      "profile",
      "draft",
      "admin",
      "support",
      "clinic",
    ],
    INSTRUCTOR: [
      "feed",
      "directory",
      "boards",
      "nailtrade",
      "insurance",
      "calculator",
      "profit_calculator",
      "academy_pricing",
      "academy_syllabus",
      "academy_courses",
      "academy_hub",
      "health_form",
      "pricelist",
      "saved",
      "profile",
      "draft",
      "support",
      "clinic",
    ],
    NAIL_TECH: [
      "feed",
      "directory",
      "boards",
      "nailtrade",
      "insurance",
      "calculator",
      "profit_calculator",
      "health_form",
      "pricelist",
      "saved",
      "profile",
      "draft",
      "support",
      "clinic",
    ],
    CLIENT_MODEL: ["feed", "directory", "boards", "saved", "profile", "support"],
    SUPPLIER: ["feed", "directory", "boards", "insurance", "saved", "profile", "support"],
  };

  it.each(Object.entries(expectedSections))(
    "%s sees only its allowed sections",
    (role, allowed) => {
      const allSections = [
        "feed",
        "directory",
        "boards",
        "nailtrade",
        "insurance",
        "calculator",
        "profit_calculator",
        "academy_pricing",
        "academy_syllabus",
        "academy_courses",
        "academy_hub",
        "health_form",
        "pricelist",
        "saved",
        "profile",
        "draft",
        "admin",
        "support",
        "clinic",
      ] as const;
      for (const section of allSections) {
        expect(canAccessSection(role as PreviewRole, section)).toBe(allowed.includes(section));
      }
    },
  );

  it("maps professional account roles to the requested navigation roles", () => {
    expect(getRoleForAccountRole("instructor")).toBe("INSTRUCTOR");
    expect(getRoleForAccountRole("nail_tech")).toBe("NAIL_TECH");
    expect(getRoleForAccountRole("supplier")).toBe("SUPPLIER");
    expect(getRoleForAccountRole("client")).toBe("CLIENT_MODEL");
    expect(getRoleForAccountRole("model")).toBe("CLIENT_MODEL");
    expect(getRoleForAccountRole("nail_tech", true)).toBe("SUPER_ADMIN");
  });
});

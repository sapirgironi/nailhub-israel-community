export type HubSection =
  | "feed"
  | "directory"
  | "boards"
  | "nailtrade"
  | "insurance"
  | "calculator"
  | "academy_pricing"
  | "academy_syllabus"
  | "academy_courses"
  | "health_form"
  | "pricelist"
  | "saved"
  | "profile"
  | "draft"
  | "admin"
  | "support"
  | "clinic";

export type PreviewRole = "SUPER_ADMIN" | "INSTRUCTOR" | "NAIL_TECH" | "CLIENT_MODEL" | "SUPPLIER";

export const PREVIEW_ROLES: { id: PreviewRole; label: string; scope: string }[] = [
  { id: "SUPER_ADMIN", label: "👑 מנהלת ראשית", scope: "רואה הכל" },
  {
    id: "INSTRUCTOR",
    label: "👩‍🏫 מדריכה",
    scope: "האקדמיה שלי, הקליניקה שלי וכלי הקהילה",
  },
  {
    id: "NAIL_TECH",
    label: "💅 מניקוריסטית מקצועית",
    scope: "הקליניקה שלי וכלי הקהילה, ללא אקדמיה",
  },
  {
    id: "CLIENT_MODEL",
    label: "🌸 לקוחה ומודליסטית",
    scope: "הפיד, אינדקס חברות, לוחות קהילה, שמורים, יצירת קשר ופרופיל",
  },
  {
    id: "SUPPLIER",
    label: "🛍️ ספק",
    scope: "הפיד, אינדקס חברות, לוחות קהילה, ביטוח ושירותי קהילה",
  },
];

export function getRoleForAccountRole(
  accountRole: string | undefined,
  isAdmin = false,
): PreviewRole {
  if (isAdmin) return "SUPER_ADMIN";
  if (accountRole === "instructor") return "INSTRUCTOR";
  if (accountRole === "nail_tech") return "NAIL_TECH";
  if (accountRole === "supplier") return "SUPPLIER";
  return "CLIENT_MODEL";
}

export function canAccessSection(role: PreviewRole, section: HubSection): boolean {
  if (role === "SUPER_ADMIN") return true;
  if (
    section === "feed" ||
    section === "directory" ||
    section === "boards" ||
    section === "saved" ||
    section === "support" ||
    section === "profile"
  ) {
    return true;
  }
  if (role === "INSTRUCTOR") {
    return (
      section === "clinic" ||
      section === "nailtrade" ||
      section === "insurance" ||
      section === "calculator" ||
      section === "academy_pricing" ||
      section === "academy_syllabus" ||
      section === "academy_courses" ||
      section === "health_form" ||
      section === "pricelist" ||
      section === "draft"
    );
  }
  if (role === "NAIL_TECH") {
    return (
      section === "clinic" ||
      section === "nailtrade" ||
      section === "insurance" ||
      section === "calculator" ||
      section === "health_form" ||
      section === "pricelist" ||
      section === "draft"
    );
  }
  if (role === "CLIENT_MODEL") return false;
  return role === "SUPPLIER" && section === "insurance";
}

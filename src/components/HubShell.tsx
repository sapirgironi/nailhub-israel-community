import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sparkles,
  Users,
  ShieldCheck,
  Bookmark,
  User,
  Home,
  Search,
  Plus,
  LogOut,
  Menu,
  X,
  Camera,
  ImageIcon,
  LifeBuoy,
  Megaphone,
  BriefcaseBusiness,
  ShoppingBag,
  GraduationCap,
} from "lucide-react";
import { Button } from "./ui/button";
import { NotificationsBell } from "./NotificationsBell";
import { queueStory } from "@/lib/story-handoff";
import { supabase } from "@/integrations/supabase/client";
import {
  canAccessSection,
  canCreateFeedContent,
  getRoleForAccountRole,
  PREVIEW_ROLES,
  type HubSection,
  type PreviewRole,
} from "@/lib/role-preview";
export type { HubSection } from "@/lib/role-preview";
const links = [
  { id: "clinic", path: "/clinic", label: "הקליניקה שלי", icon: BriefcaseBusiness },
  { id: "directory", path: "/directory", label: "אינדקס חברות", icon: Users },
  { id: "nailtrade", path: "/nailtrade", label: "ציוד יד שנייה", icon: ShoppingBag },
  { id: "boards", path: "/boards", label: "לוחות הקהילה", icon: Users },
  { id: "insurance", path: "/insurance", label: "ביטוח מקצועי לעסק", icon: ShieldCheck },
  { id: "saved", path: "/saved", label: "השמורים שלי", icon: Bookmark },
  { id: "support", path: "/support", label: "צרי קשר / דיווח על תקלה", icon: LifeBuoy },
  { id: "profile", path: "/profile", label: "הפרופיל שלי", icon: User },
] as const;
const adminLink = { id: "admin", path: "/admin", label: "ניהול מערכת", icon: ShieldCheck } as const;

function AnnouncementBar() {
  const { data } = useQuery({
    queryKey: ["announcement"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("id,body")
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) return [];
      return data;
    },
    staleTime: 60_000,
  });
  const a = data?.[0];
  if (!a) return null;
  return (
    <div
      role="status"
      className="bg-rose-glam text-primary-foreground text-center text-xs font-bold px-4 py-2 flex items-center justify-center gap-2"
    >
      <Megaphone className="w-4 h-4 shrink-0" />
      {a.body}
    </div>
  );
}

function NavLinks({
  section,
  onPick,
  isAdmin,
  hasAcademyAccess,
  previewRole,
  onPreviewRoleChange,
  accountRole,
}: {
  section: HubSection;
  onPick?: () => void;
  isAdmin?: boolean | undefined;
  hasAcademyAccess?: boolean | undefined;
  previewRole?: PreviewRole | undefined;
  onPreviewRoleChange?: ((role: PreviewRole) => void) | undefined;
  accountRole?: string | undefined;
}) {
  const academyActive = [
    "academy_hub",
    "academy_pricing",
    "academy_syllabus",
    "academy_courses",
  ].includes(section);
  const clinicActive = [
    "clinic",
    "pricelist",
    "calculator",
    "profit_calculator",
    "health_form",
    "draft",
  ].includes(section);
  const activeRole = isAdmin
    ? (previewRole ?? "SUPER_ADMIN")
    : getRoleForAccountRole(accountRole, isAdmin);
  const canSeeAcademy = hasAcademyAccess && ["SUPER_ADMIN", "INSTRUCTOR"].includes(activeRole);
  const canSeeClinic = canAccessSection(activeRole, "clinic");
  const visibleLinks = links.filter(({ id }) => {
    return id !== "clinic" && canAccessSection(activeRole, id);
  });
  const showAdminLink = isAdmin && activeRole === "SUPER_ADMIN";
  const showPlansLink = activeRole === "SUPER_ADMIN";
  const showUpgradeLink = activeRole === "CLIENT_MODEL";
  return (
    <>
      {showPlansLink && (
        <Button
          asChild
          variant="secondary"
          className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs mb-2"
        >
          <Link to="/plans" onClick={onPick}>
            <Sparkles />
            מסלולים ושדרוג
          </Link>
        </Button>
      )}
      <Button
        asChild
        variant={section === "feed" ? "secondary" : "ghost"}
        className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs"
      >
        <Link to="/feed" search={{ compose: false }} onClick={onPick}>
          <Sparkles />
          <span>הפיד המקצועי</span>
        </Link>
      </Button>
      {canSeeAcademy && (
        <Button
          asChild
          variant={academyActive ? "secondary" : "ghost"}
          className="w-full justify-start h-auto min-h-11 whitespace-normal text-right text-xs font-bold"
        >
          <Link to="/academy" onClick={onPick}>
            <GraduationCap />
            <span>האקדמיה שלי</span>
          </Link>
        </Button>
      )}
      {canSeeClinic && (
        <Button
          asChild
          variant={clinicActive ? "secondary" : "ghost"}
          className="w-full justify-start h-auto min-h-11 whitespace-normal text-right text-xs font-bold"
        >
          <Link to="/clinic" onClick={onPick}>
            <BriefcaseBusiness />
            <span>הקליניקה שלי</span>
          </Link>
        </Button>
      )}
      {visibleLinks.map(({ id, path, label, icon: Icon }) => (
        <Button
          asChild
          key={id}
          variant={section === id ? "secondary" : "ghost"}
          className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs"
        >
          <Link to={path} onClick={onPick}>
            <Icon />
            <span>{label}</span>
          </Link>
        </Button>
      ))}
      {showAdminLink && (
        <Button
          asChild
          variant={section === "admin" ? "secondary" : "ghost"}
          className="w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs font-bold text-primary"
        >
          <Link to={adminLink.path} onClick={onPick}>
            <adminLink.icon />
            <span>{adminLink.label}</span>
          </Link>
        </Button>
      )}
      {showPlansLink && (
        <Button
          asChild
          variant="ghost"
          className="mt-3 w-full justify-start h-auto min-h-10 whitespace-normal text-right text-xs text-muted-foreground"
        >
          <Link to="/terms" onClick={onPick}>
            תנאי שימוש ומדיניות קהילה
          </Link>
        </Button>
      )}
      {isAdmin && (
        <div className="mt-4 border-t border-border pt-3">
          <label className="mb-1.5 block text-[11px] font-bold text-muted-foreground">
            👁️ סימולציית תצוגת ניווט
          </label>
          <select
            aria-label="סימולציית תצוגת ניווט לפי תפקיד"
            value={previewRole ?? "SUPER_ADMIN"}
            onChange={(event) => onPreviewRoleChange?.(event.target.value as PreviewRole)}
            className="w-full rounded-xl border border-border bg-background px-2 py-2 text-xs"
          >
            {PREVIEW_ROLES.map(({ id, label }) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-muted-foreground">
            תצוגה חזותית בלבד; אינה משנה הרשאות או גישה בפועל.
          </p>
        </div>
      )}
      {showUpgradeLink && (
        <Button
          asChild
          className="mt-4 w-full justify-start bg-gradient-to-r from-pink-600 to-rose-500 font-bold text-white shadow-md hover:from-pink-700 hover:to-rose-600"
        >
          <Link to="/pricing" onClick={onPick}>
            ✨ שדרגי חשבון למקצועית
          </Link>
        </Button>
      )}
    </>
  );
}

export function HubShell({
  section,
  children,
  name,
  onSignOut,
  isAdmin,
  hasAcademyAccess,
  previewRole,
  onPreviewRoleChange,
  accountRole,
  onCreatePost,
}: {
  section: HubSection;
  children: ReactNode;
  name?: string | undefined;
  onSignOut?: () => void;
  isAdmin?: boolean;
  hasAcademyAccess?: boolean;
  previewRole?: PreviewRole;
  onPreviewRoleChange?: ((role: PreviewRole) => void) | undefined;
  accountRole?: string | undefined;
  onCreatePost?: (() => void) | undefined;
}) {
  const [menu, setMenu] = useState(false);
  const [sheet, setSheet] = useState(false);
  const navigate = useNavigate();
  const activeRole = getRoleForAccountRole(accountRole, isAdmin);
  const effectiveRole = isAdmin ? (previewRole ?? activeRole) : activeRole;
  const showAdminNavigation = isAdmin && effectiveRole === "SUPER_ADMIN";
  const clinicActive = [
    "clinic",
    "calculator",
    "profit_calculator",
    "academy_pricing",
    "academy_syllabus",
    "academy_courses",
    "health_form",
    "pricelist",
    "draft",
  ].includes(section);
  const mobileItems =
    effectiveRole === "CLIENT_MODEL" || effectiveRole === "SUPPLIER"
      ? [
          { path: "/feed", label: "בית", icon: Home, active: section === "feed" },
          {
            path: "/directory",
            label: "אינדקס חברות",
            icon: Search,
            active: section === "directory",
          },
          { path: "/boards", label: "לוחות קהילה", icon: Users, active: section === "boards" },
          { path: "/saved", label: "השמורים שלי", icon: Bookmark, active: section === "saved" },
          { path: "/profile", label: "הפרופיל שלי", icon: User, active: section === "profile" },
        ]
      : [
          { path: "/feed", label: "בית", icon: Home, active: section === "feed" },
          {
            path: "/directory",
            label: "אינדקס חברות",
            icon: Search,
            active: section === "directory",
          },
          { path: "/clinic", label: "הקליניקה שלי", icon: BriefcaseBusiness, active: clinicActive },
          { path: "/profile", label: "הפרופיל שלי", icon: User, active: section === "profile" },
        ];
  const showCreateAction = canCreateFeedContent(accountRole, isAdmin, previewRole);
  const item = (i: (typeof mobileItems)[number] | undefined) =>
    i ? (
      <Button
        key={i.path}
        asChild
        variant="ghost"
        className={
          "mx-auto w-11 h-11 p-0 " + (i.active ? "text-primary bg-accent" : "text-muted-foreground")
        }
      >
        <Link to={i.path} aria-label={i.label} title={i.label}>
          <i.icon />
        </Link>
      </Button>
    ) : null;
  return (
    <div
      dir="rtl"
      className="min-h-screen bg-background text-foreground text-right md:flex [&_svg]:stroke-[1.5]"
    >
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-64 shrink-0 border-l border-border bg-card p-5 flex-col">
        <div className="flex items-center mb-6">
          <Link
            to="/feed"
            search={{ compose: false }}
            aria-label="NailHub – הבית של בונות הציפורניים בישראל"
            className="flex h-8 items-center"
          >
            <img src="/NailHub.png" alt="" className="h-full w-8 shrink-0 object-cover" />
          </Link>
        </div>
        <nav className="space-y-1 overflow-y-auto flex-1">
          <NavLinks
            section={section}
            isAdmin={isAdmin}
            hasAcademyAccess={hasAcademyAccess}
            previewRole={isAdmin ? previewRole : undefined}
            onPreviewRoleChange={onPreviewRoleChange}
            accountRole={accountRole}
          />
        </nav>
        <div className="border-t border-border mt-4 pt-4">
          <div className="text-sm font-bold break-words">{name ?? "NailHub"}</div>
          {onSignOut && (
            <Button
              variant="ghost"
              className="mt-2 text-muted-foreground text-xs"
              onClick={onSignOut}
            >
              <LogOut />
              התנתקות
            </Button>
          )}
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <AnnouncementBar />
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-xl grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-4 py-3">
          <div className="flex items-center gap-1 min-w-0">
            <Button
              size="icon"
              variant="ghost"
              className="md:hidden"
              aria-label="פתיחת תפריט"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </Button>
            <Link
              to="/feed"
              search={{ compose: false }}
              aria-label="NailHub"
              className="flex h-full min-w-0 items-center justify-center"
            >
              <img
                src="/logo-main.png"
                alt="NailHub Logo"
                className="h-11 sm:h-12 w-auto object-contain"
              />
            </Link>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showAdminNavigation && (
              <Button
                asChild
                size="icon"
                variant="ghost"
                aria-label="פאנל ניהול"
                title="פאנל ניהול"
                className="text-primary"
              >
                <Link to="/admin">
                  <ShieldCheck />
                </Link>
              </Button>
            )}
            {(!isAdmin || effectiveRole === "SUPER_ADMIN") && (
              <>
                {showCreateAction && (
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="פרסום עבודה חדשה"
                    title="פרסום עבודה חדשה"
                    className="hidden md:inline-flex text-primary"
                    onClick={() => setSheet(true)}
                  >
                    <Plus />
                  </Button>
                )}
                <NotificationsBell />
              </>
            )}
          </div>
        </header>
        <main
          className={
            section === "feed"
              ? "max-w-6xl mx-auto px-3 py-4 md:px-6 md:py-6 pb-28 md:pb-12"
              : "max-w-5xl mx-auto p-4 md:p-8 pb-28 md:pb-12"
          }
        >
          {isAdmin && effectiveRole !== "SUPER_ADMIN" && (
            <p
              role="status"
              className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs"
            >
              סימולציית תצוגה: {PREVIEW_ROLES.find((role) => role.id === effectiveRole)?.label}.
              ההרשאות האמיתיות נשארות של מנהלת.
            </p>
          )}
          {!canAccessSection(effectiveRole, section) ? (
            <div
              role="status"
              className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground"
            >
              המסך הזה אינו מוצג בתצוגה שנבחרה.
            </div>
          ) : (
            children
          )}
        </main>
      </div>
      {menu && (
        <div className="md:hidden fixed inset-0 z-50 bg-overlay" onClick={() => setMenu(false)}>
          <aside
            role="dialog"
            aria-label="תפריט ניווט"
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0 right-0 h-full w-72 max-w-[85vw] bg-card shadow-soft p-5 flex flex-col animate-in slide-in-from-right duration-200"
          >
            <div className="flex items-center justify-between mb-4">
              <Link
                to="/feed"
                search={{ compose: false }}
                aria-label="NailHub"
                onClick={() => setMenu(false)}
                className="flex h-12 min-w-0 items-center"
              >
                <img
                  src="/NailHub2.png"
                  alt="NailHub Logo"
                  className="h-11 w-auto object-contain sm:h-12"
                />
              </Link>
              <Button
                size="icon"
                variant="ghost"
                aria-label="סגירת תפריט"
                onClick={() => setMenu(false)}
              >
                <X />
              </Button>
            </div>
            <nav className="space-y-1 overflow-y-auto flex-1">
              <NavLinks
                section={section}
                onPick={() => setMenu(false)}
                isAdmin={isAdmin}
                hasAcademyAccess={hasAcademyAccess}
                previewRole={isAdmin ? previewRole : undefined}
                onPreviewRoleChange={onPreviewRoleChange}
                accountRole={accountRole}
              />
            </nav>
            <div className="border-t border-border mt-4 pt-4">
              <div className="text-sm font-bold break-words">{name ?? "NailHub"}</div>
              {onSignOut && (
                <Button
                  variant="ghost"
                  className="mt-2 text-muted-foreground text-xs"
                  onClick={() => {
                    setMenu(false);
                    onSignOut();
                  }}
                >
                  <LogOut />
                  התנתקות
                </Button>
              )}
            </div>
          </aside>
        </div>
      )}
      {sheet && showCreateAction && (
        <div
          className="fixed inset-0 z-50 bg-overlay backdrop-blur-sm flex flex-col justify-end"
          onClick={() => setSheet(false)}
        >
          <div
            role="dialog"
            aria-label="יצירה חדשה"
            onClick={(e) => e.stopPropagation()}
            className="bg-card rounded-t-3xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] space-y-4 max-w-lg w-full mx-auto shadow-soft animate-in slide-in-from-bottom duration-200"
          >
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="font-black text-sm">יצירה והעלאה חדשה</span>
              <Button
                size="icon"
                variant="ghost"
                aria-label="סגירה"
                onClick={() => setSheet(false)}
              >
                <X />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-accent/50 hover:bg-accent cursor-pointer text-center gap-2">
                <span className="w-10 h-10 rounded-full bg-rose-glam text-primary-foreground grid place-items-center">
                  <Camera className="w-5 h-5" />
                </span>
                <span className="text-xs font-black">סטורי ל־24 שעות</span>
                <span className="text-[10px] text-primary font-bold">בחירת תמונה ופרסום</span>
                <input
                  type="file"
                  aria-label="בחירת תמונה לסטורי"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    setSheet(false);
                    queueStory(f);
                    if (section !== "feed")
                      void navigate({ to: "/feed", search: { compose: false } });
                  }}
                />
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setSheet(false);
                  onCreatePost?.();
                  void navigate({ to: "/feed", search: { compose: true } });
                }}
                className="h-auto flex flex-col items-center justify-center p-4 rounded-2xl border border-border bg-accent/50 hover:bg-accent text-center gap-2 whitespace-normal"
              >
                <span className="w-10 h-10 rounded-full bg-rose-glam text-primary-foreground grid place-items-center">
                  <ImageIcon className="w-5 h-5" />
                </span>
                <span className="text-xs font-black">פוסט בפיד המקצועי</span>
                <span className="text-[10px] text-primary font-bold">תמונה וכיתוב</span>
              </Button>
            </div>
          </div>
        </div>
      )}
      <nav
        aria-label="ניווט ראשי במובייל"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/85 backdrop-blur-xl grid grid-cols-5 items-center px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] h-auto min-h-16"
      >
        {showCreateAction ? (
          <>
            {item(mobileItems[0])}
            {item(mobileItems[1])}
            <Button
              variant="ghost"
              aria-label="פרסום עבודה חדשה"
              title="פרסום עבודה חדשה"
              onClick={() => setSheet(true)}
              className="mx-auto w-11 h-11 p-0 rounded-full bg-rose-glam text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Plus />
            </Button>
            {item(mobileItems[2])}
            {item(mobileItems[3])}
          </>
        ) : (
          mobileItems.map(item)
        )}
      </nav>
    </div>
  );
}

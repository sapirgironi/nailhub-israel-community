import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { UserRound, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoImage } from "@/components/PhotoImage";
import { MemberFollowButton, MemberFollowCounts } from "@/components/MemberFollowControls";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/members/$memberId")({
  head: () => ({
    meta: [
      { title: "פרופיל חברת קהילה — NailHub" },
      { name: "description", content: "היכרות עם אשת מקצוע בקהילת NailHub." },
      { property: "og:title", content: "פרופיל חברת קהילה — NailHub" },
      { property: "og:description", content: "היכרות עם אשת מקצוע בקהילת NailHub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MemberProfile,
});
function MemberProfile() {
  const { memberId } = Route.useParams();
  const member = useQuery({
    queryKey: ["community-member", memberId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("community_members", {
        search_text: "",
        member_id: memberId,
        page_size: 1,
      });
      if (error) throw error;
      return data;
    },
  });
  // Read-only view is open to every signed-in member; ownership only toggles edit controls.
  const viewer = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session?.user.id ?? null;
    },
  });
  const p = member.data?.[0];
  const isOwner = Boolean(viewer.data && p && viewer.data === p.id);
  return (
    <main dir="rtl" className="min-h-screen bg-background text-right px-5 py-8">
      <div className="max-w-xl mx-auto">
        <Button asChild variant="ghost">
          <Link to="/feed" search={{ compose: false }}>
            <ArrowRight />
            חזרה לפיד
          </Link>
        </Button>
        {member.isPending ? (
          <p role="status" className="py-8">
            טוענת פרופיל...
          </p>
        ) : member.isError ? (
          <p role="alert" className="py-8">
            טעינת הפרופיל נכשלה. נסי שוב בעוד רגע.
          </p>
        ) : p ? (
          <section className="py-10 space-y-4">
            <div className="w-28 h-28 rounded-full bg-accent overflow-hidden grid place-items-center">
              {p.avatar_url ? (
                <PhotoImage
                  src={p.avatar_url}
                  alt={p.display_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <UserRound className="w-12 h-12 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold">{p.display_name}</h1>
            {p.business_name && <p className="text-lg text-primary">{p.business_name}</p>}
            <p>{p.city}</p>
            <p className="text-sm text-muted-foreground">
              {(
                {
                  nail_tech: "בונה ציפורניים",
                  supplier: "ספקית ציוד",
                  instructor: "מדריכה",
                  student: "תלמידה",
                } as Record<string, string>
              )[p.account_role] ?? "חברת קהילה"}
            </p>
            <MemberFollowCounts memberId={p.id} />
            {viewer.data && !isOwner && (
              <MemberFollowButton userId={viewer.data} memberId={p.id} />
            )}
            {isOwner && (
              <Button asChild variant="outline" size="sm">
                <Link to="/profile">עריכת הפרופיל שלי</Link>
              </Button>
            )}
            {viewer.isError && (
              <p role="alert" className="text-sm text-destructive">
                לא ניתן לטעון את סטטוס ההתחברות כדי לעקוב
              </p>
            )}
          </section>
        ) : (
          <p className="py-8">הפרופיל אינו זמין</p>
        )}
      </div>
    </main>
  );
}

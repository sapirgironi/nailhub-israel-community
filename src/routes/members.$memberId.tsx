import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { UserRound, ArrowRight } from "lucide-react";
import { findCommunityMembers } from "@/lib/community.functions";
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
  const find = useServerFn(findCommunityMembers);
  const member = useQuery({
    queryKey: ["community-member", memberId],
    queryFn: () => find({ data: { memberId, query: "" } }),
  });
  const viewer = useQuery({
    queryKey: ["current-user-id"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user?.id ?? null;
    },
  });
  const p = member.data?.[0];
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
            יש להתחבר כדי לצפות בפרופיל, או לנסות שוב.
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
            {viewer.data && <MemberFollowButton userId={viewer.data} memberId={p.id} />}
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

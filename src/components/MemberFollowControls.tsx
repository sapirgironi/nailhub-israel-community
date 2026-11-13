import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useIsFollowing, useToggleFollow } from "@/lib/use-follows";
import { Button } from "./ui/button";

export function MemberFollowButton({
  userId,
  memberId,
  className,
}: {
  userId: string;
  memberId: string;
  className?: string;
}) {
  const following = useIsFollowing(userId, memberId);
  const toggleFollow = useToggleFollow(userId);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isFollowing = following.data ?? false;
  if (userId === memberId) return null;

  async function toggle() {
    setBusy(true);
    setError("");
    try {
      await toggleFollow(memberId);
    } catch {
      setError("עדכון המעקב נכשל. נסי שוב.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start">
      <Button
        type="button"
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        disabled={busy || following.isPending || following.isError}
        aria-pressed={isFollowing}
        onClick={() => void toggle()}
        className={
          className ??
          (isFollowing ? "h-8 rounded-full text-xs" : "h-8 rounded-full bg-rose-glam text-xs")
        }
      >
        {isFollowing ? "עוקבת ✓" : "עקבי +"}
      </Button>
      {error && (
        <span role="alert" className="text-[11px] text-destructive">
          {error}
        </span>
      )}
      {following.isError && (
        <span role="alert" className="text-[11px] text-destructive">
          לא ניתן לטעון את המעקב
        </span>
      )}
    </span>
  );
}

export function MemberFollowCounts({ memberId }: { memberId: string }) {
  const counts = useQuery({
    queryKey: ["member-follow-counts", memberId],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("member_follow_counts", { member_id: memberId });
      if (error) throw error;
      if (!data[0]) throw new Error("לא ניתן לטעון את נתוני המעקב");
      return data[0];
    },
  });

  if (counts.isPending)
    return (
      <p role="status" className="text-xs text-muted-foreground">
        טוענת נתוני מעקב...
      </p>
    );
  if (counts.isError)
    return (
      <p role="alert" className="text-xs text-destructive">
        טעינת נתוני המעקב נכשלה
      </p>
    );

  return (
    <div className="flex gap-5 text-sm" aria-label="נתוני מעקב">
      <span>
        <strong>{counts.data.followers}</strong> עוקבות
      </span>
      <span>
        <strong>{counts.data.following}</strong> נעקבות
      </span>
    </div>
  );
}

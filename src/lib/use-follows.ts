import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function isMissingUserFollowsTable(error: { code?: string } | null) {
  return error?.code === "PGRST205" || error?.code === "42P01";
}

export function followingQueryKey(userId: string, memberId: string) {
  return ["hub-following", userId, memberId] as const;
}

export function useIsFollowing(userId: string, memberId: string) {
  return useQuery({
    queryKey: followingQueryKey(userId, memberId),
    enabled: Boolean(userId && memberId && userId !== memberId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_follows")
        .select("followed_id")
        .eq("follower_id", userId)
        .eq("followed_id", memberId)
        .maybeSingle();
      if (error) {
        if (isMissingUserFollowsTable(error)) return false;
        throw error;
      }
      return Boolean(data);
    },
  });
}

export function useToggleFollow(userId: string) {
  const queryClient = useQueryClient();
  return async (memberId: string) => {
    if (memberId === userId) return;
    const followed = queryClient.getQueryData<boolean>(followingQueryKey(userId, memberId));
    if (followed === undefined) throw new Error("לא ניתן לבדוק את מצב המעקב");
    const result = followed
      ? await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", userId)
          .eq("followed_id", memberId)
      : await supabase.from("user_follows").insert({ follower_id: userId, followed_id: memberId });
    if (result.error) throw result.error;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: followingQueryKey(userId, memberId) }),
      queryClient.invalidateQueries({ queryKey: ["member-follow-counts", memberId] }),
      queryClient.invalidateQueries({ queryKey: ["member-follow-counts", userId] }),
      queryClient.invalidateQueries({ queryKey: ["hub-posts", userId] }),
    ]);
  };
}

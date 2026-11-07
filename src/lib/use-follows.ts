import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function followingQueryKey(userId: string) {
  return ["hub-following", userId] as const;
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: followingQueryKey(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_follows")
        .select("followed_id")
        .eq("follower_id", userId);
      if (error) throw error;
      return (data ?? []).map((row) => row.followed_id);
    },
  });
}

export function useToggleFollow(userId: string) {
  const queryClient = useQueryClient();
  return async (memberId: string) => {
    if (memberId === userId) return;
    const followed = queryClient.getQueryData<string[]>(followingQueryKey(userId)) ?? [];
    const result = followed.includes(memberId)
      ? await supabase
          .from("user_follows")
          .delete()
          .eq("follower_id", userId)
          .eq("followed_id", memberId)
      : await supabase.from("user_follows").insert({ follower_id: userId, followed_id: memberId });
    if (result.error) throw result.error;
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: followingQueryKey(userId) }),
      queryClient.invalidateQueries({ queryKey: ["member-follow-counts", memberId] }),
      queryClient.invalidateQueries({ queryKey: ["member-follow-counts", userId] }),
      queryClient.invalidateQueries({ queryKey: ["hub-posts", userId] }),
    ]);
  };
}

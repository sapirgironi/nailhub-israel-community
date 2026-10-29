import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { setResponseHeader } from "@tanstack/react-start/server";
import { requireActiveAccount } from "./account-access";
export const findCommunityMembers = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((v: unknown) =>
    z
      .object({
        query: z.string().max(80).default(""),
        memberId: z.string().uuid().optional(),
        roleFilter: z.string().max(40).optional(),
        afterName: z.string().max(150).optional(),
        afterId: z.string().uuid().optional(),
        pageSize: z.number().int().min(1).max(24).default(10),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    setResponseHeader("Cache-Control", "private, no-store");
    const { data: members, error } = await context.supabase.rpc("community_members", {
      search_text: data.query,
      ...(data.memberId ? { member_id: data.memberId } : {}),
      role_filter: data.roleFilter ?? "",
      after_name: data.afterName ?? null,
      after_id: data.afterId ?? null,
      page_size: data.pageSize,
    });
    if (error) throw new Error("טעינת חברות הקהילה נכשלה");
    return members ?? [];
  });

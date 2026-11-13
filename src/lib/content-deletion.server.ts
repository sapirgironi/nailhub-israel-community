import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Context = { userId: string; supabase: SupabaseClient<Database> };
type Content = { kind: "post" | "story" | "comment" | "sticker"; id: string };

async function isAdmin(context: Context) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) {
    console.error("Content deletion permission check failed", { code: error.code });
    throw new Error("בדיקת ההרשאות נכשלה");
  }
  return data === true;
}

export async function deleteContentOnServer(content: Content, context: Context) {
  const admin = await isAdmin(context);
  if (content.kind === "sticker") {
    if (!admin) throw new Error("אין לך הרשאה למחוק סטיקר");
    const { data: sticker, error } = await supabaseAdmin.from("story_stickers")
      .select("image_path").eq("id", content.id).maybeSingle();
    if (error || !sticker) throw new Error("לא ניתן למצוא את הסטיקר");
    const { error: storageError } = await supabaseAdmin.storage.from("story-stickers").remove([sticker.image_path]);
    if (storageError) {
      console.error("Sticker file deletion failed");
      throw new Error("מחיקת קובץ הסטיקר נכשלה");
    }
    const { data: deleted, error: deleteError } = await supabaseAdmin.from("story_stickers")
      .delete().eq("id", content.id).select("id").maybeSingle();
    if (deleteError || !deleted) throw new Error("מחיקת הסטיקר נכשלה");
    return;
  }

  const result = content.kind === "post"
    ? await (admin ? supabaseAdmin.from("posts").delete().eq("id", content.id)
      : supabaseAdmin.from("posts").delete().eq("id", content.id).eq("author_id", context.userId)).select("id").maybeSingle()
    : content.kind === "story"
      ? await (admin ? supabaseAdmin.from("stories").delete().eq("id", content.id)
        : supabaseAdmin.from("stories").delete().eq("id", content.id).eq("user_id", context.userId)).select("id").maybeSingle()
      : await (admin ? supabaseAdmin.from("post_comments").delete().eq("id", content.id)
        : supabaseAdmin.from("post_comments").delete().eq("id", content.id).eq("user_id", context.userId)).select("id").maybeSingle();
  if (result.error || !result.data) {
    console.error("Content deletion denied or failed", { kind: content.kind, code: result.error?.code });
    throw new Error("המחיקה נכשלה או שאין לך הרשאה למחוק פריט זה");
  }
}

export async function discardStickerUploadOnServer(path: string, context: Context) {
  if (!await isAdmin(context)) throw new Error("אין לך הרשאה למחוק סטיקר");
  const { data, error } = await supabaseAdmin.from("story_stickers").select("id").eq("image_path", path).maybeSingle();
  if (error || data) throw new Error("לא ניתן לנקות את קובץ הסטיקר");
  const { error: storageError } = await supabaseAdmin.storage.from("story-stickers").remove([path]);
  if (storageError) throw new Error("ניקוי קובץ הסטיקר נכשל");
}

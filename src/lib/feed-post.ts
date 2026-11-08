import { z } from "zod";
import { plainText } from "./input-security";
export const POST_TAG_GROUPS = [
  {
    label: "טכניקות",
    tags: ["מבנה_אנטומי", "לק_ג'ל", "בנייה_באקריל", "בנייה_בג'ל", "טיפים_הפוכים"],
  },
  { label: "עיצוב", tags: ["נייל_ארט", "פרנץ'", "אומברה", "עיצוב_כלתי"] },
  { label: "כללי", tags: ["טיפ_מקצועי", "לפני_ואחרי", "שאלה_לקהילה"] },
] as const;
export const POST_TAGS = [
  ...new Set([
    ...POST_TAG_GROUPS.flatMap((group) => group.tags),
    "השתלמויות",
    "מניקור_מכשירי",
    "אזור_הצפון",
    "אזור_המרכז",
    "אזור_הדרום",
  ]),
];
export const TEXT_POST_BACKGROUNDS = [
  {
    id: "powder-pink",
    label: "ורוד פודרה",
    style: { backgroundColor: "#EBC4CC" },
  },
  {
    id: "classic-nude",
    label: "ניוד קלאסי",
    style: { backgroundColor: "#DCC7B8" },
  },
  {
    id: "pearl-white",
    label: "לבן פנינה",
    style: { backgroundColor: "#FBFAF7" },
  },
  {
    id: "luxury-charcoal",
    label: "שחור פחם",
    style: { backgroundColor: "#292629" },
  },
  {
    id: "soft-sunset",
    label: "שקיעה רכה",
    style: { backgroundImage: "linear-gradient(135deg,#F9D7E2 0%,#F7C6B3 100%)" },
  },
  {
    id: "rose-gold",
    label: "גרדיאנט רוז-גולד",
    style: { backgroundImage: "linear-gradient(135deg,#F5D6D1 0%,#DDB7A5 52%,#F3E1D2 100%)" },
  },
  {
    id: "lavender-cream",
    label: "לבנדר-שמנת",
    style: { backgroundImage: "linear-gradient(135deg,#E7DDF2 0%,#F8F0E3 100%)" },
  },
] as const;
export type TextPostBackgroundId =
  (typeof TEXT_POST_BACKGROUNDS)[number]["id"] | `custom:${string}`;
export function getTextPostBackground(id: string | null | undefined) {
  if (id?.startsWith("custom:")) {
    const color = id.slice("custom:".length);
    if (/^#[\da-f]{6}$/i.test(color)) {
      return { id, label: "צבע מותאם אישית", style: { backgroundColor: color } };
    }
  }
  return (
    TEXT_POST_BACKGROUNDS.find((background) => background.id === id) ?? TEXT_POST_BACKGROUNDS[0]
  );
}
export const DEFAULT_CAPTION_STYLE = {
  font: "assistant",
  textAlign: "center",
  highlight: "solid",
  color: "#FFFFFF",
  highlightColor: "#171717",
  fontSize: 32,
} as const;
export const TEXT_POST_CAPTION_LIMIT = 400;
export const captionStyleSchema = z.object({
  font: z.enum([
    "assistant",
    "heebo",
    "italic",
    "hand",
    "round",
    "playful",
    "serif",
    "modern",
    "bold",
    "handwriting",
    "elegant",
  ]),
  textAlign: z.enum(["center", "right", "left"]),
  highlight: z.enum(["none", "solid", "soft"]),
  color: z.string().regex(/^#[\da-f]{6}$/i),
  highlightColor: z
    .string()
    .regex(/^#[\da-f]{6}$/i)
    .default("#171717"),
  fontSize: z.number().int().min(16).max(56),
});
export type CaptionStyle = z.infer<typeof captionStyleSchema>;
export function parseCaptionStyle(value: unknown): CaptionStyle {
  const parsed = captionStyleSchema.safeParse(value);
  return parsed.success ? parsed.data : { ...DEFAULT_CAPTION_STYLE };
}
export const postMentionSchema = z.object({
  userId: z.string().uuid(),
  label: z.string().regex(/^@[^\s@<>]{1,100}$/),
});
export type PostMention = z.infer<typeof postMentionSchema>;
export type FeedPostType = "post" | "course" | "deal";
export type FeedTab = "all" | "following" | "gallery" | "discussions" | "courses" | "deals";
export function matchesFeedTab(
  post: { image_url: string | null; post_type: string | null | undefined },
  tab: FeedTab,
) {
  switch (tab) {
    case "all":
    case "following":
      return true;
    case "gallery":
      return Boolean(post.image_url) && post.post_type !== "course" && post.post_type !== "deal";
    case "discussions":
      return !post.image_url;
    case "courses":
      return post.post_type === "course";
    case "deals":
      return post.post_type === "deal";
  }
}
export function normalizeTag(value: string) {
  return value.trim().replace(/^#+/, "").replace(/\s+/g, "_");
}
export const tagSchema = z
  .string()
  .transform(normalizeTag)
  .pipe(
    z
      .string()
      .min(1)
      .max(60)
      .regex(/^[\p{L}\p{N}_'׳״-]+$/u, "התגית אינה תקינה"),
  );
export const postMetadataSchema = z.object({
  caption: plainText(2000),
  tags: z.array(tagSchema).max(30),
  mentions: z.array(postMentionSchema).max(30),
});
export function readPostMentions(value: unknown): PostMention[] {
  const result = z.array(postMentionSchema).safeParse(value);
  return result.success ? result.data : [];
}
export function livePostMentions(text: string, mentions: PostMention[]) {
  return mentions.filter((m) =>
    text.split(/\s+/).some((t) => t === m.label || t.replace(/[.,!?;:]+$/, "") === m.label),
  );
}
export function matchesPostSearch(
  post: { caption: string | null; service_tags: string[] | null },
  search: string,
) {
  const q = search.trim().toLocaleLowerCase();
  if (!q) return true;
  const tag = normalizeTag(q);
  return (
    (!q.startsWith("#") && (post.caption ?? "").toLocaleLowerCase().includes(q)) ||
    (post.service_tags ?? []).some((t) => normalizeTag(t).toLocaleLowerCase().includes(tag))
  );
}
export function matchesPostTag(post: { service_tags: string[] | null }, tag: string | null) {
  return (
    !tag || (post.service_tags ?? []).some((value) => normalizeTag(value) === normalizeTag(tag))
  );
}
export function hasActivePremium(
  subscription: { status: string; expires_at: string } | null | undefined,
  now = Date.now(),
) {
  return subscription?.status === "active" && Date.parse(subscription.expires_at) > now;
}

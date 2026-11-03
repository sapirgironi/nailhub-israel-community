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
function svgPattern(markup: string) {
  return `url("data:image/svg+xml,${encodeURIComponent(markup)}")`;
}
export const TEXT_POST_BACKGROUNDS = [
  {
    id: "baby-pink",
    label: "ורוד בייבי",
    style: { backgroundImage: "linear-gradient(135deg,#f9c5d5 0%,#edc9e8 55%,#e9d8f5 100%)" },
  },
  {
    id: "elegant-nude",
    label: "ניוד אלגנטי",
    style: { backgroundImage: "linear-gradient(135deg,#f4e4d7 0%,#e8cbb8 100%)" },
  },
  {
    id: "minimal-white",
    label: "לבן מינימליסטי",
    style: { backgroundColor: "#fff", color: "#3f3435" },
  },
  {
    id: "pink-polka",
    label: "נקודות ורדרדות",
    style: {
      backgroundColor: "#fff8fa",
      backgroundImage: "radial-gradient(#e9aabc 1.2px,transparent 1.2px)",
      backgroundSize: "20px 20px",
    },
  },
  {
    id: "polish-icons",
    label: "בקבוקי לק",
    style: {
      backgroundColor: "#fff5f8",
      backgroundImage: svgPattern(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="#d891a5" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"><path d="M25 7h14v8l4 5v32a3 3 0 0 1-3 3H24a3 3 0 0 1-3-3V20l4-5z"/><path d="M25 15h14M21 25h22M29 7v8"/></g><path fill="#f3c7d2" d="M24 28h16v23H24z"/></svg>',
      ),
      backgroundSize: "64px 64px",
    },
  },
  {
    id: "nail-line-art",
    label: "איור קווי עדין",
    style: {
      backgroundColor: "#fff9f8",
      backgroundImage: svgPattern(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><g fill="none" stroke="#d9aaa8" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"><path d="M39 68c-6-4-9-10-12-17l-8-16c-1-3 3-5 5-2l8 11-7-25c-1-4 4-5 5-1l6 18-3-25c0-4 5-4 5 0l4 24 2-20c1-4 5-3 5 1l-1 22 5-14c2-4 6-2 4 2l-5 22c-2 10-6 16-13 20z"/><path d="m27 39 5-2m10-7 5-1m5 7 4 1"/><path d="M31 29q3-4 5-1m4-8q3-3 5 0m5 5q3-3 5 0"/></g></svg>',
      ),
      backgroundSize: "80px 80px",
    },
  },
  {
    id: "pastel-gradient",
    label: "פסטל מודרני",
    style: { backgroundImage: "linear-gradient(125deg,#f9c5dd 0%,#ffd6c3 48%,#fff2dc 100%)" },
  },
] as const;
export type TextPostBackgroundId = (typeof TEXT_POST_BACKGROUNDS)[number]["id"];
export function getTextPostBackground(id: string | null | undefined) {
  return (
    TEXT_POST_BACKGROUNDS.find((background) => background.id === id) ?? TEXT_POST_BACKGROUNDS[0]
  );
}
export const DEFAULT_CAPTION_STYLE = {
  font: "modern",
  textAlign: "center",
  highlight: "solid",
  color: "#FFFFFF",
  fontSize: 32,
} as const;
export const captionStyleSchema = z.object({
  font: z.enum(["modern", "bold", "handwriting", "elegant"]),
  textAlign: z.enum(["center", "right", "left"]),
  highlight: z.enum(["none", "solid", "soft"]),
  color: z.enum(["#FFFFFF", "#000000", "#F472B6", "#D7B19D", "#D4AF37"]),
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

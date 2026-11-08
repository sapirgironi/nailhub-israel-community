import { describe, it, expect } from "vitest";
import {
  POST_TAG_GROUPS,
  POST_TAGS,
  TEXT_POST_BACKGROUNDS,
  DEFAULT_CAPTION_STYLE,
  TEXT_POST_CAPTION_LIMIT,
  captionStyleSchema,
  getTextPostBackground,
  parseCaptionStyle,
  tagSchema,
  matchesPostSearch,
  matchesPostTag,
  livePostMentions,
  readPostMentions,
  hasActivePremium,
  matchesFeedTab,
} from "../lib/feed-post";
import {
  CAPTION_FONT_OPTIONS,
  captionHighlightStyle,
  captionPreviewStyle,
} from "../lib/caption-style";
import { STORY_FONTS } from "../lib/story-fonts";
describe("feed tags and mentions", () => {
  it("offers the requested curated tag groups and retains existing tags", () => {
    expect(POST_TAG_GROUPS.map((g) => g.tags.flat())).toEqual([
      ["מבנה_אנטומי", "לק_ג'ל", "בנייה_באקריל", "בנייה_בג'ל", "טיפים_הפוכים"],
      ["נייל_ארט", "פרנץ'", "אומברה", "עיצוב_כלתי"],
      ["טיפ_מקצועי", "לפני_ואחרי", "שאלה_לקהילה"],
    ]);
    expect(POST_TAGS).toContain("השתלמויות");
  });
  it("normalizes custom tags and rejects executable markup", () => {
    expect(tagSchema.parse("#עיצוב עדין")).toBe("עיצוב_עדין");
    expect(tagSchema.safeParse("<script>").success).toBe(false);
  });
  it("searches persisted tags with or without a hash", () => {
    const p = { caption: "עבודה חדשה", service_tags: ["מבנה_אנטומי"] };
    expect(matchesPostSearch(p, "#מבנה_אנטומי")).toBe(true);
    expect(matchesPostSearch(p, "מבנה אנטומי")).toBe(true);
    expect(matchesPostSearch(p, "#אקריל")).toBe(false);
  });
  it("filters a feed by an exact selected tag", () => {
    expect(matchesPostTag({ service_tags: ["מבנה_אנטומי"] }, "מבנה אנטומי")).toBe(true);
    expect(matchesPostTag({ service_tags: ["מבנה_אנטומי"] }, "לק_ג׳ל")).toBe(false);
  });
  it("classifies posts for each feed tab", () => {
    const imagePost = { image_url: "image.jpg", post_type: "post" };
    const textPost = { image_url: null, post_type: "post" };
    const coursePost = { image_url: "course.jpg", post_type: "course" };
    const dealPost = { image_url: "deal.jpg", post_type: "deal" };

    expect(matchesFeedTab(imagePost, "gallery")).toBe(true);
    expect(matchesFeedTab(textPost, "discussions")).toBe(true);
    expect(matchesFeedTab(coursePost, "gallery")).toBe(false);
    expect(matchesFeedTab(coursePost, "courses")).toBe(true);
    expect(matchesFeedTab(dealPost, "deals")).toBe(true);
    expect(matchesFeedTab(imagePost, "following")).toBe(true);
  });
  it("validates and safely defaults persisted text styling", () => {
    expect(captionStyleSchema.safeParse(DEFAULT_CAPTION_STYLE).success).toBe(true);
    expect(captionStyleSchema.safeParse({ ...DEFAULT_CAPTION_STYLE, fontSize: 999 }).success).toBe(
      false,
    );
    expect(parseCaptionStyle({ font: "<script>" })).toEqual(DEFAULT_CAPTION_STYLE);
  });
  it("provides all seven styled text backgrounds", () => {
    expect(TEXT_POST_BACKGROUNDS).toHaveLength(7);
    expect(TEXT_POST_BACKGROUNDS.map((background) => background.id)).toEqual([
      "powder-pink",
      "classic-nude",
      "pearl-white",
      "luxury-charcoal",
      "soft-sunset",
      "rose-gold",
      "lavender-cream",
    ]);
    expect(TEXT_POST_BACKGROUNDS.some((background) => /בקבוק|איור/.test(background.label))).toBe(
      false,
    );
  });
  it("limits styled text posts to 400 characters", () => {
    expect(TEXT_POST_CAPTION_LIMIT).toBe(400);
  });
  it("supports persisted custom background colors and validates custom caption colors", () => {
    expect(getTextPostBackground("custom:#abc123").style).toEqual({ backgroundColor: "#abc123" });
    expect(getTextPostBackground("custom:javascript:alert(1)").id).toBe("powder-pink");
    expect(
      captionStyleSchema.safeParse({
        ...DEFAULT_CAPTION_STYLE,
        color: "#12AB34",
        highlightColor: "#ABCDEF",
      }).success,
    ).toBe(true);
    expect(captionStyleSchema.safeParse({ ...DEFAULT_CAPTION_STYLE, color: "red" }).success).toBe(
      false,
    );
  });
  it("keeps the saved typography settings in the rendered style", () => {
    const style = captionPreviewStyle({
      ...DEFAULT_CAPTION_STYLE,
      font: "elegant",
      textAlign: "right",
      highlight: "soft",
      color: "#F472B6",
      highlightColor: "#12AB34",
      fontSize: 44,
    });
    expect(style).toMatchObject({
      fontFamily: '"Frank Ruhl Libre", serif',
      textAlign: "right",
      fontSize: "44px",
      color: "#F472B6",
    });
    expect(
      captionHighlightStyle({
        ...DEFAULT_CAPTION_STYLE,
        highlight: "soft",
        highlightColor: "#12AB34",
      }),
    ).toMatchObject({
      background: "rgba(18,171,52,0.55)",
      borderRadius: 999,
      boxDecorationBreak: "clone",
      WebkitBoxDecorationBreak: "clone",
    });
  });
  it("uses the complete shared story font list for styled feed posts", () => {
    expect(CAPTION_FONT_OPTIONS.map(({ id }) => id)).toEqual(STORY_FONTS.map(({ id }) => id));
    for (const font of STORY_FONTS) {
      expect(
        captionStyleSchema.safeParse({ ...DEFAULT_CAPTION_STYLE, font: font.id }).success,
      ).toBe(true);
    }
  });
  it("drops deleted mentions and rejects invalid profile targets", () => {
    const m = { userId: "00000000-0000-4000-8000-000000000001", label: "@ספיר_גירוני" };
    expect(livePostMentions("היי @ספיר_גירוני", [m])).toEqual([m]);
    expect(livePostMentions("היי", [m])).toEqual([]);
    expect(readPostMentions([{ ...m, userId: "javascript:alert(1)" }])).toEqual([]);
  });
});
describe("premium access", () => {
  const now = Date.parse("2026-10-27T20:28:00Z");
  it("allows only an active unexpired subscription", () => {
    expect(hasActivePremium({ status: "active", expires_at: "2026-10-28T00:00:00Z" }, now)).toBe(
      true,
    );
  });
  it("denies ordinary members", () => {
    expect(hasActivePremium(null, now)).toBe(false);
  });
  it("denies cancelled subscriptions even before expiry", () => {
    expect(hasActivePremium({ status: "cancelled", expires_at: "2026-10-28T00:00:00Z" }, now)).toBe(
      false,
    );
  });
  it("denies expired active subscriptions", () => {
    expect(hasActivePremium({ status: "active", expires_at: "2026-10-27T20:28:00Z" }, now)).toBe(
      false,
    );
  });
});

import { describe, it, expect } from "vitest";
import {
  POST_TAG_GROUPS,
  POST_TAGS,
  TEXT_POST_BACKGROUNDS,
  DEFAULT_CAPTION_STYLE,
  captionStyleSchema,
  parseCaptionStyle,
  tagSchema,
  matchesPostSearch,
  matchesPostTag,
  livePostMentions,
  readPostMentions,
  hasActivePremium,
} from "../lib/feed-post";
import { captionPreviewStyle } from "../lib/caption-style";
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
  it("validates and safely defaults persisted text styling", () => {
    expect(captionStyleSchema.safeParse(DEFAULT_CAPTION_STYLE).success).toBe(true);
    expect(captionStyleSchema.safeParse({ ...DEFAULT_CAPTION_STYLE, fontSize: 999 }).success).toBe(
      false,
    );
    expect(parseCaptionStyle({ font: "<script>" })).toEqual(DEFAULT_CAPTION_STYLE);
  });
  it("provides all seven styled text backgrounds", () => {
    expect(TEXT_POST_BACKGROUNDS).toHaveLength(7);
  });
  it("keeps the saved typography settings in the rendered style", () => {
    const style = captionPreviewStyle({
      ...DEFAULT_CAPTION_STYLE,
      font: "elegant",
      textAlign: "right",
      highlight: "soft",
      color: "#F472B6",
      fontSize: 44,
    });
    expect(style).toMatchObject({
      fontFamily: '"Frank Ruhl Libre", serif',
      textAlign: "right",
      fontSize: "44px",
      color: "#F472B6",
    });
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

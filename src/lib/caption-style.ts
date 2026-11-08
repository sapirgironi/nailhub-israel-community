import type { CSSProperties } from "react";
import type { CaptionStyle } from "./feed-post";
import { STORY_FONTS } from "./story-fonts";

export const CAPTION_FONT_OPTIONS = STORY_FONTS.map((font) => ({
  id: font.id,
  label: font.desc,
  family: `"${font.family}", sans-serif`,
  italic: font.italic,
}));
const LEGACY_CAPTION_FONTS = [
  { id: "modern", family: "Assistant, sans-serif", weight: 600 },
  { id: "bold", family: "Heebo, sans-serif", weight: 800 },
  { id: "handwriting", family: '"Amatic SC", cursive', weight: 600 },
  { id: "elegant", family: '"Frank Ruhl Libre", serif', weight: 600 },
] as const;
export const CAPTION_COLOR_OPTIONS = [
  { color: "#FFFFFF", label: "לבן" },
  { color: "#000000", label: "שחור" },
  { color: "#FF00A8", label: "ורוד פוקסיה" },
  { color: "#FFB6C1", label: "ורוד בייבי" },
  { color: "#D7B19D", label: "ניוד" },
  { color: "#800020", label: "בורדו עמוק" },
  { color: "#E53935", label: "אדום קלאסי" },
  { color: "#D4AF37", label: "זהב" },
  { color: "#6F4E37", label: "חום שוקולד" },
  { color: "#C8A2C8", label: "סגול לילך" },
  { color: "#8A9A5B", label: "ירוק מרווה" },
] as const;

function withAlpha(color: string, alpha: number) {
  const hex = color.slice(1);
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red},${green},${blue},${alpha})`;
}

export function captionPreviewStyle(style: CaptionStyle): CSSProperties {
  const font = CAPTION_FONT_OPTIONS.find((option) => option.id === style.font);
  const legacyFont = LEGACY_CAPTION_FONTS.find((option) => option.id === style.font);
  const fontFamily = font?.family ?? legacyFont?.family ?? CAPTION_FONT_OPTIONS[0]?.family;
  return {
    color: style.color,
    fontFamily,
    fontStyle: font?.italic ? "italic" : "normal",
    fontSize: `${style.fontSize}px`,
    fontWeight: legacyFont?.weight ?? 600,
    textAlign: style.textAlign,
    textShadow: style.highlight === "none" ? "0 1px 5px rgba(0,0,0,.65)" : "none",
  };
}

export function captionHighlightStyle(style: CaptionStyle): CSSProperties {
  const background =
    style.highlight === "none"
      ? "transparent"
      : style.highlight === "solid"
        ? style.highlightColor
        : withAlpha(style.highlightColor, 0.55);
  return {
    background,
    borderRadius: style.highlight === "none" ? 0 : 999,
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
    padding: style.highlight === "none" ? 0 : "2px 0.625rem",
  };
}

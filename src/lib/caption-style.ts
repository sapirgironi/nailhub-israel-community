import type { CSSProperties } from "react";
import type { CaptionStyle } from "./feed-post";

export const CAPTION_FONT_OPTIONS = [
  { id: "modern", label: "נקי", family: "Assistant, sans-serif" },
  { id: "bold", label: "מודגש", family: "Heebo, sans-serif" },
  { id: "handwriting", label: "כתב יד", family: '"Amatic SC", cursive' },
  { id: "elegant", label: "אלגנטי", family: '"Frank Ruhl Libre", serif' },
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
  const font =
    CAPTION_FONT_OPTIONS.find((option) => option.id === style.font) ?? CAPTION_FONT_OPTIONS[0];
  const background =
    style.highlight === "none"
      ? "transparent"
      : style.highlight === "solid"
        ? style.highlightColor
        : withAlpha(style.highlightColor, 0.55);
  return {
    color: style.color,
    fontFamily: font.family,
    fontSize: `${style.fontSize}px`,
    fontWeight: style.font === "bold" ? 800 : 600,
    textAlign: style.textAlign,
    background,
    borderRadius: style.highlight === "none" ? 0 : 999,
    padding: style.highlight === "none" ? 0 : ".25em .7em",
    textShadow: style.highlight === "none" ? "0 1px 5px rgba(0,0,0,.65)" : "none",
  };
}

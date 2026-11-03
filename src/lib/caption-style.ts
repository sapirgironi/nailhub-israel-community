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
  { color: "#F472B6", label: "ורוד עדין" },
  { color: "#D7B19D", label: "ניוד" },
  { color: "#D4AF37", label: "זהב" },
] as const;

function isLightColor(color: string) {
  return color === "#FFFFFF" || color === "#D7B19D" || color === "#D4AF37";
}

export function captionPreviewStyle(style: CaptionStyle): CSSProperties {
  const font =
    CAPTION_FONT_OPTIONS.find((option) => option.id === style.font) ?? CAPTION_FONT_OPTIONS[0];
  const background =
    style.highlight === "none"
      ? "transparent"
      : style.highlight === "solid"
        ? isLightColor(style.color)
          ? "#171717"
          : "#FFFFFF"
        : isLightColor(style.color)
          ? "rgba(23,23,23,.55)"
          : "rgba(255,255,255,.78)";
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

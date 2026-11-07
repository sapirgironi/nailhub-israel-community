import type { CSSProperties, RefObject } from "react";
import { AlignCenter, AlignLeft, AlignRight, Bold, Highlighter, Type } from "lucide-react";
import type { CaptionStyle } from "@/lib/feed-post";
import {
  CAPTION_COLOR_OPTIONS,
  CAPTION_FONT_OPTIONS,
  captionPreviewStyle,
} from "@/lib/caption-style";
import { Button } from "./ui/button";

export function StoryTextEditor({
  value,
  onChange,
  style,
  onStyleChange,
  imageSrc,
  textOnly,
  backgroundStyle,
  inputRef,
  onCaretChange,
  disabled = false,
  placeholder = "כתבי טקסט לפוסט…",
}: {
  value: string;
  onChange: (value: string, caret: number) => void;
  style: CaptionStyle;
  onStyleChange: (style: CaptionStyle) => void;
  imageSrc: string | undefined;
  textOnly: boolean;
  backgroundStyle: CSSProperties | undefined;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  onCaretChange: (caret: number) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const previewStyle = captionPreviewStyle(style);
  const updateStyle = (updates: Partial<CaptionStyle>) => onStyleChange({ ...style, ...updates });
  const highlightModes: CaptionStyle["highlight"][] = ["none", "solid", "soft"];
  const nextHighlight =
    highlightModes[(highlightModes.indexOf(style.highlight) + 1) % highlightModes.length] ?? "none";

  return (
    <section className="space-y-4" aria-label="עורך טקסט לפוסט">
      {textOnly ? (
        <div
          className="grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-border p-6 text-center"
          style={backgroundStyle}
        >
          <p
            className="max-w-full whitespace-pre-wrap break-words"
            style={{ ...previewStyle, textAlign: style.textAlign }}
          >
            {value.trim() || "התצוגה המקדימה של הפוסט שלך"}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt="תצוגה מקדימה של הפוסט"
              className="block max-h-[560px] w-full bg-card object-contain"
            />
          ) : (
            <div className="grid min-h-64 place-items-center text-sm text-muted-foreground">
              בחרי תמונה כדי לראות תצוגה מקדימה
            </div>
          )}
          {value.trim() && (
            <p className="whitespace-pre-wrap break-words p-4 text-sm text-foreground">{value}</p>
          )}
        </div>
      )}

      <label className="block font-bold text-sm" htmlFor="feed-caption">
        כיתוב לפוסט
      </label>
      <textarea
        id="feed-caption"
        ref={inputRef}
        aria-label="כיתוב לפוסט"
        maxLength={2000}
        rows={4}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full min-w-0 resize-y whitespace-pre-wrap rounded-xl border border-input bg-card px-3 py-3 text-right text-sm outline-none focus:ring-2 focus:ring-ring"
        onChange={(event) => onChange(event.target.value, event.target.selectionStart)}
        onSelect={(event) => onCaretChange(event.currentTarget.selectionStart)}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{textOnly ? "הטקסט נשמר יחד עם העיצוב" : "הכיתוב יוצג מתחת לתמונה"}</span>
        <output aria-label="מונה תווים" dir="ltr">
          {value.length} / 2000
        </output>
      </div>

      {textOnly && (
        <div className="space-y-3 rounded-xl border border-border p-3" aria-label="סרגל עיצוב טקסט">
          <div className="flex flex-wrap gap-2" role="group" aria-label="סגנון כתב">
            {CAPTION_FONT_OPTIONS.map((font) => (
              <Button
                key={font.id}
                type="button"
                disabled={disabled}
                size="sm"
                variant={style.font === font.id ? "default" : "outline"}
                aria-pressed={style.font === font.id}
                onClick={() => updateStyle({ font: font.id })}
                style={{ fontFamily: font.family }}
              >
                {font.id === "bold" && <Bold className="size-3" />}
                {font.id === "modern" && <Type className="size-3" />}
                {font.label}
              </Button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex gap-1" role="group" aria-label="יישור הטקסט">
              {(
                [
                  ["right", "יישור לימין", AlignRight],
                  ["center", "יישור למרכז", AlignCenter],
                  ["left", "יישור לשמאל", AlignLeft],
                ] as const
              ).map(([alignment, label, Icon]) => (
                <Button
                  key={alignment}
                  type="button"
                  size="icon"
                  disabled={disabled}
                  variant={style.textAlign === alignment ? "secondary" : "ghost"}
                  aria-label={label}
                  aria-pressed={style.textAlign === alignment}
                  onClick={() => updateStyle({ textAlign: alignment })}
                >
                  <Icon />
                </Button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disabled}
              aria-label={`סגנון רקע לטקסט: ${style.highlight}`}
              onClick={() => updateStyle({ highlight: nextHighlight })}
            >
              <Highlighter />
              {style.highlight === "none"
                ? "ללא רקע"
                : style.highlight === "solid"
                  ? "קפסולה מלאה"
                  : "רקע מעודן"}
            </Button>
            <div
              className="flex max-w-full items-center gap-2 overflow-x-auto py-1"
              role="group"
              aria-label="צבע הטקסט"
            >
              {CAPTION_COLOR_OPTIONS.map(({ color, label }) => (
                <button
                  key={color}
                  type="button"
                  disabled={disabled}
                  aria-label={`צבע ${label}`}
                  aria-pressed={style.color === color}
                  onClick={() => updateStyle({ color })}
                  className={`size-7 shrink-0 rounded-full border ${style.color === color ? "ring-2 ring-primary ring-offset-2" : "border-border"}`}
                  style={{ backgroundColor: color }}
                />
              ))}
              <label
                className="relative flex size-7 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed border-border"
                title="בחירת צבע טקסט מותאם אישית"
              >
                <span aria-hidden="true">✦</span>
                <input
                  type="color"
                  value={style.color}
                  aria-label="בחירת צבע טקסט מותאם אישית"
                  disabled={disabled}
                  onChange={(event) => updateStyle({ color: event.target.value.toUpperCase() })}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs">
              צבע רקע להדגשה
              <input
                type="color"
                value={style.highlightColor}
                aria-label="צבע רקע להדגשת הטקסט"
                disabled={disabled}
                onChange={(event) =>
                  updateStyle({ highlightColor: event.target.value.toUpperCase() })
                }
                className="size-8 cursor-pointer rounded border border-border bg-transparent p-0.5"
              />
            </label>
          </div>

          <label className="flex items-center gap-3 text-xs font-bold">
            גודל הטקסט
            <input
              type="range"
              disabled={disabled}
              min="16"
              max="56"
              step="1"
              value={style.fontSize}
              aria-label="גודל הטקסט"
              onChange={(event) => updateStyle({ fontSize: Number(event.target.value) })}
              className="w-full accent-primary"
            />
            <output>{style.fontSize}px</output>
          </label>
        </div>
      )}
    </section>
  );
}

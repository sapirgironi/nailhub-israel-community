import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject, type PointerEvent as RPointerEvent } from "react";
import { createStoryPreview } from "@/lib/story-preview";
import { optimizeUploadImage } from "@/lib/image-optimization";
import {
  Trash2,
  Type,
  X,
  Smile,
  Bold,
  Underline,
  Highlighter,
  Minus,
  Plus,
  AtSign,
  ImagePlus,
  Image as ImageIcon,
  MoreHorizontal,
  Pipette,
  LockKeyhole,
  LockKeyholeOpen,
  ArrowUp,
  ArrowDown,
  Check,
  ChevronDown,
  ChevronUp,
  Send,
  Stamp,
  RotateCw,
  Square,
  Circle,
  Heart,
  Star,
} from "lucide-react";
import {toast} from "sonner";
import type {PointerEvent as ReactPointerEvent} from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { uploadPhoto } from "@/lib/media";
import { ImageUploadStatus } from "./ImageUploadStatus";
import { Button } from "./ui/button";
import { toBlob } from "html-to-image";
import { flushSync } from "react-dom";
import { StoryMentionPicker } from "./StoryMentionPicker";
import {
  activeMention,
  insertMention,
  storyTextLines,
  type StoryMention,
  type MentionMember,
} from "@/lib/story-layout";

export const STORY_STICKERS = [
  "התפנה תור להיום ⏰",
  "מחפשת מודליסטית 🔍",
  "מבצע לספקים 🔥",
  "השתלמות מקצועית 👑",
];
export const STORY_FONTS = [
  {
    id: "assistant",
    label: "Assistant",
    desc: "דפוס נקי ומודרני",
    family: "Assistant",
    italic: false,
  },
  { id: "heebo", label: "Heebo", desc: "דפוס קלאסי", family: "Heebo", italic: false },
  { id: "italic", label: "Rubik Italic", desc: "סגנון נטוי", family: "Rubik", italic: true },
  { id: "hand", label: "Amatic SC", desc: "כתב יד", family: "Amatic SC", italic: false },
  { id: "round", label: "Varela Round", desc: "סגנון עגול", family: "Varela Round", italic: false },
  {
    id: "playful",
    label: "Playpen Sans",
    desc: "כתב יד עגול",
    family: "Playpen Sans Hebrew",
    italic: false,
  },
  {
    id: "serif",
    label: "Frank Ruhl Libre",
    desc: "סריפי מעוצב",
    family: "Frank Ruhl Libre",
    italic: false,
  },
] as const;
type FontId = (typeof STORY_FONTS)[number]["id"];
const COLORS = [
  "#FFFFFF",
  "#000000",
  "#5B0E2D",
  "#E91E63",
  "#F48FB1",
  "#FCE4EC",
  "#D7B19D",
  "#C8A27A",
  "#D4AF37",
  "#B5EAD7",
  "#C7CEEA",
  "#FFDAC1",
  "#E2F0CB",
  "#FF6F61",
];
const STORY_COLOR_FAMILIES = [
  {label: "ניוד ובז׳", shades: ["#FFF8E7", "#F3E5AB", "#E5D0B1", "#C8AA88", "#896B52"]},
  {label: "ורודים", shades: ["#FCE4EC", "#F8BBD0", "#F48FB1", "#E91E63", "#AD486D"]},
  {label: "אדומים", shades: ["#FFD8D5", "#F58B83", "#E53935", "#B71C1C", "#5B0E2D"]},
  {label: "סגולים", shades: ["#F0E5FA", "#DCC6F0", "#B78CD6", "#8751AF", "#4A216B"]},
  {label: "כחולים", shades: ["#E0F2FE", "#B3DDF2", "#62BCD5", "#258AA7", "#163A61"]},
  {label: "ירוקים", shades: ["#E4F3DE", "#B5EAD7", "#BCD39A", "#91AD91", "#205B46"]},
  {label: "כתום וצהוב", shades: ["#FFF3C4", "#FFDAC1", "#FFBA80", "#ED9142", "#B68A20"]},
  {label: "שחור לבן ואפור", shades: ["#FFFFFF", "#E4E4E4", "#A3A3A3", "#525252", "#000000"]},
] as const;
const StoryColorPalette = memo(function StoryColorPalette({value, onChange}: {value: string; onChange: (color: string) => void}) {
  const [familyIndex, setFamilyIndex] = useState(() => Math.max(0, STORY_COLOR_FAMILIES.findIndex(family => family.shades.some(shade => shade === value.toUpperCase()))));
  const family = STORY_COLOR_FAMILIES[familyIndex] ?? STORY_COLOR_FAMILIES[0];
  const [spectrum, setSpectrum] = useState(false), [hue, setHue] = useState(330), [light, setLight] = useState(0.5), [sampling, setSampling] = useState(false);
  const startSampling = async () => {
    const Dropper = (window as unknown as {EyeDropper?: new () => {open: () => Promise<{sRGBHex: string}>}}).EyeDropper;
    if (Dropper) {try {const res = await new Dropper().open(); onChange(res.sRGBHex.toUpperCase());} catch {/* cancelled */} return;}
    setSampling(true);
  };
  const sampleAt = (ev: ReactPointerEvent<HTMLDivElement>) => {
    ev.preventDefault(); ev.stopPropagation();
    const overlay = ev.currentTarget; overlay.style.pointerEvents = "none";
    const color = sampleImageAt(ev.clientX, ev.clientY);
    setSampling(false);
    if (color) onChange(color); else toast.error("לא ניתן לדגום צבע בנקודה זו, נסי נקודה אחרת בתמונה");
  };
  return <div className="space-y-1" onPointerDown={ev => {if (ev.target instanceof Element && ev.target.closest('button')) ev.preventDefault();}}>
    {spectrum && <div className="space-y-1.5 py-1">
      <input type="range" aria-label="גוון" min={0} max={360} value={hue} onChange={ev => {const h = Number(ev.target.value); setHue(h); onChange(hueColor(h, light));}} className="story-spectrum h-3 w-full cursor-pointer appearance-none rounded-full" style={{background: "linear-gradient(to left, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)"}}/>
      <input type="range" aria-label="בהירות" min={5} max={95} value={Math.round(light * 100)} onChange={ev => {const l = Number(ev.target.value) / 100; setLight(l); onChange(hueColor(hue, l));}} className="story-spectrum h-3 w-full cursor-pointer appearance-none rounded-full" style={{background: `linear-gradient(to left, #000, ${hueColor(hue, 0.5)}, #fff)`}}/>
    </div>}
    <div role="group" aria-label="משפחות צבעים" className="flex gap-2 overflow-x-auto py-1">
      {STORY_COLOR_FAMILIES.map((item, index) => <Button key={item.label} size="icon" variant="ghost" aria-label={`צבעי ${item.label}`} title={item.label} aria-pressed={index === familyIndex} className="size-7 shrink-0 rounded-full border border-primary-foreground/40 p-0 aria-pressed:ring-2 aria-pressed:ring-primary-foreground" style={{backgroundColor: item.shades[2]}} onClick={() => setFamilyIndex(index)}/>)}
    </div>
    <div role="group" aria-label={`גווני ${family.label}`} className="flex items-center gap-2 overflow-x-auto py-1">
      {family.shades.map((shade, index) => <Button key={shade} size="icon" variant="ghost" aria-label={`${family.label} גוון ${index + 1}`} title={`${family.label} ${index + 1}`} aria-pressed={value.toUpperCase() === shade} className="size-7 shrink-0 rounded-full border border-primary-foreground/40 p-0 aria-pressed:ring-2 aria-pressed:ring-primary-foreground" style={{backgroundColor: shade}} onClick={() => onChange(shade)}/>)}
      <button type="button" aria-label="גוונים נוספים" aria-pressed={spectrum} onClick={() => setSpectrum(v => !v)} className="flex shrink-0 flex-col items-center gap-0.5 text-[9px] text-primary-foreground/80">
        <span className="size-7 rounded-full border border-primary-foreground/40 aria-pressed:ring-2" style={{background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)"}}/>
        גוונים נוספים
      </button>
      <button type="button" aria-label="דגימת צבע מהתמונה" title="טפטפת" onClick={startSampling} className="flex size-7 shrink-0 items-center justify-center rounded-full border border-primary-foreground/40 text-primary-foreground"><Pipette className="size-4"/></button>
    </div>
    {sampling && <div className="fixed inset-0 z-[80] cursor-crosshair" onPointerDown={sampleAt}><span className="pointer-events-none absolute inset-x-0 top-16 mx-auto w-fit rounded-full bg-overlay px-3 py-1 text-xs text-primary-foreground">הקישי על נקודה בתמונה</span></div>}
  </div>;
});
function hueColor(h: number, l: number) {
  const a = Math.min(l, 1 - l), f = (n: number) => {const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, "0");};
  return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}
function sampleImageAt(x: number, y: number): string | null {
  const img = document.elementsFromPoint(x, y).find((el): el is HTMLImageElement => el instanceof HTMLImageElement && el.naturalWidth > 0);
  if (!img) return null;
  const r = img.getBoundingClientRect(), nw = img.naturalWidth, nh = img.naturalHeight;
  const fit = getComputedStyle(img).objectFit;
  const scale = fit === "cover" ? Math.max(r.width / nw, r.height / nh) : fit === "contain" ? Math.min(r.width / nw, r.height / nh) : NaN;
  const sx = Number.isNaN(scale) ? (x - r.left) * nw / r.width : (x - r.left - (r.width - nw * scale) / 2) / scale;
  const sy = Number.isNaN(scale) ? (y - r.top) * nh / r.height : (y - r.top - (r.height - nh * scale) / 2) / scale;
  if (sx < 0 || sy < 0 || sx >= nw || sy >= nh) return null;
  try {
    const c = document.createElement("canvas"); c.width = 1; c.height = 1;
    const ctx = c.getContext("2d"); if (!ctx) return null;
    ctx.drawImage(img, Math.floor(sx), Math.floor(sy), 1, 1, 0, 0, 1, 1);
    const [red = 0, green = 0, blue = 0] = ctx.getImageData(0, 0, 1, 1).data;
    return `#${[red, green, blue].map(v => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  } catch {return null;}
}
const BASE = 28;
const IMG_BASE = 110;
type El = {
  id: number;
  kind: "text" | "pill" | "image";
  text: string;
  font: FontId;
  bold: boolean;
  underline: boolean;
  highlight: boolean;
  color: string;
  x: number;
  y: number;
  scale: number;
  rot: number;
  z: number;
  width: number;
  opacity: number;
  mentions: { userId: string; label: string }[];
  src?: string | undefined;
  locked?: boolean;
  imageRole?: "logo" | "sticker" | "photo";
  shape?: PhotoShape;
  borderWidth?: number;
  borderColor?: string;
};

export const PHOTO_SHAPES = [
  {id: "square", label: "ריבוע", icon: Square},
  {id: "rounded", label: "פינות מעוגלות", icon: Square},
  {id: "circle", label: "עיגול", icon: Circle},
  {id: "heart", label: "לב", icon: Heart},
  {id: "star", label: "כוכב", icon: Star},
] as const;
type PhotoShape = (typeof PHOTO_SHAPES)[number]["id"];
const PHOTO_PATHS: Record<PhotoShape, string> = {
  square: "M0 0H120V120H0Z",
  rounded: "M20 0H100Q120 0 120 20V100Q120 120 100 120H20Q0 120 0 100V20Q0 0 20 0Z",
  circle: "M60 0A60 60 0 1 1 60 120A60 60 0 1 1 60 0Z",
  heart: "M60 116C48 104 0 73 0 36C0 3 40 -9 60 20C80 -9 120 3 120 36C120 73 72 104 60 116Z",
  star: "M60 0L74 40L118 42L84 69L96 112L60 88L24 112L36 69L2 42L46 40Z",
};
export function storyBorderWidth(value: number) { return Math.max(0, Math.min(12, value)); }
export function storyLayerCanMove(layer: {locked?: boolean}) { return !layer.locked; }
export function reorderStoryLayers<T extends {id: number; z: number}>(layers: T[], id: number, direction: 1 | -1): T[] {
  const ordered = [...layers].sort((a, b) => a.z - b.z);
  const index = ordered.findIndex(layer => layer.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= ordered.length) return layers;
  const current = ordered[index], neighbor = ordered[target];
  if (!current || !neighbor) return layers;
  ordered[index] = neighbor;
  ordered[target] = current;
  return ordered.map((layer, z) => ({...layer, z}));
}
const StoryPhoto = memo(function StoryPhoto({e}: {e: El}) {
  const shape = e.shape ?? "square";
  const border = storyBorderWidth(e.borderWidth ?? 0);
  const clipId = `story-photo-${e.id}`;
  return <svg role="img" aria-label={e.text || "תמונה נוספת"} width="120" height="120" viewBox="0 0 120 120" className="pointer-events-none block overflow-hidden">
    <defs><clipPath id={clipId}><path d={PHOTO_PATHS[shape]}/></clipPath></defs>
    <image href={e.src} width="120" height="120" preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`}/>
    <path d={PHOTO_PATHS[shape]} fill="none" stroke={e.borderColor ?? COLORS[0]} strokeWidth={border} transform={`translate(${border / 2} ${border / 2}) scale(${1 - border / 120})`}/>
  </svg>;
});

const fontOf = (id: FontId) => STORY_FONTS.find((f) => f.id === id) ?? STORY_FONTS[0];
function isLight(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160;
}
const highlightBg = (c: string) => (isLight(c) ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.92)");
function isTrash(x: number, y: number) {
  return y > 86 && Math.abs(x - 50) < 18;
}
function cssFont(e: El, px: number) {
  const f = fontOf(e.font);
  return `${f.italic ? "italic " : ""}${e.bold ? "700" : "400"} ${px}px "${f.family}"`;
}

async function loadImg(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
async function hasTransparentPixels(img: HTMLImageElement) {
  const scale = Math.min(1, 128 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("בדיקת הלוגו נכשלה");
  context.drawImage(img, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < pixels.length; i += 4) if ((pixels[i] ?? 255) < 255) return true;
  return false;
}

export function EditableText({
  initial,
  onChange,
  autoFocus = true,
}: {
  initial: string;
  onChange: (t: string, caret: number) => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const n = ref.current;
    if (!n) return;
    n.textContent = initial;
    if (!autoFocus) return;
    n.focus();
    const r = document.createRange();
    r.selectNodeContents(n);
    r.collapse(false);
    const s = getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const n = ref.current;
    if (n && (n.innerText || "") !== initial) {
      n.textContent = initial;
      if (document.activeElement === n) {
        const range = document.createRange(); range.selectNodeContents(n); range.collapse(false);
        const selection = getSelection(); selection?.removeAllRanges(); selection?.addRange(range);
      }
    }
  }, [initial]);
  return (
    <span
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="טקסט הסטורי"
      data-placeholder="הקלידי כאן"
      onPointerDown={(e) => e.stopPropagation()}
      onInput={(e) =>
        onChange(
          (e.currentTarget.innerText || "").slice(0, 120),
          (() => {
            const selection = getSelection();
            if (!selection?.rangeCount) return 0;
            const range = selection.getRangeAt(0).cloneRange();
            range.selectNodeContents(e.currentTarget);
            range.setEnd(selection.anchorNode ?? e.currentTarget, selection.anchorOffset);
            return range.toString().length;
          })(),
        )
      }
      onPaste={ev => {
        ev.preventDefault();
        const selection = getSelection();
        if (!selection?.rangeCount) return;
        const range = selection.getRangeAt(0);
        if (!ev.currentTarget.contains(range.commonAncestorContainer)) return;
        const value = ev.clipboardData.getData("text/plain").slice(0, Math.max(0, 120 - (ev.currentTarget.innerText || "").length + range.toString().length));
        range.deleteContents();
        const node = document.createTextNode(value); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
        selection.removeAllRanges(); selection.addRange(range);
        const caret = range.cloneRange(); caret.selectNodeContents(ev.currentTarget); caret.setEnd(node, node.length);
        onChange((ev.currentTarget.innerText || "").slice(0, 120), caret.toString().length);
      }}
      style={{whiteSpace: "pre-wrap", wordBreak: "normal", overflowWrap: "anywhere", display: "inline-block", width: "100%"}}
      className="outline-none min-w-[1ch] caret-current empty:before:content-[attr(data-placeholder)] empty:before:opacity-60"
    />
  );
}


function useStableEvent<T extends (...args: never[]) => unknown>(handler: T): T {
  const ref = useRef(handler);
  useLayoutEffect(() => { ref.current = handler; });
  return useCallback(((...args) => ref.current(...args)) as T, []);
}

type LayerProps = {
  e: El; active: boolean; editing: boolean; focusText: boolean; dimmed: boolean;
  down: (ev: RPointerEvent, e: El) => void;
  editLayer: (id: number) => void; finishEditing: () => void;
  changeText: (id: number, text: string, caret: number) => void;
  beginResize: (ev: RPointerEvent, e: El, side: 1 | -1) => void;
};
export function storyPixelWidth(width: number, dx: number, dy: number, rotation: number, frameWidth: number, side: 1 | -1) {
  const angle = rotation * Math.PI / 180;
  const max = Math.max(0, frameWidth - 24);
  return Math.max(Math.min(48, max), Math.min(width + side * (dx * Math.cos(angle) + dy * Math.sin(angle)) * 2, max));
}
export function storyImageScale(value: number) { return Math.max(0.8, Math.min(2, value)); }
type ImageView = {scale: number; x: number; y: number};
export function boundedImageView(view: ImageView, width: number, height: number, naturalWidth: number, naturalHeight: number): ImageView {
  const scale = storyImageScale(view.scale);
  if (!naturalWidth || !naturalHeight) return {...view, scale, x: 0, y: 0};
  const fit = Math.max(width / naturalWidth, height / naturalHeight);
  const maxX = Math.abs(width - naturalWidth * fit * scale) / (2 * scale);
  const maxY = Math.abs(height - naturalHeight * fit * scale) / (2 * scale);
  return {scale, x: Math.max(-maxX, Math.min(maxX, view.x)) || 0, y: Math.max(-maxY, Math.min(maxY, view.y)) || 0};
}
function fitTextLayer(node: HTMLElement, size: number, rotation: number) {
  const canvas = node.parentElement;
  const text = node.querySelector<HTMLElement>('[data-story-text]');
  if (!canvas || !text || !canvas.clientWidth) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  node.style.width = `${storyPixelWidth(parseFloat(node.style.width), 0, 0, rotation, width, 1)}px`;
  node.style.maxWidth = `${Math.max(0, width - 24)}px`;
  text.style.fontSize = `${BASE * size}px`;
  node.style.transform = `translate(-50%,-50%) rotate(${rotation}deg)`;
  const box = node.getBoundingClientRect();
  const halfWidth = Math.min(width / 2, box.width / 2 + 12), halfHeight = Math.min(height / 2, box.height / 2);
  const x = parseFloat(node.style.left) / 100 * width;
  const y = parseFloat(node.style.top) / 100 * height;
  node.style.left = `${Math.min(width - halfWidth, Math.max(halfWidth, x)) / width * 100}%`;
  node.style.top = `${Math.min(height - halfHeight, Math.max(halfHeight, y)) / height * 100}%`;
}
const StoryLayer = memo(function StoryLayer({e, active, editing, dimmed, down, editLayer, finishEditing, changeText, beginResize}: LayerProps) {
  const f = fontOf(e.font);
  const layerRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (e.kind !== "text") return;
    const node = layerRef.current;
    if (!node) return;
    const fit = () => fitTextLayer(node, e.scale, e.rot);
    fit();
    const observer = new ResizeObserver(fit);
    if (node.parentElement) observer.observe(node.parentElement);
    let mounted = true;
    void document.fonts.ready.then(() => { if (mounted) fit(); });
    return () => { mounted = false; observer.disconnect(); };
  }, [e, editing]);
  return (
              <div
                ref={layerRef}
                data-layer-id={e.id}
                key={e.id}
                onPointerDown={(ev) => down(ev, e)}
                onDoubleClick={() => !e.locked && e.kind === "text" && editLayer(e.id)}
                style={{
                  left: e.x + "%",
                  top: e.y + "%",
                  zIndex: e.z,
                  transform: `translate(-50%,-50%) scale(${e.kind === "text" ? 1 : e.scale}) rotate(${e.rot}deg)`,
                  touchAction: "none",
                  willChange: "transform",
                  width: e.kind === "text" ? e.width + "px" : "max-content",
                  maxWidth: e.kind === "text" ? "calc(100% - 24px)" : "90%",
                  minWidth: e.kind === "text" ? 0 : undefined,
                  opacity: dimmed ? 0.5 : e.opacity,
                }}
                className={
                  "absolute text-center " + (e.locked ? "cursor-default " : "cursor-grab ") +
                  (active
                    ? "outline outline-1 outline-dashed outline-primary-foreground/70 rounded-md"
                    : "")
                }
              >
                {e.kind === "image" && e.imageRole === "photo" && e.src && <StoryPhoto e={e}/>}
                {e.kind === "image" && e.imageRole !== "photo" && e.src && (
                  <img
                    src={e.src}
                    alt={e.text || "סטיקר"}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    style={{
                      width: IMG_BASE,
                      maxWidth: "90%",
                      height: "auto",
                      objectFit: "contain",
                    }}
                    className="pointer-events-none"
                  />
                )}
                {e.kind === "pill" && (
                  <span className="block bg-card text-primary font-extrabold rounded-full px-4 py-2 text-[15px] whitespace-nowrap shadow-soft">
                    {e.text}
                  </span>
                )}
                {e.kind === "text" && (
                  <span
                    data-story-text="true"
                    style={{
                      fontFamily: `"${f.family}"`,
                      fontStyle: f.italic ? "italic" : "normal",
                      fontWeight: e.bold ? 700 : 400,
                      textDecoration: e.underline ? "underline" : "none",
                      color: e.color,
                      opacity: 1,
                      fontSize: BASE * e.scale,
                      lineHeight: 1.25,
                      background: e.highlight ? highlightBg(e.color) : "transparent",
                      textShadow: e.highlight ? "none" : "0 1px 6px rgba(0,0,0,.35)",
                      whiteSpace: "normal",
                      display: "inline-block",
                      width: "100%",
                      maxWidth: "100%",
                      overflow: "hidden",
                      overflowWrap: "anywhere",
                      wordBreak: "normal",
                    }}
                    className="block rounded-lg px-3"
                  >
                    {editing ? (
                      <EditableText
                        initial={e.text}
                        onChange={(t, caret) => changeText(e.id, t, caret)}
                      />
                    ) : (
                      e.text ? storyTextLines(e.text).map((line, index) => (
                        <span key={index}>
                          {index > 0 && <br />}
                          <span>{line || "\u200b"}</span>
                        </span>
                      )) : <span className="opacity-60">הקלידי כאן</span>
                    )}
                  </span>
                )}
                {e.kind === "text" &&
                  active && !e.locked &&
                  ([-1, 1] as const).map((side) => (
                    <Button
                      key={side}
                      data-editor-control="true"
                      size="icon"
                      variant="ghost"
                      aria-label={side === -1 ? "שינוי רוחב משמאל" : "שינוי רוחב מימין"}
                      onPointerDown={(ev) => beginResize(ev, e, side)}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: side === -1 ? 0 : undefined,
                        right: side === 1 ? 0 : undefined,
                        transform: "translateY(-50%)",
                        touchAction: "none",
                  willChange: "transform",
                      }}
                      className="!size-3 !min-w-0 !min-h-0 shrink-0 cursor-ew-resize rounded-full !border-0 !p-0 !bg-story-handle !shadow-none"
                    />
                  ))}
              </div>
  );
});

type CanvasProps = Omit<LayerProps, 'e' | 'active' | 'editing' | 'dimmed'> & {
  frame: RefObject<HTMLDivElement | null>; src: string; imageView: ImageView; backgroundZ: number; els: El[]; sel: number | null;
  editing: number | null; exporting: boolean; over: boolean;
  drag: {id: number; dx: number; dy: number} | null;
  frameDown: (ev: RPointerEvent) => void; move: (ev: RPointerEvent) => void; up: (ev: RPointerEvent) => void;
};
const StoryBackground = memo(function StoryBackground({src, imageView, z}: {src: string; imageView: ImageView; z: number}) {
  return <img
    data-story-background="true"
    src={src}
    style={{zIndex: z, transform: `scale(${imageView.scale}) translate(${imageView.x}px, ${imageView.y}px)`, touchAction: "none", willChange: "transform"}}
    alt=""
    loading="eager"
    decoding="async"
    draggable={false}
    className="pointer-events-none absolute inset-0 h-full w-full object-cover"
  />;
});
const StoryCanvas = memo(function StoryCanvas({frame, src, imageView, backgroundZ, els, sel, editing, exporting, over, drag, frameDown, move, up, down, editLayer, finishEditing, changeText, beginResize}: CanvasProps) {
  return (
      <div
        ref={frame}
        onPointerDown={frameDown}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          touchAction: "none",
          width: "100%",
          aspectRatio: "9 / 16",
        }}
        className="relative w-full shrink-0 overflow-hidden bg-foreground select-none sm:max-w-[min(560px,calc(100dvh*9/16))]"
      >
        <StoryBackground src={src} imageView={imageView} z={backgroundZ} />
        {els
          .filter((e) => !exporting || e.kind !== "text" || e.text.trim())
          .map((e) => {
            return <StoryLayer key={e.id} e={e} active={sel === e.id && !exporting} editing={editing === e.id} dimmed={drag?.id === e.id && over} down={down} editLayer={editLayer} finishEditing={finishEditing} changeText={changeText} beginResize={beginResize} />;
          })}
        {drag && !exporting && (
          <div
            data-editor-control="true"
            className={
              "absolute bottom-4 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full grid place-items-center transition z-[999] " +
              (over
                ? "bg-destructive text-destructive-foreground scale-125"
                : "bg-card/80 text-foreground")
            }
          >
            <Trash2 />
          </div>
        )}
      </div>
  );
});

export const StorySlider = memo(function StorySlider({label, value, min, max, onPreview, onCommit}: {
  label: string; value: number; min: number; max: number;
  onPreview: (value: number) => void; onCommit: (value: number) => void;
}) {
  const [local, setLocal] = useState(value);
  const pending = useRef<number | null>(null);
  useEffect(() => { setLocal(value); }, [value]);
  function commit() {
    if (pending.current === null) return;
    const next = pending.current;
    pending.current = null;
    onCommit(next);
  }
  return <input aria-label={label} type="range" min={min} max={max} step={0.05} value={local}
    onPointerDown={ev => ev.currentTarget.setPointerCapture(ev.pointerId)}
    onChange={ev => { const next = Number(ev.target.value); pending.current = next; setLocal(next); onPreview(next); }}
    onPointerUp={commit} onPointerCancel={commit} onLostPointerCapture={commit} onKeyUp={commit} onBlur={commit}
    style={{touchAction: "none"}} className="min-w-0 flex-1 accent-primary" />;
});

export function StoryEditor({
  file,
  onCancel,
  onPublish,
}: {
  file: File;
  onCancel: () => void;
  onPublish: (
    f: File,
    alt: string,
    backgroundUrl: string,
    mentions: StoryMention[],
  ) => Promise<void>;
}) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let cancelled = false;
    let url = "";
    setSrc("");
    void createStoryPreview(file).then(blob => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setSrc(url);
    }).catch(() => { if (!cancelled) setErr("לא ניתן לפתוח את התמונה. בחרי תמונה אחרת."); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [file]);
  const backgroundUrl = useRef<{ file: File; url: string } | null>(null);
  const [backgroundLocked, setBackgroundLocked] = useState(false);
  const [backgroundZ, setBackgroundZ] = useState(0);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const logoInput = useRef<HTMLInputElement>(null);
  const backgroundPointers = useRef(new Map<number, {x: number; y: number}>());
  const backgroundPinch = useRef<{distance: number; x: number; y: number; view: ImageView} | null>(null);
  const [imageView, setImageView] = useState<ImageView>({scale: 1, x: 0, y: 0});
  const imagePreview = useRef<ImageView | null>(null);
  const imageDrag = useRef<{pointer: number; x: number; y: number; view: ImageView} | null>(null);
  const imageRaf = useRef<number | null>(null);
  useEffect(() => () => { if (imageRaf.current !== null) cancelAnimationFrame(imageRaf.current); }, []);
  const [els, setEls] = useState<El[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const [over, setOver] = useState(false);
  const overRef = useRef(false);
  const [panel, setPanel] = useState<"stickers" | "layers" | null>(null);
  const [drawerCollapsed, setDrawerCollapsed] = useState(false);
  const [fontPickerOpen, setFontPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const drawerGesture = useRef<number | null>(null);
  useEffect(() => { setDrawerCollapsed(false); }, [sel, panel]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const frame = useRef<HTMLDivElement>(null);
  const nid = useRef(1);
  const topZ = useRef(1);
  const logoUrls = useRef<string[]>([]);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; a: number; s: number; r: number } | null>(null);
  useEffect(
    () => () => {
      logoUrls.current.forEach(URL.revokeObjectURL);
    },
    [],
  );
  const stickers = useQuery({
    queryKey: ["story-stickers"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("story_stickers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (
        await Promise.all(
          data.map(async (s) => {
            const { data: b } = await supabase.storage
              .from("story-stickers")
              .download(s.image_path);
            return b ? { ...s, url: URL.createObjectURL(b) } : null;
          }),
        )
      ).filter((s): s is NonNullable<typeof s> => !!s);
    },
  });
  const [exporting, setExporting] = useState(false);
  const [mention, setMention] = useState<{
    id: number;
    start: number;
    end: number;
    query: string;
  } | null>(null);
  const textToolbar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (sel === null && panel === null) return;
    const viewport = window.visualViewport;
    const position = () => {
      const toolbar = textToolbar.current;
      if (toolbar) toolbar.style.bottom = `${viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0}px`;
    };
    position();
    viewport?.addEventListener("resize", position);
    viewport?.addEventListener("scroll", position);
    return () => {viewport?.removeEventListener("resize", position); viewport?.removeEventListener("scroll", position);};
  }, [sel, panel, drawerCollapsed]);
  const resize = useRef<{
    id: number;
    side: 1 | -1;
    x: number;
    y: number;
    width: number;
    scale: number;
    rotation: number;
  } | null>(null);
  const selected = els.find((e) => e.id === sel) ?? null;
  const patch = useCallback((id: number, p: Partial<El>) =>
    setEls((v) => v.map((e) => (e.id === id ? { ...e, ...p } : e))), []);
  const transient = useRef<{id: number; values: Partial<El>} | null>(null);
  const raf = useRef<number | null>(null);
  useEffect(() => () => { if (raf.current !== null) cancelAnimationFrame(raf.current); }, []);
  function paint() {
    const pending = transient.current;
    if (!pending) return;
    const layer = els.find(e => e.id === pending.id);
    const node = frame.current?.querySelector<HTMLElement>(`[data-layer-id="${pending.id}"]`);
    if (!node || !layer) return;
    const next = {...layer, ...pending.values};
    node.style.transform = `translate(-50%,-50%) scale(${next.kind === "text" ? 1 : next.scale}) rotate(${next.rot}deg)`;
    node.style.left = next.x + "%";
    node.style.top = next.y + "%";
    node.style.width = next.kind === "text" ? next.width + "px" : "max-content";
    node.style.opacity = String(next.opacity);
    if (next.kind === "text") fitTextLayer(node, next.scale, next.rot);
  }
  function previewLayer(id: number, values: Partial<El>) {
    transient.current = {id, values: {...(transient.current?.id === id ? transient.current.values : {}), ...values}};
    if (raf.current === null) raf.current = requestAnimationFrame(() => { raf.current = null; paint(); });
  }
  function commitPreview() {
    if (raf.current !== null) { cancelAnimationFrame(raf.current); raf.current = null; }
    paint();
    const pending = transient.current;
    transient.current = null;
    if (pending) patch(pending.id, pending.values);
    return pending !== null;
  }
  const last = useRef<Pick<El, "font" | "bold" | "underline" | "highlight" | "color">>({
    font: "assistant",
    bold: true,
    underline: false,
    highlight: false,
    color: "#FFFFFF",
  });
  function add(kind: El["kind"], text: string, src?: string, opacity = 1, imageRole: El["imageRole"] = "sticker") {
    const id = nid.current++;
    const z = Math.max(backgroundZ, ...els.map(e => e.z), topZ.current) + 1;
    topZ.current = z;
    setEls((v) => [
      ...v,
      {
        id,
        kind,
        text,
        src,
        imageRole,
        locked: false,
        shape: "square",
        borderWidth: 0,
        borderColor: COLORS[0] ?? "#FFFFFF",
        width: Math.max(48, (frame.current?.clientWidth ?? 300) - 24),
        opacity,
        mentions: [],
        ...last.current,
        x: 50,
        y: kind === "text" ? 50 : 55,
        scale: 1,
        rot: 0,
        z,
      },
    ]);
    setSel(id);
    setPanel(null);
    if (kind === "text") setEditing(id);
  }
  async function addLogo(file: File) {
    if (file.type !== "image/png" || file.size > 2 * 1024 * 1024) {
      setErr("יש לבחור קובץ PNG שקוף עד 2 מגה־בייט");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImg(url);
      if (!(await hasTransparentPixels(image))) {
        URL.revokeObjectURL(url);
        setErr("הלוגו צריך לכלול אזורים שקופים");
        return;
      }
      logoUrls.current.push(url);
      setErr("");
      add("image", file.name, url, 0.7, "logo");
    } catch {
      URL.revokeObjectURL(url);
      setErr("לא ניתן לטעון את קובץ הלוגו");
    }
  }
  async function addPhoto(file: File) {
    setAddingPhoto(true);
    setErr("");
    try {
      const optimized = await optimizeUploadImage(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("לא ניתן לפתוח את התמונה"));
        reader.onerror = () => reject(new Error("לא ניתן לפתוח את התמונה"));
        reader.readAsDataURL(optimized);
      });
      add("image", "תמונה נוספת", dataUrl, 1, "photo");
    } catch { setErr("לא ניתן לפתוח את התמונה. בחרי תמונה אחרת."); }
    finally { setAddingPhoto(false); }
  }
  function reorder(id: number, direction: 1 | -1) {
    const ordered = reorderStoryLayers([{id: 0, z: backgroundZ}, ...els.map(e => ({id: e.id, z: e.z}))], id, direction);
    const background = ordered.find(e => e.id === 0);
    if (background) setBackgroundZ(background.z);
    setEls(previous => previous.map(e => ({...e, z: ordered.find(layer => layer.id === e.id)?.z ?? e.z})));
  }
  function dismissPanels() {
    setSel(null); setEditing(null); setPanel(null); setMention(null); setDrawerCollapsed(false); setFontPickerOpen(false); setColorPickerOpen(false);
    frame.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.blur();
  }
  const pos = (ev: { clientX: number; clientY: number }) => {
    const r = frame.current?.getBoundingClientRect();
    if (!r) return { x: 50, y: 50 };
    return {
      x: ((ev.clientX - r.left) / r.width) * 100,
      y: ((ev.clientY - r.top) / r.height) * 100,
    };
  };
  const clampLayer = (p: { x: number; y: number }, e: El) => {
    const frameWidth = frame.current?.getBoundingClientRect().width ?? 0;
    return {
      x:
        e.kind === "text"
          ? Math.min(100 - (Math.min(e.width, frameWidth - 24) / 2 + 12) / frameWidth * 100, Math.max((Math.min(e.width, frameWidth - 24) / 2 + 12) / frameWidth * 100, p.x))
          : Math.min(97, Math.max(3, p.x)),
      y: Math.min(98, Math.max(2, p.y)),
    };
  };
  const tap = useRef<{ id: number; x: number; y: number; was: boolean; moved: boolean } | null>(
    null,
  );
  function startPinch(target: El) {
    const [a, b] = [...pointers.current.values()];
    if (!a || !b) return;
    pinch.current = {
      d: Math.hypot(a.x - b.x, a.y - b.y),
      a: Math.atan2(b.y - a.y, b.x - a.x),
      s: target.scale,
      r: target.rot,
    };
    setDrag(null);
    if (tap.current) tap.current.moved = true;
  }
  function down(ev: RPointerEvent, e: El) {
    ev.stopPropagation();
    if (busy) return;
    setPanel(null);
    setSel(e.id);
    if (!storyLayerCanMove(e) || editing === e.id) return;
    frame.current?.setPointerCapture(ev.pointerId);
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.current.size === 2) {
      const t = els.find((x) => x.id === sel) ?? e;
      startPinch(t);
      return;
    }
    tap.current = { id: e.id, x: ev.clientX, y: ev.clientY, was: sel === e.id, moved: false };
    setSel(e.id);
    if (editing !== null && editing !== e.id) setEditing(null);
    const p = pos(ev);
    setDrag({ id: e.id, dx: p.x - e.x, dy: p.y - e.y });
  }
  function boundImage(view: ImageView) {
    const canvas = frame.current;
    const image = canvas?.querySelector<HTMLImageElement>('[data-story-background]');
    return canvas && image ? boundedImageView(view, canvas.clientWidth, canvas.clientHeight, image.naturalWidth, image.naturalHeight) : view;
  }
  function previewImage(view: ImageView) {
    imagePreview.current = boundImage(view);
    if (imageRaf.current === null) imageRaf.current = requestAnimationFrame(() => {
      imageRaf.current = null;
      const image = frame.current?.querySelector<HTMLElement>('[data-story-background]');
      const next = imagePreview.current;
      if (image && next) image.style.transform = `scale(${next.scale}) translate(${next.x}px, ${next.y}px)`;
    });
  }
  function commitImage() {
    if (imageRaf.current !== null) { cancelAnimationFrame(imageRaf.current); imageRaf.current = null; }
    if (imagePreview.current) setImageView(imagePreview.current);
    imagePreview.current = null;
  }
  function frameDown(ev: RPointerEvent) {
    if (busy) return;
    dismissPanels();
    if (backgroundLocked) return;
    frame.current?.setPointerCapture(ev.pointerId);
    backgroundPointers.current.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
    const view = imagePreview.current ?? imageView;
    if (backgroundPointers.current.size === 2) {
      const [a, b] = [...backgroundPointers.current.values()];
      if (a && b) backgroundPinch.current = {distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, view};
    } else imageDrag.current = {pointer: ev.pointerId, x: ev.clientX, y: ev.clientY, view};
  }
  function beginResize(ev: RPointerEvent, e: El, side: 1 | -1) {
    ev.preventDefault();
    ev.stopPropagation();
    if (busy || !storyLayerCanMove(e)) return;
    setEditing(null);
    frame.current?.setPointerCapture(ev.pointerId);
    resize.current = {
      id: e.id,
      side,
      x: ev.clientX,
      y: ev.clientY,
      width: (() => {
        const node = frame.current?.querySelector<HTMLElement>(`[data-layer-id="${e.id}"]`);
        const frameWidth = frame.current?.clientWidth;
        return node && frameWidth ? node.offsetWidth : e.width;
      })(),
      scale: e.scale,
      rotation: e.rot,
    };
  }
  function move(ev: RPointerEvent) {
    const bgDrag = imageDrag.current;
    if (backgroundPointers.current.has(ev.pointerId)) {
      backgroundPointers.current.set(ev.pointerId, {x: ev.clientX, y: ev.clientY});
      const gesture = backgroundPinch.current;
      const [a, b] = [...backgroundPointers.current.values()];
      if (gesture && a && b) {
        const scale = storyImageScale(gesture.view.scale * Math.hypot(a.x - b.x, a.y - b.y) / gesture.distance);
        previewImage({scale, x: gesture.view.x + ((a.x + b.x) / 2 - gesture.x) / scale, y: gesture.view.y + ((a.y + b.y) / 2 - gesture.y) / scale});
        return;
      }
    }
    if (bgDrag?.pointer === ev.pointerId) {
      previewImage({...bgDrag.view, x: bgDrag.view.x + (ev.clientX - bgDrag.x) / bgDrag.view.scale, y: bgDrag.view.y + (ev.clientY - bgDrag.y) / bgDrag.view.scale});
      return;
    }
    if (resize.current) {
      const r = resize.current;
      const width = frame.current?.getBoundingClientRect().width;
      if (width) {
        previewLayer(r.id, {
          width: storyPixelWidth(
            r.width,
            ev.clientX - r.x,
            ev.clientY - r.y,
            r.rotation,
            width,
            r.side,
          ),
        });
      }
      return;
    }
    if (!pointers.current.has(ev.pointerId)) return;
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (tap.current && Math.hypot(ev.clientX - tap.current.x, ev.clientY - tap.current.y) > 6)
      tap.current.moved = true;
    if (pinch.current && sel !== null && pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      previewLayer(sel, {
        scale: selected?.kind === "text" ? pinch.current.s : Math.min(5, Math.max(0.4, (pinch.current.s * d) / pinch.current.d)),
        rot: pinch.current.r + ((ang - pinch.current.a) * 180) / Math.PI,
      });
      return;
    }
    if (!drag) return;
    const p = pos(ev);
    const nextOver = isTrash(p.x, p.y);
    if (overRef.current !== nextOver) {
      overRef.current = nextOver;
      setOver(nextOver);
    }
    const draggedElement = els.find(element => element.id === drag.id);
    if (draggedElement) previewLayer(drag.id, clampLayer({ x: p.x - drag.dx, y: p.y - drag.dy }, draggedElement));
  }
  function up(ev: RPointerEvent) {
    if (backgroundPointers.current.has(ev.pointerId)) {
      const view = imagePreview.current ?? imageView;
      commitImage();
      backgroundPointers.current.delete(ev.pointerId);
      backgroundPinch.current = null;
      const remaining = [...backgroundPointers.current.entries()][0];
      imageDrag.current = remaining ? {pointer: remaining[0], x: remaining[1].x, y: remaining[1].y, view} : null;
      return;
    }
    commitPreview();
    if (resize.current) {
      resize.current = null;
      return;
    }
    pointers.current.delete(ev.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    const t = tap.current;
    if (pointers.current.size === 0) tap.current = null;
    if (t && !t.moved && t.was) {
      const el = els.find((x) => x.id === t.id);
      if (el?.kind === "text") setEditing(el.id);
    }
    if (!drag) return;
    const p = pos(ev);
    if (isTrash(p.x, p.y)) {
      setEls((v) => v.filter((e) => e.id !== drag.id));
      setSel(null);
    }
    setDrag(null);
    overRef.current = false;
    setOver(false);
  }
  function style(p: Partial<El>) {
    if (!selected || selected.locked) return;
    Object.assign(last.current, p);
    patch(selected.id, p);
  }
  function changeText(id: number, text: string, caret: number) {
    patch(id, { text });
    const range = activeMention(text, caret);
    setMention(range ? { id, ...range } : null);
  }
  function chooseMember(member: MentionMember) {
    if (!mention) return;
    const e = els.find((x) => x.id === mention.id);
    if (!e) return;
    const result = insertMention(e.text, mention, member.display_name);
    if (result.text.length > 120) {
      setErr("הטקסט ארוך מדי");
      return;
    }
    patch(e.id, {
      text: result.text,
      mentions: [
        ...e.mentions.filter((m) => m.label !== result.label),
        { userId: member.id, label: result.label },
      ],
    });
    setMention(null);
    setEditing(e.id);
    requestAnimationFrame(() => {
      const node = frame.current?.querySelector<HTMLElement>(`[data-layer-id="${e.id}"] [contenteditable="true"]`);
      node?.focus();
    });
  }
  const stableDown = useStableEvent(down);
  const stableFrameDown = useStableEvent(frameDown);
  const stableMove = useStableEvent(move);
  const stableUp = useStableEvent(up);
  const stableBeginResize = useStableEvent(beginResize);
  const stableChangeText = useStableEvent(changeText);
  const editLayer = useStableEvent((id: number) => { if (els.find(e => e.id === id)?.locked) return; setSel(id); setEditing(id); });
  const finishEditing = useStableEvent(() => dismissPanels());
  const previewScale = useStableEvent((value: number) => { if (sel !== null) previewLayer(sel, {scale: value}); });
  const previewOpacity = useStableEvent((value: number) => { if (sel !== null) previewLayer(sel, {opacity: value}); });
  const commitScale = useStableEvent((value: number) => { if (!commitPreview() && sel !== null) patch(sel, {scale: value}); });
  const commitOpacity = useStableEvent((value: number) => { if (!commitPreview() && sel !== null) patch(sel, {opacity: value}); });
  const previewImageScale = useStableEvent((scale: number) => previewImage({...imageView, scale}));
  const commitImageScale = useStableEvent(() => commitImage());
  const previewRotation = useStableEvent((value: number) => { if (sel !== null) previewLayer(sel, {rot: value}); });
  const commitRotation = useStableEvent((value: number) => { if (!commitPreview() && sel !== null) patch(sel, {rot: value}); });
  async function snapshot() {
    const node = frame.current;
    if (!node) throw new Error("התמונה אינה מוכנה");
    const background = node.querySelector<HTMLImageElement>("[data-story-background]");
    const originalUrl = URL.createObjectURL(file);
    flushSync(() => {
      setEditing(null);
      setExporting(true);
    });
    try {
      if (background) { background.src = originalUrl; await background.decode(); }
      await document.fonts.ready;
      await Promise.all(
        els
          .filter((e) => e.kind === "text")
          .map((e) => document.fonts.load(cssFont(e, BASE), e.text)),
      );
      const box = node.getBoundingClientRect();
      const links: StoryMention[] = [];
      for (const el of els) {
        const target = node.querySelector(`[data-layer-id="${el.id}"]`);
        if (!target) continue;
        const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        while (walker.nextNode()) {
          const n = walker.currentNode;
          if (n instanceof Text) nodes.push(n);
        }
        for (const m of el.mentions.filter((m) => el.text.includes(m.label))) {
          for (const n of nodes) {
            let offset = n.textContent?.indexOf(m.label) ?? -1;
            while (offset >= 0) {
              const range = document.createRange();
              range.setStart(n, offset);
              range.setEnd(n, offset + m.label.length);
              for (const r of range.getClientRects()) {
                const left = Math.max(box.left, r.left),
                  top = Math.max(box.top, r.top),
                  right = Math.min(box.right, r.right),
                  bottom = Math.min(box.bottom, r.bottom);
                if (right > left && bottom > top)
                  links.push({
                    ...m,
                    x: ((left - box.left) / box.width) * 100,
                    y: ((top - box.top) / box.height) * 100,
                    width: ((right - left) / box.width) * 100,
                    height: ((bottom - top) / box.height) * 100,
                  });
              }
              offset = n.textContent?.indexOf(m.label, offset + m.label.length) ?? -1;
            }
          }
        }
      }
      const blob = await toBlob(node, {
        pixelRatio: 1080 / box.width,
        filter: (n) => !(n instanceof HTMLElement && n.dataset["editorControl"] === "true"),
        skipFonts: false,
      });
      if (!blob) throw new Error("ייצוא התמונה נכשל");
      const image = await loadImg(URL.createObjectURL(blob));
      const c = document.createElement("canvas");
      c.width = 1080;
      c.height = 1920;
      const g = c.getContext("2d");
      if (!g) throw new Error("ייצוא התמונה נכשל");
      g.drawImage(image, 0, 0, 1080, 1920);
      URL.revokeObjectURL(image.src);
      const jpeg = await new Promise<Blob>((resolve, reject) =>
        c.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("ייצוא התמונה נכשל"))),
          "image/jpeg",
          0.95,
        ),
      );
      return { file: new File([jpeg], "story.jpg", { type: "image/jpeg" }), mentions: links };
    } finally {
      if (background) background.src = src;
      URL.revokeObjectURL(originalUrl);
      setExporting(false);
    }
  }
  async function publish() {
    commitPreview();
    commitImage();
    setBusy(true);
    setErr("");
    setEditing(null);
    let stage = "העלאת תמונת הרקע";
    try {
      if (backgroundUrl.current?.file !== file)
        backgroundUrl.current = { file, url: await uploadPhoto(file) };
      stage = "ייצוא תמונת הסטורי";
      const result = await snapshot();
      stage = "שמירת הסטורי";
      await onPublish(result.file, "", backgroundUrl.current.url, result.mentions);
    } catch (error) {
      console.error("Story publish failed", { stage, error });
      setErr("פרסום הסטורי נכשל. נסי שוב.");
      setBusy(false);
    }
  }

  return (
    <div
      dir="rtl"
      role="dialog"
      aria-label="עורך סטורי"
      aria-modal="true"
      className="fixed inset-0 z-[60] bg-foreground flex items-center justify-center overflow-hidden"
    >
      <StoryCanvas frame={frame} src={src} imageView={imageView} backgroundZ={backgroundZ} els={els} sel={sel} editing={editing} exporting={exporting} over={over} drag={drag} frameDown={stableFrameDown} move={stableMove} up={stableUp} down={stableDown} editLayer={editLayer} finishEditing={finishEditing} changeText={stableChangeText} beginResize={stableBeginResize} />
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between gap-2 px-3 pb-3 pt-[max(12px,env(safe-area-inset-top))] pointer-events-none">
        <Button size="icon" variant="ghost" title="ביטול" aria-label="ביטול" onClick={onCancel} disabled={busy} className="pointer-events-auto rounded-full bg-foreground/40 text-primary-foreground"><X/></Button>
        <div className="flex gap-1.5 pointer-events-auto rounded-full bg-foreground/40 p-1 text-primary-foreground">
          <Button size="icon" variant="ghost" title="הוספת טקסט" aria-label="הוספת טקסט" disabled={busy} onClick={() => add("text", "")}><Type/></Button>
          <Button size="icon" variant="ghost" title="סטיקרים" aria-label="סטיקרים" disabled={busy} onClick={() => {setSel(null); setEditing(null); setPanel(panel === "stickers" ? null : "stickers");}}><Smile/></Button>
          <Button variant="ghost" className="h-9 gap-1 px-2 text-xs" title="הוספת תמונה" aria-label="הוספת תמונה" disabled={busy || addingPhoto} onClick={() => photoInput.current?.click()}><ImagePlus className="size-4"/><span>תמונה</span></Button>
          <Button variant="ghost" className="h-9 gap-1 px-2 text-xs" title="הוספת לוגו / סימן מים" aria-label="הוספת לוגו / סימן מים" disabled={busy} onClick={() => logoInput.current?.click()}><Stamp className="size-4"/><span>לוגו</span></Button>
        </div>
      </div>
      <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" aria-label="העלאת תמונה נוספת" className="sr-only" onChange={ev => {const f = ev.currentTarget.files?.[0]; ev.currentTarget.value = ""; if (f) void addPhoto(f);}}/>
      <input ref={logoInput} type="file" accept="image/png" aria-label="העלאת לוגו PNG שקוף" className="sr-only" onChange={ev => {const f = ev.currentTarget.files?.[0]; ev.currentTarget.value = ""; if (f) void addLogo(f);}}/>
      <Button size="icon" variant="ghost" aria-label="שכבות" title="שכבות" disabled={busy} aria-expanded={panel === "layers"} onClick={() => {setSel(null); setEditing(null); setPanel(panel === "layers" ? null : "layers");}} className="absolute top-20 left-3 z-20 rounded-full bg-foreground/40 text-primary-foreground"><MoreHorizontal/></Button>
      {(sel !== null || panel !== null) && <div ref={textToolbar} data-story-drawer="true" className="absolute inset-x-0 bottom-0 z-30 mx-auto max-w-xl bg-foreground/65 text-primary-foreground backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-6 items-center justify-center" style={{touchAction: "none"}}
          onPointerDown={ev => {drawerGesture.current = ev.clientY; if (!(ev.target instanceof Element && ev.target.closest('button'))) ev.currentTarget.setPointerCapture(ev.pointerId);}}
          onPointerUp={ev => {if (drawerGesture.current !== null && ev.clientY - drawerGesture.current > 24) {setDrawerCollapsed(true); setEditing(null); setMention(null); frame.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.blur();} drawerGesture.current = null;}}
          onPointerCancel={() => {drawerGesture.current = null;}}>
          <Button size="icon" variant="ghost" className="h-6 w-16 rounded-full" aria-label={drawerCollapsed ? "הרחבת כלי עריכה" : "מזעור כלי עריכה"} aria-expanded={!drawerCollapsed}
            onPointerDown={ev => ev.preventDefault()}
            onClick={() => {setDrawerCollapsed(v => !v); setFontPickerOpen(false); setEditing(null); setMention(null); frame.current?.querySelector<HTMLElement>('[contenteditable="true"]')?.blur();}}>
            {drawerCollapsed ? <ChevronUp className="size-4"/> : <ChevronDown className="size-4"/>}
          </Button>
        </div>
        {!drawerCollapsed && <div className="max-h-[30dvh] overflow-y-auto overscroll-contain px-3 pr-16 pb-2">
      {sel === 0 && panel === null && <div>
        <div className="flex items-center justify-between mb-3"><span className="text-sm font-bold">תמונת רקע</span><Button size="icon" variant="ghost" aria-label="סגירת עריכת רקע" onClick={dismissPanels}><Check/></Button></div>
        <fieldset disabled={backgroundLocked || busy}><label className="flex items-center gap-3 text-xs font-bold">גודל תמונה<StorySlider label="גודל תמונה" value={imageView.scale} min={0.8} max={2} onPreview={previewImageScale} onCommit={commitImageScale}/></label></fieldset>
      </div>}
      {panel === "layers" && <div className="space-y-1">
        <div className="flex items-center justify-between mb-2"><h2 className="text-sm font-bold">שכבות</h2><Button size="icon" variant="ghost" aria-label="סגירת שכבות" onClick={() => setPanel(null)}><X/></Button></div>
        {[{id: 0, z: backgroundZ, text: "תמונת רקע", kind: "background", locked: backgroundLocked}, ...els].sort((a, b) => b.z - a.z).map((e, index, layers) => <div key={e.id} className="flex items-center gap-1 border-b border-border/50 py-2 last:border-0">
          <Button variant="ghost" className="min-w-0 flex-1 justify-start overflow-hidden text-right" aria-label={`בחירת שכבה ${e.id === 0 ? "תמונת רקע" : e.text || "טקסט"}`} onClick={() => {setSel(e.id); setEditing(null); setPanel(null);}}>{e.kind === "text" ? <Type/> : e.kind === "pill" ? <Smile/> : <ImageIcon/>}<span className="truncate">{e.id === 0 ? "תמונת רקע" : e.text || "טקסט"}</span></Button>
          <Button size="icon" variant="ghost" title="העלאה קדימה" aria-label={`העלאה קדימה ${e.id}`} disabled={index === 0 || busy} onClick={() => reorder(e.id, 1)}><ArrowUp/></Button>
          <Button size="icon" variant="ghost" title="הורדה לאחור" aria-label={`הורדה לאחור ${e.id}`} disabled={index === layers.length - 1 || busy} onClick={() => reorder(e.id, -1)}><ArrowDown/></Button>
          <Button size="icon" variant={e.locked ? "secondary" : "ghost"} title={e.locked ? "ביטול נעילה" : "נעילה"} aria-label={`${e.locked ? "ביטול נעילה" : "נעילה"} ${e.id}`} aria-pressed={!!e.locked} disabled={busy} onClick={() => e.id === 0 ? setBackgroundLocked(!backgroundLocked) : patch(e.id, {locked: !e.locked})}>{e.locked ? <LockKeyhole/> : <LockKeyholeOpen/>}</Button>
        </div>)}
      </div>}
      {selected?.kind === "text" && <div role="toolbar" aria-label="כלי עריכת טקסט" className="flex h-12 items-center gap-2" onPointerDown={ev => {
        const target = ev.target;
        if (target instanceof HTMLElement && target.closest("button")) ev.preventDefault();
      }}>
        <fieldset disabled={selected.locked || busy} className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-2">
          <div className="flex w-24 shrink-0 items-center gap-1" title="גודל טקסט"><Type className="size-4 shrink-0"/><StorySlider key={`text-size-${selected.id}`} label="שינוי גודל" value={selected.scale} min={0.4} max={5} onPreview={previewScale} onCommit={commitScale}/></div>
          <Button variant="ghost" aria-label="בחירת פונט" title="בחירת פונט" aria-expanded={fontPickerOpen} onClick={() => {setFontPickerOpen(v => !v); setColorPickerOpen(false);}} style={{fontFamily: `"${fontOf(selected.font).family}"`, fontStyle: fontOf(selected.font).italic ? "italic" : "normal"}} className="h-9 w-28 shrink-0 border border-primary-foreground/20 bg-foreground/60 px-2 text-xs text-primary-foreground">{fontOf(selected.font).desc}<ChevronUp className="size-3"/></Button>
          <Button size="icon" variant="ghost" aria-label="צבע טקסט" title="צבע טקסט" aria-expanded={colorPickerOpen} onClick={() => {setColorPickerOpen(v => !v); setFontPickerOpen(false);}} style={{backgroundColor: selected.color}} className="size-8 shrink-0 rounded-full border border-primary-foreground/40 p-0"/>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="עיבוי" title="עיבוי" aria-pressed={selected.bold} onClick={() => style({bold: !selected.bold})}><Bold/></Button>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="קו תחתון" title="קו תחתון" aria-pressed={selected.underline} onClick={() => style({underline: !selected.underline})}><Underline/></Button>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="רקע מרקר" title="רקע מרקר" aria-pressed={selected.highlight} onClick={() => style({highlight: !selected.highlight})}><Highlighter/></Button>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="תיוג חברה" title="תיוג חברה" onClick={() => {
            const node = frame.current?.querySelector<HTMLElement>(`[data-layer-id="${selected.id}"] [contenteditable="true"]`);
            const selection = getSelection();
            let caret = selected.text.length;
            if (node && selection?.rangeCount && node.contains(selection.anchorNode)) {
              const range = selection.getRangeAt(0).cloneRange(); range.selectNodeContents(node); range.setEnd(selection.anchorNode ?? node, selection.anchorOffset); caret = range.toString().length;
            }
            setEditing(selected.id);
            changeText(selected.id, (selected.text.slice(0, caret) + " @" + selected.text.slice(caret)).slice(0, 120), Math.min(120, caret + 2));
            node?.focus();
          }}><AtSign/></Button>
          <Button size="icon" variant="ghost" className="size-8 shrink-0" aria-label="עריכה" title="הקלדה על התמונה" onClick={() => editLayer(selected.id)}><Type/></Button>
        </fieldset>
        <Button size="icon" variant="ghost" className="size-9 shrink-0 rounded-full bg-primary-foreground/10" aria-label="אישור טקסט" title="אישור טקסט" onClick={dismissPanels}><Check/></Button>
        {mention?.id === selected.id && <div className="absolute bottom-full inset-x-3 mb-2 text-foreground"><StoryMentionPicker query={mention.query} onSelect={chooseMember}/></div>}
      </div>}
      {selected && selected.kind !== "text" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between"><span className="text-xs font-bold">{selected.imageRole === "photo" ? "תמונה נוספת" : selected.imageRole === "logo" ? "לוגו / סימן מים" : "סטיקר"}{selected.locked && <LockKeyhole className="inline size-3 mr-2"/>}</span><Button size="icon" variant="ghost" aria-label="סגירת עריכה" onClick={dismissPanels}><Check/></Button></div>
          <fieldset disabled={selected.locked || busy} className="space-y-2 disabled:opacity-50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">גודל</span>
            {<Button
              size="icon"
              variant="outline"
              aria-label="הקטנה"
              onClick={() => patch(selected.id, { scale: Math.max(0.4, selected.scale - 0.15) })}
            >
              <Minus />
            </Button>}
            <StorySlider key={`scale-${selected.id}`} label="שינוי גודל" value={selected.scale} min={0.4} max={5} onPreview={previewScale} onCommit={commitScale} />
            {<Button
              size="icon"
              variant="outline"
              aria-label="הגדלה"
              onClick={() => patch(selected.id, { scale: Math.min(5, selected.scale + 0.15) })}
            >
              <Plus />
            </Button>}
          </div>
          {<label className="flex items-center gap-2 text-xs font-bold"><RotateCw className="size-4"/>סיבוב<StorySlider key={`rotation-${selected.id}`} label="סיבוב שכבה" value={selected.rot} min={-180} max={180} onPreview={previewRotation} onCommit={commitRotation}/></label>}
          {selected.kind === "image" && (
            <label className="flex items-center gap-2 text-xs font-bold">
              שקיפות
              <StorySlider key={`opacity-${selected.id}`} label="שקיפות הלוגו או הסטיקר" value={selected.opacity} min={0.15} max={1} onPreview={previewOpacity} onCommit={commitOpacity} />
            </label>
          )}
          {selected.imageRole === "photo" && <>
            <div className="flex gap-1.5 justify-between">{PHOTO_SHAPES.map(shape => <Button key={shape.id} size="icon" variant={selected.shape === shape.id ? "secondary" : "ghost"} aria-label={`מסגרת ${shape.label}`} aria-pressed={selected.shape === shape.id} title={shape.label} onClick={() => patch(selected.id, {shape: shape.id})}><shape.icon className={shape.id === "rounded" ? "rounded-md" : ""}/></Button>)}</div>
            <label className="flex items-center gap-2 text-xs font-bold">עובי מסגרת<StorySlider key={`border-${selected.id}`} label="עובי מסגרת" value={selected.borderWidth ?? 0} min={0} max={12} onPreview={value => {
              const node = frame.current?.querySelector<SVGPathElement>(`[data-layer-id="${selected.id}"] svg > path`);
              const border = storyBorderWidth(value);
              if (node) {node.setAttribute("stroke-width", String(border)); node.setAttribute("transform", `translate(${border / 2} ${border / 2}) scale(${1 - border / 120})`);}
              else patch(selected.id, {borderWidth: border});
            }} onCommit={value => patch(selected.id, {borderWidth: storyBorderWidth(value)})}/></label>
            <div className="flex items-center justify-between text-xs font-bold"><span>צבע מסגרת</span><Button size="icon" variant="ghost" aria-label="צבע מסגרת" title="צבע מסגרת" aria-expanded={colorPickerOpen} onClick={() => {setColorPickerOpen(v => !v); setFontPickerOpen(false);}} style={{backgroundColor: selected.borderColor ?? COLORS[0]}} className="size-8 rounded-full border border-primary-foreground/40 p-0"/></div>
          </>}
          </fieldset>
        </div>
      )}

      {panel === "stickers" && (
        <div className="space-y-2">
          <div className="flex justify-between items-center"><span className="text-sm font-bold">סטיקרים</span><Button size="icon" variant="ghost" aria-label="סגירת סטיקרים" onClick={() => setPanel(null)}><X/></Button></div>
          <div className="grid grid-cols-2 gap-2">
            {STORY_STICKERS.map((s) => (
              <Button
                key={s}
                type="button"
                variant="ghost"
                onClick={() => add("pill", s)}
                className="h-auto min-h-9 whitespace-normal rounded-full bg-accent text-primary font-bold text-xs px-3 py-2"
              >
                {s}
              </Button>
            ))}
          </div>
          {(stickers.data?.length ?? 0) > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {stickers.data?.map((s) => (
                <Button
                  key={s.id}
                  type="button"
                  variant="ghost"
                  aria-label={s.label || "סטיקר"}
                  onClick={() => add("image", s.label, s.url)}
                  className="aspect-square rounded-xl bg-muted p-1"
                >
                  <img
                    src={s.url}
                    alt={s.label || "סטיקר"}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain"
                  />
                </Button>
              ))}
            </div>
          )}
          {stickers.isError && (
            <p className="text-xs text-muted-foreground">טעינת הסטיקרים נכשלה</p>
          )}
        </div>
      )}

        </div>}
        {selected?.kind === "text" && fontPickerOpen && !drawerCollapsed && <div role="group" aria-label="תצוגת גופנים" className="absolute bottom-full inset-x-3 mb-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto rounded-lg bg-foreground/80 p-2 backdrop-blur-md" onPointerDown={ev => ev.preventDefault()}>
          {STORY_FONTS.map(font => <Button key={font.id} variant="ghost" aria-label={`גופן ${font.desc}`} aria-pressed={selected.font === font.id} disabled={selected.locked || busy} style={{fontFamily: `"${font.family}"`, fontStyle: font.italic ? "italic" : "normal"}} className="h-10 text-base" onClick={() => {style({font: font.id}); setFontPickerOpen(false);}}>{font.desc}</Button>)}
        </div>}
        {selected && (selected.kind === "text" || selected.imageRole === "photo") && colorPickerOpen && !drawerCollapsed && <fieldset disabled={selected.locked || busy} className="absolute bottom-full inset-x-3 mb-2 rounded-lg bg-foreground/80 px-3 py-1 backdrop-blur-md">
          <StoryColorPalette key={`${selected.id}-${selected.kind}`} value={selected.kind === "text" ? selected.color : selected.borderColor ?? COLORS[0] ?? "#FFFFFF"} onChange={color => selected.kind === "text" ? style({color}) : patch(selected.id, {borderColor: color})}/>
        </fieldset>}
      </div>}

      {addingPhoto && <div role="status" className="absolute inset-0 z-40 grid place-items-center bg-overlay text-primary-foreground"><ImageUploadStatus/></div>}
      {err && <p role="alert" className="absolute bottom-36 z-40 max-w-sm mx-3 rounded-lg bg-destructive p-3 text-xs text-destructive-foreground">{err}</p>}
      {(selected?.kind !== "text" || drawerCollapsed) && <Button
        size="icon"
        aria-label="פרסום סטורי לקהילה"
        title="פרסום סטורי לקהילה"
        disabled={busy || addingPhoto || !src}
        onClick={() => void publish()}
        className="absolute right-3 bottom-[max(32px,env(safe-area-inset-bottom))] z-40 size-11 rounded-full bg-rose-glam text-primary-foreground shadow-soft"
      >
        {busy ? <ImageUploadStatus /> : <Send className="size-5"/>}
      </Button>}
    </div>
  );
}

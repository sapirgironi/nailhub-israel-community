import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject, type PointerEvent as RPointerEvent } from "react";
import { createStoryPreview } from "@/lib/story-preview";
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
} from "lucide-react";
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
};

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

function EditableText({
  initial,
  onChange,
  onDone,
}: {
  initial: string;
  onChange: (t: string, caret: number) => void;
  onDone: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const n = ref.current;
    if (!n) return;
    n.textContent = initial;
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
    if (n && document.activeElement !== n && n.innerText !== initial) n.textContent = initial;
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
      onBlur={onDone}
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
  e: El; active: boolean; editing: boolean; dimmed: boolean;
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
  const fit = Math.min(width / naturalWidth, height / naturalHeight);
  const maxX = Math.abs(width - naturalWidth * fit * scale) / (2 * scale);
  const maxY = Math.abs(height - naturalHeight * fit * scale) / (2 * scale);
  return {scale, x: Math.max(-maxX, Math.min(maxX, view.x)), y: Math.max(-maxY, Math.min(maxY, view.y))};
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
                onDoubleClick={() => e.kind === "text" && editLayer(e.id)}
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
                  "absolute cursor-grab text-center " +
                  (active
                    ? "outline outline-1 outline-dashed outline-primary-foreground/70 rounded-md"
                    : "")
                }
              >
                {e.kind === "image" && e.src && (
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
                  <span className="block bg-card text-[#5B0E2D] font-extrabold rounded-full px-4 py-2 text-[15px] whitespace-nowrap shadow-soft">
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
                        onDone={finishEditing}
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
                  active &&
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
  frame: RefObject<HTMLDivElement | null>; src: string; imageView: ImageView; els: El[]; sel: number | null;
  editing: number | null; compact: boolean; exporting: boolean; over: boolean;
  drag: {id: number; dx: number; dy: number} | null;
  frameDown: (ev: RPointerEvent) => void; move: (ev: RPointerEvent) => void; up: (ev: RPointerEvent) => void;
};
const StoryBackground = memo(function StoryBackground({src, imageView}: {src: string; imageView: ImageView}) {
  return <img
    data-story-background="true"
    src={src}
    style={{transform: `scale(${imageView.scale}) translate(${imageView.x}px, ${imageView.y}px)`, touchAction: "none", willChange: "transform"}}
    alt=""
    loading="eager"
    decoding="async"
    draggable={false}
    className="pointer-events-none absolute inset-0 h-full w-full object-contain"
  />;
});
const StoryCanvas = memo(function StoryCanvas({frame, src, imageView, els, sel, editing, compact, exporting, over, drag, frameDown, move, up, down, editLayer, finishEditing, changeText, beginResize}: CanvasProps) {
  return (
      <div
        ref={frame}
        onPointerDown={frameDown}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          touchAction: "none",
          width: `min(100%,384px,calc(${compact ? "44" : "58"}dvh * 9 / 16))`,
          aspectRatio: "9 / 16",
        }}
        className="relative shrink-0 overflow-hidden bg-foreground select-none"
      >
        <StoryBackground src={src} imageView={imageView} />
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
    style={{touchAction: "none"}} className="flex-1 accent-primary" />;
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
  const [imageView, setImageView] = useState<ImageView>({scale: 1, x: 0, y: 0});
  const imagePreview = useRef<ImageView | null>(null);
  const imageDrag = useRef<{pointer: number; x: number; y: number; view: ImageView} | null>(null);
  const imageRaf = useRef<number | null>(null);
  useEffect(() => () => { if (imageRaf.current !== null) cancelAnimationFrame(imageRaf.current); }, []);
  const [els, setEls] = useState<El[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [textInputFocused, setTextInputFocused] = useState(false);
  const [drag, setDrag] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const [over, setOver] = useState(false);
  const overRef = useRef(false);
  const [panel, setPanel] = useState<"stickers" | null>(null);
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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
  function add(kind: El["kind"], text: string, src?: string, opacity = 1) {
    const id = nid.current++;
    const z = ++topZ.current;
    setEls((v) => [
      ...v,
      {
        id,
        kind,
        text,
        src,
        width: Math.max(48, (frame.current?.clientWidth ?? 300) - 24),
        opacity,
        mentions: [],
        ...last.current,
        x: 50,
        y: kind === "text" ? 40 : 55,
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
      add("image", file.name, url, 0.7);
    } catch {
      URL.revokeObjectURL(url);
      setErr("לא ניתן לטעון את קובץ הלוגו");
    }
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
    if (editing === e.id) return;
    frame.current?.setPointerCapture(ev.pointerId);
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.current.size === 2) {
      const t = els.find((x) => x.id === sel) ?? e;
      startPinch(t);
      return;
    }
    tap.current = { id: e.id, x: ev.clientX, y: ev.clientY, was: sel === e.id, moved: false };
    const z = ++topZ.current;
    patch(e.id, { z });
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
    frame.current?.setPointerCapture(ev.pointerId);
    setSel(null);
    setEditing(null);
    imageDrag.current = {pointer: ev.pointerId, x: ev.clientX, y: ev.clientY, view: imageView};
  }
  function beginResize(ev: RPointerEvent, e: El, side: 1 | -1) {
    ev.preventDefault();
    ev.stopPropagation();
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
    if (imageDrag.current?.pointer === ev.pointerId) {
      commitImage();
      imageDrag.current = null;
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
    if (!selected) return;
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
    setEditing(null);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(result.caret, result.caret);
    });
  }
  const stableDown = useStableEvent(down);
  const stableFrameDown = useStableEvent(frameDown);
  const stableMove = useStableEvent(move);
  const stableUp = useStableEvent(up);
  const stableBeginResize = useStableEvent(beginResize);
  const stableChangeText = useStableEvent(changeText);
  const editLayer = useCallback((id: number) => setEditing(id), []);
  const finishEditing = useCallback(() => setEditing(null), []);
  const previewScale = useStableEvent((value: number) => { if (sel !== null) previewLayer(sel, {scale: value}); });
  const previewOpacity = useStableEvent((value: number) => { if (sel !== null) previewLayer(sel, {opacity: value}); });
  const commitScale = useStableEvent((value: number) => { if (!commitPreview() && sel !== null) patch(sel, {scale: value}); });
  const commitOpacity = useStableEvent((value: number) => { if (!commitPreview() && sel !== null) patch(sel, {opacity: value}); });
  const previewImageScale = useStableEvent((scale: number) => previewImage({...imageView, scale}));
  const commitImageScale = useStableEvent(() => commitImage());
  async function snapshot() {
    const node = frame.current;
    if (!node) throw new Error("התמונה אינה מוכנה");
    const background = node.querySelector<HTMLImageElement>("img");
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
      className="fixed inset-0 z-[60] bg-foreground/95 flex flex-col items-center p-3 gap-2 overflow-y-auto"
    >
      <div className="w-full max-w-sm flex items-center justify-between shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground"
          aria-label="ביטול"
          onClick={onCancel}
        >
          <X />
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => add("text", "")}>
            <Type />
            טקסט
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPanel(panel === "stickers" ? null : "stickers")}
          >
            <Smile />
            סטיקרים
          </Button>
          <label className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-secondary px-3 py-2 text-xs font-medium text-secondary-foreground">
            <ImagePlus className="h-4 w-4" />
            הוספת לוגו / סימן מים
            <input
              type="file"
              accept="image/png"
              aria-label="העלאת לוגו PNG שקוף"
              className="sr-only"
              onChange={(ev) => {
                const f = ev.currentTarget.files?.[0];
                ev.currentTarget.value = "";
                if (f) void addLogo(f);
              }}
            />
          </label>
        </div>
      </div>
      <StoryCanvas frame={frame} src={src} imageView={imageView} els={els} sel={sel} editing={editing} compact={editing !== null || textInputFocused} exporting={exporting} over={over} drag={drag} frameDown={stableFrameDown} move={stableMove} up={stableUp} down={stableDown} editLayer={editLayer} finishEditing={finishEditing} changeText={stableChangeText} beginResize={stableBeginResize} />

      <label className="flex items-center gap-3 w-full max-w-sm rounded-lg bg-card p-3 text-xs font-bold shrink-0">
        גודל תמונה
        <StorySlider label="גודל תמונה" value={imageView.scale} min={0.8} max={2} onPreview={previewImageScale} onCommit={commitImageScale} />
      </label>
      {selected && (
        <div className="sticky bottom-0 z-10 w-full max-w-sm max-h-[40vh] overflow-y-auto overscroll-contain bg-card rounded-t-3xl rounded-b-2xl p-3 space-y-2 shrink-0 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">גודל</span>
            {selected.kind !== "text" && <Button
              size="icon"
              variant="outline"
              aria-label="הקטנה"
              onClick={() => patch(selected.id, { scale: Math.max(0.4, selected.scale - 0.15) })}
            >
              <Minus />
            </Button>}
            <StorySlider key={`scale-${selected.id}`} label="שינוי גודל" value={selected.scale} min={0.4} max={5} onPreview={previewScale} onCommit={commitScale} />
            {selected.kind !== "text" && <Button
              size="icon"
              variant="outline"
              aria-label="הגדלה"
              onClick={() => patch(selected.id, { scale: Math.min(5, selected.scale + 0.15) })}
            >
              <Plus />
            </Button>}
          </div>
          {selected.kind === "image" && (
            <label className="flex items-center gap-2 text-xs font-bold">
              שקיפות
              <StorySlider key={`opacity-${selected.id}`} label="שקיפות הלוגו או הסטיקר" value={selected.opacity} min={0.15} max={1} onPreview={previewOpacity} onCommit={commitOpacity} />
            </label>
          )}
          {selected.kind === "text" && (
            <>
              <textarea
                ref={inputRef}
                aria-label="הקלדת טקסט לסטורי"
                dir="rtl"
                rows={2}
                maxLength={120}
                value={selected.text}
                placeholder="הקלידי כאן"
                onFocus={() => {
                  setTextInputFocused(true);
                  setEditing(null);
                }}
                onBlur={() => setTextInputFocused(false)}
                onSelect={(ev) => {
                  const range = activeMention(
                    ev.currentTarget.value,
                    ev.currentTarget.selectionStart,
                  );
                  setMention(range ? { id: selected.id, ...range } : null);
                }}
                onChange={(ev) =>
                  changeText(selected.id, ev.target.value.slice(0, 120), ev.target.selectionStart)
                }
                className="w-full rounded-xl border border-border bg-accent px-3 py-2 text-sm text-right"
              />
              {mention?.id === selected.id && (
                <StoryMentionPicker query={mention.query} onSelect={chooseMember} />
              )}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {STORY_FONTS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => style({ font: f.id })}
                    className={
                      "shrink-0 rounded-xl border px-3 py-1.5 text-right " +
                      (selected.font === f.id ? "border-primary bg-accent" : "border-border")
                    }
                  >
                    <span
                      style={{
                        fontFamily: `"${f.family}"`,
                        fontStyle: f.italic ? "italic" : "normal",
                      }}
                      className="block text-base leading-tight"
                    >
                      {f.desc}
                    </span>
                    <span className="block text-[10px] text-muted-foreground">{f.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1.5 flex-wrap">
                <Button
                  size="icon"
                  variant={selected.bold ? "default" : "outline"}
                  aria-label="עיבוי"
                  aria-pressed={selected.bold}
                  onClick={() => style({ bold: !selected.bold })}
                >
                  <Bold />
                </Button>
                <Button
                  size="icon"
                  variant={selected.underline ? "default" : "outline"}
                  aria-label="קו תחתון"
                  aria-pressed={selected.underline}
                  onClick={() => style({ underline: !selected.underline })}
                >
                  <Underline />
                </Button>
                <Button
                  size="icon"
                  variant={selected.highlight ? "default" : "outline"}
                  aria-label="רקע מרקר"
                  aria-pressed={selected.highlight}
                  onClick={() => style({ highlight: !selected.highlight })}
                >
                  <Highlighter />
                </Button>
                <Button
                  size="icon"
                  variant="outline"
                  aria-label="תיוג חברה"
                  title="תיוג חברה"
                  onClick={() => {
                    const caret = inputRef.current?.selectionStart ?? selected.text.length;
                    const text = selected.text.slice(0, caret) + " @" + selected.text.slice(caret);
                    changeText(selected.id, text, caret + 2);
                    inputRef.current?.focus();
                  }}
                >
                  <AtSign />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(selected.id)}>
                  <Type />
                  עריכה
                </Button>
              </div>
              <div className="flex gap-1.5 flex-wrap items-center">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`צבע ${c}`}
                    onClick={() => style({ color: c })}
                    style={{ background: c }}
                    className={
                      "w-7 h-7 rounded-full border-2 " +
                      (selected.color === c ? "border-primary scale-110" : "border-border")
                    }
                  />
                ))}
                <label
                  className="w-7 h-7 rounded-full overflow-hidden border-2 border-border relative bg-rose-glam"
                  title="צבע חופשי"
                >
                  <input
                    type="color"
                    aria-label="בחירת צבע חופשי"
                    value={selected.color}
                    onChange={(e) => style({ color: e.target.value.toUpperCase() })}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </label>
              </div>
            </>
          )}
        </div>
      )}

      {panel === "stickers" && (
        <div className="w-full max-w-sm bg-card rounded-2xl p-3 space-y-2 shrink-0">
          <div className="grid grid-cols-2 gap-2">
            {STORY_STICKERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add("pill", s)}
                className="rounded-full bg-accent text-[#5B0E2D] font-bold text-xs px-3 py-2"
              >
                {s}
              </button>
            ))}
          </div>
          {(stickers.data?.length ?? 0) > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {stickers.data?.map((s) => (
                <button
                  key={s.id}
                  type="button"
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
                </button>
              ))}
            </div>
          )}
          {stickers.isError && (
            <p className="text-xs text-muted-foreground">טעינת הסטיקרים נכשלה</p>
          )}
        </div>
      )}

      {err && (
        <p role="alert" className="text-xs text-primary-foreground">
          {err}
        </p>
      )}
      <Button
        disabled={busy || !src}
        onClick={() => void publish()}
        className="mb-2 mt-2 min-h-12 w-full max-w-sm shrink-0 rounded-2xl bg-rose-glam py-3 font-black text-primary-foreground"
      >
        {busy ? <ImageUploadStatus /> : "פרסום סטורי לקהילה"}
      </Button>
    </div>
  );
}

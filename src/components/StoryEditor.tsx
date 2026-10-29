import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
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
  resizedTextWidth,
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
      className="outline-none w-full min-w-[1ch] block whitespace-pre-wrap caret-current empty:before:content-[attr(data-placeholder)] empty:before:opacity-60"
    />
  );
}

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
    const u = URL.createObjectURL(file);
    setSrc(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  const backgroundUrl = useRef<{ file: File; url: string } | null>(null);
  const [els, setEls] = useState<El[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [textInputFocused, setTextInputFocused] = useState(false);
  const [drag, setDrag] = useState<{ id: number; dx: number; dy: number } | null>(null);
  const [over, setOver] = useState(false);
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
  const patch = (id: number, p: Partial<El>) =>
    setEls((v) => v.map((e) => (e.id === id ? { ...e, ...p } : e)));
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
        width: 80,
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
  const clamp = (p: { x: number; y: number }) => ({
    x: Math.min(97, Math.max(3, p.x)),
    y: Math.min(98, Math.max(2, p.y)),
  });
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
  function frameDown(ev: RPointerEvent) {
    pointers.current.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.current.size === 2 && selected) {
      startPinch(selected);
    } else if (pointers.current.size === 1 && !drag) {
      setSel(null);
      setEditing(null);
    }
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
      width: e.width,
      scale: e.scale,
      rotation: e.rot,
    };
  }
  function move(ev: RPointerEvent) {
    if (resize.current) {
      const r = resize.current;
      const width = frame.current?.getBoundingClientRect().width;
      if (width)
        patch(r.id, {
          width: resizedTextWidth(
            r.width,
            ev.clientX - r.x,
            ev.clientY - r.y,
            r.rotation,
            r.scale,
            width,
            r.side,
          ),
        });
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
      patch(sel, {
        scale: Math.min(5, Math.max(0.4, (pinch.current.s * d) / pinch.current.d)),
        rot: pinch.current.r + ((ang - pinch.current.a) * 180) / Math.PI,
      });
      return;
    }
    if (!drag) return;
    const p = pos(ev);
    setOver(isTrash(p.x, p.y));
    patch(drag.id, clamp({ x: p.x - drag.dx, y: p.y - drag.dy }));
  }
  function up(ev: RPointerEvent) {
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
  async function snapshot() {
    const node = frame.current;
    if (!node) throw new Error("התמונה אינה מוכנה");
    flushSync(() => {
      setEditing(null);
      setExporting(true);
    });
    try {
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
      setExporting(false);
    }
  }
  async function publish() {
    setBusy(true);
    setErr("");
    setEditing(null);
    try {
      if (backgroundUrl.current?.file !== file)
        backgroundUrl.current = { file, url: await uploadPhoto(file) };
      const result = await snapshot();
      await onPublish(result.file, "", backgroundUrl.current.url, result.mentions);
    } catch {
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
      <div
        ref={frame}
        onPointerDown={frameDown}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        style={{
          touchAction: "none",
          width: `min(100%,384px,calc(${editing !== null || textInputFocused ? "44" : "58"}dvh * 9 / 16))`,
          aspectRatio: "9 / 16",
        }}
        className="relative shrink-0 overflow-hidden bg-black select-none"
      >
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full object-contain"
        />
        {els
          .filter((e) => !exporting || e.kind !== "text" || e.text.trim())
          .map((e) => {
            const f = fontOf(e.font);
            const active = sel === e.id && !exporting;
            return (
              <div
                data-layer-id={e.id}
                key={e.id}
                onPointerDown={(ev) => down(ev, e)}
                onDoubleClick={() => e.kind === "text" && setEditing(e.id)}
                style={{
                  left: e.x + "%",
                  top: e.y + "%",
                  zIndex: e.z,
                  transform: `translate(-50%,-50%) scale(${e.scale}) rotate(${e.rot}deg)`,
                  touchAction: "none",
                  width: e.kind === "text" ? e.width + "%" : "max-content",
                  maxWidth: "90%",
                  opacity: drag?.id === e.id && over ? 0.5 : e.opacity,
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
                    style={{
                      fontFamily: `"${f.family}"`,
                      fontStyle: f.italic ? "italic" : "normal",
                      fontWeight: e.bold ? 700 : 400,
                      textDecoration: e.underline ? "underline" : "none",
                      color: e.color,
                      opacity: 1,
                      fontSize: BASE,
                      lineHeight: 1.25,
                      background: e.highlight ? highlightBg(e.color) : "transparent",
                      textShadow: e.highlight ? "none" : "0 1px 6px rgba(0,0,0,.35)",
                      whiteSpace: "pre-wrap",
                      maxWidth: "90%",
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                    className="block rounded-lg px-2"
                  >
                    {editing === e.id ? (
                      <EditableText
                        initial={e.text}
                        onChange={(t, caret) => changeText(e.id, t, caret)}
                        onDone={() => setEditing(null)}
                      />
                    ) : (
                      e.text || <span className="opacity-60">הקלידי כאן</span>
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
                      variant="secondary"
                      aria-label={side === -1 ? "שינוי רוחב משמאל" : "שינוי רוחב מימין"}
                      onPointerDown={(ev) => beginResize(ev, e, side)}
                      style={{
                        position: "absolute",
                        top: "50%",
                        left: side === -1 ? -16 : undefined,
                        right: side === 1 ? -16 : undefined,
                        transform: "translateY(-50%)",
                        touchAction: "none",
                      }}
                      className="w-8 h-10 cursor-ew-resize border border-primary rounded-full"
                    >
                      <span className="w-1 h-5 bg-primary rounded-full" />
                    </Button>
                  ))}
              </div>
            );
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

      {selected && (
        <div className="sticky bottom-0 z-10 w-full max-w-sm max-h-[40vh] overflow-y-auto overscroll-contain bg-card rounded-t-3xl rounded-b-2xl p-3 space-y-2 shrink-0 shadow-soft">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">גודל</span>
            <Button
              size="icon"
              variant="outline"
              aria-label="הקטנה"
              onClick={() => patch(selected.id, { scale: Math.max(0.4, selected.scale - 0.15) })}
            >
              <Minus />
            </Button>
            <input
              aria-label="שינוי גודל"
              type="range"
              min={0.4}
              max={5}
              step={0.05}
              value={selected.scale}
              onChange={(e) => patch(selected.id, { scale: Number(e.target.value) })}
              style={{ touchAction: "none" }}
              className="flex-1 accent-primary"
            />
            <Button
              size="icon"
              variant="outline"
              aria-label="הגדלה"
              onClick={() => patch(selected.id, { scale: Math.min(5, selected.scale + 0.15) })}
            >
              <Plus />
            </Button>
          </div>
          {selected.kind === "image" && (
            <label className="flex items-center gap-2 text-xs font-bold">
              שקיפות
              <input
                aria-label="שקיפות הלוגו או הסטיקר"
                type="range"
                min={0.15}
                max={1}
                step={0.05}
                value={selected.opacity}
                onChange={(e) => patch(selected.id, { opacity: Number(e.target.value) })}
                style={{ touchAction: "none" }}
                className="flex-1 accent-primary"
              />
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

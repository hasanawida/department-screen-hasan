"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, Calendar, Bell, MessageSquare, BookOpen, Image as ImageIcon,
  CloudSun, Trash2, Plus, Save, Eye, Palette, Sparkles, Upload,
  Type, Square, ArrowUp, ArrowDown, RotateCw, Copy as CopyIcon,
  Layers, ChevronUp, ChevronDown,
} from "lucide-react";
import { Rnd } from "react-rnd";

const CANVAS_W = 1920;
const CANVAS_H = 1080;

type WidgetType =
  | "header" | "current" | "next" | "weekly" | "ticker"
  | "announcements" | "topic" | "clock" | "media" | "weather" | "logo"
  | "text" | "shape";

type Widget = {
  i: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation?: number;
  z?: number;
  bg?: string;
  fg?: string;
  fontScale?: number;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  imageOpacity?: number;
  text?: string;
  textAlign?: "right" | "center" | "left";
  fontWeight?: "normal" | "bold";
  shape?: "rect" | "circle";
  radius?: number;
};

const WIDGET_META: Record<WidgetType, { label: string; icon: any; defaultW: number; defaultH: number }> = {
  header:        { label: "כותרת + שעון",    icon: Clock,         defaultW: 1800, defaultH: 160 },
  current:       { label: "פעילות עכשיו",     icon: Sparkles,      defaultW: 900,  defaultH: 360 },
  next:          { label: "בהמשך היום",       icon: Calendar,      defaultW: 600,  defaultH: 360 },
  weekly:        { label: "לוח שבועי",        icon: Calendar,      defaultW: 1800, defaultH: 600 },
  ticker:        { label: "שורת רצה",         icon: MessageSquare, defaultW: 1800, defaultH: 80 },
  announcements: { label: "הודעות חשובות",    icon: Bell,          defaultW: 600,  defaultH: 240 },
  topic:         { label: "נושא השבוע",       icon: BookOpen,      defaultW: 1200, defaultH: 120 },
  clock:         { label: "שעון",             icon: Clock,         defaultW: 280,  defaultH: 160 },
  media:         { label: "תמונה / מדיה",     icon: ImageIcon,     defaultW: 600,  defaultH: 400 },
  weather:       { label: "מזג אוויר",        icon: CloudSun,      defaultW: 280,  defaultH: 160 },
  logo:          { label: "לוגו",             icon: ImageIcon,     defaultW: 200,  defaultH: 200 },
  text:          { label: "טקסט חופשי",       icon: Type,          defaultW: 500,  defaultH: 100 },
  shape:         { label: "צורה דקורטיבית",    icon: Square,        defaultW: 400,  defaultH: 200 },
};

const TEMPLATES: Record<string, { widgets: Widget[]; bg?: string; fg?: string }> = {
  classic: {
    bg: "#F8FAFC", fg: "#1E293B",
    widgets: [
      { i: "w1", type: "header",        x: 60,   y: 40,   w: 1800, h: 160 },
      { i: "w2", type: "current",       x: 60,   y: 220,  w: 1100, h: 480 },
      { i: "w3", type: "next",          x: 1180, y: 220,  w: 680,  h: 220 },
      { i: "w4", type: "announcements", x: 1180, y: 460,  w: 680,  h: 240 },
      { i: "w5", type: "ticker",        x: 60,   y: 720,  w: 1800, h: 80  },
    ],
  },
  weekly_focus: {
    bg: "#FFFBEB", fg: "#451A03",
    widgets: [
      { i: "w1", type: "header", x: 60, y: 40,  w: 1800, h: 140 },
      { i: "w2", type: "topic",  x: 60, y: 200, w: 1800, h: 120 },
      { i: "w3", type: "weekly", x: 60, y: 340, w: 1800, h: 600 },
      { i: "w4", type: "ticker", x: 60, y: 960, w: 1800, h: 80  },
    ],
  },
  pastel: {
    bg: "#FDF2F8", fg: "#4A044E",
    widgets: [
      { i: "w1", type: "shape",         x: 0,    y: 0,    w: 1920, h: 220, bg: "#F9A8D4", radius: 0 },
      { i: "w2", type: "logo",          x: 80,   y: 30,   w: 160,  h: 160, imageFit: "contain" },
      { i: "w3", type: "text",          x: 280,  y: 80,   w: 1200, h: 120, text: "ברוכים הבאים", fontWeight: "bold", textAlign: "right", fontScale: 2.4, bg: "transparent", fg: "#831843" },
      { i: "w4", type: "clock",         x: 1620, y: 60,   w: 240,  h: 100, bg: "#FFFFFF" },
      { i: "w5", type: "current",       x: 60,   y: 260,  w: 1180, h: 480 },
      { i: "w6", type: "next",          x: 1260, y: 260,  w: 600,  h: 230 },
      { i: "w7", type: "announcements", x: 1260, y: 510,  w: 600,  h: 230 },
      { i: "w8", type: "ticker",        x: 60,   y: 760,  w: 1800, h: 80  },
    ],
  },
  modern_dark: {
    bg: "#0F172A", fg: "#F1F5F9",
    widgets: [
      { i: "w1", type: "shape",   x: 0,    y: 0,    w: 1920, h: 12,  bg: "#10B981", radius: 0 },
      { i: "w2", type: "header",  x: 60,   y: 40,   w: 1800, h: 140, bg: "#1E293B", fg: "#F1F5F9" },
      { i: "w3", type: "current", x: 60,   y: 200,  w: 1180, h: 480, bg: "#1E293B", fg: "#F1F5F9" },
      { i: "w4", type: "next",    x: 1260, y: 200,  w: 600,  h: 230, bg: "#1E293B", fg: "#F1F5F9" },
      { i: "w5", type: "weather", x: 1260, y: 450,  w: 290,  h: 110, bg: "#1E293B", fg: "#F1F5F9" },
      { i: "w6", type: "clock",   x: 1570, y: 450,  w: 290,  h: 110, bg: "#1E293B", fg: "#F1F5F9" },
      { i: "w7", type: "topic",   x: 1260, y: 580,  w: 600,  h: 100, bg: "#10B981", fg: "#FFFFFF" },
      { i: "w8", type: "ticker",  x: 60,   y: 700,  w: 1800, h: 80,  bg: "#10B981", fg: "#FFFFFF" },
    ],
  },
};

const SAMPLE_DATA = {
  greeting: "ערב טוב",
  deptName: "מחלקה ב",
  date: "יום ראשון | 19.04.26",
  time: "22:30",
  currentActivity: { title: "התעמלות בוקר", time: "10:00 - 10:45", instructor: "מרינה" },
  nextActivities: [
    { title: "הפסקת קפה", time: "10:45" },
    { title: "פעילות מוזיקלית", time: "11:30" },
  ],
  topic: "שבוע האהבה והחברות",
  ticker: "ברוכים הבאים · יום מולדת שמח לרחל · בית הכנסת פתוח 17:00",
  weeklyDays: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
};

function WidgetRenderer({ w, color }: { w: Widget; color: { bg: string; fg: string; scale: number } }) {
  const cls = "w-full h-full flex flex-col rounded-xl p-3 overflow-hidden shadow-sm border";
  const style = { backgroundColor: color.bg, color: color.fg, fontSize: `${color.scale}rem` };
  const Icon = WIDGET_META[w.type].icon;

  switch (w.type) {
    case "header":
      return (
        <div className={cls} style={style}>
          <div className="flex justify-between items-center w-full h-full">
            <div>
              <div className="font-bold" style={{ fontSize: `${color.scale * 1.7}rem` }}>{SAMPLE_DATA.greeting}</div>
              <div className="opacity-70" style={{ fontSize: `${color.scale * 0.9}rem` }}>{SAMPLE_DATA.deptName}</div>
            </div>
            <div className="text-left">
              <div className="font-bold" style={{ fontSize: `${color.scale * 1.7}rem` }}>{SAMPLE_DATA.time}</div>
              <div className="opacity-70" style={{ fontSize: `${color.scale * 0.85}rem` }}>{SAMPLE_DATA.date}</div>
            </div>
          </div>
        </div>
      );
    case "current":
      return (
        <div className={cls} style={style}>
          <div className="text-xs font-semibold opacity-70 mb-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3" /> עכשיו
          </div>
          <div className="font-bold" style={{ fontSize: `${color.scale * 2}rem` }}>{SAMPLE_DATA.currentActivity.title}</div>
          <div className="opacity-70 mt-1">{SAMPLE_DATA.currentActivity.time}</div>
          <div className="opacity-70">מנחה: {SAMPLE_DATA.currentActivity.instructor}</div>
        </div>
      );
    case "next":
      return (
        <div className={cls} style={style}>
          <div className="text-xs font-semibold opacity-70 mb-1 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> בהמשך
          </div>
          <div className="space-y-1.5 text-sm">
            {SAMPLE_DATA.nextActivities.map((a, i) => (
              <div key={i} className="flex justify-between border-b border-current/10 pb-1">
                <span>{a.title}</span>
                <span className="opacity-60">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      );
    case "weekly":
      return (
        <div className={cls} style={style}>
          <div className="text-xs font-semibold opacity-70 mb-2 flex items-center gap-1">
            <Calendar className="h-3 w-3" /> לוח שבועי
          </div>
          <div className="grid grid-cols-7 gap-1 flex-1">
            {SAMPLE_DATA.weeklyDays.map((d, i) => (
              <div key={d} className={`rounded p-1 text-center text-xs ${i === 0 ? "bg-current/20 font-bold" : "bg-current/5"}`}>
                {d}
              </div>
            ))}
          </div>
        </div>
      );
    case "ticker":
      return (
        <div className={cls} style={style}>
          <div className="flex items-center gap-2 h-full">
            <Bell className="h-4 w-4 shrink-0" />
            <div className="truncate">{SAMPLE_DATA.ticker}</div>
          </div>
        </div>
      );
    case "announcements":
      return (
        <div className={cls} style={style}>
          <div className="text-xs font-semibold opacity-70 mb-1 flex items-center gap-1">
            <Bell className="h-3 w-3" /> הודעות
          </div>
          <div className="text-sm">בית הכנסת פתוח היום 17:00 · פעילות מוזיקלית בלובי 16:00</div>
        </div>
      );
    case "topic":
      return (
        <div className={cls} style={style}>
          <div className="text-xs font-semibold opacity-70 mb-1 flex items-center gap-1">
            <BookOpen className="h-3 w-3" /> נושא השבוע
          </div>
          <div className="font-bold" style={{ fontSize: `${color.scale * 1.4}rem` }}>{SAMPLE_DATA.topic}</div>
        </div>
      );
    case "clock":
      return (
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center" }}>
          <Clock className="h-5 w-5 opacity-50" />
          <div className="font-bold" style={{ fontSize: `${color.scale * 2.4}rem` }}>{SAMPLE_DATA.time}</div>
        </div>
      );
    case "weather":
      return (
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center" }}>
          <CloudSun className="h-7 w-7" />
          <div className="font-bold mt-1">22°</div>
          <div className="opacity-70 text-xs">נעים</div>
        </div>
      );
    case "media":
      return (
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center" }}>
          <ImageIcon className="h-10 w-10 opacity-30" />
          <div className="opacity-50 text-xs mt-2">איזור תמונות / PDF</div>
        </div>
      );
    case "text": {
      const align = w.textAlign || "right";
      const weight = w.fontWeight || "normal";
      return (
        <div
          className="w-full h-full flex items-center p-2 overflow-hidden"
          style={{
            backgroundColor: color.bg,
            color: color.fg,
            borderRadius: w.radius != null ? `${w.radius}px` : 12,
            justifyContent: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end",
            textAlign: align,
            fontWeight: weight,
            fontSize: `${color.scale * 1.4}rem`,
          }}
        >
          {w.text || "לחץ כאן להוספת טקסט"}
        </div>
      );
    }
    case "shape": {
      const isCircle = w.shape === "circle";
      return (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: color.bg,
            borderRadius: isCircle ? "50%" : (w.radius != null ? `${w.radius}px` : 12),
          }}
        />
      );
    }
    case "logo": {
      const fit = w.imageFit || "contain";
      const opacity = w.imageOpacity ?? 1;
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: color.bg, padding: 4, borderRadius: 12 }}>
          {w.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={w.imageUrl}
              alt="לוגו"
              style={{ width: "100%", height: "100%", objectFit: fit, opacity }}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex flex-col items-center text-center text-xs opacity-40">
              <ImageIcon className="h-8 w-8 mb-1" />
              <div>הקלד URL של לוגו</div>
            </div>
          )}
        </div>
      );
    }
    default:
      return (
        <div className={cls} style={style}>
          <Icon className="h-5 w-5" />
          <div>{(WIDGET_META as any)[w.type]?.label}</div>
        </div>
      );
  }
}

export default function LayoutEditor() {
  const [items, setItems] = useState<Widget[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [globalBg, setGlobalBg] = useState("#F8FAFC");
  const [globalFg, setGlobalFg] = useState("#1E293B");
  const [bgImage, setBgImage] = useState("");
  const [bgImageOpacity, setBgImageOpacity] = useState(0.3);
  const [bgImageFit, setBgImageFit] = useState<"cover" | "contain" | "repeat">("cover");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [showLayers, setShowLayers] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplate("modern_dark");
  }, []);

  function loadTemplate(name: keyof typeof TEMPLATES) {
    const t = TEMPLATES[name];
    setItems(t.widgets.map((w) => ({ ...w })));
    if (t.bg) setGlobalBg(t.bg);
    if (t.fg) setGlobalFg(t.fg);
    setSelectedId(null);
  }

  function nextZ() {
    return items.reduce((m, w) => Math.max(m, w.z ?? 0), 0) + 1;
  }

  function addWidget(type: WidgetType) {
    const id = "w" + Date.now() + Math.random().toString(36).slice(2, 5);
    const meta = WIDGET_META[type];
    setItems((prev) => [
      ...prev,
      {
        i: id,
        type,
        x: 100,
        y: 100,
        w: meta.defaultW,
        h: meta.defaultH,
        z: nextZ(),
      },
    ]);
    setSelectedId(id);
  }

  function removeWidget(id: string) {
    setItems((prev) => prev.filter((w) => w.i !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateWidget(id: string) {
    const w = items.find((x) => x.i === id);
    if (!w) return;
    const copy: Widget = {
      ...w,
      i: "w" + Date.now() + Math.random().toString(36).slice(2, 5),
      x: w.x + 30,
      y: w.y + 30,
      z: nextZ(),
    };
    setItems((prev) => [...prev, copy]);
    setSelectedId(copy.i);
  }

  function updateWidget(id: string, patch: Partial<Widget>) {
    setItems((prev) => prev.map((w) => (w.i === id ? { ...w, ...patch } : w)));
  }

  function bringForward(id: string) {
    updateWidget(id, { z: nextZ() });
  }
  function sendBackward(id: string) {
    const cur = items.find((w) => w.i === id);
    if (!cur) return;
    updateWidget(id, { z: Math.max(0, (cur.z ?? 1) - 1) });
  }

  async function uploadFile(file: File): Promise<string | null> {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `layout-demo/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("department-media").upload(fileName, file, { upsert: true });
    if (error) {
      alert("שגיאה בהעלאת קובץ: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("department-media").getPublicUrl(fileName);
    return data.publicUrl;
  }

  async function handleBgUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
    const url = await uploadFile(file);
    setIsUploadingBg(false);
    if (url) setBgImage(url);
    e.target.value = "";
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>, widgetId: string) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    const url = await uploadFile(file);
    setIsUploadingLogo(false);
    if (url) updateWidget(widgetId, { imageUrl: url });
    e.target.value = "";
  }

  function exportJson() {
    const config = { widgets: items, globalBg, globalFg, bgImage, bgImageOpacity, bgImageFit };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert("JSON של הלייאוט הועתק לקליפבורד");
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedId) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Delete" || e.key === "Backspace") removeWidget(selectedId);
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicateWidget(selectedId);
      }
      const w = items.find((x) => x.i === selectedId);
      if (!w) return;
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowLeft") updateWidget(selectedId, { x: w.x - step });
      if (e.key === "ArrowRight") updateWidget(selectedId, { x: w.x + step });
      if (e.key === "ArrowUp") updateWidget(selectedId, { y: w.y - step });
      if (e.key === "ArrowDown") updateWidget(selectedId, { y: w.y + step });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, items]);

  const selectedWidget = items.find((w) => w.i === selectedId);
  const selectedMeta = selectedWidget ? WIDGET_META[selectedWidget.type] : null;

  return (
    <div className="h-screen flex flex-col bg-[#1f1f1f] text-slate-100" dir="rtl">
      {/* Top bar */}
      <div className="bg-[#2a2a2a] border-b border-black/40 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-bold">עורך עיצוב</h1>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Demo</span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        <Select onValueChange={(v) => loadTemplate(v as keyof typeof TEMPLATES)}>
          <SelectTrigger className="w-44 bg-[#1f1f1f] border-white/10 text-white">
            <SelectValue placeholder="טען תבנית..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">קלאסי</SelectItem>
            <SelectItem value="weekly_focus">דגש שבועי</SelectItem>
            <SelectItem value="pastel">פסטל</SelectItem>
            <SelectItem value="modern_dark">מודרני כהה</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-white/10" />

        {selectedWidget && (
          <>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1"
              onClick={() => duplicateWidget(selectedWidget.i)}>
              <CopyIcon className="h-3.5 w-3.5" /> שכפול
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1"
              onClick={() => bringForward(selectedWidget.i)}>
              <ArrowUp className="h-3.5 w-3.5" /> קדימה
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1"
              onClick={() => sendBackward(selectedWidget.i)}>
              <ArrowDown className="h-3.5 w-3.5" /> אחורה
            </Button>
            <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/20 gap-1"
              onClick={() => removeWidget(selectedWidget.i)}>
              <Trash2 className="h-3.5 w-3.5" /> מחק
            </Button>
            <div className="h-6 w-px bg-white/10" />
          </>
        )}

        <div className="flex items-center gap-1 mr-auto">
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setZoom(Math.max(0.2, zoom - 0.1))}>
            <ChevronDown className="h-4 w-4" />
          </Button>
          <span className="text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10" onClick={() => setZoom(Math.min(1.5, zoom + 0.1))}>
            <ChevronUp className="h-4 w-4" />
          </Button>

          <div className="h-6 w-px bg-white/10 mx-2" />

          <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 gap-1"
            onClick={() => setShowLayers(!showLayers)}>
            <Layers className="h-4 w-4" /> שכבות
          </Button>
          <Button variant={previewMode ? "default" : "ghost"} size="sm"
            className={previewMode ? "" : "text-white hover:bg-white/10"} onClick={() => setPreviewMode(!previewMode)}>
            <Eye className="h-4 w-4 me-1" /> {previewMode ? "חזור לעריכה" : "תצוגה"}
          </Button>
          <Button size="sm" onClick={exportJson} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
            <Save className="h-4 w-4" /> שמור
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: widget palette */}
        {!previewMode && (
          <div className="w-56 bg-[#2a2a2a] border-l border-black/40 p-3 overflow-y-auto shrink-0">
            <h2 className="text-xs font-bold mb-2 text-slate-400 uppercase tracking-wider">הוסף widget</h2>
            <div className="space-y-1">
              {Object.entries(WIDGET_META).map(([t, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    onClick={() => addWidget(t as WidgetType)}
                    className="flex items-center gap-2 w-full text-right rounded-lg border border-white/10 hover:border-emerald-500 hover:bg-white/5 p-2 text-sm transition"
                  >
                    <Icon className="h-4 w-4 text-emerald-400" />
                    <span className="flex-1 text-right">{meta.label}</span>
                    <Plus className="h-3 w-3 text-slate-500" />
                  </button>
                );
              })}
            </div>

            <h2 className="text-xs font-bold mt-4 mb-2 text-slate-400 uppercase tracking-wider">רקע</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs">צבע רקע</label>
                <input type="color" value={globalBg} onChange={(e) => setGlobalBg(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent" />
              </div>
              <div>
                <label className="text-xs">צבע טקסט ברירת מחדל</label>
                <input type="color" value={globalFg} onChange={(e) => setGlobalFg(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent" />
              </div>
              <label className="flex items-center justify-center gap-2 w-full text-xs border border-dashed border-white/20 rounded px-3 py-2 cursor-pointer hover:bg-white/5">
                <Upload className="h-3 w-3" />
                {isUploadingBg ? "מעלה..." : "העלה תמונת רקע"}
                <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={isUploadingBg} />
              </label>
              <Input
                value={bgImage}
                onChange={(e) => setBgImage(e.target.value)}
                placeholder="או URL https://..."
                dir="ltr"
                className="text-xs bg-[#1f1f1f] border-white/10 text-white"
              />
              {bgImage && (
                <>
                  <div>
                    <label className="text-xs">שקיפות: {Math.round(bgImageOpacity * 100)}%</label>
                    <input type="range" min={0} max={1} step={0.05}
                      value={bgImageOpacity} onChange={(e) => setBgImageOpacity(parseFloat(e.target.value))}
                      className="w-full" />
                  </div>
                  <Select value={bgImageFit} onValueChange={(v) => setBgImageFit(v as any)}>
                    <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cover">cover</SelectItem>
                      <SelectItem value="contain">contain</SelectItem>
                      <SelectItem value="repeat">repeat</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" className="w-full text-xs text-white hover:bg-white/10"
                    onClick={() => setBgImage("")}>הסר רקע</Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Center: canvas */}
        <div
          className="flex-1 overflow-auto bg-[#1f1f1f] flex items-start justify-center p-8"
          onClick={() => setSelectedId(null)}
        >
          <div
            ref={canvasRef}
            className="relative shadow-2xl"
            style={{
              width: CANVAS_W * zoom,
              height: CANVAS_H * zoom,
              backgroundColor: globalBg,
              flexShrink: 0,
              border: previewMode ? "none" : "1px solid #444",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* inner with scale */}
            <div
              style={{
                width: CANVAS_W,
                height: CANVAS_H,
                transform: `scale(${zoom})`,
                transformOrigin: "top right",
                position: "absolute",
                inset: 0,
                color: globalFg,
              }}
            >
              {bgImage && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    backgroundImage: `url(${bgImage})`,
                    backgroundSize: bgImageFit === "repeat" ? "auto" : bgImageFit,
                    backgroundRepeat: bgImageFit === "repeat" ? "repeat" : "no-repeat",
                    backgroundPosition: "center",
                    opacity: bgImageOpacity,
                    zIndex: 0,
                  }}
                />
              )}

              {[...items].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((w) => {
                const isSelected = selectedId === w.i;
                const color = {
                  bg: w.bg || (w.type === "shape" ? "#10B981" : "#FFFFFF"),
                  fg: w.fg || globalFg,
                  scale: w.fontScale || 1,
                };
                return (
                  <Rnd
                    key={w.i}
                    size={{ width: w.w, height: w.h }}
                    position={{ x: w.x, y: w.y }}
                    bounds="parent"
                    disableDragging={previewMode}
                    enableResizing={previewMode ? false : true}
                    scale={zoom}
                    onDragStop={(_, d) => updateWidget(w.i, { x: d.x, y: d.y })}
                    onResizeStop={(_, __, ref, ___, position) => {
                      updateWidget(w.i, {
                        w: parseInt(ref.style.width),
                        h: parseInt(ref.style.height),
                        x: position.x,
                        y: position.y,
                      });
                    }}
                    style={{
                      zIndex: w.z ?? 1,
                      transform: w.rotation ? `rotate(${w.rotation}deg)` : undefined,
                      outline: isSelected && !previewMode ? "2px solid #10B981" : "none",
                      outlineOffset: 2,
                      cursor: previewMode ? "default" : "move",
                    }}
                    onClick={(e: any) => {
                      e.stopPropagation();
                      if (!previewMode) setSelectedId(w.i);
                    }}
                  >
                    <WidgetRenderer w={w} color={color} />
                  </Rnd>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: properties / layers */}
        {!previewMode && (
          <div className="w-72 bg-[#2a2a2a] border-r border-black/40 overflow-y-auto shrink-0">
            {showLayers ? (
              <div className="p-3">
                <h2 className="text-xs font-bold mb-2 text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Layers className="h-3 w-3" /> שכבות ({items.length})
                </h2>
                <div className="space-y-1">
                  {[...items].sort((a, b) => (b.z ?? 0) - (a.z ?? 0)).map((w) => {
                    const meta = WIDGET_META[w.type];
                    const Icon = meta.icon;
                    const isSel = selectedId === w.i;
                    return (
                      <button
                        key={w.i}
                        onClick={() => setSelectedId(w.i)}
                        className={`flex items-center gap-2 w-full text-right rounded p-2 text-sm transition ${
                          isSel ? "bg-emerald-500/20 border border-emerald-500" : "border border-white/5 hover:bg-white/5"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5 text-slate-400" />
                        <span className="flex-1 truncate text-right">{meta.label}{w.text ? ` — ${w.text.slice(0, 15)}` : ""}</span>
                        <span className="text-[10px] opacity-50">z{w.z ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : selectedWidget && selectedMeta ? (
              <div className="p-3">
                <h2 className="text-sm font-bold mb-3 flex items-center gap-2">
                  <selectedMeta.icon className="h-4 w-4 text-emerald-400" />
                  {selectedMeta.label}
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">X</label>
                      <Input type="number" value={Math.round(selectedWidget.x)}
                        onChange={(e) => updateWidget(selectedWidget.i, { x: parseInt(e.target.value) || 0 })}
                        className="bg-[#1f1f1f] border-white/10 text-white text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">Y</label>
                      <Input type="number" value={Math.round(selectedWidget.y)}
                        onChange={(e) => updateWidget(selectedWidget.i, { y: parseInt(e.target.value) || 0 })}
                        className="bg-[#1f1f1f] border-white/10 text-white text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">רוחב</label>
                      <Input type="number" value={Math.round(selectedWidget.w)}
                        onChange={(e) => updateWidget(selectedWidget.i, { w: parseInt(e.target.value) || 50 })}
                        className="bg-[#1f1f1f] border-white/10 text-white text-xs" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">גובה</label>
                      <Input type="number" value={Math.round(selectedWidget.h)}
                        onChange={(e) => updateWidget(selectedWidget.i, { h: parseInt(e.target.value) || 50 })}
                        className="bg-[#1f1f1f] border-white/10 text-white text-xs" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 flex items-center gap-1">
                      <RotateCw className="h-3 w-3" /> סיבוב: {selectedWidget.rotation || 0}°
                    </label>
                    <input type="range" min={-180} max={180} step={1}
                      value={selectedWidget.rotation || 0}
                      onChange={(e) => updateWidget(selectedWidget.i, { rotation: parseInt(e.target.value) })}
                      className="w-full" />
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">סוג</label>
                    <Select value={selectedWidget.type} onValueChange={(v) => updateWidget(selectedWidget.i, { type: v as WidgetType })}>
                      <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(WIDGET_META).map(([t, m]) => (<SelectItem key={t} value={t}>{m.label}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400">צבע רקע</label>
                      <input type="color" value={selectedWidget.bg || "#FFFFFF"}
                        onChange={(e) => updateWidget(selectedWidget.i, { bg: e.target.value })}
                        className="w-full h-8 rounded border border-white/10 bg-transparent" />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400">צבע טקסט</label>
                      <input type="color" value={selectedWidget.fg || globalFg}
                        onChange={(e) => updateWidget(selectedWidget.i, { fg: e.target.value })}
                        className="w-full h-8 rounded border border-white/10 bg-transparent" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400">
                      גודל גופן: ×{(selectedWidget.fontScale || 1).toFixed(2)}
                    </label>
                    <input type="range" min={0.7} max={3} step={0.1}
                      value={selectedWidget.fontScale || 1}
                      onChange={(e) => updateWidget(selectedWidget.i, { fontScale: parseFloat(e.target.value) })}
                      className="w-full" />
                  </div>

                  {selectedWidget.type === "text" && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div>
                        <label className="text-xs text-slate-400">תוכן</label>
                        <Input value={selectedWidget.text || ""}
                          onChange={(e) => updateWidget(selectedWidget.i, { text: e.target.value })}
                          placeholder="הקלד טקסט..."
                          className="bg-[#1f1f1f] border-white/10 text-white" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Select value={selectedWidget.textAlign || "right"} onValueChange={(v) => updateWidget(selectedWidget.i, { textAlign: v as any })}>
                          <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="right">ימין</SelectItem>
                            <SelectItem value="center">מרכז</SelectItem>
                            <SelectItem value="left">שמאל</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={selectedWidget.fontWeight || "normal"} onValueChange={(v) => updateWidget(selectedWidget.i, { fontWeight: v as any })}>
                          <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="normal">רגיל</SelectItem>
                            <SelectItem value="bold">מודגש</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {selectedWidget.type === "shape" && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <Select value={selectedWidget.shape || "rect"} onValueChange={(v) => updateWidget(selectedWidget.i, { shape: v as any })}>
                        <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rect">מלבן</SelectItem>
                          <SelectItem value="circle">עיגול</SelectItem>
                        </SelectContent>
                      </Select>
                      {selectedWidget.shape !== "circle" && (
                        <div>
                          <label className="text-xs text-slate-400">עיגול פינות: {selectedWidget.radius ?? 12}px</label>
                          <input type="range" min={0} max={120} step={1}
                            value={selectedWidget.radius ?? 12}
                            onChange={(e) => updateWidget(selectedWidget.i, { radius: parseInt(e.target.value) })}
                            className="w-full" />
                        </div>
                      )}
                    </div>
                  )}

                  {selectedWidget.type === "logo" && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <label className="flex items-center justify-center gap-2 w-full text-xs border border-dashed border-white/20 rounded px-3 py-2 cursor-pointer hover:bg-white/5">
                        <Upload className="h-3 w-3" />
                        {isUploadingLogo ? "מעלה..." : "העלה לוגו מהמחשב"}
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => handleLogoUpload(e, selectedWidget.i)} disabled={isUploadingLogo} />
                      </label>
                      <Input value={selectedWidget.imageUrl || ""}
                        onChange={(e) => updateWidget(selectedWidget.i, { imageUrl: e.target.value || undefined })}
                        placeholder="או URL"
                        dir="ltr"
                        className="bg-[#1f1f1f] border-white/10 text-white text-xs" />
                      <Select value={selectedWidget.imageFit || "contain"} onValueChange={(v) => updateWidget(selectedWidget.i, { imageFit: v as any })}>
                        <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contain">contain</SelectItem>
                          <SelectItem value="cover">cover</SelectItem>
                        </SelectContent>
                      </Select>
                      <div>
                        <label className="text-xs text-slate-400">שקיפות: {Math.round((selectedWidget.imageOpacity ?? 1) * 100)}%</label>
                        <input type="range" min={0.1} max={1} step={0.05}
                          value={selectedWidget.imageOpacity ?? 1}
                          onChange={(e) => updateWidget(selectedWidget.i, { imageOpacity: parseFloat(e.target.value) })}
                          className="w-full" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-slate-500 text-sm">
                <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-30" />
                בחר widget לעריכה
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-[#2a2a2a] border-t border-black/40 px-3 py-1 text-[10px] text-slate-400 flex items-center justify-between">
        <div>
          <kbd className="bg-white/10 px-1 rounded">Del</kbd> מחק · <kbd className="bg-white/10 px-1 rounded">Ctrl+D</kbd> שכפל ·
          <kbd className="bg-white/10 px-1 rounded">↑↓→←</kbd> הזז · <kbd className="bg-white/10 px-1 rounded">Shift+↑↓→←</kbd> הזז 10px
        </div>
        <div>1920×1080 · {items.length} widgets</div>
      </div>
    </div>
  );
}

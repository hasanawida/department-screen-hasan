"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, Calendar, Bell, MessageSquare, BookOpen, Image as ImageIcon,
  CloudSun, Trash2, Plus, Save, Eye, Palette, Sparkles, Upload,
  Type, Square, Circle, ArrowUp, ArrowDown,
} from "lucide-react";

import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetType =
  | "header" | "current" | "next" | "weekly" | "ticker"
  | "announcements" | "topic" | "clock" | "media" | "weather" | "logo"
  | "text" | "shape";

type Widget = {
  i: string;             // unique id for grid
  type: WidgetType;
  bg?: string;
  fg?: string;
  fontScale?: number;    // 1 = normal, 1.2, 1.5, ...
  imageUrl?: string;     // for logo widget
  imageFit?: "contain" | "cover";
  imageOpacity?: number; // 0..1
  text?: string;         // for text widget
  textAlign?: "right" | "center" | "left";
  fontWeight?: "normal" | "bold";
  shape?: "rect" | "circle";
  radius?: number;       // border radius (px)
  z?: number;            // z-index for layering
};

type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  type: WidgetType;
};

const WIDGET_META: Record<WidgetType, { label: string; icon: any; defaultW: number; defaultH: number }> = {
  header:        { label: "כותרת + שעון",    icon: Clock,         defaultW: 12, defaultH: 2 },
  current:       { label: "פעילות עכשיו",     icon: Sparkles,      defaultW: 7,  defaultH: 4 },
  next:          { label: "בהמשך היום",       icon: Calendar,      defaultW: 5,  defaultH: 4 },
  weekly:        { label: "לוח שבועי",        icon: Calendar,      defaultW: 12, defaultH: 6 },
  ticker:        { label: "שורת רצה",         icon: MessageSquare, defaultW: 12, defaultH: 1 },
  announcements: { label: "הודעות חשובות",    icon: Bell,          defaultW: 5,  defaultH: 3 },
  topic:         { label: "נושא השבוע",       icon: BookOpen,      defaultW: 7,  defaultH: 2 },
  clock:         { label: "שעון",             icon: Clock,         defaultW: 3,  defaultH: 2 },
  media:         { label: "תמונה / מדיה",     icon: ImageIcon,     defaultW: 6,  defaultH: 4 },
  weather:       { label: "מזג אוויר",        icon: CloudSun,      defaultW: 3,  defaultH: 2 },
  logo:          { label: "לוגו",             icon: ImageIcon,     defaultW: 2,  defaultH: 2 },
  text:          { label: "טקסט חופשי",       icon: Type,          defaultW: 4,  defaultH: 1 },
  shape:         { label: "צורה דקורטיבית",    icon: Square,        defaultW: 3,  defaultH: 2 },
};

const TEMPLATES: Record<string, { layout: LayoutItem[], style: Record<string, { bg?: string; fg?: string; fontScale?: number }> }> = {
  classic: {
    layout: [
      { i: "w1", type: "header",        x: 0, y: 0,  w: 12, h: 2 },
      { i: "w2", type: "current",       x: 0, y: 2,  w: 7,  h: 4 },
      { i: "w3", type: "next",          x: 7, y: 2,  w: 5,  h: 2 },
      { i: "w4", type: "announcements", x: 7, y: 4,  w: 5,  h: 2 },
      { i: "w5", type: "ticker",        x: 0, y: 6,  w: 12, h: 1 },
    ],
    style: {},
  },
  weekly_focus: {
    layout: [
      { i: "w1", type: "header", x: 0, y: 0, w: 12, h: 2 },
      { i: "w2", type: "topic",  x: 0, y: 2, w: 12, h: 1 },
      { i: "w3", type: "weekly", x: 0, y: 3, w: 12, h: 6 },
      { i: "w4", type: "ticker", x: 0, y: 9, w: 12, h: 1 },
    ],
    style: {},
  },
  pastel: {
    layout: [
      { i: "w1", type: "clock",         x: 9, y: 0,  w: 3, h: 2 },
      { i: "w2", type: "weather",       x: 6, y: 0,  w: 3, h: 2 },
      { i: "w3", type: "topic",         x: 0, y: 0,  w: 6, h: 2 },
      { i: "w4", type: "current",       x: 0, y: 2,  w: 8, h: 4 },
      { i: "w5", type: "next",          x: 8, y: 2,  w: 4, h: 2 },
      { i: "w6", type: "announcements", x: 8, y: 4,  w: 4, h: 2 },
      { i: "w7", type: "ticker",        x: 0, y: 6,  w: 12, h: 1 },
    ],
    style: {
      w1: { bg: "#FBCFE8", fg: "#831843" },
      w2: { bg: "#FED7AA", fg: "#7C2D12" },
      w3: { bg: "#FEF3C7", fg: "#78350F" },
      w4: { bg: "#FFFFFF", fg: "#1E293B", fontScale: 1.2 },
      w5: { bg: "#E0E7FF", fg: "#3730A3" },
      w6: { bg: "#FCE7F3", fg: "#9D174D" },
      w7: { bg: "#1E293B", fg: "#FFFFFF" },
    },
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
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center", padding: 4 }}>
          {w.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={w.imageUrl}
              alt="לוגו"
              style={{
                width: "100%",
                height: "100%",
                objectFit: fit,
                opacity,
              }}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          ) : (
            <div className="flex flex-col items-center text-center opacity-40 text-xs">
              <ImageIcon className="h-8 w-8 mb-1" />
              <div>הקלד URL של לוגו</div>
              <div className="opacity-70">בפאנל מאפיינים</div>
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

export default function LayoutDemoPage() {
  const [items, setItems] = useState<Widget[]>([]);
  const [layout, setLayout] = useState<LayoutItem[]>([]);
  const [previewMode, setPreviewMode] = useState(false);
  const [globalBg, setGlobalBg] = useState("#F8FAFC");
  const [globalFg, setGlobalFg] = useState("#1E293B");
  const [bgImage, setBgImage] = useState("");
  const [bgImageOpacity, setBgImageOpacity] = useState(0.3);
  const [bgImageFit, setBgImageFit] = useState<"cover" | "contain" | "repeat">("cover");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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

  useEffect(() => {
    loadTemplate("classic");
  }, []);

  function loadTemplate(name: keyof typeof TEMPLATES) {
    const t = TEMPLATES[name];
    setLayout(t.layout);
    setItems(
      t.layout.map((l) => ({
        i: l.i,
        type: l.type,
        bg: t.style[l.i]?.bg,
        fg: t.style[l.i]?.fg,
        fontScale: t.style[l.i]?.fontScale,
      }))
    );
    setSelectedId(null);
  }

  function addWidget(type: WidgetType) {
    const id = "w" + Date.now();
    const meta = WIDGET_META[type];
    const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    const newLayoutItem: LayoutItem = {
      i: id, type, x: 0, y: maxY, w: meta.defaultW, h: meta.defaultH,
    };
    setLayout([...layout, newLayoutItem]);
    setItems([...items, { i: id, type }]);
    setSelectedId(id);
  }

  function removeWidget(id: string) {
    setLayout(layout.filter((l) => l.i !== id));
    setItems(items.filter((w) => w.i !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateWidget(id: string, patch: Partial<Widget>) {
    setItems(items.map((w) => (w.i === id ? { ...w, ...patch } : w)));
  }

  function onLayoutChange(newLayout: any[]) {
    const merged: LayoutItem[] = newLayout.map((l: any) => {
      const cur = layout.find((x) => x.i === l.i);
      return {
        i: l.i, x: l.x, y: l.y, w: l.w, h: l.h,
        type: cur?.type || "header",
      };
    });
    setLayout(merged);
  }

  function exportJson() {
    const config = {
      layout: layout.map(({ i, x, y, w, h, type }) => ({ i, x, y, w, h, type })),
      style: items.reduce<Record<string, any>>((acc, w) => {
        const entry: any = {};
        if (w.bg) entry.bg = w.bg;
        if (w.fg) entry.fg = w.fg;
        if (w.fontScale) entry.fontScale = w.fontScale;
        if (w.imageUrl) entry.imageUrl = w.imageUrl;
        if (w.imageFit) entry.imageFit = w.imageFit;
        if (w.imageOpacity != null) entry.imageOpacity = w.imageOpacity;
        if (w.text) entry.text = w.text;
        if (w.textAlign) entry.textAlign = w.textAlign;
        if (w.fontWeight) entry.fontWeight = w.fontWeight;
        if (w.shape) entry.shape = w.shape;
        if (w.radius != null) entry.radius = w.radius;
        if (w.z != null) entry.z = w.z;
        if (Object.keys(entry).length > 0) acc[w.i] = entry;
        return acc;
      }, {}),
      globalBg,
      globalFg,
      bgImage,
      bgImageOpacity,
      bgImageFit,
    };
    navigator.clipboard.writeText(JSON.stringify(config, null, 2));
    alert("JSON של הלייאוט הועתק לקליפבורד");
  }

  const selectedWidget = items.find((w) => w.i === selectedId);
  const selectedMeta = selectedWidget ? WIDGET_META[selectedWidget.type] : null;

  return (
    <div className="h-screen flex flex-col bg-slate-50" dir="rtl">
      {/* Toolbar */}
      <div className="bg-white border-b shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Palette className="h-5 w-5 text-emerald-600" />
          עורך עיצוב — Demo
        </h1>
        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
          תצוגה — לא משפיע על מסכי המחלקה
        </span>

        <div className="flex items-center gap-2 mr-auto">
          <span className="text-sm text-muted-foreground">תבנית מוכנה:</span>
          <Select onValueChange={(v) => loadTemplate(v as keyof typeof TEMPLATES)}>
            <SelectTrigger className="w-44"><SelectValue placeholder="טען תבנית..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="classic">קלאסי</SelectItem>
              <SelectItem value="weekly_focus">דגש שבועי</SelectItem>
              <SelectItem value="pastel">פסטל צבעוני</SelectItem>
            </SelectContent>
          </Select>
          <Button variant={previewMode ? "default" : "outline"} size="sm" onClick={() => setPreviewMode(!previewMode)} className="gap-1">
            <Eye className="h-4 w-4" /> {previewMode ? "חזור לעריכה" : "תצוגה מקדימה"}
          </Button>
          <Button variant="outline" size="sm" onClick={exportJson} className="gap-1">
            <Save className="h-4 w-4" /> ייצוא JSON
          </Button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: widget palette */}
        {!previewMode && (
          <div className="w-56 bg-white border-l p-3 overflow-y-auto shrink-0">
            <h2 className="text-sm font-bold mb-2 text-slate-600">הוסף widget</h2>
            <div className="space-y-1">
              {Object.entries(WIDGET_META).map(([t, meta]) => {
                const Icon = meta.icon;
                return (
                  <button
                    key={t}
                    onClick={() => addWidget(t as WidgetType)}
                    className="flex items-center gap-2 w-full text-right rounded-lg border hover:bg-slate-50 p-2 text-sm"
                  >
                    <Icon className="h-4 w-4 text-emerald-600" />
                    <span className="flex-1 text-right">{meta.label}</span>
                    <Plus className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                );
              })}
            </div>

            <h2 className="text-sm font-bold mt-4 mb-2 text-slate-600">צבעי רקע גלובליים</h2>
            <div className="space-y-2">
              <div>
                <label className="text-xs">רקע מסך</label>
                <input type="color" value={globalBg} onChange={(e) => setGlobalBg(e.target.value)} className="w-full h-8 rounded border" />
              </div>
              <div>
                <label className="text-xs">צבע טקסט ברירת מחדל</label>
                <input type="color" value={globalFg} onChange={(e) => setGlobalFg(e.target.value)} className="w-full h-8 rounded border" />
              </div>
            </div>

            <h2 className="text-sm font-bold mt-4 mb-2 text-slate-600">תמונת רקע</h2>
            <div className="space-y-2">
              <label className="flex items-center justify-center gap-2 w-full text-xs border border-dashed rounded px-3 py-2 cursor-pointer hover:bg-slate-50">
                <Upload className="h-3 w-3" />
                {isUploadingBg ? "מעלה..." : "העלה תמונה מהמחשב"}
                <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} disabled={isUploadingBg} />
              </label>
              <div className="text-[10px] text-slate-400 text-center">או הדבק URL ↓</div>
              <Input
                value={bgImage}
                onChange={(e) => setBgImage(e.target.value)}
                placeholder="https://..."
                dir="ltr"
                className="text-xs"
              />
              {bgImage && (
                <>
                  <div>
                    <label className="text-xs">שקיפות: {Math.round(bgImageOpacity * 100)}%</label>
                    <input
                      type="range" min={0} max={1} step={0.05}
                      value={bgImageOpacity}
                      onChange={(e) => setBgImageOpacity(parseFloat(e.target.value))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-xs block mb-1">התאמה</label>
                    <Select value={bgImageFit} onValueChange={(v) => setBgImageFit(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cover">cover (מילוי כל המסך)</SelectItem>
                        <SelectItem value="contain">contain (כל התמונה)</SelectItem>
                        <SelectItem value="repeat">repeat (חזרה)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => setBgImage("")}>
                    הסר תמונת רקע
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Center: canvas */}
        <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: previewMode ? globalBg : undefined }}>
          <div
            className="mx-auto rounded-lg shadow-lg overflow-hidden relative"
            style={{
              maxWidth: 1200,
              backgroundColor: globalBg,
              color: globalFg,
              border: previewMode ? "none" : "2px dashed #CBD5E1",
              minHeight: 600,
            }}
          >
            {bgImage && (
              // eslint-disable-next-line @next/next/no-img-element
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
            <div className="relative z-10">
            <ResponsiveGridLayout
              className="layout"
              layouts={{ lg: layout }}
              breakpoints={{ lg: 1024, md: 768, sm: 0 }}
              cols={{ lg: 12, md: 12, sm: 12 }}
              rowHeight={52}
              isDraggable={!previewMode}
              isResizable={!previewMode}
              onLayoutChange={onLayoutChange}
              draggableCancel=".no-drag"
              compactType={null}
              preventCollision={true}
              allowOverlap={false}
              margin={[8, 8]}
              isBounded={false}
            >
              {layout.map((l) => {
                const w = items.find((x) => x.i === l.i)
                  || { i: l.i, type: l.type, bg: undefined, fg: undefined, fontScale: undefined };
                const color = {
                  bg: w.bg || "#FFFFFF",
                  fg: w.fg || globalFg,
                  scale: w.fontScale || 1,
                };
                const isSelected = selectedId === l.i;
                const zIndex = (w as Widget).z ?? 1;
                return (
                  <div
                    key={l.i}
                    onClick={() => !previewMode && setSelectedId(l.i)}
                    className={isSelected ? "ring-2 ring-emerald-500 rounded-xl" : ""}
                    style={{ zIndex }}
                  >
                    <WidgetRenderer w={w as Widget} color={color} />
                    {!previewMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeWidget(l.i); }}
                        className="no-drag absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        style={{ zIndex: zIndex + 100 }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </ResponsiveGridLayout>
            </div>
          </div>
        </div>

        {/* Right: properties */}
        {!previewMode && selectedWidget && selectedMeta && (
          <div className="w-72 bg-white border-r p-3 overflow-y-auto shrink-0">
            <h2 className="text-sm font-bold mb-2 text-slate-600 flex items-center gap-2">
              <selectedMeta.icon className="h-4 w-4 text-emerald-600" />
              {selectedMeta.label}
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1">סוג</label>
                <Select value={selectedWidget.type} onValueChange={(v) => updateWidget(selectedWidget.i, { type: v as WidgetType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(WIDGET_META).map(([t, m]) => (
                      <SelectItem key={t} value={t}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">צבע רקע</label>
                <div className="flex gap-2">
                  <input type="color" value={selectedWidget.bg || "#FFFFFF"}
                    onChange={(e) => updateWidget(selectedWidget.i, { bg: e.target.value })}
                    className="w-12 h-8 rounded border" />
                  <Input value={selectedWidget.bg || ""}
                    onChange={(e) => updateWidget(selectedWidget.i, { bg: e.target.value || undefined })}
                    placeholder="#FFFFFF" className="flex-1 text-xs" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">צבע טקסט</label>
                <div className="flex gap-2">
                  <input type="color" value={selectedWidget.fg || globalFg}
                    onChange={(e) => updateWidget(selectedWidget.i, { fg: e.target.value })}
                    className="w-12 h-8 rounded border" />
                  <Input value={selectedWidget.fg || ""}
                    onChange={(e) => updateWidget(selectedWidget.i, { fg: e.target.value || undefined })}
                    placeholder="#1E293B" className="flex-1 text-xs" />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1">
                  גודל גופן: ×{(selectedWidget.fontScale || 1).toFixed(2)}
                </label>
                <input type="range" min={0.7} max={2} step={0.1}
                  value={selectedWidget.fontScale || 1}
                  onChange={(e) => updateWidget(selectedWidget.i, { fontScale: parseFloat(e.target.value) })}
                  className="w-full" />
              </div>

              {selectedWidget.type === "logo" && (
                <>
                  <div className="pt-2 border-t space-y-2">
                    <label className="text-xs font-medium block">תמונת לוגו</label>
                    <label className="flex items-center justify-center gap-2 w-full text-xs border border-dashed rounded px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <Upload className="h-3 w-3" />
                      {isUploadingLogo ? "מעלה..." : "העלה לוגו מהמחשב"}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogoUpload(e, selectedWidget.i)} disabled={isUploadingLogo} />
                    </label>
                    <div className="text-[10px] text-slate-400 text-center">או הדבק URL ↓</div>
                    <Input
                      value={selectedWidget.imageUrl || ""}
                      onChange={(e) => updateWidget(selectedWidget.i, { imageUrl: e.target.value || undefined })}
                      placeholder="https://..."
                      dir="ltr"
                      className="text-xs"
                    />
                    {selectedWidget.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedWidget.imageUrl}
                        alt=""
                        className="mt-2 max-h-20 rounded border bg-slate-50 object-contain w-full"
                        onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">התאמה</label>
                    <Select value={selectedWidget.imageFit || "contain"} onValueChange={(v) => updateWidget(selectedWidget.i, { imageFit: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="contain">contain (כל הלוגו)</SelectItem>
                        <SelectItem value="cover">cover (מילוי הריבוע)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">
                      שקיפות: {Math.round((selectedWidget.imageOpacity ?? 1) * 100)}%
                    </label>
                    <input
                      type="range" min={0.1} max={1} step={0.05}
                      value={selectedWidget.imageOpacity ?? 1}
                      onChange={(e) => updateWidget(selectedWidget.i, { imageOpacity: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                </>
              )}

              {selectedWidget.type === "text" && (
                <>
                  <div className="pt-2 border-t">
                    <label className="text-xs font-medium block mb-1">תוכן הטקסט</label>
                    <Input
                      value={selectedWidget.text || ""}
                      onChange={(e) => updateWidget(selectedWidget.i, { text: e.target.value })}
                      placeholder="הקלד טקסט..."
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">יישור</label>
                    <Select value={selectedWidget.textAlign || "right"} onValueChange={(v) => updateWidget(selectedWidget.i, { textAlign: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="right">לימין</SelectItem>
                        <SelectItem value="center">למרכז</SelectItem>
                        <SelectItem value="left">לשמאל</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1">משקל</label>
                    <Select value={selectedWidget.fontWeight || "normal"} onValueChange={(v) => updateWidget(selectedWidget.i, { fontWeight: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">רגיל</SelectItem>
                        <SelectItem value="bold">מודגש</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {selectedWidget.type === "shape" && (
                <div className="pt-2 border-t">
                  <label className="text-xs font-medium block mb-1">סוג צורה</label>
                  <Select value={selectedWidget.shape || "rect"} onValueChange={(v) => updateWidget(selectedWidget.i, { shape: v as any })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rect">מלבן</SelectItem>
                      <SelectItem value="circle">עיגול</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedWidget.shape !== "circle" && (
                    <div className="mt-2">
                      <label className="text-xs font-medium block mb-1">
                        עיגול פינות: {selectedWidget.radius ?? 12}px
                      </label>
                      <input type="range" min={0} max={80} step={1}
                        value={selectedWidget.radius ?? 12}
                        onChange={(e) => updateWidget(selectedWidget.i, { radius: parseInt(e.target.value) })}
                        className="w-full" />
                    </div>
                  )}
                </div>
              )}

              {/* Layer controls */}
              <div className="pt-2 border-t">
                <label className="text-xs font-medium block mb-1">שכבה: {selectedWidget.z ?? 1}</label>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" className="flex-1 gap-1"
                    onClick={() => updateWidget(selectedWidget.i, { z: (selectedWidget.z ?? 1) + 1 })}>
                    <ArrowUp className="h-3 w-3" /> קדימה
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-1"
                    onClick={() => updateWidget(selectedWidget.i, { z: Math.max(0, (selectedWidget.z ?? 1) - 1) })}>
                    <ArrowDown className="h-3 w-3" /> אחורה
                  </Button>
                </div>
              </div>

              <div className="text-xs text-slate-400 pt-2 border-t">
                גרור פינה ימנית-תחתונה לשינוי גודל. גרור את המרכז להזזה.
              </div>

              <Button variant="destructive" size="sm" className="w-full gap-1" onClick={() => removeWidget(selectedWidget.i)}>
                <Trash2 className="h-3 w-3" /> מחק widget
              </Button>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .react-grid-item.react-grid-placeholder {
          background: #10b981 !important;
          opacity: 0.3 !important;
          border-radius: 0.75rem;
        }
        .react-grid-item > .react-resizable-handle {
          background-image: none !important;
        }
        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid #10b981;
          border-bottom: 2px solid #10b981;
        }
      `}</style>
    </div>
  );
}

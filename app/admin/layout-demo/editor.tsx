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
  Layers, ChevronUp, ChevronDown, Undo2, Redo2,
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
  fontFamily?: string;
  fontSize?: number;        // direct px override
  fontWeight?: string;      // normal | bold | 300 | 500 | 700 | 900
  italic?: boolean;
  letterSpacing?: number;   // px
  lineHeight?: number;      // unitless multiplier
  bgTransparent?: boolean;  // skip background entirely
  borderColor?: string;
  borderWidth?: number;
  shadow?: boolean;
  imageUrl?: string;
  imageFit?: "contain" | "cover";
  imageOpacity?: number;
  text?: string;
  textAlign?: "right" | "center" | "left";
  shape?: "rect" | "circle";
  radius?: number;
};

const FONT_FAMILIES = [
  { value: "system", label: "ברירת מחדל" },
  { value: "'Heebo', sans-serif", label: "Heebo (מודרני)" },
  { value: "'Rubik', sans-serif", label: "Rubik (מעוגל)" },
  { value: "'Assistant', sans-serif", label: "Assistant (נקי)" },
  { value: "'Varela Round', sans-serif", label: "Varela Round" },
  { value: "'Secular One', sans-serif", label: "Secular One (גדול)" },
  { value: "'Suez One', serif", label: "Suez One (display)" },
  { value: "'Frank Ruhl Libre', serif", label: "Frank Ruhl Libre (קלאסי)" },
  { value: "'Alef', sans-serif", label: "Alef" },
  { value: "'Miriam Libre', serif", label: "Miriam" },
];

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

const TEMPLATES: Record<string, { widgets: Widget[]; bg?: string; fg?: string; gradientEnabled?: boolean; gradientColor2?: string; gradientAngle?: number }> = {
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
  sunrise: {
    bg: "#FEF3C7", fg: "#7C2D12",
    gradientEnabled: true, gradientColor2: "#FB923C", gradientAngle: 135,
    widgets: [
      { i: "w1", type: "shape",         x: 100,  y: 60,   w: 1720, h: 120, bg: "#FFFFFF", radius: 60, z: 1 },
      { i: "w2", type: "header",        x: 130,  y: 75,   w: 1660, h: 90,  bg: "transparent", fg: "#7C2D12", z: 2 },
      { i: "w3", type: "current",       x: 100,  y: 220,  w: 1100, h: 460, bg: "#FFFFFF", fg: "#7C2D12", z: 1 },
      { i: "w4", type: "topic",         x: 1230, y: 220,  w: 590,  h: 130, bg: "#7C2D12", fg: "#FFFFFF", z: 1 },
      { i: "w5", type: "next",          x: 1230, y: 370,  w: 590,  h: 220, bg: "#FFFFFF", fg: "#7C2D12", z: 1 },
      { i: "w6", type: "weather",       x: 1230, y: 610,  w: 290,  h: 70,  bg: "#FFFFFF", fg: "#7C2D12", z: 1 },
      { i: "w7", type: "clock",         x: 1530, y: 610,  w: 290,  h: 70,  bg: "#FFFFFF", fg: "#7C2D12", z: 1 },
      { i: "w8", type: "shape",         x: 0,    y: 720,  w: 1920, h: 80,  bg: "#7C2D12", radius: 0, z: 1 },
      { i: "w9", type: "ticker",        x: 60,   y: 720,  w: 1800, h: 80,  bg: "transparent", fg: "#FFFFFF", z: 2 },
    ],
  },
  ocean: {
    bg: "#0EA5E9", fg: "#FFFFFF",
    gradientEnabled: true, gradientColor2: "#1E3A8A", gradientAngle: 180,
    widgets: [
      { i: "w1", type: "header",        x: 60,   y: 40,   w: 1800, h: 140, bg: "rgba(255,255,255,0.15)", fg: "#FFFFFF" },
      { i: "w2", type: "current",       x: 60,   y: 200,  w: 1180, h: 480, bg: "rgba(255,255,255,0.95)", fg: "#0F172A" },
      { i: "w3", type: "next",          x: 1260, y: 200,  w: 600,  h: 220, bg: "rgba(255,255,255,0.95)", fg: "#0F172A" },
      { i: "w4", type: "announcements", x: 1260, y: 440,  w: 600,  h: 240, bg: "rgba(255,255,255,0.15)", fg: "#FFFFFF" },
      { i: "w5", type: "ticker",        x: 60,   y: 700,  w: 1800, h: 80,  bg: "#1E3A8A", fg: "#FFFFFF" },
    ],
  },
};

type LiveData = {
  greeting: string;
  deptName: string;
  date: string;
  time: string;
  todayIdx?: number;
  currentActivity: { title: string; time: string; instructor?: string } | null;
  nextActivities: { title: string; time: string }[];
  topic: string;
  ticker: string;
  announcements: string;
  weeklyDays: string[];
  weeklyActivitiesByIdx?: { title: string; time: string }[][];
};

const SAMPLE_DATA: LiveData = {
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
  announcements: "בית הכנסת פתוח היום 17:00 · פעילות מוזיקלית בלובי 16:00",
  weeklyDays: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
};

function WidgetRenderer({ w, color, data }: { w: Widget; color: { bg: string; fg: string; scale: number }; data: LiveData }) {
  const transparent = w.bgTransparent === true || color.bg === "transparent";
  const baseClass = "w-full h-full flex flex-col p-3 overflow-hidden";
  const cls = `${baseClass} rounded-xl ${transparent ? "" : "shadow-sm border"}`;

  // Helper: compute font-size for sub-elements proportionally to the widget's font-size.
  // If the user set a px fontSize, sub-elements scale relative to it; otherwise use the rem scale.
  const fs = (ratio: number): string =>
    w.fontSize != null ? `${w.fontSize * ratio}px` : `${color.scale * ratio}rem`;
  const fontStyles = {
    fontFamily: w.fontFamily && w.fontFamily !== "system" ? w.fontFamily : undefined,
    fontWeight: (w.fontWeight as any) || undefined,
    fontStyle: w.italic ? "italic" : undefined,
    letterSpacing: w.letterSpacing != null ? `${w.letterSpacing}px` : undefined,
    lineHeight: w.lineHeight,
  };
  const style: React.CSSProperties = {
    backgroundColor: transparent ? "transparent" : color.bg,
    color: color.fg,
    fontSize: w.fontSize != null ? `${w.fontSize}px` : `${color.scale}rem`,
    border: transparent ? "none" : (w.borderWidth ? `${w.borderWidth}px solid ${w.borderColor || color.fg}` : undefined),
    borderRadius: w.radius != null ? `${w.radius}px` : undefined,
    boxShadow: w.shadow ? "0 8px 32px rgba(0,0,0,0.18)" : (transparent ? "none" : undefined),
    ...fontStyles,
  };
  const Icon = WIDGET_META[w.type].icon;

  switch (w.type) {
    case "header":
      return (
        <div className={cls} style={style}>
          <div className="flex justify-between items-center w-full h-full">
            <div>
              <div className="font-bold" style={{ fontSize: fs(1.7) }}>{data.greeting}</div>
              <div className="opacity-70" style={{ fontSize: fs(0.9) }}>{data.deptName}</div>
            </div>
            <div className="text-left">
              <div className="font-bold" style={{ fontSize: fs(1.7) }}>{data.time}</div>
              <div className="opacity-70" style={{ fontSize: fs(0.85) }}>{data.date}</div>
            </div>
          </div>
        </div>
      );
    case "current":
      return (
        <div className={cls} style={style}>
          <div className="font-semibold opacity-70 mb-1 flex items-center gap-1" style={{ fontSize: fs(0.55) }}>
            <Sparkles className="h-3 w-3" /> עכשיו
          </div>
          {data.currentActivity ? (
            <>
              <div className="font-bold" style={{ fontSize: fs(2) }}>{data.currentActivity.title}</div>
              <div className="opacity-70 mt-1" style={{ fontSize: fs(0.9) }}>{data.currentActivity.time}</div>
              {data.currentActivity.instructor && (
                <div className="opacity-70" style={{ fontSize: fs(0.9) }}>מנחה: {data.currentActivity.instructor}</div>
              )}
            </>
          ) : (
            <div className="opacity-50" style={{ fontSize: fs(0.9) }}>אין פעילות כעת</div>
          )}
        </div>
      );
    case "next":
      return (
        <div className={cls} style={style}>
          <div className="font-semibold opacity-70 mb-1 flex items-center gap-1" style={{ fontSize: fs(0.55) }}>
            <Calendar className="h-3 w-3" /> בהמשך
          </div>
          <div className="space-y-1.5" style={{ fontSize: fs(0.95) }}>
            {data.nextActivities.length === 0 ? (
              <div className="opacity-50">אין פעילויות נוספות</div>
            ) : data.nextActivities.map((a, i) => (
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
          <div className="font-semibold opacity-70 mb-2 flex items-center gap-1" style={{ fontSize: fs(0.55) }}>
            <Calendar className="h-3 w-3" /> לוח שבועי
          </div>
          <div className="grid grid-cols-7 gap-1 flex-1 overflow-hidden" style={{ fontSize: fs(0.55) }}>
            {data.weeklyDays.map((d, i) => {
              const today = data.todayIdx ?? new Date().getDay();
              const acts = data.weeklyActivitiesByIdx?.[i] || [];
              return (
                <div key={d} className={`rounded p-1.5 flex flex-col gap-1 overflow-hidden ${i === today ? "bg-current/20 font-bold" : "bg-current/5"}`}>
                  <div className="text-center pb-1 border-b border-current/10">{d}</div>
                  <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
                    {acts.slice(0, 8).map((act, j) => (
                      <div key={j} className="opacity-80 truncate" style={{ fontSize: fs(0.42), lineHeight: 1.2 }}>
                        <span className="opacity-60 me-1">{act.time}</span>
                        {act.title}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    case "ticker":
      return (
        <div className={cls} style={style}>
          <div className="flex items-center gap-2 h-full">
            <Bell className="h-4 w-4 shrink-0" />
            <div className="truncate" style={{ fontSize: fs(1) }}>{data.ticker || "—"}</div>
          </div>
        </div>
      );
    case "announcements":
      return (
        <div className={cls} style={style}>
          <div className="font-semibold opacity-70 mb-1 flex items-center gap-1" style={{ fontSize: fs(0.55) }}>
            <Bell className="h-3 w-3" /> הודעות
          </div>
          <div style={{ fontSize: fs(0.9) }}>{data.announcements || "אין הודעות חדשות"}</div>
        </div>
      );
    case "topic":
      return (
        <div className={cls} style={style}>
          <div className="font-semibold opacity-70 mb-1 flex items-center gap-1" style={{ fontSize: fs(0.55) }}>
            <BookOpen className="h-3 w-3" /> נושא השבוע
          </div>
          <div className="font-bold" style={{ fontSize: fs(1.4) }}>{data.topic || "—"}</div>
        </div>
      );
    case "clock":
      return (
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center" }}>
          <Clock className="h-5 w-5 opacity-50" />
          <div className="font-bold" style={{ fontSize: fs(2.4) }}>{data.time}</div>
        </div>
      );
    case "weather":
      return (
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center" }}>
          <CloudSun className="h-7 w-7" />
          <div className="font-bold mt-1" style={{ fontSize: fs(1.6) }}>22°</div>
          <div className="opacity-70" style={{ fontSize: fs(0.6) }}>נעים</div>
        </div>
      );
    case "media":
      return (
        <div className={cls} style={{ ...style, justifyContent: "center", alignItems: "center" }}>
          <ImageIcon className="h-10 w-10 opacity-30" />
          <div className="opacity-50 mt-2" style={{ fontSize: fs(0.6) }}>איזור תמונות / PDF</div>
        </div>
      );
    case "text": {
      const align = w.textAlign || "right";
      return (
        <div
          className="w-full h-full flex items-center p-2 overflow-hidden"
          style={{
            backgroundColor: transparent ? "transparent" : color.bg,
            color: color.fg,
            borderRadius: w.radius != null ? `${w.radius}px` : 12,
            justifyContent: align === "center" ? "center" : align === "left" ? "flex-start" : "flex-end",
            textAlign: align,
            fontFamily: w.fontFamily && w.fontFamily !== "system" ? w.fontFamily : undefined,
            fontWeight: (w.fontWeight as any) || "normal",
            fontStyle: w.italic ? "italic" : undefined,
            fontSize: w.fontSize != null ? `${w.fontSize}px` : `${color.scale * 1.4}rem`, // text widget — direct fontSize
            letterSpacing: w.letterSpacing != null ? `${w.letterSpacing}px` : undefined,
            lineHeight: w.lineHeight,
            border: w.borderWidth ? `${w.borderWidth}px solid ${w.borderColor || color.fg}` : undefined,
            boxShadow: w.shadow ? "0 4px 16px rgba(0,0,0,0.18)" : undefined,
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
            backgroundColor: transparent ? "transparent" : color.bg,
            borderRadius: isCircle ? "50%" : (w.radius != null ? `${w.radius}px` : 12),
            border: w.borderWidth ? `${w.borderWidth}px solid ${w.borderColor || color.fg}` : undefined,
            boxShadow: w.shadow ? "0 8px 32px rgba(0,0,0,0.18)" : undefined,
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
  const [gradientEnabled, setGradientEnabled] = useState(false);
  const [gradientColor2, setGradientColor2] = useState("#10B981");
  const [gradientAngle, setGradientAngle] = useState(135);
  const [bgImage, setBgImage] = useState("");
  const [bgImageOpacity, setBgImageOpacity] = useState(0.3);
  const [bgImageFit, setBgImageFit] = useState<"cover" | "contain" | "repeat">("cover");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [zoom, setZoom] = useState(0.5);
  const [showLayers, setShowLayers] = useState(false);

  // live data preview
  const [departments, setDepartments] = useState<{ id: string; name: string; code: string }[]>([]);
  const [previewDeptId, setPreviewDeptId] = useState<string>("sample");
  const [liveData, setLiveData] = useState<LiveData>(SAMPLE_DATA);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("departments").select("id, name, code").order("name").then(({ data }) => {
      if (data) setDepartments(data as any);
    });
    // pre-select department from ?dept= URL param
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const deptParam = params.get("dept");
      if (deptParam) setPreviewDeptId(deptParam);
    }
  }, []);

  useEffect(() => {
    if (previewDeptId === "sample") {
      setLiveData(SAMPLE_DATA);
      return;
    }
    fetchLiveData(previewDeptId);
    fetchSavedLayout(previewDeptId);
  }, [previewDeptId]);

  // tick the clock + recompute greeting every 15s while previewing live data
  useEffect(() => {
    if (previewDeptId === "sample") return;
    const tickClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const dayNamesHe = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];
      const dd = String(now.getDate()).padStart(2, "0");
      const mo = String(now.getMonth() + 1).padStart(2, "0");
      const yy = String(now.getFullYear()).slice(2);
      const greeting = now.getHours() < 5 ? "לילה טוב"
        : now.getHours() < 12 ? "בוקר טוב"
        : now.getHours() < 17 ? "צהריים טובים"
        : now.getHours() < 21 ? "ערב טוב" : "לילה טוב";
      setLiveData((prev) => ({
        ...prev,
        time: `${hh}:${mm}`,
        date: `יום ${dayNamesHe[now.getDay()]} | ${dd}.${mo}.${yy}`,
        greeting,
        todayIdx: now.getDay(),
      }));
    };
    const id = setInterval(tickClock, 15_000);
    return () => clearInterval(id);
  }, [previewDeptId]);

  const [savedAtDept, setSavedAtDept] = useState<string | null>(null);

  async function fetchSavedLayout(deptId: string) {
    const supabase = createClient();
    const { data } = await supabase
      .from("screen_settings")
      .select("display_settings")
      .eq("department_id", deptId)
      .single();
    const cfg = (data?.display_settings as any)?.layout_config;
    if (cfg) setSavedAtDept(JSON.stringify(cfg).slice(0, 32));
    else setSavedAtDept(null);
  }

  async function saveToDepartment() {
    if (previewDeptId === "sample") {
      alert("בחר מחלקה לתצוגה מקדימה לפני שמירה");
      return;
    }
    const supabase = createClient();
    const { data: existing } = await supabase
      .from("screen_settings")
      .select("id, display_settings")
      .eq("department_id", previewDeptId)
      .single();

    const nextDisplaySettings = {
      ...(existing?.display_settings || {}),
      layout_config: getCurrentConfig(),
    };

    if (existing) {
      await supabase
        .from("screen_settings")
        .update({ display_settings: nextDisplaySettings })
        .eq("id", existing.id);
    } else {
      await supabase
        .from("screen_settings")
        .insert({ department_id: previewDeptId, display_settings: nextDisplaySettings });
    }
    const dept = departments.find((d) => d.id === previewDeptId);
    alert(`נשמר עיצוב למחלקה: ${dept?.name || ""}`);
    fetchSavedLayout(previewDeptId);
  }

  async function loadFromDepartment() {
    if (previewDeptId === "sample") return;
    const supabase = createClient();
    const { data } = await supabase
      .from("screen_settings")
      .select("display_settings")
      .eq("department_id", previewDeptId)
      .single();
    const cfg = (data?.display_settings as any)?.layout_config;
    if (!cfg) {
      alert("אין עיצוב שמור למחלקה זו");
      return;
    }
    applyConfig(cfg);
  }

  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [duplicateTargets, setDuplicateTargets] = useState<Set<string>>(new Set());

  async function duplicateToOthers() {
    if (duplicateTargets.size === 0) {
      alert("בחר לפחות מחלקה אחת");
      return;
    }
    const supabase = createClient();
    const config = getCurrentConfig();
    let success = 0;
    let failed = 0;
    for (const deptId of duplicateTargets) {
      const { data: existing } = await supabase
        .from("screen_settings")
        .select("id, display_settings")
        .eq("department_id", deptId)
        .single();
      const nextDisplaySettings = {
        ...(existing?.display_settings || {}),
        layout_config: config,
      };
      const res = existing
        ? await supabase.from("screen_settings").update({ display_settings: nextDisplaySettings }).eq("id", existing.id)
        : await supabase.from("screen_settings").insert({ department_id: deptId, display_settings: nextDisplaySettings });
      if (res.error) failed++; else success++;
    }
    alert(`שוכפל ל-${success} מחלקות${failed ? ` (נכשלו ${failed})` : ""}`);
    setShowDuplicateDialog(false);
    setDuplicateTargets(new Set());
  }

  async function fetchLiveData(deptId: string) {
    const supabase = createClient();
    const dept = departments.find((d) => d.id === deptId);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const dayOfWeekHe = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"][now.getDay()];
    const greeting = now.getHours() < 12 ? "בוקר טוב" : now.getHours() < 18 ? "צהריים טובים" : "ערב טוב";

    const [allActs, anns, tickers, topic] = await Promise.all([
      supabase.from("activities")
        .select("title, start_time, end_time, instructor_name, day_of_week")
        .eq("department_id", deptId).eq("is_active", true).order("start_time"),
      supabase.from("announcements").select("content, title").eq("department_id", deptId).eq("is_active", true).order("created_at", { ascending: false }).limit(3),
      supabase.from("ticker_messages").select("message").or(`department_id.eq.${deptId},is_global.eq.true`).eq("is_active", true).order("display_order"),
      supabase.from("weekly_topics").select("title").eq("department_id", deptId).eq("is_active", true).order("week_start", { ascending: false }).limit(1),
    ]);

    const dayCodes = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
    const weeklyByIdx: { title: string; time: string }[][] = dayCodes.map((code) =>
      (allActs.data || [])
        .filter((a: any) => a.day_of_week === code)
        .map((a: any) => ({ title: a.title, time: (a.start_time || "").slice(0, 5) }))
    );

    const todayActs = (allActs.data || [])
      .filter((a: any) => a.day_of_week === dayOfWeekHe)
      .map((a: any) => ({
        title: a.title,
        time: `${(a.start_time || "").slice(0, 5)}${a.end_time ? " - " + a.end_time.slice(0, 5) : ""}`,
        startMin: parseInt((a.start_time || "00:00").slice(0, 2)) * 60 + parseInt((a.start_time || "00:00").slice(3, 5)),
        endMin: parseInt((a.end_time || "23:59").slice(0, 2)) * 60 + parseInt((a.end_time || "23:59").slice(3, 5)),
        instructor: a.instructor_name,
      }));
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const current = todayActs.find((a) => nowMin >= a.startMin && nowMin <= a.endMin);
    const next = todayActs.filter((a) => a.startMin > nowMin).slice(0, 3);

    setLiveData({
      greeting,
      deptName: dept?.name || "",
      date: `יום ${dayOfWeekHe} | ${now.toLocaleDateString("he-IL")}`,
      time: `${hh}:${mm}`,
      todayIdx: now.getDay(),
      currentActivity: current ? { title: current.title, time: current.time, instructor: current.instructor } : null,
      nextActivities: next.map((a) => ({ title: a.title, time: a.time.split(" - ")[0] })),
      topic: (topic.data?.[0] as any)?.title || "",
      ticker: (tickers.data || []).map((t: any) => t.message).join(" · "),
      announcements: (anns.data || []).map((a: any) => a.content || a.title).join(" · "),
      weeklyDays: ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"],
      weeklyActivitiesByIdx: weeklyByIdx,
    });
  }

  // undo/redo
  const historyRef = useRef<Widget[][]>([]);
  const redoRef = useRef<Widget[][]>([]);
  const [, force] = useState(0);

  // snap guides
  const [snapLines, setSnapLines] = useState<{ vertical: number[]; horizontal: number[] }>({ vertical: [], horizontal: [] });

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTemplate("modern_dark");
  }, []);

  function pushHistory(prev: Widget[]) {
    historyRef.current.push(prev.map((w) => ({ ...w })));
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
    force((n) => n + 1);
  }

  function commitItems(updater: (prev: Widget[]) => Widget[]) {
    setItems((prev) => {
      pushHistory(prev);
      return updater(prev);
    });
  }

  function undo() {
    const prev = historyRef.current.pop();
    if (!prev) return;
    setItems((cur) => {
      redoRef.current.push(cur.map((w) => ({ ...w })));
      return prev;
    });
    force((n) => n + 1);
  }

  function redo() {
    const next = redoRef.current.pop();
    if (!next) return;
    setItems((cur) => {
      historyRef.current.push(cur.map((w) => ({ ...w })));
      return next;
    });
    force((n) => n + 1);
  }

  function loadTemplate(name: keyof typeof TEMPLATES) {
    const t = TEMPLATES[name];
    setItems((prev) => {
      historyRef.current.push(prev.map((w) => ({ ...w })));
      return t.widgets.map((w) => ({ ...w }));
    });
    if (t.bg) setGlobalBg(t.bg);
    if (t.fg) setGlobalFg(t.fg);
    setGradientEnabled(!!t.gradientEnabled);
    if (t.gradientColor2) setGradientColor2(t.gradientColor2);
    if (typeof t.gradientAngle === "number") setGradientAngle(t.gradientAngle);
    setSelectedId(null);
  }

  function nextZ() {
    return items.reduce((m, w) => Math.max(m, w.z ?? 0), 0) + 1;
  }

  function addWidget(type: WidgetType) {
    const id = "w" + Date.now() + Math.random().toString(36).slice(2, 5);
    const meta = WIDGET_META[type];
    commitItems((prev) => [
      ...prev,
      {
        i: id,
        type,
        x: 100,
        y: 100,
        w: meta.defaultW,
        h: meta.defaultH,
        z: prev.reduce((m, w) => Math.max(m, w.z ?? 0), 0) + 1,
      },
    ]);
    setSelectedId(id);
  }

  function removeWidget(id: string) {
    commitItems((prev) => prev.filter((w) => w.i !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateWidget(id: string) {
    const w = items.find((x) => x.i === id);
    if (!w) return;
    const newId = "w" + Date.now() + Math.random().toString(36).slice(2, 5);
    commitItems((prev) => [
      ...prev,
      {
        ...w,
        i: newId,
        x: w.x + 30,
        y: w.y + 30,
        z: prev.reduce((m, x) => Math.max(m, x.z ?? 0), 0) + 1,
      },
    ]);
    setSelectedId(newId);
  }

  function updateWidget(id: string, patch: Partial<Widget>) {
    commitItems((prev) => prev.map((w) => (w.i === id ? { ...w, ...patch } : w)));
  }

  function bringForward(id: string) {
    updateWidget(id, { z: nextZ() });
  }
  function sendBackward(id: string) {
    const cur = items.find((w) => w.i === id);
    if (!cur) return;
    updateWidget(id, { z: Math.max(0, (cur.z ?? 1) - 1) });
  }

  // snap-to-alignment during drag
  const SNAP_THRESHOLD = 8; // pixels in canvas coordinates
  function computeSnap(currentId: string, x: number, y: number, w: number, h: number): { x: number; y: number; vert: number[]; horiz: number[] } {
    const others = items.filter((it) => it.i !== currentId);
    const verticalLines: number[] = [];
    const horizontalLines: number[] = [];

    // canvas edges + center
    const canvasVerts = [0, CANVAS_W / 2, CANVAS_W];
    const canvasHorizs = [0, CANVAS_H / 2, CANVAS_H];

    const myCenterX = x + w / 2;
    const myCenterY = y + h / 2;
    const myRight = x + w;
    const myBottom = y + h;

    let snappedX = x;
    let snappedY = y;
    let bestVDelta = SNAP_THRESHOLD + 1;
    let bestHDelta = SNAP_THRESHOLD + 1;

    function tryVerticalSnap(otherX: number) {
      // align my left
      let d = Math.abs(otherX - x);
      if (d <= SNAP_THRESHOLD && d < bestVDelta) { snappedX = otherX; bestVDelta = d; verticalLines.push(otherX); }
      // align my right
      d = Math.abs(otherX - myRight);
      if (d <= SNAP_THRESHOLD && d < bestVDelta) { snappedX = otherX - w; bestVDelta = d; verticalLines.push(otherX); }
      // align my center
      d = Math.abs(otherX - myCenterX);
      if (d <= SNAP_THRESHOLD && d < bestVDelta) { snappedX = otherX - w / 2; bestVDelta = d; verticalLines.push(otherX); }
    }
    function tryHorizontalSnap(otherY: number) {
      let d = Math.abs(otherY - y);
      if (d <= SNAP_THRESHOLD && d < bestHDelta) { snappedY = otherY; bestHDelta = d; horizontalLines.push(otherY); }
      d = Math.abs(otherY - myBottom);
      if (d <= SNAP_THRESHOLD && d < bestHDelta) { snappedY = otherY - h; bestHDelta = d; horizontalLines.push(otherY); }
      d = Math.abs(otherY - myCenterY);
      if (d <= SNAP_THRESHOLD && d < bestHDelta) { snappedY = otherY - h / 2; bestHDelta = d; horizontalLines.push(otherY); }
    }

    canvasVerts.forEach(tryVerticalSnap);
    canvasHorizs.forEach(tryHorizontalSnap);

    others.forEach((o) => {
      tryVerticalSnap(o.x);
      tryVerticalSnap(o.x + o.w);
      tryVerticalSnap(o.x + o.w / 2);
      tryHorizontalSnap(o.y);
      tryHorizontalSnap(o.y + o.h);
      tryHorizontalSnap(o.y + o.h / 2);
    });

    return { x: snappedX, y: snappedY, vert: verticalLines, horiz: horizontalLines };
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

  function getCurrentConfig() {
    return {
      widgets: items, globalBg, globalFg, bgImage, bgImageOpacity, bgImageFit,
      gradientEnabled, gradientColor2, gradientAngle,
    };
  }

  function applyConfig(config: any) {
    if (!config) return;
    if (Array.isArray(config.widgets)) {
      pushHistory(items);
      setItems(config.widgets);
    }
    if (config.globalBg) setGlobalBg(config.globalBg);
    if (config.globalFg) setGlobalFg(config.globalFg);
    if (typeof config.bgImage === "string") setBgImage(config.bgImage);
    if (typeof config.bgImageOpacity === "number") setBgImageOpacity(config.bgImageOpacity);
    if (config.bgImageFit) setBgImageFit(config.bgImageFit);
    setGradientEnabled(!!config.gradientEnabled);
    if (config.gradientColor2) setGradientColor2(config.gradientColor2);
    if (typeof config.gradientAngle === "number") setGradientAngle(config.gradientAngle);
    setSelectedId(null);
  }

  function exportJson() {
    navigator.clipboard.writeText(JSON.stringify(getCurrentConfig(), null, 2));
    alert("JSON של הלייאוט הועתק לקליפבורד");
  }

  // local saved designs
  const STORAGE_KEY = "layout-demo-designs-v1";
  function getSavedDesigns(): Record<string, any> {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  }
  function saveDesign() {
    const name = window.prompt("שם לעיצוב הזה:");
    if (!name) return;
    const all = getSavedDesigns();
    all[name] = { ...getCurrentConfig(), savedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setSavedListVersion((n) => n + 1);
    alert(`נשמר: "${name}"`);
  }
  function loadDesign(name: string) {
    const all = getSavedDesigns();
    if (!all[name]) return;
    applyConfig(all[name]);
  }
  function deleteDesign(name: string) {
    const all = getSavedDesigns();
    delete all[name];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setSavedListVersion((n) => n + 1);
  }
  const [savedListVersion, setSavedListVersion] = useState(0);
  const savedDesigns = typeof window !== "undefined" ? getSavedDesigns() : {};
  const savedNames = Object.keys(savedDesigns);
  void savedListVersion; // ensure rerender on save/delete

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      // undo/redo (no selection needed)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
        return;
      }

      if (!selectedId) return;

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
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;900&family=Rubik:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400;1,700&family=Assistant:wght@300;400;600;700&family=Varela+Round&family=Secular+One&family=Suez+One&family=Frank+Ruhl+Libre:wght@300;400;700;900&family=Alef:wght@400;700&family=Miriam+Libre:wght@400;700&display=swap');
      `}</style>
      {/* Top bar */}
      <div className="bg-[#2a2a2a] border-b border-black/40 px-4 py-2 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5 text-emerald-400" />
          <h1 className="text-lg font-bold">עורך עיצוב</h1>
          <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">Demo</span>
        </div>

        <div className="h-6 w-px bg-white/10" />

        <Select value={previewDeptId} onValueChange={setPreviewDeptId}>
          <SelectTrigger className="w-44 bg-[#1f1f1f] border-white/10 text-white">
            <SelectValue placeholder="תצוגה מקדימה..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sample">📋 נתוני דמה</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>🏥 {d.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select onValueChange={(v) => loadTemplate(v as keyof typeof TEMPLATES)}>
          <SelectTrigger className="w-44 bg-[#1f1f1f] border-white/10 text-white">
            <SelectValue placeholder="טען תבנית..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="classic">קלאסי</SelectItem>
            <SelectItem value="weekly_focus">דגש שבועי</SelectItem>
            <SelectItem value="pastel">פסטל</SelectItem>
            <SelectItem value="modern_dark">מודרני כהה</SelectItem>
            <SelectItem value="sunrise">זריחה ☀️</SelectItem>
            <SelectItem value="ocean">אוקיינוס 🌊</SelectItem>
          </SelectContent>
        </Select>

        <div className="h-6 w-px bg-white/10" />

        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 disabled:opacity-30"
          onClick={undo} disabled={historyRef.current.length === 0} title="Ctrl+Z">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 disabled:opacity-30"
          onClick={redo} disabled={redoRef.current.length === 0} title="Ctrl+Shift+Z">
          <Redo2 className="h-4 w-4" />
        </Button>

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
          {savedNames.length > 0 && (
            <Select onValueChange={(v) => {
              if (v.startsWith("__del__:")) deleteDesign(v.replace("__del__:", ""));
              else loadDesign(v);
            }}>
              <SelectTrigger className="w-40 bg-[#1f1f1f] border-white/10 text-white">
                <SelectValue placeholder="העיצובים שלי..." />
              </SelectTrigger>
              <SelectContent>
                {savedNames.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
                <div className="border-t my-1" />
                {savedNames.map((n) => (
                  <SelectItem key={"d-" + n} value={"__del__:" + n} className="text-red-500">
                    🗑 מחק: {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" onClick={saveDesign} variant="outline" className="bg-transparent border-white/20 text-white hover:bg-white/10 gap-1">
            <Save className="h-4 w-4" /> שמור מקומי
          </Button>
          {previewDeptId !== "sample" && (
            <>
              <Button size="sm" onClick={loadFromDepartment} variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 gap-1"
                disabled={!savedAtDept}
                title={savedAtDept ? "טען עיצוב שמור למחלקה" : "אין עיצוב שמור למחלקה זו"}>
                טען ממחלקה
              </Button>
              <Button size="sm" onClick={saveToDepartment} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                <Save className="h-4 w-4" /> שמור למחלקה
              </Button>
              <Button size="sm" onClick={() => setShowDuplicateDialog(true)} variant="outline"
                className="bg-transparent border-white/20 text-white hover:bg-white/10 gap-1">
                <CopyIcon className="h-4 w-4" /> שכפל ל...
              </Button>
            </>
          )}
          <Button size="sm" onClick={exportJson} variant="ghost" className="text-slate-400 hover:bg-white/5 gap-1 text-xs">
            JSON
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

              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={gradientEnabled} onChange={(e) => setGradientEnabled(e.target.checked)} />
                <span>גרדיאנט</span>
              </label>
              {gradientEnabled && (
                <>
                  <div>
                    <label className="text-xs">צבע שני</label>
                    <input type="color" value={gradientColor2} onChange={(e) => setGradientColor2(e.target.value)} className="w-full h-8 rounded border border-white/10 bg-transparent" />
                  </div>
                  <div>
                    <label className="text-xs">זווית: {gradientAngle}°</label>
                    <input type="range" min={0} max={360} step={5}
                      value={gradientAngle} onChange={(e) => setGradientAngle(parseInt(e.target.value))}
                      className="w-full" />
                  </div>
                </>
              )}

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
              background: gradientEnabled
                ? `linear-gradient(${gradientAngle}deg, ${globalBg}, ${gradientColor2})`
                : globalBg,
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

              {/* snap guide lines */}
              {!previewMode && snapLines.vertical.map((vx, i) => (
                <div key={"v" + i + vx} className="pointer-events-none absolute"
                  style={{ left: vx - 1, top: 0, width: 2, height: CANVAS_H, background: "#FF3366", zIndex: 9999, opacity: 0.8 }} />
              ))}
              {!previewMode && snapLines.horizontal.map((hy, i) => (
                <div key={"h" + i + hy} className="pointer-events-none absolute"
                  style={{ top: hy - 1, left: 0, height: 2, width: CANVAS_W, background: "#FF3366", zIndex: 9999, opacity: 0.8 }} />
              ))}

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
                    onDrag={(_, d) => {
                      const snap = computeSnap(w.i, d.x, d.y, w.w, w.h);
                      setSnapLines({ vertical: snap.vert, horizontal: snap.horiz });
                      // Rnd respects returned position via setting the dom — simplest: just show guides
                      // (snap correction happens in onDragStop)
                    }}
                    onDragStop={(_, d) => {
                      const snap = computeSnap(w.i, d.x, d.y, w.w, w.h);
                      setSnapLines({ vertical: [], horizontal: [] });
                      updateWidget(w.i, { x: snap.x, y: snap.y });
                    }}
                    onResizeStop={(_, __, ref, ___, position) => {
                      setSnapLines({ vertical: [], horizontal: [] });
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
                    <WidgetRenderer w={w} color={color} data={liveData} />
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

                  {/* Background */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs font-bold text-slate-300 mb-2">רקע</div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer mb-2">
                      <input type="checkbox" checked={!!selectedWidget.bgTransparent}
                        onChange={(e) => updateWidget(selectedWidget.i, { bgTransparent: e.target.checked })} />
                      <span>ללא רקע (שקוף)</span>
                    </label>
                    {!selectedWidget.bgTransparent && (
                      <div className="flex gap-2 items-center">
                        <input type="color" value={selectedWidget.bg || "#FFFFFF"}
                          onChange={(e) => updateWidget(selectedWidget.i, { bg: e.target.value })}
                          className="w-12 h-8 rounded border border-white/10 bg-transparent" />
                        <Input value={selectedWidget.bg || ""}
                          onChange={(e) => updateWidget(selectedWidget.i, { bg: e.target.value || undefined })}
                          placeholder="#FFFFFF"
                          className="flex-1 bg-[#1f1f1f] border-white/10 text-white text-xs h-8" />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <label className="text-xs text-slate-400">עובי מסגרת</label>
                        <Input type="number" min={0} max={20}
                          value={selectedWidget.borderWidth || 0}
                          onChange={(e) => updateWidget(selectedWidget.i, { borderWidth: parseInt(e.target.value) || 0 })}
                          className="bg-[#1f1f1f] border-white/10 text-white text-xs h-8" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">צבע מסגרת</label>
                        <input type="color" value={selectedWidget.borderColor || "#000000"}
                          onChange={(e) => updateWidget(selectedWidget.i, { borderColor: e.target.value })}
                          className="w-full h-8 rounded border border-white/10 bg-transparent" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-xs cursor-pointer mt-2">
                      <input type="checkbox" checked={!!selectedWidget.shadow}
                        onChange={(e) => updateWidget(selectedWidget.i, { shadow: e.target.checked })} />
                      <span>צל</span>
                    </label>
                  </div>

                  {/* Typography */}
                  <div className="pt-2 border-t border-white/10">
                    <div className="text-xs font-bold text-slate-300 mb-2">טיפוגרפיה</div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-slate-400">צבע טקסט</label>
                        <div className="flex gap-2 items-center">
                          <input type="color" value={selectedWidget.fg || globalFg}
                            onChange={(e) => updateWidget(selectedWidget.i, { fg: e.target.value })}
                            className="w-12 h-8 rounded border border-white/10 bg-transparent" />
                          <Input value={selectedWidget.fg || ""}
                            onChange={(e) => updateWidget(selectedWidget.i, { fg: e.target.value || undefined })}
                            placeholder={globalFg}
                            className="flex-1 bg-[#1f1f1f] border-white/10 text-white text-xs h-8" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">גופן</label>
                        <Select value={selectedWidget.fontFamily || "system"} onValueChange={(v) => updateWidget(selectedWidget.i, { fontFamily: v })}>
                          <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {FONT_FAMILIES.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                <span style={{ fontFamily: f.value !== "system" ? f.value : undefined }}>{f.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs text-slate-400">גודל (px)</label>
                          <Input type="number" min={8} max={200} placeholder="אוטו"
                            value={selectedWidget.fontSize ?? ""}
                            onChange={(e) => {
                              const v = e.target.value;
                              updateWidget(selectedWidget.i, { fontSize: v === "" ? undefined : parseInt(v) });
                            }}
                            className="bg-[#1f1f1f] border-white/10 text-white text-xs h-8" />
                        </div>
                        <div>
                          <label className="text-xs text-slate-400">משקל</label>
                          <Select value={selectedWidget.fontWeight || "normal"}
                            onValueChange={(v) => updateWidget(selectedWidget.i, { fontWeight: v })}>
                            <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="300">דק</SelectItem>
                              <SelectItem value="normal">רגיל</SelectItem>
                              <SelectItem value="500">חצי-מודגש</SelectItem>
                              <SelectItem value="bold">מודגש</SelectItem>
                              <SelectItem value="900">שמן</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input type="checkbox" checked={!!selectedWidget.italic}
                          onChange={(e) => updateWidget(selectedWidget.i, { italic: e.target.checked })} />
                        <span>נטוי</span>
                      </label>
                      <div>
                        <label className="text-xs text-slate-400">
                          סולם גודל (יחסי): ×{(selectedWidget.fontScale || 1).toFixed(2)}
                        </label>
                        <input type="range" min={0.4} max={4} step={0.1}
                          value={selectedWidget.fontScale || 1}
                          onChange={(e) => updateWidget(selectedWidget.i, { fontScale: parseFloat(e.target.value) })}
                          className="w-full" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">
                          ריווח אותיות: {selectedWidget.letterSpacing ?? 0}px
                        </label>
                        <input type="range" min={-2} max={20} step={0.5}
                          value={selectedWidget.letterSpacing || 0}
                          onChange={(e) => updateWidget(selectedWidget.i, { letterSpacing: parseFloat(e.target.value) })}
                          className="w-full" />
                      </div>
                    </div>
                  </div>

                  {selectedWidget.type === "text" && (
                    <div className="space-y-2 pt-2 border-t border-white/10">
                      <div className="text-xs font-bold text-slate-300">תוכן הטקסט</div>
                      <textarea value={selectedWidget.text || ""}
                        onChange={(e) => updateWidget(selectedWidget.i, { text: e.target.value })}
                        placeholder="הקלד טקסט חופשי..."
                        rows={3}
                        className="w-full bg-[#1f1f1f] border border-white/10 text-white text-sm rounded p-2" />
                      <div>
                        <label className="text-xs text-slate-400">יישור</label>
                        <Select value={selectedWidget.textAlign || "right"} onValueChange={(v) => updateWidget(selectedWidget.i, { textAlign: v as any })}>
                          <SelectTrigger className="bg-[#1f1f1f] border-white/10 text-white"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="right">ימין</SelectItem>
                            <SelectItem value="center">מרכז</SelectItem>
                            <SelectItem value="left">שמאל</SelectItem>
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

      {showDuplicateDialog && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={() => setShowDuplicateDialog(false)}>
          <div className="bg-[#2a2a2a] rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-2">שכפל עיצוב למחלקות נוספות</h2>
            <p className="text-xs text-slate-400 mb-3">
              העיצוב הנוכחי יישמר בכל המחלקות שתבחר. עיצוב קיים במחלקות אלו ידרס.
            </p>
            <div className="space-y-1 max-h-80 overflow-y-auto border border-white/10 rounded p-2">
              {departments.filter((d) => d.id !== previewDeptId).map((d) => {
                const checked = duplicateTargets.has(d.id);
                return (
                  <label key={d.id} className="flex items-center gap-2 p-2 rounded hover:bg-white/5 cursor-pointer text-sm">
                    <input type="checkbox" checked={checked} onChange={(e) => {
                      const next = new Set(duplicateTargets);
                      if (e.target.checked) next.add(d.id); else next.delete(d.id);
                      setDuplicateTargets(next);
                    }} />
                    <span>{d.name}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 mt-3 justify-end">
              <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10"
                onClick={() => { setShowDuplicateDialog(false); setDuplicateTargets(new Set()); }}>
                ביטול
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={duplicateToOthers}
                disabled={duplicateTargets.size === 0}>
                שכפל ל-{duplicateTargets.size} מחלקות
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#2a2a2a] border-t border-black/40 px-3 py-1 text-[10px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <kbd className="bg-white/10 px-1 rounded">Ctrl+Z</kbd> בטל ·
          <kbd className="bg-white/10 px-1 rounded">Ctrl+Shift+Z</kbd> חזור ·
          <kbd className="bg-white/10 px-1 rounded">Del</kbd> מחק ·
          <kbd className="bg-white/10 px-1 rounded">Ctrl+D</kbd> שכפל ·
          <kbd className="bg-white/10 px-1 rounded">↑↓→←</kbd> הזז ·
          <kbd className="bg-white/10 px-1 rounded">Shift+↑↓→←</kbd> 10px
        </div>
        <div>1920×1080 · {items.length} widgets · {historyRef.current.length} undo</div>
      </div>
    </div>
  );
}

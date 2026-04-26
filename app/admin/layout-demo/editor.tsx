"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Clock, Calendar, Bell, MessageSquare, BookOpen, Image as ImageIcon,
  CloudSun, Trash2, Plus, Save, Eye, Palette, Sparkles,
} from "lucide-react";

import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

type WidgetType =
  | "header" | "current" | "next" | "weekly" | "ticker"
  | "announcements" | "topic" | "clock" | "media" | "weather";

type Widget = {
  i: string;             // unique id for grid
  type: WidgetType;
  bg?: string;
  fg?: string;
  fontScale?: number;    // 1 = normal, 1.2, 1.5, ...
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
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        if (w.bg || w.fg || w.fontScale) acc[w.i] = { bg: w.bg, fg: w.fg, fontScale: w.fontScale };
        return acc;
      }, {}),
      globalBg,
      globalFg,
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
          </div>
        )}

        {/* Center: canvas */}
        <div className="flex-1 overflow-auto p-4" style={{ backgroundColor: previewMode ? globalBg : undefined }}>
          <div
            className="mx-auto rounded-lg shadow-lg overflow-hidden"
            style={{
              maxWidth: 1200,
              backgroundColor: globalBg,
              color: globalFg,
              border: previewMode ? "none" : "2px dashed #CBD5E1",
              minHeight: 600,
            }}
          >
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
              compactType="vertical"
              margin={[8, 8]}
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
                return (
                  <div key={l.i} onClick={() => !previewMode && setSelectedId(l.i)} className={isSelected ? "ring-2 ring-emerald-500 rounded-xl" : ""}>
                    <WidgetRenderer w={w as Widget} color={color} />
                    {!previewMode && (
                      <button
                        onClick={(e) => { e.stopPropagation(); removeWidget(l.i); }}
                        className="no-drag absolute top-1 left-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 z-10"
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

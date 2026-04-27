"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import {
  Clock, Calendar, Bell, MessageSquare, BookOpen, Image as ImageIcon,
  CloudSun, Sparkles, Type, Square,
} from "lucide-react";

const CANVAS_W = 1920;
const CANVAS_H = 1080;

export type DynamicWidgetType =
  | "header" | "current" | "next" | "weekly" | "ticker"
  | "announcements" | "topic" | "clock" | "media" | "weather" | "logo"
  | "text" | "shape";

export type DynamicWidget = {
  i: string;
  type: DynamicWidgetType;
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
  fontSize?: number;
  fontWeight?: string;
  italic?: boolean;
  letterSpacing?: number;
  lineHeight?: number;
  bgTransparent?: boolean;
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

export type LayoutConfig = {
  widgets: DynamicWidget[];
  globalBg?: string;
  globalFg?: string;
  bgImage?: string;
  bgImageOpacity?: number;
  bgImageFit?: "cover" | "contain" | "repeat";
  gradientEnabled?: boolean;
  gradientColor2?: string;
  gradientAngle?: number;
};

export type DynamicLiveData = {
  greeting: string;
  deptName: string;
  date: string;
  time: string;
  todayIdx?: number;        // 0=ראשון
  currentActivity: { title: string; time: string; instructor?: string } | null;
  nextActivities: { title: string; time: string }[];
  topic: string;
  ticker: string;
  announcements: string;
  weeklyDays: string[];
  /** activities indexed by day-of-week (0=ראשון..6=שבת) */
  weeklyActivitiesByIdx?: { title: string; time: string }[][];
};

function WidgetView({ w, color, data }: { w: DynamicWidget; color: { bg: string; fg: string; scale: number }; data: DynamicLiveData }) {
  const transparent = w.bgTransparent === true || color.bg === "transparent";
  const cls = `w-full h-full flex flex-col p-3 overflow-hidden rounded-xl ${transparent ? "" : "shadow-sm border"}`;

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
          <div className="opacity-50 mt-2" style={{ fontSize: fs(0.6) }}>תמונה</div>
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
            fontSize: w.fontSize != null ? `${w.fontSize}px` : `${color.scale * 1.4}rem`,
            letterSpacing: w.letterSpacing != null ? `${w.letterSpacing}px` : undefined,
            lineHeight: w.lineHeight,
            border: w.borderWidth ? `${w.borderWidth}px solid ${w.borderColor || color.fg}` : undefined,
            boxShadow: w.shadow ? "0 4px 16px rgba(0,0,0,0.18)" : undefined,
            whiteSpace: "pre-wrap",
          }}
        >
          {w.text || ""}
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
        <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: transparent ? "transparent" : color.bg, padding: 4, borderRadius: 12 }}>
          {w.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={w.imageUrl} alt="לוגו"
              style={{ width: "100%", height: "100%", objectFit: fit, opacity }}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />
          )}
        </div>
      );
    }
    default:
      return null;
  }
}

interface Props {
  config: LayoutConfig;
  data: DynamicLiveData;
}

export default function DynamicLayoutRenderer({ config, data }: Props) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function compute() {
      const sw = window.innerWidth;
      const sh = window.innerHeight;
      const s = Math.min(sw / CANVAS_W, sh / CANVAS_H);
      setScale(s);
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  const bgStyle: React.CSSProperties = {
    width: "100vw",
    height: "100vh",
    overflow: "hidden",
    background: config.gradientEnabled
      ? `linear-gradient(${config.gradientAngle ?? 135}deg, ${config.globalBg || "#FFFFFF"}, ${config.gradientColor2 || "#10B981"})`
      : (config.globalBg || "#F8FAFC"),
    color: config.globalFg || "#1E293B",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "fixed",
    top: 0,
    left: 0,
  };

  return (
    <div style={bgStyle}>
      <div
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          position: "relative",
          transform: `scale(${scale})`,
          transformOrigin: "center center",
          flexShrink: 0,
        }}
      >
        {config.bgImage && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: `url(${config.bgImage})`,
              backgroundSize: config.bgImageFit === "repeat" ? "auto" : (config.bgImageFit || "cover"),
              backgroundRepeat: config.bgImageFit === "repeat" ? "repeat" : "no-repeat",
              backgroundPosition: "center",
              opacity: config.bgImageOpacity ?? 0.3,
              zIndex: 0,
            }}
          />
        )}

        {[...config.widgets].sort((a, b) => (a.z ?? 0) - (b.z ?? 0)).map((w) => {
          const color = {
            bg: w.bg || (w.type === "shape" ? "#10B981" : "#FFFFFF"),
            fg: w.fg || config.globalFg || "#1E293B",
            scale: w.fontScale || 1,
          };
          return (
            <div
              key={w.i}
              style={{
                position: "absolute",
                left: w.x,
                top: w.y,
                width: w.w,
                height: w.h,
                zIndex: w.z ?? 1,
                transform: w.rotation ? `rotate(${w.rotation}deg)` : undefined,
              }}
            >
              <WidgetView w={w} color={color} data={data} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

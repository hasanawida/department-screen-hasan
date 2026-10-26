"use client";

// מצב המסכים בכל מחלקה: איזו טלוויזיה מחוברת עכשיו, מה פתוח בה, ורענון מרחוק.
// משמש את "מסכי מחלקות" ואת "מסכי התמצאות". מתעדכן לבד (כל מסך מדווח כל דקה).

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, Copy, ExternalLink, Pencil, RefreshCw, Settings, Trash2, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { refreshDepartmentScreens } from "@/lib/screens";
import { btnGhost, inputCls } from "@/components/admin/brand-ui";
import { deviceName, isOnline, whenText, type ScreenDevice, type ScreenKind } from "@/lib/screen-devices";

export type ScreenItem = {
  /** מזהה המחלקה */
  id: string;
  name: string;
  color: string | null;
  /** הכתובת שמכניסים בטלוויזיה, למשל ‎/display/kian‎ */
  screenPath: string;
  settingsHref: string;
  settingsNewTab?: boolean;
  /** שורה קטנה מתחת לשם */
  sub?: string;
};

const KIND_LABEL: Record<ScreenKind, string> = { department: "מסך מחלקה", orientation: "מסך התמצאות", physio: "פיזיותרפיה" };
const withPreview = (path: string) => path + (path.includes("?") ? "&" : "?") + "preview=1";

export default function ScreensPanel({ kind, items, otherKinds = [] }: {
  kind: Exclude<ScreenKind, "physio">;
  items: ScreenItem[];
  /** מסכים נוספים שמוצגים בסוף העמוד (למשל פיזיותרפיה) */
  otherKinds?: ScreenKind[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [devices, setDevices] = useState<ScreenDevice[]>([]);
  const [missingTable, setMissingTable] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [origin, setOrigin] = useState("");
  const [flash, setFlash] = useState<{ key: string; text: string } | null>(null);
  const [copied, setCopied] = useState("");
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const kindsKey = [kind, ...otherKinds].join(",");
  const kinds = useMemo(() => kindsKey.split(",") as ScreenKind[], [kindsKey]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.from("screen_devices").select("*").in("kind", kinds).order("first_seen");
    if (error) { setMissingTable(/screen_devices|relation|schema cache/i.test(error.message)); return; }
    setMissingTable(false);
    setDevices((data ?? []) as ScreenDevice[]);
  }, [supabase, kinds]);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    // כל דיווח של מסך מעדכן את העמוד; ובכל מקרה פעם בחצי דקה
    let t: ReturnType<typeof setTimeout> | undefined;
    const soon = () => { if (t) clearTimeout(t); t = setTimeout(load, 400); };
    const channel = supabase
      .channel("screens-panel-" + kind)
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "screen_devices" }, soon)
      .subscribe();
    const tick = setInterval(() => { setNow(Date.now()); load(); }, 30 * 1000);
    return () => { if (t) clearTimeout(t); clearInterval(tick); supabase.removeChannel(channel); };
  }, [supabase, kind, load]);

  const say = (key: string, text: string) => {
    setFlash({ key, text });
    setTimeout(() => setFlash(f => (f?.key === key ? null : f)), 4000);
  };

  /** רענון: למסכים שמדווחים — לפי שעון השרת; ותמיד גם בדרך הישנה, למסכים שעוד לא מדווחים */
  const reload = async (key: string, ids: string[], departmentId?: string) => {
    if (ids.length && !missingTable) await supabase.rpc("screen_reload", { p_ids: ids });
    if (departmentId && (!ids.length || missingTable)) refreshDepartmentScreens(supabase, departmentId, 0);
    say(key, ids.length > 1 ? "נשלח רענון. המסכים ייטענו מחדש תוך כמה שניות." : "נשלח רענון. המסך ייטען מחדש תוך כמה שניות.");
    setTimeout(load, 5000);
  };

  const copy = async (path: string) => {
    try { await navigator.clipboard.writeText(origin + path); } catch { /* */ }
    setCopied(path);
    setTimeout(() => setCopied(c => (c === path ? "" : c)), 2000);
  };

  const saveLabel = async () => {
    if (!editing) return;
    const label = editing.value.trim() || null;
    setDevices(ds => ds.map(d => (d.id === editing.id ? { ...d, label } : d)));
    setEditing(null);
    await supabase.from("screen_devices").update({ label }).eq("id", editing.id);
  };

  const remove = async (d: ScreenDevice) => {
    setDevices(ds => ds.filter(x => x.id !== d.id));
    await supabase.from("screen_devices").delete().eq("id", d.id);
  };

  const mine = devices.filter(d => d.kind === kind);
  const onlineCount = mine.filter(d => isOnline(d, now)).length;
  const deptsWithScreen = new Set(mine.map(d => d.department_id));
  const noScreen = items.filter(i => !deptsWithScreen.has(i.id)).length;
  const others = devices.filter(d => d.kind !== kind);
  const deptName = (id: string | null) => items.find(i => i.id === id)?.name ?? null;

  return (
    <div className="space-y-5">
      {/* סיכום */}
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
        {missingTable ? (
          <p className="text-[15px]">
            כדי לראות כאן אילו מסכים מחוברים, מריצים פעם אחת את <b dir="ltr">scripts/015_screen_status.sql</b> ב-Supabase.
            עד אז הכפתור &quot;רענון&quot; עובד כמו קודם.
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className={"text-3xl font-extrabold " + (onlineCount ? "text-[#5A826F]" : "text-[#3F2F2D]/40")}>{onlineCount}</span>
              <span className="text-[15px] font-semibold">
                {mine.length === 0
                  ? "מסכים מחוברים. עוד לא חובר אף מסך."
                  : `${onlineCount === 1 ? "מחובר" : "מחוברים"} עכשיו, מתוך ${mine.length === 1 ? "מסך אחד" : mine.length + " מסכים"}`}
              </span>
            </div>
            <span className="text-sm text-[#3F2F2D]/60">
              {noScreen === 1 && "מחלקה אחת בלי מסך מחובר. "}
              {noScreen > 1 && `${noScreen} מחלקות בלי מסך מחובר. `}
              המצב מתעדכן לבד: כל מסך מדווח כל דקה.
            </span>
            {mine.length > 0 && (
              <button type="button" className={btnGhost + " ms-auto"} onClick={() => reload("all", mine.map(d => d.id))}>
                <RefreshCw className="h-4 w-4" /> רענון כל המסכים
              </button>
            )}
          </>
        )}
        {flash?.key === "all" && <p role="status" className="w-full text-sm font-semibold text-[#5A826F]">{flash.text}</p>}
      </section>

      {/* מחלקות */}
      <div className="space-y-3">
        {items.map(item => {
          const list = mine.filter(d => d.department_id === item.id);
          const live = list.filter(d => isOnline(d, now));
          const lastSeen = list.map(d => d.last_seen).sort().pop();
          const expanded = open[item.id] ?? list.length > 0;
          const status = missingTable ? null
            : list.length === 0 ? { cls: "bg-[#3F2F2D]/5 text-[#3F2F2D]/60", dot: "bg-[#3F2F2D]/25", text: "עוד לא חובר מסך" }
            : live.length ? { cls: "bg-[#E3ECE7] text-[#2c4037]", dot: "bg-[#5A826F]", text: live.length > 1 ? `${live.length} מסכים מחוברים` : "מחובר" }
            : { cls: "bg-[#FDE8E1] text-[#7a2e22]", dot: "bg-[#B56262]", text: "לא מחובר · " + whenText(lastSeen, now) };

          return (
            <section key={item.id} className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <span className="h-9 w-9 shrink-0 rounded-full ring-4 ring-[#F6F2EE]" style={{ backgroundColor: item.color || "#5A826F" }} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold">{item.name}</h2>
                    {status && (
                      <span className={"inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold " + status.cls}>
                        <span className={"h-2 w-2 rounded-full " + status.dot} aria-hidden="true" />
                        {status.text}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-sm text-[#3F2F2D]/60">
                    {item.sub ? item.sub + " · " : ""}<span dir="ltr">{item.screenPath}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <a href={withPreview(item.screenPath)} target="_blank" rel="noreferrer" className={btnGhost}>
                    <ExternalLink className="h-4 w-4" /> פתיחת המסך
                  </a>
                  <Link href={item.settingsHref} target={item.settingsNewTab ? "_blank" : undefined} className={btnGhost}>
                    <Settings className="h-4 w-4" /> הגדרות
                  </Link>
                  <button type="button" className={btnGhost} onClick={() => reload(item.id, list.map(d => d.id), item.id)}>
                    <RefreshCw className="h-4 w-4" /> רענון
                  </button>
                </div>
              </div>

              {flash?.key === item.id && <p role="status" className="mt-2 text-sm font-semibold text-[#5A826F]">{flash.text}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-[#F6F2EE] px-3 py-2 text-sm">
                <Tv className="h-4 w-4 shrink-0 text-[#5A826F]" aria-hidden="true" />
                <span className="font-semibold">הקישור לטלוויזיה:</span>
                <span dir="ltr" className="min-w-0 truncate font-mono text-[13px]">{origin + item.screenPath}</span>
                <button type="button" onClick={() => copy(item.screenPath)} className="ms-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-[#5A826F] hover:bg-white">
                  {copied === item.screenPath ? <><Check className="h-4 w-4" /> הועתק</> : <><Copy className="h-4 w-4" /> העתקה</>}
                </button>
              </div>

              {!missingTable && list.length > 0 && (
                <div className="mt-3">
                  <button type="button" aria-expanded={expanded} onClick={() => setOpen(o => ({ ...o, [item.id]: !expanded }))}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-[#3F2F2D]/70 hover:text-[#3F2F2D]">
                    <ChevronDown className={"h-4 w-4 transition-transform " + (expanded ? "" : "rotate-90")} />
                    {list.length === 1 ? "מסך אחד" : `${list.length} מסכים`}
                  </button>
                  {expanded && (
                    <ul className="mt-2 divide-y divide-[#3F2F2D]/10 rounded-xl border border-[#3F2F2D]/10">
                      {list.map(d => (
                        <DeviceRow key={d.id} d={d} now={now} editing={editing} setEditing={setEditing} saveLabel={saveLabel}
                          onReload={() => reload(d.id, [d.id])} onRemove={() => remove(d)} flash={flash?.key === d.id ? flash.text : null} />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* מסכים נוספים (פיזיותרפיה) */}
      {!missingTable && others.length > 0 && (
        <section className="rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
          <h2 className="mb-2 text-lg font-bold">מסכים נוספים</h2>
          <ul className="divide-y divide-[#3F2F2D]/10 rounded-xl border border-[#3F2F2D]/10">
            {others.map(d => (
              <DeviceRow key={d.id} d={d} now={now} editing={editing} setEditing={setEditing} saveLabel={saveLabel}
                extra={KIND_LABEL[d.kind] + " · " + (deptName(d.department_id) ?? "כל המחלקות")}
                onReload={() => reload(d.id, [d.id])} onRemove={() => remove(d)} flash={flash?.key === d.id ? flash.text : null} />
            ))}
          </ul>
        </section>
      )}

      <InstallHelp kind={kind} />
    </div>
  );
}

function DeviceRow({ d, now, editing, setEditing, saveLabel, onReload, onRemove, flash, extra }: {
  d: ScreenDevice;
  now: number;
  editing: { id: string; value: string } | null;
  setEditing: (e: { id: string; value: string } | null) => void;
  saveLabel: () => void;
  onReload: () => void;
  onRemove: () => void;
  flash: string | null;
  extra?: string;
}) {
  const on = isOnline(d, now);
  const i = d.info ?? {};
  const meta = [
    extra,
    // ‏\u2066…\u2069 — כדי ש-1920×1080 לא יתהפך בתוך טקסט בעברית
    i.screen ? "מסך \u2066" + i.screen + "\u2069" + (i.portrait ? " · לאורך" : "") : null,
    on ? "פתוח מאז " + whenText(d.loaded_at, now) : "נראה לאחרונה " + whenText(d.last_seen, now),
  ].filter(Boolean).join(" · ");
  const isEditing = editing?.id === d.id;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5">
      <span className={"h-2.5 w-2.5 shrink-0 rounded-full " + (on ? "bg-[#5A826F]" : "bg-[#3F2F2D]/25")} title={on ? "מחובר" : "לא מחובר"} />
      <div className="min-w-0 flex-1">
        {isEditing ? (
          <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); saveLabel(); }}>
            <input autoFocus className={inputCls + " h-9 max-w-xs"} value={editing.value} placeholder="למשל: טלוויזיה ליד חדר האוכל"
              onChange={e => setEditing({ id: d.id, value: e.target.value })} aria-label="שם המסך" />
            <button type="submit" className="rounded-lg bg-[#3F2F2D] px-3 py-1.5 text-sm font-semibold text-[#F6F2EE]">שמירה</button>
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg px-2 py-1.5 text-sm font-semibold text-[#3F2F2D]/60">ביטול</button>
          </form>
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="font-semibold">{deviceName(d)}</span>
            <button type="button" onClick={() => setEditing({ id: d.id, value: d.label ?? "" })} aria-label={"שינוי השם של " + deviceName(d)}
              className="rounded-md p-1 text-[#3F2F2D]/45 hover:bg-[#F6F2EE] hover:text-[#3F2F2D]">
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="text-sm text-[#3F2F2D]/60">{meta}</div>
        {flash && <div role="status" className="text-sm font-semibold text-[#5A826F]">{flash}</div>}
      </div>
      {on ? (
        <button type="button" onClick={onReload} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7]">
          <RefreshCw className="h-4 w-4" /> רענון
        </button>
      ) : (
        <button type="button" onClick={onRemove} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-[#B56262] hover:bg-[#FDE8E1]">
          <Trash2 className="h-4 w-4" /> הסרה מהרשימה
        </button>
      )}
    </li>
  );
}

/** הוראות קצרות להתקנה על סטרימר */
function InstallHelp({ kind }: { kind: Exclude<ScreenKind, "physio"> }) {
  return (
    <details className="group rounded-2xl bg-white p-5 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-lg font-bold">
        <ChevronDown className="h-5 w-5 rotate-90 transition-transform group-open:rotate-0" />
        איך מחברים טלוויזיה (סטרימר)
      </summary>
      <ol className="mt-3 list-decimal space-y-2 ps-6 text-[15px] leading-relaxed">
        <li>סטרימר Android TV / Google TV או Fire TV, מחובר ל-HDMI בטלוויזיה ולרשת ה-Wi-Fi.</li>
        <li>מתקינים בו את האפליקציה <b>Fully Kiosk Browser</b>.</li>
        <li>
          ב-<b>Start URL</b> מדביקים את &quot;הקישור לטלוויזיה&quot; של המחלקה
          {kind === "orientation" ? " (קישור קצר, נוח להקליד בשלט)." : "."}
        </li>
        <li>בהגדרות של Fully מפעילים: הפעלה אוטומטית כשהמכשיר נדלק, מסך תמיד דולק, וטעינה מחדש כשהרשת חוזרת.</li>
        <li>בטלוויזיה מכבים את שומר המסך ואת טיימר השינה, ומפעילים HDMI-CEC.</li>
        <li>תוך דקה המסך מופיע כאן כ&quot;מחובר&quot;. אפשר לתת לו שם (העיפרון), ולרענן אותו מכאן בכל רגע.</li>
      </ol>
      <p className="mt-3 text-sm text-[#3F2F2D]/60">
        &quot;פתיחת המסך&quot; מהעמוד הזה מציגה את המסך בלי לרשום את המחשב שלך כמסך.
      </p>
    </details>
  );
}

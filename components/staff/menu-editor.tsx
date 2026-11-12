"use client";

// עריכת התפריט השבועי — לדיאטנית (בקישור אישי) ולמנהלים.
// שש ארוחות ביום כמו בתפריט של הדיאטנית, והערות לשבוע. כל שינוי נשמר לבד אחרי רגע.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DepartmentDisplay, { type ViewKind } from "@/components/display/department-display";
import { latestIconConfig, menuLinePhotos, type IconConfig } from "@/lib/icon-config";
import { updateIconConfig } from "@/lib/icon-config-db";
import DishIconPicker from "@/components/admin/dish-icon-picker";
import type { SupabaseClient } from "@supabase/supabase-js";
import { dishImage, dishKey, dishLabel } from "@/lib/dishes";
import { ScreenFrame, Toggle, btnGhost, textareaCls, usePreviewCu } from "@/components/admin/brand-ui";
import {
  DAY_NAMES, MEALS, MEAL_LABELS, MEAL_TIME, MENU_NOTES, SNACK_MEALS, addDaysISO, displaySettings, israelDateISO, menuFromRows,
  shortDate, weekDatesISO, weekStartISO, weeklyBoardSettings, type Meal, type MenuRow,
} from "@/lib/week";

type SaveState = "idle" | "saving" | "saved" | "error";
type Slot = Meal | typeof MENU_NOTES;
const key = (day: number, meal: Slot) => `${day}|${meal}`;
const NOTES_KEY = key(0, MENU_NOTES);

const PLACEHOLDER: Record<Meal, string> = {
  wake: "ביסקוויטים / קרקרים",
  breakfast: "ביצים: מקושקשת\nדייסה: סולת\nגבינות: לבנה / קוטג' / צהובה\nסלט ירקות",
  snack_am: "בננה\nמנה טחונה: רסק פירות",
  lunch: "מרק ירקות\nעוף בתנור\nמנה רכה: קציצות עוף\nפחמימה: אורז / פירה, לחם\nירק: שעועית ירוקה",
  snack_pm: "ביסקוויט, עוגת שמרים",
  dinner: "דייסה: קוואקר\nפשטידת ירקות\nסלט ירקות\nממרחים: ריבה, חומוס, לחם",
};

const EMPTY_DAYS = [[], [], [], [], [], [], []];
/** כמה שבועות קדימה מוצגים לבחירה, וכמה נוספים בכל "עוד שבועות" */
const FORWARD_SHOW = 12;
const FORWARD_MORE = 8;
const FORWARD_MAX = 52;
type ForwardWeek = { week: string; has: boolean };

export default function MenuEditor() {
  const supabase = useMemo(() => createClient(), []);
  const today = israelDateISO();
  const [weekOffset, setWeekOffset] = useState(0);
  const weekStart = addDaysISO(weekStartISO(today), weekOffset * 7);
  const weekDates = useMemo(() => weekDatesISO(weekStart), [weekStart]);
  const todayIndex = weekDates.indexOf(today);

  const [day, setDay] = useState(() => (todayIndex >= 0 ? todayIndex : 0));
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  // התפריט של השבוע לא נטען (תקלת חיבור): לא נותנים לערוך "שבוע ריק" — זה היה דורס את התפריט האמיתי
  const [loadFailed, setLoadFailed] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [copyAsk, setCopyAsk] = useState(false);
  const [copyMsg, setCopyMsg] = useState("");
  const [copied, setCopied] = useState<Meal | null>(null);
  const [preview, setPreview] = useState<ViewKind>("menuToday");
  // תמונות הארוחות (נערכות בעמוד "אייקונים ותמונות")
  const [iconConfig, setIconConfig] = useState<IconConfig>({});
  useEffect(() => {
    supabase.from("screen_settings").select("display_settings").then(({ data }) => setIconConfig(latestIconConfig(data as { display_settings?: unknown }[] | null)));
  }, [supabase]);
  // תמונה ליד כל מנה בפירוט (בתפריט היום / בשבועי) — משותף לכל המסכים, נשמר מיד
  const [linesMsg, setLinesMsg] = useState<string | null>(null);
  async function setLinePhotos(on: boolean) {
    const before = iconConfig;
    setIconConfig(c => ({ ...c, menu_lines: { today: on, week: on } }));
    const { error, saved } = await updateIconConfig(supabase, cfg => ({ ...cfg, menu_lines: { today: on, week: on } }));
    setIconConfig(saved ?? before);
    setLinesMsg(error ?? "נשמר. יופיע במסכים בתוך כמה דקות.");
    setTimeout(() => setLinesMsg(null), 4000);
  }
  // שכפול לשבועות הבאים
  const [fwdOpen, setFwdOpen] = useState(false);
  const [fwdCount, setFwdCount] = useState(FORWARD_SHOW);
  const [fwdWeeks, setFwdWeeks] = useState<ForwardWeek[] | null>(null);
  // השבועות שנבחרו לשכפול (רק הם מקבלים את התפריט)
  const [fwdSel, setFwdSel] = useState<string[]>([]);
  const [fwdBusy, setFwdBusy] = useState(false);
  const [fwdMsg, setFwdMsg] = useState("");
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [cu, frameRef] = usePreviewCu();

  const loadId = useRef(0);
  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    const { data, error } = await supabase.from("weekly_menus").select("day_index, meal, items").eq("week_start", weekStart);
    if (id !== loadId.current) return; // החליפו שבוע בינתיים — התשובה הזו כבר לא רלוונטית
    if (error) {
      setLoadFailed(true);
      setTexts({});
    } else {
      setLoadFailed(false);
      const t: Record<string, string> = {};
      for (const r of data ?? []) t[key(r.day_index, r.meal as Slot)] = r.items ?? "";
      setTexts(t);
    }
    setLoading(false);
  }, [supabase, weekStart]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setDay(todayIndex >= 0 ? todayIndex : 0); setCopyAsk(false); setCopyMsg(""); setFwdOpen(false); setFwdMsg(""); setFwdSel([]); setFwdCount(FORWARD_SHOW); setFwdWeeks(null); }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  /** אילו מהשבועות הבאים כבר יש בהם תפריט */
  const loadForward = useCallback(async (count: number) => {
    const weeks = Array.from({ length: count }, (_, i) => addDaysISO(weekStart, 7 * (i + 1)));
    // בקבוצות של 10 שבועות — כדי לא לעבור את מגבלת השורות של שאילתה אחת
    const groups: string[][] = [];
    for (let i = 0; i < weeks.length; i += 10) groups.push(weeks.slice(i, i + 10));
    const results = await Promise.all(groups.map(g => supabase.from("weekly_menus").select("week_start, items").in("week_start", g).neq("items", "")));
    // אם הבדיקה נכשלה — לא מציגים את כל השבועות כ"ריקים" (כך היו דורסים תפריט קיים בלי אזהרה)
    if (results.some(r => r.error)) { setFwdWeeks(null); setFwdMsg("הבדיקה אילו שבועות כבר מלאים לא הצליחה. בדקו את החיבור, סגרו ופתחו שוב את השכפול."); return; }
    const data = results.flatMap(r => r.data ?? []);
    const filled = new Set(data.filter(r => String(r.items ?? "").trim()).map(r => r.week_start));
    setFwdWeeks(weeks.map(week => ({ week, has: filled.has(week) })));
  }, [supabase, weekStart]);

  useEffect(() => { if (fwdOpen) loadForward(fwdCount); }, [fwdOpen, fwdCount, loadForward]);

  // תאים שהשמירה שלהם נכשלה. הסימון "לא נשמר" נשאר עד שכולם נשמרו, והם נשמרים שוב לבד
  // כשהחיבור חוזר (בשמירה המוצלחת הבאה) — כדי ששמירה מוצלחת של תא אחר לא תסתיר כישלון קודם.
  const failed = useRef(new Map<string, { week: string; d: number; meal: Slot }>());
  const latest = useRef(new Map<string, string>());
  const upsertCell = (week: string, d: number, meal: Slot, items: string) =>
    supabase.from("weekly_menus").upsert({ week_start: week, day_index: d, meal, items, updated_at: new Date().toISOString() }, { onConflict: "week_start,day_index,meal" });

  async function persist(d: number, meal: Slot, items: string, week: string) {
    setSave("saving");
    const id = week + "|" + key(d, meal);
    const { error } = await upsertCell(week, d, meal, items);
    if (error) failed.current.set(id, { week, d, meal });
    else {
      failed.current.delete(id);
      for (const [fid, f] of Array.from(failed.current.entries())) {
        const again = await upsertCell(f.week, f.d, f.meal, latest.current.get(fid) ?? "");
        if (!again.error) failed.current.delete(fid);
      }
    }
    setSave(failed.current.size ? "error" : "saved");
  }

  // גם בלי הקלדה נוספת: מה שלא נשמר נשלח שוב כל רבע דקה, עד שהחיבור חוזר
  useEffect(() => {
    const id = setInterval(async () => {
      if (!failed.current.size) return;
      for (const [fid, f] of Array.from(failed.current.entries())) {
        const again = await upsertCell(f.week, f.d, f.meal, latest.current.get(fid) ?? "");
        if (!again.error) failed.current.delete(fid);
      }
      setSave(failed.current.size ? "error" : "saved");
    }, 15_000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function change(d: number, meal: Slot, value: string) {
    const k = key(d, meal);
    const week = weekStart;
    latest.current.set(week + "|" + k, value);
    setTexts(t => ({ ...t, [k]: value }));
    setSave("saving");
    clearTimeout(timers.current[week + "|" + k]);
    timers.current[week + "|" + k] = setTimeout(() => persist(d, meal, value, week), 700);
  }

  /** אותה ארוחה לכל ימי השבוע (למשל ארוחת בוקר שחוזרת כל יום) */
  async function copyToAllDays(meal: Meal) {
    const value = texts[key(day, meal)] ?? "";
    setTexts(t => { const n = { ...t }; for (let i = 0; i < 7; i++) n[key(i, meal)] = value; return n; });
    setSave("saving");
    for (let i = 0; i < 7; i++) latest.current.set(weekStart + "|" + key(i, meal), value);
    const rows = [0, 1, 2, 3, 4, 5, 6].map(i => ({ week_start: weekStart, day_index: i, meal, items: value, updated_at: new Date().toISOString() }));
    const { error } = await supabase.from("weekly_menus").upsert(rows, { onConflict: "week_start,day_index,meal" });
    if (error) {
      for (let i = 0; i < 7; i++) failed.current.set(weekStart + "|" + key(i, meal), { week: weekStart, d: i, meal });
      setSave("error");
      return;
    }
    setSave(failed.current.size ? "error" : "saved");
    setCopied(meal);
    setTimeout(() => setCopied(c => (c === meal ? null : c)), 2000);
  }

  /** התפריט של השבוע הקודם במקום מה שכתוב השבוע (כל הארוחות וההערות) */
  async function copyPreviousWeek() {
    setCopyAsk(false);
    setCopyMsg("");
    const prev = addDaysISO(weekStart, -7);
    const { data, error } = await supabase.from("weekly_menus").select("day_index, meal, items").eq("week_start", prev);
    if (error) { setCopyMsg("ההעתקה לא הצליחה. בדקו את החיבור ונסו שוב."); return; }
    if (!data?.some(r => String(r.items ?? "").trim())) { setCopyMsg("בשבוע הקודם אין תפריט להעתיק."); return; }
    setSave("saving");
    const now = new Date().toISOString();
    const rows = data.map(r => ({ week_start: weekStart, day_index: r.day_index, meal: r.meal, items: r.items, updated_at: now }));
    // "מחליף את מה שכתוב": מה שכתוב השבוע ואין לו מקבילה בשבוע הקודם — מתרוקן, כדי שלא יישאר ערבוב של שני תפריטים
    const copiedKeys = new Set(data.map(r => key(r.day_index, r.meal as Slot)));
    for (const [k, items] of Object.entries(texts)) {
      if (copiedKeys.has(k) || !items.trim()) continue;
      const [d, meal] = k.split("|");
      rows.push({ week_start: weekStart, day_index: Number(d), meal, items: "", updated_at: now });
    }
    const res = await supabase.from("weekly_menus").upsert(rows, { onConflict: "week_start,day_index,meal" });
    if (res.error) { setSave("error"); setCopyMsg("ההעתקה לא הצליחה. בדקו את החיבור ונסו שוב."); return; }
    setSave(failed.current.size ? "error" : "saved");
    load();
  }

  const toggleFwd = (week: string) => { setFwdMsg(""); setFwdSel(sel => (sel.includes(week) ? sel.filter(w => w !== week) : [...sel, week])); };

  /** התפריט של השבוע הזה לשבועות שנבחרו — כל הארוחות וההערות, כך שכל שבוע שנבחר יהיה זהה */
  async function copyForward() {
    if (!fwdWeeks) return;
    const targets = fwdWeeks.filter(w => fwdSel.includes(w.week)).map(w => w.week);
    const replaced = fwdWeeks.filter(w => w.has && fwdSel.includes(w.week)).length;
    if (!targets.length) { setFwdMsg("בחרו לפחות שבוע אחד."); return; }
    const now = new Date().toISOString();
    const grid: { day_index: number; meal: Slot; items: string }[] = [];
    for (let d = 0; d < 7; d++) for (const m of MEALS) grid.push({ day_index: d, meal: m, items: texts[key(d, m)] ?? "" });
    grid.push({ day_index: 0, meal: MENU_NOTES, items: texts[NOTES_KEY] ?? "" });
    const rows = targets.flatMap(week_start => grid.map(r => ({ ...r, week_start, updated_at: now })));
    setFwdBusy(true);
    setFwdMsg("");
    const { error } = await supabase.from("weekly_menus").upsert(rows, { onConflict: "week_start,day_index,meal" });
    setFwdBusy(false);
    if (error) { setFwdMsg("השכפול לא הצליח. בדקו את החיבור ונסו שוב."); return; }
    setFwdMsg(
      `שוכפל ל-${targets.length === 1 ? "שבוע אחד" : `${targets.length} שבועות`}: ` +
      targets.map(w => shortDate(w) + "–" + shortDate(addDaysISO(w, 6))).join(", ") + "." +
      (replaced ? ` ${replaced === 1 ? "בשבוע אחד התפריט הקודם הוחלף" : `ב-${replaced} שבועות התפריט הקודם הוחלף`}.` : "")
    );
    setFwdSel([]);
    loadForward(fwdCount);
  }

  const rows = useMemo(() => {
    const out: MenuRow[] = [];
    for (const [k, items] of Object.entries(texts)) {
      const [d, meal] = k.split("|");
      out.push({ week_start: weekStart, day_index: Number(d), meal: meal as Slot, items });
    }
    return out;
  }, [texts, weekStart]);
  const menu = useMemo(() => menuFromRows(rows), [rows]);
  const notes = useMemo(() => (texts[NOTES_KEY] ?? "").split("\n").map(s => s.trim()).filter(Boolean), [texts]);

  const filled = (d: number) => MEALS.filter(m => (texts[key(d, m)] ?? "").trim()).length;
  const weekEmpty = [0, 1, 2, 3, 4, 5, 6].every(d => filled(d) === 0);
  const weekLabel = weekOffset === 0 ? "השבוע" : weekOffset === 1 ? "שבוע הבא" : weekOffset === -1 ? "שבוע שעבר" : "";

  return (
    <div className="space-y-5">
      {loadFailed && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#B56262]/40 bg-[#FDE8E1] p-4 text-[15px] text-[#7a2e22]" role="alert">
          <span>התפריט של השבוע הזה לא נטען. בדקו את החיבור לאינטרנט. עד שהוא ייטען אי אפשר לערוך — כדי לא לדרוס את מה שכבר כתוב.</span>
          <button type="button" className="rounded-xl bg-white px-4 py-2 font-semibold text-[#7a2e22] ring-1 ring-[#B56262]/40" onClick={load}>ניסיון נוסף</button>
        </div>
      )}
      {copyMsg && <div className="rounded-2xl bg-[#FDF0CC] p-3 text-[15px]" role="status">{copyMsg}</div>}

      {/* שבוע */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
          <button type="button" aria-label="שבוע קודם" className="h-10 w-10 rounded-xl text-lg hover:bg-[#E3ECE7]" onClick={() => setWeekOffset(w => w - 1)}>›</button>
          <div className="min-w-[160px] px-2 text-center">
            <div className="text-[15px] font-bold">{weekLabel || "שבוע"}</div>
            <div className="text-xs text-[#3F2F2D]/60" dir="ltr">{shortDate(weekDates[0])}–{shortDate(weekDates[6])}</div>
          </div>
          <button type="button" aria-label="שבוע הבא" className="h-10 w-10 rounded-xl text-lg hover:bg-[#E3ECE7]" onClick={() => setWeekOffset(w => w + 1)}>‹</button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SaveChip state={save} />
          <button type="button" className={btnGhost} onClick={() => { setFwdOpen(o => !o); setFwdMsg(""); setFwdSel([]); }} disabled={loading || loadFailed || weekEmpty} aria-expanded={fwdOpen}>
            שכפול לשבועות הבאים
          </button>
          {copyAsk ? (
            <span className="flex items-center gap-2 text-sm">
              {weekEmpty ? "להעתיק את התפריט של השבוע הקודם?" : "זה יחליף את מה שכבר כתוב. להמשיך?"}
              <button type="button" className="rounded-xl bg-[#5A826F] px-3 py-2 font-semibold text-white" onClick={copyPreviousWeek}>כן, להעתיק</button>
              <button type="button" className={btnGhost + " !py-2"} onClick={() => setCopyAsk(false)}>לא</button>
            </span>
          ) : (
            <button type="button" className={btnGhost} onClick={() => { setCopyMsg(""); setCopyAsk(true); }} disabled={loading || loadFailed}>העתקה מהשבוע הקודם</button>
          )}
        </div>
      </div>

      {fwdOpen && (
        <section className="rounded-2xl border border-[#5A826F]/30 bg-white p-4 shadow-[0_1px_2px_rgba(63,47,45,0.06)] sm:p-5">
          <h2 className="text-lg font-bold">שכפול התפריט לשבועות הבאים</h2>
          <p className="mt-1 text-sm text-[#3F2F2D]/65">
            בוחרים את השבועות שיקבלו את התפריט של <span dir="ltr">{shortDate(weekDates[0])}–{shortDate(weekDates[6])}</span> (כמו שהוא, עם ההערות). שבועות שלא נבחרו לא משתנים. אחר כך אפשר לשנות כל שבוע בנפרד.
          </p>

          {!fwdWeeks ? (
            <p className="mt-3 text-sm text-[#3F2F2D]/55">בודק אילו שבועות כבר מלאים…</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <button type="button" className="rounded-full bg-[#F6F2EE] px-3 py-1.5 font-semibold hover:bg-[#E3ECE7]"
                  onClick={() => { setFwdMsg(""); setFwdSel(fwdWeeks.filter(w => !w.has).map(w => w.week)); }}>
                  כל השבועות הריקים
                </button>
                <button type="button" className="rounded-full bg-[#F6F2EE] px-3 py-1.5 font-semibold hover:bg-[#E3ECE7] disabled:opacity-50"
                  onClick={() => { setFwdMsg(""); setFwdSel([]); }} disabled={!fwdSel.length}>
                  ניקוי הבחירה
                </button>
              </div>

              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="השבועות לבחירה">
                {fwdWeeks.map((w, i) => {
                  const on = fwdSel.includes(w.week);
                  return (
                    <li key={w.week}>
                      <label className={"flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm transition-colors " +
                        (on ? (w.has ? "border-[#FAB822] bg-[#FDF0CC]" : "border-[#5A826F] bg-[#E3ECE7]") : "border-[#3F2F2D]/10 bg-white hover:bg-[#F6F2EE]")}>
                        <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-[#5A826F]" checked={on} onChange={() => toggleFwd(w.week)} />
                        <span className="min-w-0">
                          <span dir="ltr" className="block font-bold">{shortDate(w.week)}–{shortDate(addDaysISO(w.week, 6))}</span>
                          <span className={"block text-xs " + (w.has && on ? "font-semibold text-[#8a5a00]" : "text-[#3F2F2D]/55")}>
                            {i === 0 ? "שבוע הבא" : `בעוד ${i + 1} שבועות`}
                            {w.has ? (on ? " · התפריט שיש בו יוחלף" : " · כבר יש תפריט") : ""}
                          </span>
                        </span>
                      </label>
                    </li>
                  );
                })}
              </ul>

              {fwdCount < FORWARD_MAX && (
                <button type="button" className="mt-2 text-sm font-semibold text-[#5A826F] hover:underline"
                  onClick={() => setFwdCount(c => Math.min(FORWARD_MAX, c + FORWARD_MORE))}>
                  עוד שבועות
                </button>
              )}
            </>
          )}

          {(() => {
            const n = fwdWeeks?.filter(w => w.has && fwdSel.includes(w.week)).length ?? 0;
            return n > 0 && (
              <p className="mt-3 rounded-xl bg-[#FDF0CC] px-3 py-2 text-sm font-semibold">
                {n === 1 ? "בשבוע אחד שבחרתם כבר יש תפריט — הוא יוחלף." : `ב-${n} שבועות שבחרתם כבר יש תפריט — הוא יוחלף.`}
              </p>
            );
          })()}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button type="button" onClick={copyForward} disabled={fwdBusy || !fwdWeeks || !fwdSel.length}
              className="rounded-xl bg-[#5A826F] px-4 py-2.5 font-semibold text-white hover:bg-[#5A826F]/90 disabled:opacity-60">
              {fwdBusy ? "משכפל…" : !fwdSel.length ? "בחרו שבועות" : fwdSel.length === 1 ? "שכפול לשבוע אחד" : `שכפול ל-${fwdSel.length} שבועות`}
            </button>
            <button type="button" className={btnGhost} onClick={() => setFwdOpen(false)}>סגירה</button>
          </div>
          {fwdMsg && <p role="status" className="mt-2 text-sm font-semibold text-[#5A826F]">{fwdMsg}</p>}
        </section>
      )}

      {/* ימים */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2" role="tablist" aria-label="ימי השבוע">
        {DAY_NAMES.map((name, i) => {
          const on = i === day;
          const n = filled(i);
          return (
            <button key={i} type="button" role="tab" aria-selected={on} onClick={() => setDay(i)}
              className={"rounded-2xl px-1 py-2.5 text-center transition-colors " + (on ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-white hover:bg-[#E3ECE7]") + (i === todayIndex && !on ? " ring-2 ring-[#FAB822]" : "")}>
              <div className="text-[15px] font-bold sm:text-base">{name}</div>
              <div className={"text-xs " + (on ? "text-[#F6F2EE]/70" : "text-[#3F2F2D]/55")}>{shortDate(weekDates[i])}</div>
              <div className="mt-1.5 flex justify-center gap-0.5" aria-label={`${n} מתוך ${MEALS.length} ארוחות`}>
                {MEALS.map(m => <span key={m} title={MEAL_LABELS[m]} className={"h-1.5 w-1.5 rounded-full " + ((texts[key(i, m)] ?? "").trim() ? (on ? "bg-[#FAB822]" : "bg-[#5A826F]") : on ? "bg-[#F6F2EE]/25" : "bg-[#3F2F2D]/15")} />)}
              </div>
            </button>
          );
        })}
      </div>

      <p className="text-sm text-[#3F2F2D]/65">
        מנה בכל שורה. אפשר לכתוב כותרת קטנה לפני נקודתיים, למשל <b>מרק: ירקות</b> או <b>מנה טחונה: רסק פירות</b>.
        מנה שחוזרת בכל ימי השבוע תוצג במסך פעם אחת, תחת ״בכל יום״.
      </p>

      {/* ארוחות היום הנבחר — לפי סדר היום */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {MEALS.map(meal => {
          const snack = SNACK_MEALS.includes(meal);
          return (
            <section key={meal} className={"rounded-2xl p-4 shadow-[0_1px_2px_rgba(63,47,45,0.06)] " + (snack ? "bg-[#FBF9F7]" : "bg-white")}>
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <label htmlFor={"meal-" + meal} className="text-lg font-bold">{MEAL_LABELS[meal]}</label>
                <span className="text-xs tabular-nums text-[#3F2F2D]/50">בערך {MEAL_TIME[meal]}</span>
              </div>
              <textarea id={"meal-" + meal} rows={snack ? 2 : 7} disabled={loading || loadFailed}
                className={textareaCls + " resize-y " + (snack ? "min-h-[64px]" : "min-h-[170px]")}
                placeholder={PLACEHOLDER[meal]}
                value={texts[key(day, meal)] ?? ""}
                onChange={e => change(day, meal, e.target.value)} />
              <DishPreview text={texts[key(day, meal)] ?? ""} config={iconConfig} supabase={supabase} onSaved={setIconConfig} />
              <button type="button" onClick={() => copyToAllDays(meal)} disabled={loading || loadFailed || !(texts[key(day, meal)] ?? "").trim()}
                className="mt-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7] disabled:opacity-40">
                {copied === meal ? "הועתק לכל הימים" : "העתקה לכל ימי השבוע"}
              </button>
            </section>
          );
        })}
      </div>

      <section className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
        <label htmlFor="menu-notes" className="mb-2 block text-lg font-bold">הערות לכל השבוע</label>
        <textarea id="menu-notes" rows={3} disabled={loading || loadFailed} className={textareaCls + " resize-y"}
          placeholder={"תמיד תמצאו אצלנו גבינה לבנה, ריבה, ביסקוויטים, ירקות ולחם בכל שעות היום, גם בלילה.\nבתאבון!"}
          value={texts[NOTES_KEY] ?? ""} onChange={e => change(0, MENU_NOTES, e.target.value)} />
        <p className="mt-1 text-xs text-[#3F2F2D]/55">ההערות מופיעות למטה בתפריט היום ובתפריט השבועי.</p>
      </section>

      {/* איך זה ייראה במסך */}
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="me-2 text-lg font-bold">כך זה ייראה במסכים</h2>
          {(["menuToday", "menu"] as ViewKind[]).map(v => (
            <button key={v} type="button" onClick={() => setPreview(v)}
              className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (preview === v ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-white hover:bg-[#E3ECE7]")}>
              {v === "menuToday" ? `תפריט היום (יום ${DAY_NAMES[day]})` : "תפריט שבועי"}
            </button>
          ))}
        </div>
        <div className="mb-2 rounded-2xl bg-white px-4 py-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
          <Toggle label="תמונה ליד כל מנה (בתפריט היום ובתפריט השבועי). כבוי — תמונה רק ליד שם הארוחה"
            on={menuLinePhotos(iconConfig, "today") || menuLinePhotos(iconConfig, "week")} onChange={setLinePhotos} />
        </div>
        {linesMsg && <p role="status" className="mb-2 text-sm font-semibold text-[#5A826F]">{linesMsg}</p>}
        <ScreenFrame frameRef={frameRef}>
          <DepartmentDisplay
            iconConfig={iconConfig}
            department={{ id: "preview", name: "כל המחלקות", color: null }}
            weekDates={weekDates}
            days={EMPTY_DAYS}
            settings={displaySettings({})}
            board={weeklyBoardSettings({})}
            topic={null}
            menu={menu}
            menuNotes={notes}
            menuDayIndex={day}
            news={[]}
            media={[]}
            embeddedCu={cu}
            fixedView={preview}
          />
        </ScreenFrame>
        <p className="mt-2 text-sm text-[#3F2F2D]/60">במסכים במחלקות: הלוח השבועי, היום, תפריט היום, תפריט שבועי — בסבב. בלוח ״היום״ מופיעה גם הארוחה הבאה.</p>
      </div>
    </div>
  );
}

function SaveChip({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: ["שומר…", "bg-[#FDF0CC] text-[#6b4e00]"],
    saved: ["נשמר", "bg-[#E3ECE7] text-[#2c4037]"],
    error: ["לא נשמר — בדקו את החיבור. מה שכתוב יישמר לבד כשהחיבור יחזור", "bg-[#FDE8E1] text-[#7a2e22]"],
  } as const;
  const [text, cls] = map[state];
  return <span role="status" className={"rounded-full px-3 py-1 text-sm font-semibold " + cls}>{text}</span>;
}

/**
 * התמונה של כל מנה — לחיצה פותחת בחירה: אוטומטי, בלי תמונה, מנה אחרת או תמונה חדשה,
 * ועריכה ומחיקה של מנות שנוספו
 */
function DishPreview({ text, config, supabase, onSaved }: {
  text: string; config: IconConfig; supabase: SupabaseClient; onSaved: (cfg: IconConfig) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  return (
    <div className="mt-2">
      <ul className="flex flex-wrap gap-1.5" aria-label="תמונות המנות — לחיצה לשינוי">
        {lines.map((line, i) => {
          const k = dishKey(line, config);
          const manual = !!config.dishes?.lines?.[line];
          const on = open === line;
          return (
            <li key={i}>
              <button type="button" onClick={() => setOpen(on ? null : line)} aria-expanded={on}
                title={line + (k ? " — " + dishLabel(k, config) : " — בלי תמונה") + " · לחיצה לשינוי"}
                className={"flex items-center gap-1 rounded-full py-0.5 pe-2 ps-0.5 text-xs hover:ring-2 hover:ring-[#A9C8B8] "
                  + (on ? "ring-2 ring-[#5A826F] " : "") + (k ? "bg-[#F6F2EE]" : "bg-[#FDE8E1] text-[#3F2F2D]/70")}>
                {k
                  ? <img src={dishImage(k, config)} alt="" className="h-6 w-6 rounded-full object-cover" />
                  : <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px]">?</span>}
                <span className="max-w-[9rem] truncate">{k ? dishLabel(k, config) : "אין תמונה"}</span>
                {manual && <span className="text-[10px] text-[#5A826F]" aria-label="נבחר ידנית">●</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {open && lines.includes(open) && (
        <DishIconPicker supabase={supabase} line={open} config={config} onSaved={onSaved} onClose={() => setOpen(null)} />
      )}
    </div>
  );
}

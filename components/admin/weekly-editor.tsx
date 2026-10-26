"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronRight, ChevronLeft, Copy, ExternalLink, Loader2, RefreshCw, Trash2, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DepartmentDisplay, { type ViewKind } from "@/components/display/department-display";
import { insertActivities, updateActivity } from "@/lib/activities-db";
import { Field, Toggle, inputCls, usePreviewCu } from "@/components/admin/brand-ui";
import {
  DAY_CODES, DAY_NAMES, activitiesByDay, addDaysISO, displaySettings, israelDateISO, menuFromRows, shortDate,
  weekDatesISO, weekStartISO, weeklyBoardSettings,
  type ActivityRow, type BoardActivity, type DisplaySettings, type MenuRow, type WeeklyBoardSettings,
} from "@/lib/week";

type Dept = { id: string; name: string; code: string; color: string | null };
type Draft = {
  id: string | null;            // null = פעילות חדשה
  title: string;
  dayIndex: number;
  start: string;
  end: string;
  location: string;
  instructor: string;
  repeat: boolean;              // true = כל שבוע, false = רק בתאריך הזה
  fromCalendar: boolean;
};

const TICKER_OPTIONS: { value: string; label: string }[] = [
  { value: "both", label: "חדשות N12 והודעות" },
  { value: "news", label: "רק חדשות N12" },
  { value: "messages", label: "רק הודעות" },
  { value: "off", label: "בלי שורת רצה" },
];

/** גודל יחידת המסך בתצוגה המקדימה — לפי רוחב המסגרת */
export default function WeeklyEditor() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const search = useSearchParams();

  const [depts, setDepts] = useState<Dept[]>([]);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [display, setDisplay] = useState<DisplaySettings>(displaySettings({}));
  const [topic, setTopic] = useState<{ id: string | null; title: string; description: string }>({ id: null, title: "", description: "" });
  const [menuRows, setMenuRows] = useState<MenuRow[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [copyDays, setCopyDays] = useState<number[]>([]);
  const [view, setView] = useState<ViewKind>("weekly");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const today = israelDateISO();
  const weekStart = addDaysISO(weekStartISO(today), weekOffset * 7);
  const weekDates = weekDatesISO(weekStart);
  const dept = depts.find(d => d.id === deptId) ?? null;
  const board = weeklyBoardSettings(display.weekly_board);

  const flash = useCallback((msg: string) => {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 2500);
  }, []);

  /* ── טעינה ── */
  useEffect(() => {
    supabase.from("departments").select("id, name, code, color").order("name").then(({ data }) => {
      const list = (data ?? []) as Dept[];
      setDepts(list);
      const wanted = search.get("dept");
      setDeptId(list.find(d => d.code === wanted)?.id ?? list[0]?.id ?? null);
    });
    supabase.from("instructors").select("name").eq("is_active", true).order("name").then(({ data }) => {
      setInstructors((data ?? []).map((i: any) => i.name).filter(Boolean));
    });
  }, [supabase, search]);

  const loadActivities = useCallback(async () => {
    if (!deptId) return;
    const { data } = await supabase.from("activities").select("*").eq("department_id", deptId);
    setRows((data ?? []) as ActivityRow[]);
  }, [supabase, deptId]);

  useEffect(() => {
    if (!deptId) return;
    setDraft(null);
    loadActivities();
    supabase.from("screen_settings").select("id, display_settings").eq("department_id", deptId).maybeSingle().then(({ data }) => {
      setSettingsId(data?.id ?? null);
      setDisplay(displaySettings(data?.display_settings));
    });
  }, [supabase, deptId, loadActivities]);

  useEffect(() => {
    if (!deptId) return;
    supabase.from("weekly_topics").select("id, title, description, week_start").eq("department_id", deptId).eq("is_active", true)
      .lte("week_start", weekDates[6]).order("week_start", { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setTopic(data ? { id: data.week_start === weekStart ? data.id : null, title: data.title ?? "", description: data.description ?? "" } : { id: null, title: "", description: "" }));
    supabase.from("weekly_menus").select("week_start, day_index, meal, items").eq("week_start", weekStart)
      .then(({ data }) => setMenuRows((data ?? []) as MenuRow[]));
  }, [supabase, deptId, weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  const days = useMemo(() => activitiesByDay(rows, weekStart), [rows, weekStart]);
  const visibleRows = rows.filter(r => r.is_active !== false);

  /* ── רענון המסכים במחלקה אחרי שינוי ── */
  const pulse = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshScreens = useCallback(() => {
    if (!deptId) return;
    if (pulse.current) clearTimeout(pulse.current);
    pulse.current = setTimeout(async () => {
      await supabase.from("departments").update({ force_refresh: true }).eq("id", deptId);
      setTimeout(() => supabase.from("departments").update({ force_refresh: false }).eq("id", deptId), 3000);
    }, 1500);
  }, [supabase, deptId]);

  /* ── הגדרות תצוגה (נשמרות מיד) ── */
  const saveDisplay = useCallback(async (next: DisplaySettings) => {
    setDisplay(next);
    if (!deptId) return;
    const { data: cur } = await supabase.from("screen_settings").select("id, display_settings").eq("department_id", deptId).maybeSingle();
    const merged = { ...(cur?.display_settings ?? {}), ...next };
    const res = cur?.id
      ? await supabase.from("screen_settings").update({ display_settings: merged }).eq("id", cur.id)
      : await supabase.from("screen_settings").insert({ department_id: deptId, display_settings: merged });
    if (res.error) flash("לא נשמר: " + res.error.message);
    else { flash("נשמר"); refreshScreens(); }
  }, [supabase, deptId, flash, refreshScreens]);

  const setBoard = (patch: Partial<WeeklyBoardSettings>) => saveDisplay({ ...display, weekly_board: { ...board, ...patch } });

  /* ── עריכת פעילות ── */
  const openActivity = (a: BoardActivity) => {
    setView("weekly");
    setCopyDays([]);
    setDraft({ id: a.id, title: a.title, dayIndex: a.dayIndex, start: a.start, end: a.end, location: a.location, instructor: a.instructor, repeat: a.recurring, fromCalendar: a.fromCalendar });
  };
  const openNew = (dayIndex: number) => {
    setView("weekly");
    setCopyDays([]);
    setDraft({ id: null, title: "", dayIndex, start: "10:00", end: "", location: "", instructor: "", repeat: true, fromCalendar: false });
  };

  const rowFromDraft = (d: Draft, dayIndex: number) => ({
    title: d.title.trim(),
    start_time: d.start,
    end_time: d.end || null,
    location: d.location.trim() || null,
    instructor_name: d.instructor.trim() || null,
    day_of_week: DAY_CODES[dayIndex],
    activity_date: d.repeat ? null : weekDates[dayIndex],
    is_recurring: d.repeat,
    is_active: true,
  });

  const saveDraft = async () => {
    if (!draft || !deptId) return;
    if (!draft.title.trim()) { flash("צריך שם לפעילות"); return; }
    if (!/^\d{2}:\d{2}$/.test(draft.start)) { flash("צריך שעת התחלה"); return; }
    setBusy(true);
    const base = rowFromDraft(draft, draft.dayIndex);
    let error: string | null = null;
    if (draft.id) {
      const original = rows.find(r => String(r.id) === draft.id);
      const patch: Record<string, unknown> = { ...base };
      if (original?.external_uid) patch.source = "override"; // מעכשיו היומן לא ידרוס את השינוי
      const res = await updateActivity(supabase, draft.id, patch);
      error = res.error?.message ?? null;
    } else {
      const res = await insertActivities(supabase, [{ ...base, department_id: deptId, source: "manual" }]);
      error = res.error?.message ?? null;
    }
    if (!error && copyDays.length) {
      const copies = copyDays.filter(i => i !== draft.dayIndex).map(i => ({ ...rowFromDraft(draft, i), department_id: deptId, source: "manual" }));
      if (copies.length) error = (await insertActivities(supabase, copies)).error?.message ?? null;
    }
    setBusy(false);
    if (error) { flash("לא נשמר: " + error); return; }
    flash(copyDays.length ? "נשמר והועתק" : "נשמר");
    setDraft(null);
    await loadActivities();
    refreshScreens();
  };

  const deleteDraft = async () => {
    if (!draft?.id) return;
    setBusy(true);
    const original = rows.find(r => String(r.id) === draft.id);
    const res = original?.external_uid
      ? await updateActivity(supabase, draft.id, { is_active: false, source: "override" }) // נשאר מוסתר — היומן לא יחזיר אותו
      : await supabase.from("activities").delete().eq("id", draft.id);
    setBusy(false);
    if (res.error) { flash("לא נמחק: " + res.error.message); return; }
    flash("נמחק");
    setDraft(null);
    await loadActivities();
    refreshScreens();
  };

  /* ── נושא השבוע ── */
  const saveTopic = async () => {
    if (!deptId) return;
    const title = topic.title.trim();
    const description = topic.description.trim();
    let res;
    if (topic.id) res = await supabase.from("weekly_topics").update({ title, description, is_active: !!title }).eq("id", topic.id);
    else if (title) res = await supabase.from("weekly_topics").insert({ department_id: deptId, title, description, week_start: weekStart, is_active: true }).select("id").single();
    if (res?.error) { flash("לא נשמר: " + res.error.message); return; }
    if (res && "data" in res && res.data && (res.data as any).id) setTopic(t => ({ ...t, id: (res!.data as any).id }));
    flash("נושא השבוע נשמר");
    refreshScreens();
  };

  /* ── סנכרון מהיומן ── */
  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/calendar/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
      const json = await res.json();
      const results: { ok: boolean; label: string; message: string }[] = json.results ?? [];
      if (!res.ok) flash(json.error || "הסנכרון נכשל");
      else if (results.length === 0) flash("אין עדיין יומן מחובר — אפשר לחבר ב'ייבוא מהיומן'");
      else flash(results.map(r => (r.ok ? "✓ " : "✗ ") + (r.label || "יומן") + ": " + r.message).join(" | "));
      await loadActivities();
    } catch {
      flash("הסנכרון נכשל — בדקו את החיבור לאינטרנט");
    }
    setSyncing(false);
  };

  /* ── תצוגה מקדימה ── */
  const [cu, frameRef] = usePreviewCu();
  const previewDays = useMemo(() => {
    if (!draft) return days;
    // הפעילות שנערכת מוצגת כבר במיקום החדש
    const copy = days.map(d => d.filter(a => a.id !== draft.id));
    if (draft.title.trim() || !draft.id) {
      copy[draft.dayIndex] = [...copy[draft.dayIndex], {
        id: draft.id ?? "__draft", title: draft.title || "פעילות חדשה", start: draft.start, end: draft.end,
        location: draft.location, instructor: draft.instructor, dayIndex: draft.dayIndex as BoardActivity["dayIndex"],
        date: draft.repeat ? null : weekDates[draft.dayIndex], recurring: draft.repeat, fromCalendar: draft.fromCalendar,
      }].sort((a, b) => a.start.localeCompare(b.start));
    }
    return copy;
  }, [days, draft, weekDates]);

  const tickerValue = display.show_ticker ? display.ticker_source : "off";
  const calendarCount = visibleRows.filter(r => r.external_uid && r.activity_date && r.activity_date >= weekDates[0] && r.activity_date <= weekDates[6]).length;

  if (!dept) {
    return <div dir="rtl" className="p-10 text-lg text-slate-500">{depts.length ? "בוחרים מחלקה…" : "טוען…"}</div>;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#F6F2EE] text-[#3F2F2D]">
      {/* סרגל עליון */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-[#3F2F2D]/10 bg-[#F6F2EE]/95 px-6 py-3 backdrop-blur">
        <h1 className="text-2xl font-extrabold">לוח שבועי</h1>
        <div className="flex flex-wrap gap-1 rounded-full bg-white p-1">
          {depts.map(d => (
            <button key={d.id} onClick={() => { setDeptId(d.id); router.replace("/admin/weekly?dept=" + encodeURIComponent(d.code)); }}
              className={"rounded-full px-3 py-1.5 text-sm font-semibold transition-colors " + (d.id === deptId ? "bg-[#3F2F2D] text-[#F6F2EE]" : "text-[#3F2F2D]/70 hover:bg-[#E3ECE7]")}>
              {d.name}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-full bg-white p-1 text-sm font-semibold">
          <button aria-label="שבוע קודם" onClick={() => setWeekOffset(w => w - 1)} className="rounded-full p-1.5 hover:bg-[#E3ECE7]"><ChevronRight className="h-4 w-4" /></button>
          <span className="min-w-[9.5rem] text-center">
            {weekOffset === 0 ? "השבוע" : weekOffset === 1 ? "שבוע הבא" : weekOffset === -1 ? "שבוע שעבר" : "שבוע"}, {shortDate(weekDates[0])}–{shortDate(weekDates[6])}
          </span>
          <button aria-label="שבוע הבא" onClick={() => setWeekOffset(w => w + 1)} className="rounded-full p-1.5 hover:bg-[#E3ECE7]"><ChevronLeft className="h-4 w-4" /></button>
        </div>

        <div className="ms-auto flex items-center gap-2">
          {status && <span className="max-w-[28rem] truncate rounded-full bg-[#E3ECE7] px-3 py-1.5 text-sm font-semibold text-[#3F2F2D]" role="status">{status}</span>}
          <button onClick={syncNow} disabled={syncing}
            className="inline-flex items-center gap-2 rounded-full border border-[#5A826F]/40 bg-white px-4 py-2 text-sm font-semibold text-[#5A826F] hover:bg-[#E3ECE7] disabled:opacity-60">
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} סנכרון מהיומן
          </button>
          <Link href={"/display/" + dept.code} target="_blank"
            className="inline-flex items-center gap-2 rounded-full bg-[#3F2F2D] px-4 py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">
            <ExternalLink className="h-4 w-4" /> פתיחת המסך
          </Link>
        </div>
      </div>

      <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* תצוגה מקדימה — בדיוק כמו בטלוויזיה */}
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-sm">
            {(["weekly", "daily", "menu"] as ViewKind[]).map(k => (
              <button key={k} onClick={() => setView(k)}
                className={"rounded-full px-3 py-1.5 font-semibold " + (view === k ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-white text-[#3F2F2D]/70 hover:bg-[#E3ECE7]")}>
                {k === "weekly" ? "לוח שבועי" : k === "daily" ? "היום" : "תפריט"}
              </button>
            ))}
            <span className="ms-auto text-[#3F2F2D]/60">
              {view === "weekly" ? "לוחצים על פעילות כדי לערוך, או על ״+ הוספה״" : "כך זה ייראה במסך במחלקה"}
              {calendarCount > 0 && <span className="ms-3 whitespace-nowrap"><CalendarDays className="inline h-4 w-4 align-[-3px] text-[#5A826F]" /> {calendarCount} מהיומן</span>}
            </span>
          </div>
          <div ref={frameRef} className="relative w-full overflow-hidden rounded-2xl shadow-[0_10px_40px_rgba(63,47,45,0.15)] ring-1 ring-[#3F2F2D]/10" style={{ aspectRatio: "16 / 9" }}>
            <DepartmentDisplay
              department={{ id: dept.id, name: dept.name, color: dept.color }}
              weekDates={weekDates}
              days={previewDays}
              settings={display}
              board={board}
              topic={topic.title ? { title: topic.title, description: topic.description } : null}
              menu={menuFromRows(menuRows)}
              messages={[]}
              news={["כאן יופיעו כותרות N12 ו/או הודעות חשובות"]}
              media={[]}
              embeddedCu={cu}
              fixedView={view}
              editor={view === "weekly" ? { selectedId: draft?.id ?? (draft ? "__draft" : null), onSelect: openActivity, onAdd: openNew } : undefined}
            />
          </div>
        </div>

        {/* לוח צד */}
        <aside className="space-y-4">
          {draft ? (
            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold">{draft.id ? "עריכת פעילות" : "פעילות חדשה"}</h2>
                <button onClick={() => setDraft(null)} aria-label="סגירה" className="rounded-full p-1.5 hover:bg-[#E3ECE7]"><X className="h-4 w-4" /></button>
              </div>

              {draft.fromCalendar && (
                <p className="mb-4 rounded-xl bg-[#E3ECE7] p-3 text-sm leading-relaxed">
                  <CalendarDays className="me-1 inline h-4 w-4 align-[-3px] text-[#5A826F]" />
                  הפעילות הגיעה מהיומן. שינוי כאן נשמר במערכת, והיומן לא ידרוס אותו.
                </p>
              )}

              <div className="space-y-3">
                <Field label="שם הפעילות">
                  <input autoFocus value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} className={inputCls} placeholder="למשל: ערב שירה" />
                </Field>
                <Field label="יום">
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((n, i) => (
                      <button key={i} type="button" onClick={() => setDraft({ ...draft, dayIndex: i })}
                        className={"rounded-lg py-1.5 text-sm font-semibold " + (draft.dayIndex === i ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-[#F6F2EE] hover:bg-[#E3ECE7]")}>
                        {DAY_CODES[i]}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="שעת התחלה"><input type="time" aria-label="שעת התחלה" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} className={inputCls} /></Field>
                  <Field label="שעת סיום (לא חובה)"><input type="time" aria-label="שעת סיום" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} className={inputCls} /></Field>
                </div>
                <Field label="מקום">
                  <input value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} className={inputCls} placeholder="למשל: לובי מרכזי" list="weekly-locations" />
                  <datalist id="weekly-locations">
                    {Array.from(new Set(visibleRows.map(r => r.location).filter(Boolean))).map(l => <option key={l!} value={l!} />)}
                  </datalist>
                </Field>
                <Field label="מפעיל/ה">
                  <input value={draft.instructor} onChange={e => setDraft({ ...draft, instructor: e.target.value })} className={inputCls} placeholder="שם המפעיל/ה" list="weekly-instructors" />
                  <datalist id="weekly-instructors">
                    {Array.from(new Set([...instructors, ...visibleRows.map(r => r.instructor_name ?? "").filter(Boolean)])).map(n => <option key={n} value={n} />)}
                  </datalist>
                </Field>
                <Field label="חזרה">
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F6F2EE] p-1 text-sm font-semibold">
                    <button type="button" onClick={() => setDraft({ ...draft, repeat: true })} className={"rounded-lg py-2 " + (draft.repeat ? "bg-white shadow-sm" : "text-[#3F2F2D]/60")}>כל שבוע</button>
                    <button type="button" onClick={() => setDraft({ ...draft, repeat: false })} className={"rounded-lg py-2 " + (!draft.repeat ? "bg-white shadow-sm" : "text-[#3F2F2D]/60")}>רק ב-{shortDate(weekDates[draft.dayIndex])}</button>
                  </div>
                </Field>
                <Field label="להעתיק גם לימים">
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((n, i) => (
                      <button key={i} type="button" disabled={i === draft.dayIndex}
                        onClick={() => setCopyDays(c => c.includes(i) ? c.filter(x => x !== i) : [...c, i])}
                        className={"rounded-lg py-1.5 text-sm font-semibold disabled:opacity-30 " + (copyDays.includes(i) ? "bg-[#5A826F] text-white" : "bg-[#F6F2EE] hover:bg-[#E3ECE7]")}>
                        {DAY_CODES[i]}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>

              <div className="mt-5 flex items-center gap-2">
                <button onClick={saveDraft} disabled={busy}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3F2F2D] py-2.5 font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : copyDays.length ? <Copy className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  {copyDays.length ? `שמירה והעתקה ל-${copyDays.length} ימים` : "שמירה"}
                </button>
                {draft.id && (
                  <button onClick={deleteDraft} disabled={busy} aria-label="מחיקה"
                    className="inline-flex items-center gap-1 rounded-xl border border-red-200 px-3 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60">
                    <Trash2 className="h-4 w-4" /> מחיקה
                  </button>
                )}
              </div>
            </section>
          ) : (
            <>
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold">נושא השבוע</h2>
                <div className="space-y-2">
                  <input value={topic.title} onChange={e => setTopic({ ...topic, title: e.target.value })} className={inputCls} placeholder="למשל: סתיו בגינה" />
                  <input value={topic.description} onChange={e => setTopic({ ...topic, description: e.target.value })} className={inputCls} placeholder="משפט קצר (לא חובה)" />
                  <button onClick={saveTopic} className="w-full rounded-xl bg-[#5A826F] py-2 text-sm font-semibold text-white hover:bg-[#5A826F]/90">שמירת נושא השבוע</button>
                </div>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-1 text-lg font-bold">מה רואים בלוח</h2>
                <p className="mb-3 text-sm text-[#3F2F2D]/60">כל שינוי נשמר מיד ומופיע במסך.</p>
                <Field label="ימים">
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_NAMES.map((n, i) => {
                      const on = board.days.includes(i);
                      return (
                        <button key={i} type="button" aria-pressed={on}
                          onClick={() => setBoard({ days: on ? board.days.filter(x => x !== i) : [...board.days, i].sort() })}
                          className={"rounded-lg py-1.5 text-sm font-semibold " + (on ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-[#F6F2EE] text-[#3F2F2D]/50")}>
                          {DAY_CODES[i]}
                        </button>
                      );
                    })}
                  </div>
                </Field>
                <div className="mt-3 divide-y divide-[#3F2F2D]/10">
                  <Toggle label="מקום הפעילות" on={board.show_location} onChange={v => setBoard({ show_location: v })} />
                  <Toggle label="שם המפעיל/ה" on={board.show_instructor} onChange={v => setBoard({ show_instructor: v })} />
                  <Toggle label="שעת סיום" on={board.show_end_time} onChange={v => setBoard({ show_end_time: v })} />
                  <Toggle label="נושא השבוע" on={board.show_topic} onChange={v => setBoard({ show_topic: v })} />
                  <Toggle label="ימים שעברו בצבע חלש" on={board.dim_past_days} onChange={v => setBoard({ dim_past_days: v })} />
                  <Toggle label="להסתיר ימים בלי פעילויות" on={board.hide_empty_days} onChange={v => setBoard({ hide_empty_days: v })} />
                </div>
                <Field label="גודל טקסט" className="mt-3">
                  <div className="grid grid-cols-3 gap-1 rounded-xl bg-[#F6F2EE] p-1 text-sm font-semibold">
                    {(["s", "m", "l"] as const).map(sz => (
                      <button key={sz} type="button" onClick={() => setBoard({ text_size: sz })}
                        className={"rounded-lg py-2 " + (board.text_size === sz ? "bg-white shadow-sm" : "text-[#3F2F2D]/60")}>
                        {sz === "s" ? "קטן" : sz === "m" ? "רגיל" : "גדול"}
                      </button>
                    ))}
                  </div>
                </Field>
                <p className="mt-2 text-xs text-[#3F2F2D]/55">יום עמוס מתכווץ לבד כדי שהכול ייכנס במסך.</p>
              </section>

              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold">סבב המסך</h2>
                <div className="divide-y divide-[#3F2F2D]/10">
                  <Toggle label="1. לוח שבועי" on={display.show_weekly} onChange={v => saveDisplay({ ...display, show_weekly: v })} />
                  <Toggle label="2. היום (עכשיו ובהמשך)" on={display.show_daily} onChange={v => saveDisplay({ ...display, show_daily: v })} />
                  <Toggle label="3. תפריט שבועי" on={display.show_menu} onChange={v => saveDisplay({ ...display, show_menu: v })} />
                  <Toggle label="4. תמונות וקבצים" on={display.show_media} onChange={v => saveDisplay({ ...display, show_media: v })} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Field label="כל תצוגה (שניות)">
                    <input type="number" min={5} max={120} value={display.view_interval_seconds}
                      onChange={e => setDisplay({ ...display, view_interval_seconds: Number(e.target.value) })}
                      onBlur={() => saveDisplay({ ...display, view_interval_seconds: Math.max(5, Math.min(120, Number(display.view_interval_seconds) || 20)) })}
                      className={inputCls} />
                  </Field>
                  <Field label="שורת רצה">
                    <select value={tickerValue} className={inputCls}
                      onChange={e => {
                        const v = e.target.value;
                        saveDisplay(v === "off" ? { ...display, show_ticker: false } : { ...display, show_ticker: true, ticker_source: v as DisplaySettings["ticker_source"] });
                      }}>
                      {TICKER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
                <p className="mt-3 text-xs text-[#3F2F2D]/55">
                  הודעות חשובות לשורת הרצה ותמונות — ב<Link className="underline" href={"/admin/display-settings/" + dept.code}>הגדרות מחלקה</Link>.
                  כותרות קשות מ-N12 מסוננות אוטומטית.
                </p>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ChevronRight, ChevronLeft, Copy, ExternalLink, Loader2, RefreshCw, Repeat, Trash2, Undo2, Users, X, Check, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DepartmentDisplay, { type ViewKind } from "@/components/display/department-display";
import { insertActivities, updateActivity } from "@/lib/activities-db";
import { Field, Toggle, inputCls, usePreviewCu } from "@/components/admin/brand-ui";
import TopicCard from "@/components/admin/topic-card";
import { ensureInstructors, refreshDepartmentScreens } from "@/lib/screens";
import { cleanName, matchesActivity } from "@/lib/participants";
import InstructorSelect, { resolveInstructorName } from "@/components/admin/instructor-select";
import type { TopicData } from "@/lib/topics";
import {
  DAY_CODES, DAY_NAMES, activitiesByDay, addDaysISO, dayCodeIndex, dayIndexOf, displaySettings, israelDateISO, menuFromRows, menuNotesFromRows, shortDate,
  weekDatesISO, weekStartISO, weeklyBoardSettings,
  type ActivityRow, type BoardActivity, type DisplaySettings, type MenuRow, type WeeklyBoardSettings,
} from "@/lib/week";

type Dept = { id: string; name: string; code: string; color: string | null };
/** הפעילות שנערכה נשמרת כאן כשעוברים להוסיף מפעיל/ה, וחוזרת כשחוזרים */
const DRAFT_KEY = "eshkolot-weekly-draft";

type DeptResident = {
  id: string; name: string; room_number: string | null;
  personal_activity: string | null; group_activity: string | null; leisure_activity: string | null;
};
/**
 * סוג הפעילות שנערכת:
 * new — חדשה; recurring — קבועה, חוזרת כל שבוע; weekcopy — שינוי לשבוע אחד של פעילות קבועה;
 * oneoff — רק בתאריך אחד; calendar — הגיעה מיומן Outlook
 */
type DraftKind = "new" | "recurring" | "weekcopy" | "oneoff" | "calendar";
type Draft = {
  id: string | null;            // null = פעילות חדשה
  kind: DraftKind;
  title: string;
  dayIndex: number;
  /** ביום הזה הפעילות הקבועה מתקיימת (לפני השינוי) */
  originalDayIndex: number;
  start: string;
  end: string;
  location: string;
  instructor: string;
  repeat: boolean;              // לחדשה ולחד-פעמית: true = כל שבוע, false = רק בתאריך הזה
  fromCalendar: boolean;
  parentId: string | null;
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
  const pathname = usePathname();

  const [depts, setDepts] = useState<Dept[]>([]);
  const [deptId, setDeptId] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [settingsId, setSettingsId] = useState<string | null>(null);
  const [display, setDisplay] = useState<DisplaySettings>(displaySettings({}));
  const [previewTopic, setPreviewTopic] = useState<TopicData | null>(null);
  const [attendance, setAttendance] = useState<{ names: string[]; date: string } | null>(null);
  const [menuRows, setMenuRows] = useState<MenuRow[]>([]);
  const [instructors, setInstructors] = useState<string[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  // דיירי המחלקה, ומי רשום לפעילות שנערכת (בפעילות חדשה — נשמר יחד איתה)
  const [residents, setResidents] = useState<DeptResident[]>([]);
  const [registered, setRegistered] = useState<string[]>([]);
  const [regQuery, setRegQuery] = useState("");
  // שיוך מפעיל/ה (הגיעו מעמוד המפעילים): כל פעילות שנפתחת — עם המפעיל/ה הזה/זו
  const [assignName, setAssignName] = useState<string | null>(null);
  const restoreRef = useRef<{ dept: string; weekOffset: number; draft: Draft; registered: string[]; copyDays: number[]; instructor: string } | null>(null);
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

  /* ── חזרה מהוספת מפעיל/ה, או שיוך מפעיל/ה מעמוד המפעילים ── */
  useEffect(() => {
    const instructor = cleanName(search.get("instructor") ?? "");
    if (search.get("restore") === "1") {
      try {
        const raw = sessionStorage.getItem(DRAFT_KEY);
        sessionStorage.removeItem(DRAFT_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          restoreRef.current = { ...saved, instructor };
          setWeekOffset(saved.weekOffset ?? 0);
        }
      } catch { /* אין גישה לאחסון — פשוט פותחים את הלוח */ }
    } else if (instructor) {
      setAssignName(instructor);
    }
  }, [search]);

  const loadActivities = useCallback(async () => {
    if (!deptId) return;
    const { data } = await supabase.from("activities").select("*").eq("department_id", deptId);
    setRows((data ?? []) as ActivityRow[]);
  }, [supabase, deptId]);

  useEffect(() => {
    if (!deptId) return;
    setDraft(null);
    loadActivities();
    supabase.from("residents").select("id, name, room_number, personal_activity, group_activity, leisure_activity")
      .eq("department_id", deptId).eq("is_active", true).order("name")
      .then(({ data }) => setResidents(((data ?? []) as DeptResident[]).sort((a, b) => a.name.localeCompare(b.name, "he"))));
    supabase.from("screen_settings").select("id, display_settings").eq("department_id", deptId).maybeSingle().then(({ data }) => {
      setSettingsId(data?.id ?? null);
      setDisplay(displaySettings(data?.display_settings));
    });
  }, [supabase, deptId, loadActivities]);

  useEffect(() => {
    if (!deptId) return;
    setDraft(null);
    supabase.from("weekly_menus").select("week_start, day_index, meal, items").eq("week_start", weekStart)
      .then(({ data }) => setMenuRows((data ?? []) as MenuRow[]));
  }, [supabase, deptId, weekStart]);

  const days = useMemo(() => activitiesByDay(rows, weekStart), [rows, weekStart]);
  const visibleRows = rows.filter(r => r.is_active !== false);

  useEffect(() => {
    const r = restoreRef.current;
    if (!r || !dept || dept.code !== r.dept || weekOffset !== (r.weekOffset ?? 0)) return;
    restoreRef.current = null;
    setView("weekly");
    setDraft({ ...r.draft, instructor: r.instructor || r.draft.instructor });
    setRegistered(r.registered ?? []);
    setCopyDays(r.copyDays ?? []);
    if (r.instructor) setInstructors(list => (list.includes(r.instructor) ? list : [...list, r.instructor]));
    router.replace(pathname + "?dept=" + encodeURIComponent(dept.code));
  }, [dept, weekOffset]); // eslint-disable-line react-hooks/exhaustive-deps

  /** "+ מפעיל/ה חדש/ה": שומרים את הפעילות שנערכת ועוברים לעמוד המפעילים */
  const goAddInstructor = () => {
    if (!draft || !dept) return;
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ dept: dept.code, weekOffset, draft, registered, copyDays }));
    } catch { /* בלי אחסון — הפעילות לא תיפתח מחדש, אבל המפעיל/ה יתווסף/תתווסף */ }
    const back = `/admin/weekly?dept=${encodeURIComponent(dept.code)}&restore=1`;
    router.push(`/admin/instructors?add=1&back=${encodeURIComponent(back)}`);
  };

  const endAssign = () => {
    setAssignName(null);
    if (dept) router.replace(pathname + "?dept=" + encodeURIComponent(dept.code));
  };

  /* ── רענון המסכים במחלקה אחרי שינוי ── */
  const refreshScreens = useCallback(() => refreshDepartmentScreens(supabase, deptId), [supabase, deptId]);

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
    setRegQuery("");
    const kind: DraftKind = a.fromCalendar ? "calendar" : a.parentId ? "weekcopy" : a.recurring ? "recurring" : "oneoff";
    setDraft({
      id: a.id, kind, title: a.title, dayIndex: a.dayIndex, originalDayIndex: a.dayIndex, start: a.start, end: a.end,
      location: a.location, instructor: assignName ?? a.instructor, repeat: a.recurring, fromCalendar: a.fromCalendar, parentId: a.parentId,
    });
  };
  const openNew = (dayIndex: number) => {
    setView("weekly");
    setCopyDays([]);
    setRegQuery("");
    setRegistered([]);
    setDraft({ id: null, kind: "new", title: "", dayIndex, originalDayIndex: dayIndex, start: "10:00", end: "", location: "", instructor: assignName ?? "", repeat: true, fromCalendar: false, parentId: null });
  };

  /** שם המפעיל לשמירה: בלי רווחים מיותרים, ובכתיב של מפעיל שכבר קיים */
  const instructorChoices = useMemo(
    () => Array.from(new Set([...instructors, ...visibleRows.map(r => cleanName(r.instructor_name ?? "")).filter(Boolean)])).sort((a, b) => a.localeCompare(b, "he")),
    [instructors, visibleRows],
  );
  const resolveInstructor = (raw: string) => resolveInstructorName(raw, instructorChoices);

  /** שורה לשמירה. weekly=true — פעילות קבועה (בלי תאריך), אחרת — בתאריך של היום הזה בשבוע המוצג */
  const rowFromDraft = (d: Draft, dayIndex: number, weekly: boolean) => ({
    title: d.title.trim(),
    start_time: d.start,
    end_time: d.end || null,
    location: d.location.trim() || null,
    instructor_name: resolveInstructor(d.instructor) || null,
    day_of_week: DAY_CODES[dayIndex],
    activity_date: weekly ? null : weekDates[dayIndex],
    is_recurring: weekly,
    is_active: true,
  });

  /** הוספת השבוע (יום ראשון) לרשימת השבועות שבהם פעילות קבועה לא מוצגת */
  const skipWeek = async (row: ActivityRow | undefined, date: string, remove = false) => {
    if (!row) return "הפעילות לא נמצאה";
    const cur = (row.skip_dates ?? []).filter(Boolean);
    const next = remove ? cur.filter(d => d !== date) : Array.from(new Set([...cur, date])).sort();
    const res = await supabase.from("activities").update({ skip_dates: next }).eq("id", row.id);
    if (res.error) return /skip_dates/.test(res.error.message) ? "צריך להריץ את scripts/012_topics_plan_attendance.sql ב-Supabase" : res.error.message;
    return null;
  };

  /** mode: "week" — רק לשבוע המוצג, "all" — לכל השבועות (לפעילות קבועה) */
  const saveDraft = async (mode: "week" | "all" = "all") => {
    if (!draft || !deptId) return;
    if (!draft.title.trim()) { flash("צריך שם לפעילות"); return; }
    if (!/^\d{2}:\d{2}$/.test(draft.start)) { flash("צריך שעת התחלה"); return; }
    setBusy(true);
    const original = draft.id ? rows.find(r => String(r.id) === draft.id) : undefined;
    let error: string | null = null;
    // האם הפעילות (והעתקים לימים נוספים) נשמרת כקבועה
    let weekly = draft.repeat;
    // פעילויות חדשות שנוצרו עכשיו — הרשומים נשמרים גם אצלן
    const createdIds: string[] = [];

    if (draft.kind === "new") {
      const res = await insertActivities(supabase, [{ ...rowFromDraft(draft, draft.dayIndex, weekly), department_id: deptId, source: "manual" }]);
      error = res.error?.message ?? null;
      createdIds.push(...(res.data ?? []).map((r: any) => String(r.id)));
    } else if (draft.kind === "recurring" && mode === "week") {
      // שינוי רק לשבוע הזה: הקבועה לא מוצגת השבוע, ובמקומה העתק עם התאריך של השבוע
      weekly = false;
      error = await skipWeek(original, weekStart);
      if (!error) {
        const res = await supabase.from("activities").insert({
          ...rowFromDraft(draft, draft.dayIndex, false), department_id: deptId, source: "manual", parent_id: draft.id,
        });
        error = res.error?.message ?? null;
        // ההעתק לא נשמר — מחזירים את הפעילות הקבועה לשבוע הזה
        if (error) await skipWeek({ ...original!, skip_dates: [...(original?.skip_dates ?? []), weekStart] }, weekStart, true);
      }
    } else {
      if (draft.kind === "recurring") weekly = true;
      if (draft.kind === "weekcopy" || draft.kind === "calendar") weekly = false;
      const patch: Record<string, unknown> = { ...rowFromDraft(draft, draft.dayIndex, weekly) };
      if (original?.external_uid) patch.source = "override"; // מעכשיו היומן לא ידרוס את השינוי
      error = (await updateActivity(supabase, draft.id!, patch)).error?.message ?? null;
    }

    if (!error && copyDays.length) {
      const copies = copyDays.filter(i => i !== draft.dayIndex).map(i => ({ ...rowFromDraft(draft, i, weekly), department_id: deptId, source: "manual" }));
      if (copies.length) {
        const res = await insertActivities(supabase, copies);
        error = res.error?.message ?? null;
        createdIds.push(...(res.data ?? []).map((r: any) => String(r.id)));
      }
    }
    if (!error && createdIds.length && registered.length) {
      const res = await supabase.from("activity_participants").upsert(
        createdIds.flatMap(activity_id => registered.map(resident_id => ({ activity_id, resident_id }))), { onConflict: "activity_id,resident_id" },
      );
      if (res.error) error = "הפעילות נשמרה, אבל הרישום של הדיירים לא: " + res.error.message;
    }
    const instructorName = resolveInstructor(draft.instructor);
    if (!error && instructorName) {
      await ensureInstructors(supabase, [instructorName]); // קישור אישי למפעיל
      if (!instructors.includes(instructorName)) setInstructors(list => [...list, instructorName]);
    }
    setBusy(false);
    if (error) { flash("לא נשמר: " + error); return; }
    flash(
      assignName && instructorName === assignName ? `${assignName} שויך/ה לפעילות. אפשר לבחור עוד פעילות, או ״סיום השיוך״.`
      : mode === "week" && draft.kind === "recurring" ? "נשמר לשבוע הזה בלבד" : copyDays.length ? "נשמר והועתק" : "נשמר"
    );
    setDraft(null);
    await loadActivities();
    refreshScreens();
  };

  /** mode: "week" — רק השבוע, "all" — מכל השבועות, "restore" — ביטול שינוי שבועי וחזרה לפעילות הקבועה */
  const deleteDraft = async (mode: "week" | "all" | "restore" = "all") => {
    if (!draft?.id) return;
    setBusy(true);
    const original = rows.find(r => String(r.id) === draft.id);
    let error: string | null = null;
    if (draft.kind === "recurring" && mode === "week") {
      error = await skipWeek(original, weekStart);
    } else if (draft.kind === "weekcopy" && mode === "restore") {
      const parent = rows.find(r => String(r.id) === draft.parentId);
      error = (await supabase.from("activities").delete().eq("id", draft.id)).error?.message ?? null;
      if (!error && parent) error = await skipWeek(parent, weekStart, true);
    } else if (draft.kind === "recurring" && mode === "all") {
      // מחיקה מכל השבועות: גם השינויים לשבועות הבאים נמחקים (מה שכבר עבר נשאר בהיסטוריה)
      error = (await supabase.from("activities").delete().eq("parent_id", draft.id).gte("activity_date", today)).error?.message ?? null;
      if (!error) error = (await supabase.from("activities").delete().eq("id", draft.id)).error?.message ?? null;
    } else if (original?.external_uid) {
      error = (await updateActivity(supabase, draft.id, { is_active: false, source: "override" })).error?.message ?? null; // היומן לא יחזיר אותה
    } else {
      error = (await supabase.from("activities").delete().eq("id", draft.id)).error?.message ?? null;
    }
    setBusy(false);
    if (error) { flash("לא נמחק: " + error); return; }
    flash(mode === "restore" ? "חזרה לפעילות הקבועה" : mode === "week" || draft.kind === "weekcopy" ? "בוטל לשבוע הזה" : "נמחק");
    setDraft(null);
    await loadActivities();
    refreshScreens();
  };

  /* ── דיירים רשומים לפעילות שנערכת ── */
  // הרישום נשמר על הפעילות הקבועה; שינוי לשבוע אחד משתמש ברשומים שלה
  const regHome = draft?.id ? (draft.kind === "weekcopy" && draft.parentId ? draft.parentId : draft.id) : null;
  useEffect(() => {
    if (!draft?.id) return;
    const ids = [draft.id, draft.parentId].filter(Boolean) as string[];
    let alive = true;
    setRegistered([]);
    supabase.from("activity_participants").select("resident_id").in("activity_id", ids)
      .then(({ data }) => { if (alive) setRegistered(Array.from(new Set((data ?? []).map((p: any) => String(p.resident_id))))); });
    return () => { alive = false; };
  }, [supabase, draft?.id, draft?.parentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const setRegistration = async (residentIds: string[], on: boolean) => {
    if (!draft || !residentIds.length) return;
    const before = registered;
    setRegistered(on ? Array.from(new Set([...registered, ...residentIds])) : registered.filter(id => !residentIds.includes(id)));
    setRegQuery("");
    if (!regHome) return; // פעילות חדשה — נשמר כשלוחצים "שמירה"
    const res = on
      ? await supabase.from("activity_participants").upsert(residentIds.map(resident_id => ({ activity_id: regHome, resident_id })), { onConflict: "activity_id,resident_id" })
      : await supabase.from("activity_participants").delete().in("activity_id", [draft.id, draft.parentId].filter(Boolean) as string[]).in("resident_id", residentIds);
    if (res.error) { setRegistered(before); flash("הרישום לא נשמר: " + res.error.message); }
    else flash(on ? (residentIds.length > 1 ? `נרשמו ${residentIds.length} דיירים` : "נרשם/ה") : "הוסר/ה מהרישום");
  };

  /* ── נוכחות בפעילות שנבחרה ── */
  useEffect(() => {
    setAttendance(null);
    if (!draft?.id || draft.kind === "new") return;
    const row = rows.find(r => String(r.id) === draft.id);
    const date = draft.kind === "recurring" ? weekDates[draft.originalDayIndex] : row?.activity_date ?? weekDates[draft.dayIndex];
    if (!date || date > today) return;
    let alive = true;
    supabase.from("activity_attendance").select("resident_name").eq("activity_id", draft.id).eq("occurrence_date", date)
      .then(({ data, error }) => { if (alive && !error) setAttendance({ date, names: (data ?? []).map((r: any) => r.resident_name).sort((a: string, b: string) => a.localeCompare(b, "he")) }); });
    return () => { alive = false; };
  }, [supabase, draft?.id, draft?.kind, draft?.originalDayIndex, weekStart, today]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── שבוע ריק: הפעילויות נשמרו פעם לשבוע אחד ── */
  const dated = useMemo(() => visibleRows.filter(r => r.activity_date && !r.external_uid && !r.parent_id), [visibleRows]);
  const emptyWeek = days.every(d => d.length === 0);
  const templateWeek = useMemo(() => {
    const past = dated.filter(r => r.activity_date! < weekStart);
    if (!emptyWeek || past.length === 0) return null;
    const latest = past.map(r => r.activity_date!).sort().pop()!;
    const ws = weekStartISO(latest);
    const list = past.filter(r => weekStartISO(r.activity_date!) === ws);
    return { weekStart: ws, rows: list };
  }, [emptyWeek, dated, weekStart]);

  /* ── פעילויות קבועות שבוטלו לשבוע הזה (בלי שינוי במקומן) ── */
  const cancelledThisWeek = useMemo(() => visibleRows.filter(r => {
    if (r.activity_date || !r.day_of_week) return false;
    if (dayCodeIndex(r.day_of_week) < 0 || !(r.skip_dates ?? []).includes(weekStart)) return false;
    return !visibleRows.some(c => c.parent_id === r.id && c.activity_date && c.activity_date >= weekDates[0] && c.activity_date <= weekDates[6]);
  }), [visibleRows, weekDates, weekStart]);

  const restoreCancelled = async (r: ActivityRow) => {
    setBusy(true);
    const error = await skipWeek(r, weekStart, true);
    setBusy(false);
    if (error) { flash("לא הוחזר: " + error); return; }
    flash("הפעילות חזרה לשבוע הזה");
    await loadActivities();
    refreshScreens();
  };

  const makeRecurring = async () => {
    if (!templateWeek) return;
    setBusy(true);
    let error: string | null = null;
    for (const r of templateWeek.rows) {
      const res = await supabase.from("activities").update({
        activity_date: null, is_recurring: true, day_of_week: DAY_CODES[dayIndexOf(r.activity_date!)],
      }).eq("id", r.id);
      if (res.error) { error = res.error.message; break; }
    }
    setBusy(false);
    if (error) { flash("לא הצליח: " + error); return; }
    flash("הלוח חוזר מעכשיו כל שבוע");
    await loadActivities();
    refreshScreens();
  };

  const copyTemplateHere = async () => {
    if (!templateWeek || !deptId) return;
    setBusy(true);
    const copies = templateWeek.rows.map(r => {
      const idx = dayIndexOf(r.activity_date!);
      return {
        department_id: deptId, title: r.title, start_time: r.start_time, end_time: r.end_time, location: r.location ?? null,
        instructor_name: r.instructor_name ?? null, day_of_week: DAY_CODES[idx], activity_date: weekDates[idx],
        is_recurring: false, is_active: true, source: "manual",
      };
    });
    const res = await insertActivities(supabase, copies);
    setBusy(false);
    if (res.error) { flash("לא הועתק: " + res.error.message); return; }
    flash("הועתק לשבוע הזה");
    await loadActivities();
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
        date: draft.repeat ? null : weekDates[draft.dayIndex], recurring: draft.repeat, fromCalendar: draft.fromCalendar, parentId: draft.parentId,
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
          {assignName && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[#E3ECE7] p-4 text-[15px]" role="status">
              <Users className="h-5 w-5 shrink-0 text-[#5A826F]" />
              <span className="min-w-0 flex-1">
                משייכים את <b>{assignName}</b>: לוחצים על פעילות בלוח, או על ״+ הוספה״ לפעילות חדשה. בפעילות בוחרים גם אילו דיירים רשומים, ושומרים.
              </span>
              <button onClick={endAssign} className="rounded-xl bg-[#3F2F2D] px-3.5 py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90">סיום השיוך</button>
            </div>
          )}
          {templateWeek && (
            <div className="mb-3 flex flex-wrap items-center gap-3 rounded-2xl bg-[#FDF0CC] p-4 text-[15px]">
              <span className="min-w-0 flex-1">
                בשבוע הזה אין פעילויות בלוח. בשבוע של {shortDate(templateWeek.weekStart)} נשמרו {templateWeek.rows.length} פעילויות לשבוע אחד בלבד.
              </span>
              <button onClick={makeRecurring} disabled={busy}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#3F2F2D] px-3.5 py-2 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-60">
                <Repeat className="h-4 w-4" /> להפוך ללוח קבוע שחוזר כל שבוע
              </button>
              <button onClick={copyTemplateHere} disabled={busy}
                className="rounded-xl border border-[#3F2F2D]/20 bg-white px-3.5 py-2 text-sm font-semibold hover:bg-[#F6F2EE] disabled:opacity-60">
                להעתיק רק לשבוע הזה
              </button>
            </div>
          )}
          <div ref={frameRef} className="relative w-full overflow-hidden rounded-2xl shadow-[0_10px_40px_rgba(63,47,45,0.15)] ring-1 ring-[#3F2F2D]/10" style={{ aspectRatio: "16 / 9" }}>
            <DepartmentDisplay
              department={{ id: dept.id, name: dept.name, color: dept.color }}
              weekDates={weekDates}
              days={previewDays}
              settings={display}
              board={board}
              topic={previewTopic}
              menu={menuFromRows(menuRows)}
              menuNotes={menuNotesFromRows(menuRows)}
              messages={[]}
              news={["כאן יופיעו כותרות N12 ו/או הודעות חשובות"]}
              media={[]}
              embeddedCu={cu}
              fixedView={view}
              editor={view === "weekly" ? { selectedId: draft?.id ?? (draft ? "__draft" : null), onSelect: openActivity, onAdd: openNew } : undefined}
            />
          </div>

          {cancelledThisWeek.length > 0 && (
            <div className="mt-3 rounded-2xl bg-white p-4 text-sm shadow-sm">
              <div className="mb-2 font-bold">פעילויות קבועות שבוטלו השבוע</div>
              <ul className="space-y-1.5">
                {cancelledThisWeek.map(r => (
                  <li key={r.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate">
                      <span className="font-semibold">{r.title}</span>
                      <span className="text-[#3F2F2D]/60">, יום {DAY_NAMES[dayCodeIndex(r.day_of_week!)]} {String(r.start_time ?? "").slice(0, 5)}</span>
                    </span>
                    <button onClick={() => restoreCancelled(r)} disabled={busy}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 font-semibold text-[#5A826F] hover:bg-[#E3ECE7] disabled:opacity-60">
                      <Undo2 className="h-4 w-4" /> החזרה
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
              {draft.kind === "recurring" && (
                <p className="mb-4 rounded-xl bg-[#F6F2EE] p-3 text-sm leading-relaxed">
                  <Repeat className="me-1 inline h-4 w-4 align-[-3px] text-[#5A826F]" />
                  פעילות קבועה — חוזרת כל שבוע. אפשר לשנות רק לשבוע הזה, או לכל השבועות.
                </p>
              )}
              {draft.kind === "weekcopy" && (
                <p className="mb-4 rounded-xl bg-[#FDF0CC] p-3 text-sm leading-relaxed">
                  שינוי לשבוע הזה בלבד. בשבוע הבא חוזרת הפעילות הקבועה.
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
                  <InstructorSelect value={draft.instructor} choices={instructorChoices}
                    onChange={v => setDraft({ ...draft, instructor: v })} onAddNew={goAddInstructor} />
                  {assignName && cleanName(draft.instructor) === assignName && draft.id && (
                    <p className="mt-1 text-xs font-semibold text-[#5A826F]">שומרים כדי לשייך את {assignName} לפעילות הזו.</p>
                  )}
                </Field>
                {(draft.kind === "new" || draft.kind === "oneoff") && <Field label="חזרה">
                  <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#F6F2EE] p-1 text-sm font-semibold">
                    <button type="button" onClick={() => setDraft({ ...draft, repeat: true })} className={"rounded-lg py-2 " + (draft.repeat ? "bg-white shadow-sm" : "text-[#3F2F2D]/60")}>כל שבוע</button>
                    <button type="button" onClick={() => setDraft({ ...draft, repeat: false })} className={"rounded-lg py-2 " + (!draft.repeat ? "bg-white shadow-sm" : "text-[#3F2F2D]/60")}>רק ב-{shortDate(weekDates[draft.dayIndex])}</button>
                  </div>
                </Field>}
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

              <ResidentsField
                title={draft.title}
                instructor={draft.instructor}
                residents={residents}
                registered={registered}
                query={regQuery}
                onQuery={setRegQuery}
                isNew={!draft.id}
                sharedWithRecurring={draft.kind === "weekcopy" || draft.kind === "recurring"}
                onChange={setRegistration}
              />

              {attendance && (
                <div className="mt-4 rounded-xl bg-[#E3ECE7] p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1.5 font-bold text-[#375044]">
                    <Users className="h-4 w-4" />
                    {attendance.names.length ? `השתתפו ב-${shortDate(attendance.date)}: ${attendance.names.length}` : `עוד לא סומנה נוכחות ל-${shortDate(attendance.date)}`}
                  </div>
                  {attendance.names.length > 0 && <p className="leading-relaxed">{attendance.names.join(", ")}</p>}
                  {!attendance.names.length && <p className="text-[#3F2F2D]/65">המפעיל/ה מסמן/ת מי השתתף בעמוד האישי שלו/ה.</p>}
                </div>
              )}

              {draft.kind === "recurring" ? (
                <div className="mt-5 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => saveDraft("week")} disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#3F2F2D] py-2.5 text-sm font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-60">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} שמירה לשבוע הזה
                    </button>
                    <button onClick={() => saveDraft("all")} disabled={busy}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#5A826F] py-2.5 text-sm font-semibold text-white hover:bg-[#5A826F]/90 disabled:opacity-60">
                      <Repeat className="h-4 w-4" /> שמירה לכל השבועות
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => deleteDraft("week")} disabled={busy}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#B56262]/30 py-2 text-sm font-semibold text-[#9e4f4f] hover:bg-[#FDE8E1] disabled:opacity-60">
                      <X className="h-4 w-4" /> ביטול השבוע
                    </button>
                    <button onClick={() => deleteDraft("all")} disabled={busy}
                      className="inline-flex items-center justify-center gap-1 rounded-xl border border-[#B56262]/30 py-2 text-sm font-semibold text-[#9e4f4f] hover:bg-[#FDE8E1] disabled:opacity-60">
                      <Trash2 className="h-4 w-4" /> מחיקה מכל השבועות
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <button onClick={() => saveDraft()} disabled={busy}
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3F2F2D] py-2.5 font-semibold text-[#F6F2EE] hover:bg-[#3F2F2D]/90 disabled:opacity-60">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : copyDays.length ? <Copy className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    {copyDays.length ? `שמירה והעתקה ל-${copyDays.length} ימים` : "שמירה"}
                  </button>
                  {draft.kind === "weekcopy" && (
                    <button onClick={() => deleteDraft("restore")} disabled={busy}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#3F2F2D]/15 px-3 py-2.5 text-sm font-semibold hover:bg-[#F6F2EE] disabled:opacity-60">
                      <Undo2 className="h-4 w-4" /> חזרה לקבוע
                    </button>
                  )}
                  {draft.id && (
                    <button onClick={() => deleteDraft()} disabled={busy}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#B56262]/30 px-3 py-2.5 text-sm font-semibold text-[#9e4f4f] hover:bg-[#FDE8E1] disabled:opacity-60">
                      <Trash2 className="h-4 w-4" /> {draft.kind === "weekcopy" ? "ביטול השבוע" : "מחיקה"}
                    </button>
                  )}
                </div>
              )}
            </section>
          ) : (
            <>
              <TopicCard supabase={supabase} deptId={dept.id} weekStart={weekStart} onPreview={setPreviewTopic} />

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
                  <Toggle label="אייקון ליד כל פעילות" on={board.show_icons !== false} onChange={v => setBoard({ show_icons: v })} />
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
                  <Toggle label="3. פיזיותרפיה (מי מוזמן היום)" on={display.show_physio !== false} onChange={v => saveDisplay({ ...display, show_physio: v })} />
                  <Toggle label="4. תפריט היום" on={display.show_menu_today !== false} onChange={v => saveDisplay({ ...display, show_menu_today: v })} />
                  <Toggle label="5. תפריט שבועי" on={display.show_menu} onChange={v => saveDisplay({ ...display, show_menu: v })} />
                  <Toggle label="6. תמונות וקבצים" on={display.show_media} onChange={v => saveDisplay({ ...display, show_media: v })} />
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

/** דיירים רשומים לפעילות: הסרה, הוספה בחיפוש, והצעות לפי כרטיס הדייר */
function ResidentsField({ title, instructor, residents, registered, query, onQuery, isNew, sharedWithRecurring, onChange }: {
  title: string;
  instructor: string;
  residents: DeptResident[];
  registered: string[];
  query: string;
  onQuery: (v: string) => void;
  isNew: boolean;
  sharedWithRecurring: boolean;
  onChange: (residentIds: string[], on: boolean) => void;
}) {
  const reg = residents.filter(r => registered.includes(r.id));
  const suggested = cleanName(title).length >= 2 || cleanName(instructor)
    ? residents.filter(r => !registered.includes(r.id) && matchesActivity(title, r, instructor))
    : [];
  const q = cleanName(query);
  const found = q ? residents.filter(r => !registered.includes(r.id) && (r.name.includes(q) || (r.room_number ?? "") === q)).slice(0, 8) : [];

  return (
    <section className="mt-4 rounded-xl border border-[#3F2F2D]/10 p-3" aria-label="דיירים רשומים">
      <h3 className="mb-2 flex items-center gap-1.5 font-bold">
        <Users className="h-4 w-4 text-[#5A826F]" /> דיירים רשומים
        {reg.length > 0 && <span className="font-semibold text-[#3F2F2D]/55">({reg.length})</span>}
      </h3>

      {residents.length === 0 ? (
        <p className="text-sm text-[#3F2F2D]/60">
          אין עדיין דיירים במחלקה. מוסיפים ב<Link href="/admin/residents" className="font-semibold text-[#5A826F] underline">דיירים</Link>.
        </p>
      ) : (
        <>
          {reg.length ? (
            <ul className="mb-2 flex flex-wrap gap-1.5">
              {reg.map(r => (
                <li key={r.id} className="inline-flex items-center gap-1 rounded-full bg-[#E3ECE7] py-1 pe-1 ps-2.5 text-sm">
                  {r.name}
                  <button type="button" aria-label={"הסרת " + r.name + " מהרישום"} onClick={() => onChange([r.id], false)}
                    className="rounded-full p-0.5 text-[#3F2F2D]/60 hover:bg-white hover:text-[#9e4f4f]">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-sm text-[#3F2F2D]/60">עוד אין רשומים. בסימון הנוכחות יופיעו כל דיירי המחלקה.</p>
          )}

          {suggested.length > 0 && (
            <div className="mb-2 rounded-lg bg-[#FDF0CC] p-2.5 text-sm">
              <div className="mb-1.5">לפי כרטיס הדייר, מתאימים לפעילות הזו:</div>
              <div className="flex flex-wrap gap-1.5">
                {suggested.map(r => (
                  <button key={r.id} type="button" onClick={() => onChange([r.id], true)}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-semibold hover:bg-[#E3ECE7]">
                    <Plus className="h-3.5 w-3.5" /> {r.name}
                  </button>
                ))}
              </div>
              {suggested.length > 1 && (
                <button type="button" onClick={() => onChange(suggested.map(r => r.id), true)}
                  className="mt-2 font-semibold text-[#5A826F] hover:underline">
                  לרשום את כל ה-{suggested.length}
                </button>
              )}
            </div>
          )}

          <input value={query} onChange={e => onQuery(e.target.value)} className={inputCls}
            placeholder="הוספת דייר/ת: שם או מספר חדר" aria-label="חיפוש דייר/ת להוספה" />
          {found.length > 0 && (
            <ul className="mt-1 overflow-hidden rounded-xl border border-[#3F2F2D]/10">
              {found.map(r => (
                <li key={r.id}>
                  <button type="button" onClick={() => onChange([r.id], true)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2 text-right text-sm hover:bg-[#E3ECE7]">
                    <span className="font-semibold">{r.name}</span>
                    {r.room_number && <span className="text-[#3F2F2D]/55">חדר {r.room_number}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q && found.length === 0 && <p className="mt-1 text-sm text-[#3F2F2D]/55">לא נמצא/ה דייר/ת כזה/זו במחלקה, או שכבר רשום/ה.</p>}
          <p className="mt-2 text-xs text-[#3F2F2D]/55">
            {isNew ? "הרשומים יישמרו יחד עם הפעילות." : sharedWithRecurring ? "נשמר מיד, ומשותף לכל השבועות של הפעילות." : "נשמר מיד."}
            {" "}הרשומים מופיעים ראשונים אצל המפעיל/ה בסימון הנוכחות.
          </p>
        </>
      )}
    </section>
  );
}

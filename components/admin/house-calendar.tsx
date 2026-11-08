"use client";

// יומן אחד לכל המחלקות — במקום יומן Outlook.
// אירוע נשמר כפעילות בכל מחלקה שנבחרה, עם מזהה משותף (external_uid = "evt:…"),
// ולכן מופיע לבד בלוחות של המחלקות. עריכה ומחיקה חלות על כל המחלקות של האירוע יחד.
// הפעילויות הקבועות של הלוחות מוצגות כאן לפי בחירה, ונערכות בעורך הלוח של כל מחלקה.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ChevronLeft, ChevronRight, MapPin, Plus, Repeat, User, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card, Field, btnGhost, btnPrimary, btnSage, inputCls } from "@/components/admin/brand-ui";
import InstructorSelect, { resolveInstructorName, useInstructorNames } from "@/components/admin/instructor-select";
import { insertActivities, updateActivity } from "@/lib/activities-db";
import { ensureInstructors, refreshDepartmentScreens } from "@/lib/screens";
import {
  DAY_CODES, DAY_NAMES, activitiesByDay, addDaysISO, dayIndexOf, israelDateISO, shortDate, toMinutes, weekDatesISO, weekStartISO,
  type ActivityRow,
} from "@/lib/week";

type Dept = { id: string; name: string; code: string | null; color: string | null };
type Row = ActivityRow & { department_id: string };

/** פריט ביומן: מופע ביום מסוים — אולי באותו זמן בכמה מחלקות */
type Item = {
  key: string;
  title: string;
  start: string;
  end: string;
  location: string;
  instructor: string;
  date: string;
  recurring: boolean;
  group: string | null;   // אירוע של היומן (evt:…)
  outlook: boolean;       // הגיע מאאוטלוק
  rows: Row[];
  deptIds: string[];
};

type Draft = {
  item: Item | null;      // null — אירוע חדש
  title: string;
  date: string;
  weekly: boolean;
  start: string;
  end: string;
  location: string;
  instructor: string;
  deptIds: string[];
};

const EVT = "evt:";
const isEvent = (r: Row) => String(r.external_uid ?? "").startsWith(EVT);
const isOutlook = (r: Row) => String(r.external_uid ?? "").startsWith("cal:");
const newGroup = () => EVT + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const hm = (t: string | null | undefined) => String(t ?? "").slice(0, 5);
const MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
const FALLBACK_COLOR = "#5A826F";

/** הפעילויות הקבועות, והפעילויות עם תאריך בטווח שמוצג (בדפים של 1000 — המגבלה של שאילתה אחת) */
async function fetchActivities(supabase: SupabaseClient, from: string, to: string): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.from("activities").select("*").eq("is_active", true)
      .or(`activity_date.is.null,and(activity_date.gte.${from},activity_date.lte.${to})`)
      .order("id").range(i * 1000, i * 1000 + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** כל השורות שהגיעו מאאוטלוק ועדיין פעילות */
async function fetchOutlookRows(supabase: SupabaseClient): Promise<Row[]> {
  const out: Row[] = [];
  for (let i = 0; i < 50; i++) {
    const { data, error } = await supabase.from("activities").select("*").eq("is_active", true).eq("source", "calendar")
      .order("id").range(i * 1000, i * 1000 + 999);
    if (error) throw error;
    out.push(...((data ?? []) as Row[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

/** הפריטים של שבוע, יום אחרי יום. פעילויות זהות בכמה מחלקות — פריט אחד */
function weekItems(rows: Row[], weekStart: string, showFixed: boolean): Item[][] {
  const dates = weekDatesISO(weekStart);
  const byId = new Map(rows.map(r => [String(r.id), r]));
  const byDept = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byDept.get(r.department_id);
    if (list) list.push(r); else byDept.set(r.department_id, [r]);
  }
  const days: Item[][] = [[], [], [], [], [], [], []];
  const merged = new Map<string, Item>();
  for (const [deptId, list] of byDept) {
    activitiesByDay(list, weekStart).forEach((day, i) => {
      for (const a of day) {
        const row = byId.get(a.id);
        if (!row) continue;
        const recurring = !row.activity_date;
        const event = isEvent(row);
        if (recurring && !event && !showFixed) continue;
        const group = event ? String(row.external_uid) : null;
        // אותו אירוע בכמה מחלקות — כרטיס אחד; אם במחלקה אחת שינו שעה או שם — כרטיס נפרד
        const key = (group ? group + "|" + a.start + "|" + a.title + "|" + recurring : "m:" + [a.title, a.start, a.end, a.location, a.instructor, recurring].join("|")) + "@" + dates[i];
        const found = merged.get(key);
        if (found) {
          found.rows.push(row);
          if (!found.deptIds.includes(deptId)) found.deptIds.push(deptId);
          continue;
        }
        const item: Item = {
          key, title: a.title, start: a.start, end: a.end, location: a.location, instructor: a.instructor,
          date: dates[i], recurring, group, outlook: isOutlook(row), rows: [row], deptIds: [deptId],
        };
        merged.set(key, item);
        days[i].push(item);
      }
    });
  }
  for (const d of days) d.sort((x, y) => toMinutes(x.start) - toMinutes(y.start) || x.title.localeCompare(y.title, "he"));
  return days;
}

export default function HouseCalendar() {
  const supabase = useMemo(() => createClient(), []);
  const today = israelDateISO();
  const [mode, setMode] = useState<"week" | "month">("week");
  const [anchor, setAnchor] = useState(today);
  const [rows, setRows] = useState<Row[]>([]);
  const [depts, setDepts] = useState<Dept[]>([]);
  const [outlookActive, setOutlookActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState<string[]>([]);
  const [showFixed, setShowFixed] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [viewItem, setViewItem] = useState<Item | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [askDelete, setAskDelete] = useState(false);
  const [askOutlook, setAskOutlook] = useState(false);
  const instructorNames = useInstructorNames();

  // סינון והצגת הקבועות נשמרים בדפדפן (נוחות בלבד)
  useEffect(() => {
    try {
      const f = JSON.parse(localStorage.getItem("calendar.filter") ?? "[]");
      if (Array.isArray(f)) setFilter(f.filter((x: unknown) => typeof x === "string"));
      setShowFixed(localStorage.getItem("calendar.fixed") === "1");
    } catch { /* בלי זיכרון — ברירת מחדל */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("calendar.filter", JSON.stringify(filter)); localStorage.setItem("calendar.fixed", showFixed ? "1" : "0"); } catch { /* */ } }, [filter, showFixed]);

  /* ── טווח התצוגה ── */
  const weekStart = weekStartISO(anchor);
  const weekDates = weekDatesISO(weekStart);
  const [y, m] = anchor.split("-").map(Number);
  const monthFirst = `${y}-${String(m).padStart(2, "0")}-01`;
  const monthWeeks = useMemo(() => {
    const out: string[] = [];
    let ws = weekStartISO(monthFirst);
    while (true) {
      out.push(ws);
      ws = addDaysISO(ws, 7);
      if (Number(ws.slice(5, 7)) !== m) break;
    }
    return out;
  }, [monthFirst, m]);
  const rangeFrom = mode === "week" ? weekDates[0] : monthWeeks[0];
  const rangeTo = mode === "week" ? weekDates[6] : addDaysISO(monthWeeks[monthWeeks.length - 1], 6);

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [d, list, src] = await Promise.all([
        supabase.from("departments").select("id, name, code, color").order("name"),
        fetchActivities(supabase, rangeFrom, rangeTo),
        supabase.from("calendar_sources").select("id, is_active"),
      ]);
      setDepts((d.data ?? []) as Dept[]);
      setRows(list);
      setOutlookActive((src.data ?? []).filter((x: any) => x.is_active !== false).length);
    } catch (e: any) {
      setLoadError("לא הצלחנו לטעון את היומן: " + (e?.message ?? "שגיאה"));
    }
    setLoading(false);
  }, [supabase, rangeFrom, rangeTo]);
  useEffect(() => { load(); }, [load]);

  const deptById = useMemo(() => new Map(depts.map(d => [d.id, d])), [depts]);
  const locations = useMemo(() => Array.from(new Set(rows.map(r => String(r.location ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")), [rows]);

  // הפריטים נבנים מכל המחלקות (כדי שעריכה תחול על כל המחלקות של האירוע), והסינון רק מסתיר כרטיסים
  const visible = useCallback((list: Item[]) => (filter.length ? list.filter(it => it.deptIds.some(d => filter.includes(d))) : list), [filter]);
  const weekAll = useMemo(() => weekItems(rows, weekStart, true), [rows, weekStart]);
  const week = useMemo(() => weekAll.map(list => visible(list.filter(it => showFixed || !it.recurring || !!it.group))), [weekAll, visible, showFixed]);
  const fixedCount = useMemo(() => weekAll.flat().filter(it => it.recurring && !it.group && visible([it]).length > 0).length, [weekAll, visible]);
  const monthDays = useMemo(() => (mode === "month" ? monthWeeks.map(ws => weekItems(rows, ws, false).map(visible)) : []), [mode, monthWeeks, rows, visible]);

  const rangeLabel = mode === "week"
    ? `${shortDate(weekDates[0])}–${shortDate(weekDates[6])}`
    : `${MONTHS[m - 1]} ${y}`;
  const step = (dir: -1 | 1) => {
    if (mode === "week") setAnchor(a => addDaysISO(a, 7 * dir));
    else {
      const nm = m + dir;
      const ny = nm < 1 ? y - 1 : nm > 12 ? y + 1 : y;
      const mm = nm < 1 ? 12 : nm > 12 ? 1 : nm;
      setAnchor(`${ny}-${String(mm).padStart(2, "0")}-01`);
    }
  };

  /* ── אירוע חדש / עריכה ── */
  const openNew = (date: string) => {
    setMsg(""); setAskDelete(false); setViewItem(null);
    setDraft({ item: null, title: "", date, weekly: false, start: "16:00", end: "", location: "", instructor: "", deptIds: filter.length ? [...filter] : [] });
  };
  const openItem = (it: Item) => {
    setMsg(""); setAskDelete(false);
    // פעילות קבועה של הלוח — נערכת בעורך הלוח של המחלקה
    if (it.recurring && !it.group) { setDraft(null); setViewItem(it); return; }
    setViewItem(null);
    setDraft({
      item: it, title: it.title, date: it.date, weekly: it.recurring, start: it.start, end: it.end,
      location: it.location, instructor: it.instructor, deptIds: [...it.deptIds],
    });
  };

  /** הבדיקות לפני שמירה. מחזיר הודעת שגיאה, או null */
  const checkDraft = (d: Draft): string | null => {
    if (!d.title.trim()) return "צריך שם לאירוע";
    if (!/^\d{2}:\d{2}$/.test(d.start)) return "צריך שעת התחלה";
    if (d.end && toMinutes(d.end) <= toMinutes(d.start)) return "שעת הסיום צריכה להיות אחרי שעת ההתחלה";
    if (!d.deptIds.length) return "בוחרים לפחות מחלקה אחת";
    return null;
  };

  const fieldsOf = (d: Draft, weekly: boolean) => ({
    title: d.title.trim(),
    start_time: d.start,
    end_time: d.end || null,
    location: d.location.trim() || null,
    instructor_name: resolveInstructorName(d.instructor, instructorNames) || null,
    day_of_week: DAY_CODES[dayIndexOf(d.date)],
    activity_date: weekly ? null : d.date,
    is_recurring: weekly,
    is_active: true,
  });

  /** סיום שמירה: רענון המסכים, ואם משהו נכשל — סוגרים, טוענים מחדש ומציגים את השגיאה (כדי לא לשמור שוב על נתונים ישנים) */
  async function finishSave(errors: string[], touched: Set<string>, instructor: string | null) {
    if (instructor) { try { await ensureInstructors(supabase, [instructor]); } catch { /* לא קריטי */ } }
    for (const d of touched) refreshDepartmentScreens(supabase, d);
    setBusy(false);
    setDraft(null);
    setMsg(errors.length ? "לא הכול נשמר: " + errors[0] + ". כדאי לפתוח את האירוע ולבדוק." : "");
    await load();
  }

  async function saveDraft() {
    if (!draft) return;
    const problem = checkDraft(draft);
    if (problem) { setMsg(problem); return; }
    setMsg("");
    setBusy(true);
    const fields = fieldsOf(draft, draft.weekly);
    const errors: string[] = [];
    const touched = new Set<string>(draft.deptIds);
    const it = draft.item;
    if (!it) {
      const group = newGroup(); // מזהה אחד לכל המחלקות של האירוע
      const res = await insertActivities(supabase, draft.deptIds.map(department_id => ({ ...fields, department_id, source: "manual", external_uid: group })));
      if (res.error) errors.push(res.error.message);
    } else {
      // אירוע קיים: עדכון בכל המחלקות שנשארו, הוספה לחדשות, הסרה מאלה שירדו
      const group = it.group ?? (it.rows.some(isOutlook) ? newGroup() : (it.rows.find(isEvent)?.external_uid as string | undefined) ?? newGroup());
      for (const r of it.rows) {
        touched.add(r.department_id);
        const keep = draft.deptIds.includes(r.department_id);
        if (isOutlook(r)) {
          // מאאוטלוק: הסנכרון מזהה את האירוע לפי התאריך שלו. אם התאריך משתנה (או שהאירוע נהיה שבועי) —
          // המקורי מוסתר והגרסה החדשה נשמרת כאירוע של היומן; אחרת משנים במקום, והסנכרון לא ידרוס
          const moved = draft.weekly || draft.date !== r.activity_date;
          if (keep && !moved) {
            const res = await updateActivity(supabase, String(r.id), { ...fields, source: "override" });
            if (res.error) errors.push(res.error.message);
            continue;
          }
          const res = await supabase.from("activities").update({ is_active: false, source: "override" }).eq("id", r.id);
          if (res.error) { errors.push(res.error.message); continue; }
          if (keep) {
            const ins = await insertActivities(supabase, [{ ...fields, department_id: r.department_id, source: "manual", external_uid: group }]);
            if (ins.error) errors.push(ins.error.message);
          }
          continue;
        }
        if (keep) {
          const patch: Record<string, unknown> = { ...fields };
          if (!r.external_uid) patch.external_uid = group;
          const res = await updateActivity(supabase, String(r.id), patch);
          if (res.error) errors.push(res.error.message);
        } else {
          const res = await supabase.from("activities").delete().eq("id", r.id);
          if (res.error) errors.push(res.error.message);
        }
      }
      const have = new Set(it.rows.map(r => r.department_id));
      const add = draft.deptIds.filter(d => !have.has(d));
      if (add.length) {
        const res = await insertActivities(supabase, add.map(department_id => ({ ...fields, department_id, source: "manual", external_uid: group })));
        if (res.error) errors.push(res.error.message);
      }
    }
    await finishSave(errors, touched, fields.instructor_name);
  }

  /** אירוע שבועי — שינוי רק בשבוע הזה: הקבוע לא מוצג השבוע, ובמקומו גרסה לתאריך הזה (כמו בעורך הלוח) */
  async function saveWeekOnly() {
    const it = draft?.item;
    if (!draft || !it || !it.recurring) return;
    const problem = checkDraft(draft);
    if (problem) { setMsg(problem); return; }
    setMsg("");
    setBusy(true);
    const ws = weekStartISO(it.date);
    const fields = fieldsOf(draft, false);
    const errors: string[] = [];
    const touched = new Set<string>(draft.deptIds);
    for (const r of it.rows) {
      touched.add(r.department_id);
      const res = await supabase.from("activities").update({ skip_dates: Array.from(new Set([...(r.skip_dates ?? []), ws])).sort() }).eq("id", r.id);
      if (res.error) errors.push(/skip_dates/.test(res.error.message) ? "צריך להריץ את scripts/012_topics_plan_attendance.sql ב-Supabase" : res.error.message);
    }
    if (!errors.length) {
      const parentOf = new Map(it.rows.map(r => [r.department_id, String(r.id)]));
      const res = await insertActivities(supabase, draft.deptIds.map(department_id => ({
        ...fields, department_id, source: "manual", external_uid: it.group ?? newGroup(), parent_id: parentOf.get(department_id) ?? null,
      })));
      if (res.error) errors.push(res.error.message);
    }
    await finishSave(errors, touched, fields.instructor_name);
  }

  /** מחיקה: "week" — רק בשבוע הזה (לאירוע שחוזר כל שבוע), "all" — לגמרי */
  async function deleteItem(scope: "week" | "all") {
    const it = draft?.item;
    if (!it) return;
    setBusy(true);
    const errors: string[] = [];
    const ws = weekStartISO(it.date);
    if (scope === "week" && it.recurring) {
      for (const r of it.rows) {
        const res = await supabase.from("activities").update({ skip_dates: Array.from(new Set([...(r.skip_dates ?? []), ws])).sort() }).eq("id", r.id);
        if (res.error) errors.push(/skip_dates/.test(res.error.message) ? "צריך להריץ את scripts/012_topics_plan_attendance.sql ב-Supabase" : res.error.message);
      }
    } else {
      const ids = it.rows.map(r => String(r.id));
      // גם השינויים "רק לשבוע אחד" של הפעילויות האלה (שנעשו ביומן או בעורך הלוח)
      if (it.recurring) {
        const res = await supabase.from("activities").delete().in("parent_id", ids);
        if (res.error) errors.push(res.error.message);
      }
      for (const r of it.rows) {
        const res = isOutlook(r)
          ? await supabase.from("activities").update({ is_active: false, source: "override" }).eq("id", r.id)
          : await supabase.from("activities").delete().eq("id", r.id);
        if (res.error) errors.push(res.error.message);
      }
    }
    for (const d of new Set(it.rows.map(r => r.department_id))) refreshDepartmentScreens(supabase, d);
    setBusy(false);
    setAskDelete(false);
    setDraft(null);
    setMsg(errors.length ? "לא נמחק: " + errors[0] : "");
    await load();
  }

  /**
   * מעבר מאאוטלוק: קודם עוצרים את הסנכרון, ואז האירועים שהגיעו מאאוטלוק נשארים כאירועים של המערכת.
   * אירוע שחוזר כל שבוע באאוטלוק (מופיע בשני השבועות שסונכרנו, באותו יום ושעה) הופך לאירוע שבועי —
   * אחרת היה נעלם מהלוחות אחרי שבועיים.
   */
  async function stopOutlook() {
    setAskOutlook(false);
    setBusy(true);
    setMsg("");
    const stop = await supabase.from("calendar_sources").update({ is_active: false }).eq("is_active", true);
    if (stop.error) { setBusy(false); setMsg("לא הצלחנו לעצור את הסנכרון: " + stop.error.message); return; }
    let outlook: Row[] = [];
    try { outlook = await fetchOutlookRows(supabase); }
    catch (e: any) { setBusy(false); setMsg("הסנכרון נעצר, אבל לא הצלחנו לקרוא את האירועים: " + (e?.message ?? "שגיאה")); await load(); return; }

    const today = israelDateISO();
    const series = new Map<string, Row[]>();
    for (const r of outlook) {
      if (!r.activity_date) continue;
      const base = String(r.external_uid ?? "").replace(/@[^@]*$/, "");
      const k = [r.department_id, base, dayIndexOf(r.activity_date), hm(r.start_time)].join("|");
      const list = series.get(k);
      if (list) list.push(r); else series.set(k, [r]);
    }
    const errors: string[] = [];
    let weeklyMade = 0;
    const handled = new Set<string>();
    for (const list of series.values()) {
      if (list.length < 2) continue;
      list.sort((x, z) => String(x.activity_date).localeCompare(String(z.activity_date)));
      const last = list[list.length - 1];
      const past = list.filter(r => String(r.activity_date) < today);
      const row: Record<string, unknown> = {
        title: last.title, start_time: hm(last.start_time), end_time: last.end_time ? hm(last.end_time) : null,
        location: last.location ?? null, instructor_name: last.instructor_name ?? null,
        day_of_week: DAY_CODES[dayIndexOf(String(last.activity_date))], activity_date: null, is_recurring: true, is_active: true,
        department_id: last.department_id, source: "manual", external_uid: newGroup(),
        // בשבועות שהמופע כבר עבר — נשאר המופע עם התאריך (שהנוכחות שסומנה לא תיעלם), והשבועי לא מוצג
        skip_dates: Array.from(new Set(past.map(r => weekStartISO(String(r.activity_date))))).sort(),
      };
      let ins = await supabase.from("activities").insert(row);
      if (ins.error && /skip_dates/.test(ins.error.message)) { const { skip_dates: _s, ...rest } = row; ins = await supabase.from("activities").insert(rest); }
      if (ins.error) { errors.push(ins.error.message); continue; }
      weeklyMade++;
      for (const r of list) {
        handled.add(String(r.id));
        const res = String(r.activity_date) < today
          ? await supabase.from("activities").update({ source: "manual" }).eq("id", r.id)
          : await supabase.from("activities").update({ is_active: false, source: "override" }).eq("id", r.id);
        if (res.error) errors.push(res.error.message);
      }
    }
    const rest = outlook.filter(r => !handled.has(String(r.id))).map(r => String(r.id));
    for (let i = 0; i < rest.length; i += 200) {
      const res = await supabase.from("activities").update({ source: "manual" }).in("id", rest.slice(i, i + 200));
      if (res.error) errors.push(res.error.message);
    }
    for (const d of new Set(outlook.map(r => r.department_id))) refreshDepartmentScreens(supabase, d);
    setBusy(false);
    setMsg(
      "הסנכרון מאאוטלוק נעצר. " +
      (weeklyMade ? `${weeklyMade === 1 ? "אירוע אחד שחזר" : weeklyMade + " אירועים שחזרו"} כל שבוע ${weeklyMade === 1 ? "נשמר כאירוע שבועי" : "נשמרו כאירועים שבועיים"} ביומן. ` : "") +
      (rest.length ? `${rest.length} ${rest.length === 1 ? "אירוע נשאר" : "אירועים נשארו"} בתאריכים שלהם. ` : "") +
      "אירוע שחוזר כל שבועיים או פחות — כדאי להוסיף ביומן." +
      (errors.length ? " חלק לא נשמר: " + errors[0] : ""),
    );
    await load();
  }

  const toggleFilter = (id: string) => setFilter(f => (f.includes(id) ? f.filter(x => x !== id) : [...f, id]));

  /* ── תצוגה ── */
  const deptDots = (ids: string[], max = 3) => {
    const all = depts.length > 1 && ids.length === depts.length;
    return (
      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#3F2F2D]/65">
        {all ? (
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#FAB822]" />כל המחלקות</span>
        ) : (
          <>
            {ids.slice(0, max).map(id => (
              <span key={id} className="inline-flex items-center gap-1">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: deptById.get(id)?.color || FALLBACK_COLOR }} />
                {deptById.get(id)?.name ?? ""}
              </span>
            ))}
            {ids.length > max && <span>ועוד {ids.length - max}</span>}
          </>
        )}
      </span>
    );
  };

  const itemCard = (it: Item) => {
    const fixed = it.recurring && !it.group;
    const color = it.deptIds.length === 1 ? deptById.get(it.deptIds[0])?.color || FALLBACK_COLOR : "#FAB822";
    return (
      <button key={it.key} type="button" onClick={() => openItem(it)}
        className={"w-full rounded-xl border-s-4 px-2.5 py-2 text-right transition-colors " + (fixed ? "bg-[#F6F2EE] hover:bg-[#EEE8E2]" : "bg-white shadow-[0_1px_2px_rgba(63,47,45,0.08)] hover:bg-[#FBF9F7]")}
        style={{ borderInlineStartColor: color }}>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#5A826F]" dir="rtl">
          <span dir="ltr">{it.start}{it.end ? "–" + it.end : ""}</span>
          {it.recurring && <Repeat className="h-3 w-3" aria-label="כל שבוע" />}
        </span>
        <span className={"block text-[15px] leading-snug " + (fixed ? "font-semibold text-[#3F2F2D]/80" : "font-bold")}>{it.title}</span>
        {(it.instructor || it.location) && (
          <span className="block truncate text-xs text-[#3F2F2D]/60">{[it.instructor, it.location].filter(Boolean).join(" · ")}</span>
        )}
        <span className="mt-0.5 block">{deptDots(it.deptIds)}</span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* סרגל */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]" role="tablist" aria-label="תצוגה">
            {(["week", "month"] as const).map(k => (
              <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
                className={"rounded-xl px-4 py-2 text-sm font-semibold " + (mode === k ? "bg-[#3F2F2D] text-[#F6F2EE]" : "hover:bg-[#E3ECE7]")}>
                {k === "week" ? "שבוע" : "חודש"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
            <button type="button" aria-label="הקודם" className="rounded-xl p-2 hover:bg-[#E3ECE7]" onClick={() => step(-1)}><ChevronRight className="h-5 w-5" /></button>
            <div className="min-w-[130px] text-center text-[15px] font-bold" dir="rtl">{rangeLabel}</div>
            <button type="button" aria-label="הבא" className="rounded-xl p-2 hover:bg-[#E3ECE7]" onClick={() => step(1)}><ChevronLeft className="h-5 w-5" /></button>
          </div>
          {(mode === "week" ? !weekDates.includes(today) : !today.startsWith(monthFirst.slice(0, 7))) && (
            <button type="button" className={btnGhost + " !py-2"} onClick={() => setAnchor(today)}>היום</button>
          )}
        </div>
        <button type="button" className={btnSage} onClick={() => openNew(weekDates.includes(today) || mode === "month" ? today : weekDates[0])}>
          <Plus className="h-4 w-4" /> אירוע חדש
        </button>
      </div>

      {/* סינון */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setFilter([])} aria-pressed={!filter.length}
          className={"rounded-full px-3.5 py-1.5 text-sm font-semibold " + (!filter.length ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-white hover:bg-[#E3ECE7]")}>
          כל המחלקות
        </button>
        {depts.map(d => {
          const on = filter.includes(d.id);
          return (
            <button key={d.id} type="button" onClick={() => toggleFilter(d.id)} aria-pressed={on}
              className={"inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold " + (on ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-white hover:bg-[#E3ECE7]")}>
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color || FALLBACK_COLOR }} />
              {d.name}
            </button>
          );
        })}
        {mode === "week" && (
          <label className="ms-auto inline-flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-[#5A826F]" checked={showFixed} onChange={e => setShowFixed(e.target.checked)} />
            גם הפעילויות הקבועות של הלוחות{fixedCount ? ` (${fixedCount})` : ""}
          </label>
        )}
      </div>

      {outlookActive > 0 && (
        <Card className="border border-[#FAB822]/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px]">
              <b>יומן Outlook עדיין מחובר</b> ({outlookActive === 1 ? "יומן אחד" : `${outlookActive} יומנים`}). אפשר לעבור ליומן של המערכת: האירועים שכבר הגיעו נשארים, והסנכרון נעצר.
            </p>
            {askOutlook ? (
              <span className="flex items-center gap-2 text-sm">
                לעצור את הסנכרון מאאוטלוק?
                <button type="button" className={btnPrimary + " !py-2"} disabled={busy} onClick={stopOutlook}>כן, לעצור</button>
                <button type="button" className={btnGhost + " !py-2"} onClick={() => setAskOutlook(false)}>לא</button>
              </span>
            ) : (
              <button type="button" className={btnGhost} onClick={() => setAskOutlook(true)}>מעבר ליומן של המערכת</button>
            )}
          </div>
        </Card>
      )}

      {loadError && <div role="alert" className="rounded-2xl bg-[#FDE8E1] p-3 text-[15px] text-[#7a2e22]">{loadError}</div>}
      {msg && !draft && <div role="status" className="rounded-2xl bg-[#E3ECE7] p-3 text-[15px]">{msg}</div>}
      {loading && <p className="text-[15px] text-[#3F2F2D]/60">טוען את היומן…</p>}

      {/* שבוע */}
      {!loading && mode === "week" && (
        <div className="grid gap-2 md:grid-cols-7">
          {week.map((list, i) => {
            const date = weekDates[i];
            const isToday = date === today;
            return (
              <section key={date} className={"flex min-h-[120px] flex-col rounded-2xl p-2 " + (isToday ? "bg-[#FDF0CC]/60 ring-2 ring-[#FAB822]" : "bg-white/60")}>
                <div className="mb-2 flex items-center justify-between gap-1 px-1">
                  <div>
                    <div className="text-sm font-bold">{DAY_NAMES[i]}</div>
                    <div className="text-xs text-[#3F2F2D]/60">{shortDate(date)}{isToday ? " · היום" : ""}</div>
                  </div>
                  <button type="button" aria-label={"אירוע חדש ביום " + DAY_NAMES[i]} onClick={() => openNew(date)}
                    className="rounded-lg p-1.5 text-[#5A826F] hover:bg-[#E3ECE7]"><Plus className="h-4 w-4" /></button>
                </div>
                <div className="space-y-1.5">
                  {list.length === 0 && <p className="px-1 text-xs text-[#3F2F2D]/45">אין אירועים</p>}
                  {list.map(itemCard)}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* חודש */}
      {!loading && mode === "month" && (
        <div className="overflow-x-auto">
          <div className="grid min-w-[700px] grid-cols-7 gap-1.5">
            {DAY_NAMES.map(n => <div key={n} className="px-1 text-center text-xs font-semibold text-[#3F2F2D]/60">{n}</div>)}
            {monthWeeks.map((ws, wi) => weekDatesISO(ws).map((date, di) => {
              const items = monthDays[wi]?.[di] ?? [];
              const inMonth = Number(date.slice(5, 7)) === m;
              const isToday = date === today;
              return (
                <div key={date} className={"min-h-[96px] rounded-xl p-1.5 " + (isToday ? "bg-[#FDF0CC] ring-2 ring-[#FAB822]" : inMonth ? "bg-white" : "bg-white/40")}>
                  <div className="mb-1 flex items-center justify-between">
                    <button type="button" className={"rounded-md px-1 text-sm font-bold hover:bg-[#E3ECE7] " + (inMonth ? "" : "text-[#3F2F2D]/40")}
                      onClick={() => { setAnchor(date); setMode("week"); }} aria-label={"השבוע של " + shortDate(date)}>
                      {Number(date.slice(8))}
                    </button>
                    <button type="button" aria-label={"אירוע חדש ב-" + shortDate(date)} onClick={() => openNew(date)} className="rounded-md p-0.5 text-[#5A826F] hover:bg-[#E3ECE7]"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                  <div className="space-y-1">
                    {items.slice(0, 3).map(it => (
                      <button key={it.key} type="button" onClick={() => openItem(it)} className="flex w-full items-center gap-1 rounded-md bg-[#F6F2EE] px-1 py-0.5 text-right text-[11px] hover:bg-[#E3ECE7]">
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: it.deptIds.length === 1 ? deptById.get(it.deptIds[0])?.color || FALLBACK_COLOR : "#FAB822" }} />
                        <span className="shrink-0 font-semibold" dir="ltr">{it.start}</span>
                        <span className="truncate">{it.title}</span>
                      </button>
                    ))}
                    {items.length > 3 && (
                      <button type="button" className="px-1 text-[11px] font-semibold text-[#5A826F] hover:underline" onClick={() => { setAnchor(date); setMode("week"); }}>
                        ועוד {items.length - 3}
                      </button>
                    )}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* פעילות קבועה של לוח — פרטים וקישור לעורך */}
      {viewItem && (
        <Modal title={viewItem.title} onClose={() => setViewItem(null)}>
          <div className="space-y-2 text-[15px]">
            <p className="flex items-center gap-2"><Repeat className="h-4 w-4 text-[#5A826F]" />כל יום {DAY_NAMES[dayIndexOf(viewItem.date)]}, <span dir="ltr">{viewItem.start}{viewItem.end ? "–" + viewItem.end : ""}</span></p>
            {viewItem.location && <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#5A826F]" />{viewItem.location}</p>}
            {viewItem.instructor && <p className="flex items-center gap-2"><User className="h-4 w-4 text-[#5A826F]" />{viewItem.instructor}</p>}
            <p className="text-sm text-[#3F2F2D]/65">פעילות קבועה של הלוח. משנים אותה (גם רק לשבוע אחד) בעורך הלוח של המחלקה:</p>
            <ul className="flex flex-wrap gap-2">
              {viewItem.deptIds.map(id => {
                const d = deptById.get(id);
                return d?.code ? (
                  <li key={id}><Link className={btnGhost + " !py-2"} href={`/admin/weekly?dept=${encodeURIComponent(d.code)}`}>עריכה בלוח של {d.name}</Link></li>
                ) : null;
              })}
            </ul>
          </div>
        </Modal>
      )}

      {/* אירוע חדש / עריכה */}
      {draft && (
        <Modal title={draft.item ? "עריכת אירוע" : "אירוע חדש"} onClose={() => setDraft(null)}>
          <div className="space-y-3">
            <Field label="שם האירוע">
              <input className={inputCls} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} placeholder="למשל: מופע מוזיקלי, מסיבת חנוכה" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="תאריך">
                <input type="date" className={inputCls} dir="ltr" value={draft.date} onChange={e => e.target.value && setDraft({ ...draft, date: e.target.value })} />
              </Field>
              <Field label="חזרה">
                <label className="flex h-10 cursor-pointer items-center gap-2 text-[15px]">
                  <input type="checkbox" className="h-4 w-4 accent-[#5A826F]" checked={draft.weekly} onChange={e => setDraft({ ...draft, weekly: e.target.checked })} />
                  כל יום {DAY_NAMES[dayIndexOf(draft.date)]}
                </label>
              </Field>
              <Field label="משעה">
                <input type="time" step={300} className={inputCls + " text-center"} dir="ltr" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} />
              </Field>
              <Field label="עד שעה">
                <input type="time" step={300} className={inputCls + " text-center"} dir="ltr" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} />
              </Field>
            </div>
            <Field label="מיקום">
              <input className={inputCls} list="calendar-locations" value={draft.location} onChange={e => setDraft({ ...draft, location: e.target.value })} placeholder="למשל: לובי מרכזי" />
              <datalist id="calendar-locations">{locations.map(l => <option key={l} value={l} />)}</datalist>
            </Field>
            <Field label="מפעיל/ה">
              <InstructorSelect value={draft.instructor} onChange={v => setDraft({ ...draft, instructor: v })} choices={instructorNames} />
            </Field>
            <Field label="באילו מחלקות">
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setDraft({ ...draft, deptIds: draft.deptIds.length === depts.length ? [] : depts.map(d => d.id) })}
                  className={"rounded-full px-3 py-1.5 text-sm font-semibold " + (draft.deptIds.length === depts.length && depts.length ? "bg-[#3F2F2D] text-[#F6F2EE]" : "bg-[#F6F2EE] hover:bg-[#E3ECE7]")}>
                  כל המחלקות
                </button>
                {depts.map(d => {
                  const on = draft.deptIds.includes(d.id);
                  return (
                    <button key={d.id} type="button" aria-pressed={on}
                      onClick={() => setDraft({ ...draft, deptIds: on ? draft.deptIds.filter(x => x !== d.id) : [...draft.deptIds, d.id] })}
                      className={"inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold " + (on ? "bg-[#5A826F] text-white" : "bg-[#F6F2EE] hover:bg-[#E3ECE7]")}>
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color || FALLBACK_COLOR }} />
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            {draft.weekly && (
              <p className="text-xs text-[#3F2F2D]/60">
                אירוע שבועי מופיע בלוחות כל יום {DAY_NAMES[dayIndexOf(draft.date)]}.
                {draft.item?.recurring ? " \"שמירה לכל השבועות\" משנה את כל השבועות; \"רק בשבוע הזה\" — רק את התאריך הזה." : ""}
              </p>
            )}
            {draft.item?.outlook && <p className="text-xs text-[#3F2F2D]/60">האירוע הגיע מאאוטלוק. אחרי שינוי כאן — הסנכרון לא ידרוס אותו.</p>}

            {msg && <p role="alert" className="text-sm font-semibold text-[#B56262]">{msg}</p>}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" className={btnSage} disabled={busy} onClick={saveDraft}>
                {busy ? "שומר…" : !draft.item ? "הוספה ליומן וללוחות" : draft.item.recurring && draft.weekly ? "שמירה לכל השבועות" : "שמירת השינויים"}
              </button>
              {draft.item?.recurring && draft.weekly && (
                <button type="button" className={btnGhost} disabled={busy} onClick={saveWeekOnly}>רק בשבוע הזה</button>
              )}
              <button type="button" className={btnGhost} onClick={() => setDraft(null)}>ביטול</button>
              {draft.item && (askDelete ? (
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  {draft.item.recurring ? (
                    <>
                      <button type="button" className={btnGhost + " !py-2"} disabled={busy} onClick={() => deleteItem("week")}>רק בשבוע הזה</button>
                      <button type="button" className="rounded-xl bg-[#B56262] px-3 py-2 font-semibold text-white" disabled={busy} onClick={() => deleteItem("all")}>כל השבועות</button>
                    </>
                  ) : (
                    <button type="button" className="rounded-xl bg-[#B56262] px-3 py-2 font-semibold text-white" disabled={busy} onClick={() => deleteItem("all")}>
                      כן, למחוק{draft.item.deptIds.length > 1 ? ` (${draft.item.deptIds.length} מחלקות)` : ""}
                    </button>
                  )}
                  <button type="button" className="text-sm underline" onClick={() => setAskDelete(false)}>לא</button>
                </span>
              ) : (
                <button type="button" className="ms-auto rounded-xl px-3 py-2 text-sm font-semibold text-[#B56262] hover:bg-[#FDE8E1]" onClick={() => setAskDelete(true)}>מחיקה</button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#3F2F2D]/40 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-modal="true" aria-label={title} dir="rtl"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{title}</h2>
          <button type="button" aria-label="סגירה" className="rounded-xl p-2 hover:bg-[#F6F2EE]" onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

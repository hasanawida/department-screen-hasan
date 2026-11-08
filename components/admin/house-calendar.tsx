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

/** כל השורות (בדפים של 1000 — המגבלה של שאילתה אחת) */
async function fetchAllActivities(supabase: SupabaseClient): Promise<Row[]> {
  const out: Row[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from("activities").select("*").eq("is_active", true).order("id").range(from, from + 999);
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
  for (const r of rows) byDept.set(r.department_id, [...(byDept.get(r.department_id) ?? []), r]);
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
        const key = (group ?? "m:" + [a.title, a.start, a.end, a.location, a.instructor, recurring].join("|")) + "@" + dates[i];
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

  const load = useCallback(async () => {
    setLoadError("");
    try {
      const [d, all, src] = await Promise.all([
        supabase.from("departments").select("id, name, code, color").order("name"),
        fetchAllActivities(supabase),
        supabase.from("calendar_sources").select("id, is_active"),
      ]);
      setDepts((d.data ?? []) as Dept[]);
      setRows(all);
      setOutlookActive((src.data ?? []).filter((s: any) => s.is_active !== false).length);
    } catch (e: any) {
      setLoadError("לא הצלחנו לטעון את היומן: " + (e?.message ?? "שגיאה"));
    }
    setLoading(false);
  }, [supabase]);
  useEffect(() => { load(); }, [load]);

  const deptById = useMemo(() => new Map(depts.map(d => [d.id, d])), [depts]);
  const shownRows = useMemo(() => (filter.length ? rows.filter(r => filter.includes(r.department_id)) : rows), [rows, filter]);
  const locations = useMemo(() => Array.from(new Set(rows.map(r => String(r.location ?? "").trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b, "he")), [rows]);

  /* ── טווח התצוגה ── */
  const weekStart = weekStartISO(anchor);
  const weekDates = weekDatesISO(weekStart);
  const week = useMemo(() => weekItems(shownRows, weekStart, showFixed), [shownRows, weekStart, showFixed]);
  const fixedCount = useMemo(() => weekItems(shownRows, weekStart, true).flat().filter(i => i.recurring && !i.group).length, [shownRows, weekStart]);

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
  const monthDays = useMemo(() => (mode === "month" ? monthWeeks.map(ws => weekItems(shownRows, ws, false)) : []), [mode, monthWeeks, shownRows]);

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

  async function saveDraft() {
    if (!draft) return;
    setMsg("");
    if (!draft.title.trim()) { setMsg("צריך שם לאירוע"); return; }
    if (!/^\d{2}:\d{2}$/.test(draft.start)) { setMsg("צריך שעת התחלה"); return; }
    if (draft.end && toMinutes(draft.end) <= toMinutes(draft.start)) { setMsg("שעת הסיום צריכה להיות אחרי שעת ההתחלה"); return; }
    if (!draft.deptIds.length) { setMsg("בוחרים לפחות מחלקה אחת"); return; }
    setBusy(true);
    const instructor = resolveInstructorName(draft.instructor, instructorNames) || null;
    const fields = {
      title: draft.title.trim(),
      start_time: draft.start,
      end_time: draft.end || null,
      location: draft.location.trim() || null,
      instructor_name: instructor,
      day_of_week: DAY_CODES[dayIndexOf(draft.date)],
      activity_date: draft.weekly ? null : draft.date,
      is_recurring: draft.weekly,
      is_active: true,
    };
    const errors: string[] = [];
    const touched = new Set<string>(draft.deptIds);
    const it = draft.item;
    if (!it) {
      const group = newGroup();
      const res = await insertActivities(supabase, draft.deptIds.map(department_id => ({ ...fields, department_id, source: "manual", external_uid: group })));
      if (res.error) errors.push(res.error.message);
    } else {
      // אירוע קיים: עדכון בכל המחלקות שנשארו, הוספה לחדשות, הסרה מאלה שירדו
      const group = it.group ?? (it.rows.find(isEvent)?.external_uid as string | undefined) ?? (it.rows.some(isOutlook) ? null : newGroup());
      for (const r of it.rows) {
        touched.add(r.department_id);
        if (draft.deptIds.includes(r.department_id)) {
          const patch: Record<string, unknown> = { ...fields };
          if (isOutlook(r)) patch.source = "override"; // שהסנכרון מאאוטלוק לא ידרוס
          else if (group && !r.external_uid) patch.external_uid = group;
          const res = await updateActivity(supabase, String(r.id), patch);
          if (res.error) errors.push(res.error.message);
        } else {
          const res = isOutlook(r)
            ? await supabase.from("activities").update({ is_active: false, source: "override" }).eq("id", r.id)
            : await supabase.from("activities").delete().eq("id", r.id);
          if (res.error) errors.push(res.error.message);
        }
      }
      const have = new Set(it.rows.map(r => r.department_id));
      const add = draft.deptIds.filter(d => !have.has(d));
      if (add.length) {
        const res = await insertActivities(supabase, add.map(department_id => ({ ...fields, department_id, source: "manual", ...(group ? { external_uid: group } : {}) })));
        if (res.error) errors.push(res.error.message);
      }
    }
    if (instructor) { try { await ensureInstructors(supabase, [instructor]); } catch { /* לא קריטי */ } }
    for (const d of touched) refreshDepartmentScreens(supabase, d);
    setBusy(false);
    if (errors.length) { setMsg("לא הכול נשמר: " + errors[0]); await load(); return; }
    setDraft(null);
    await load();
  }

  /** מחיקה: "week" — רק בשבוע הזה (לאירוע שחוזר כל שבוע), "all" — לגמרי */
  async function deleteItem(scope: "week" | "all") {
    const it = draft?.item;
    if (!it) return;
    setBusy(true);
    const errors: string[] = [];
    const ws = weekStartISO(it.date);
    for (const r of it.rows) {
      const res = scope === "week" && it.recurring
        ? await supabase.from("activities").update({ skip_dates: Array.from(new Set([...(r.skip_dates ?? []), ws])).sort() }).eq("id", r.id)
        : isOutlook(r)
          ? await supabase.from("activities").update({ is_active: false, source: "override" }).eq("id", r.id)
          : await supabase.from("activities").delete().eq("id", r.id);
      if (res.error) errors.push(res.error.message);
      refreshDepartmentScreens(supabase, r.department_id);
    }
    setBusy(false);
    setAskDelete(false);
    if (errors.length) { setMsg("לא נמחק: " + errors[0]); return; }
    setDraft(null);
    await load();
  }

  /** מעבר מאאוטלוק: האירועים שכבר הגיעו נשארים (כמו אירועים רגילים), והסנכרון נעצר */
  async function stopOutlook() {
    setAskOutlook(false);
    setBusy(true);
    await supabase.from("activities").update({ source: "manual" }).eq("source", "calendar");
    const { error } = await supabase.from("calendar_sources").update({ is_active: false }).eq("is_active", true);
    setBusy(false);
    setMsg(error ? "לא הצלחנו לעצור את הסנכרון: " + error.message : "הסנכרון מאאוטלוק נעצר. האירועים שכבר היו נשארו ביומן ובלוחות.");
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
            {draft.item?.outlook && <p className="text-xs text-[#3F2F2D]/60">האירוע הגיע מאאוטלוק. אחרי שינוי כאן — הסנכרון לא ידרוס אותו.</p>}

            {msg && <p role="alert" className="text-sm font-semibold text-[#B56262]">{msg}</p>}

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button type="button" className={btnSage} disabled={busy} onClick={saveDraft}>{busy ? "שומר…" : draft.item ? "שמירת השינויים" : "הוספה ליומן וללוחות"}</button>
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

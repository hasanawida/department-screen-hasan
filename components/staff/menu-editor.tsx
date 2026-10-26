"use client";

// עריכת התפריט השבועי — לדיאטנית (בקישור אישי) ולמנהלים.
// כל שינוי נשמר לבד אחרי רגע, והמסכים במחלקות מתעדכנים.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import DepartmentDisplay from "@/components/display/department-display";
import { ScreenFrame, btnGhost, textareaCls, usePreviewCu } from "@/components/admin/brand-ui";
import {
  DAY_NAMES, MEALS, MEAL_LABELS, addDaysISO, displaySettings, israelDateISO, menuFromRows,
  shortDate, weekDatesISO, weekStartISO, weeklyBoardSettings, type Meal, type MenuRow,
} from "@/lib/week";

type SaveState = "idle" | "saving" | "saved" | "error";
const key = (day: number, meal: Meal) => `${day}|${meal}`;

const PLACEHOLDER: Record<Meal, string> = {
  breakfast: "חביתה\nגבינה לבנה\nסלט ירקות",
  lunch: "מרק ירקות\nשניצל עוף\nאורז ושעועית ירוקה",
  dinner: "פשטידת ירקות\nיוגורט\nפירות",
};

const EMPTY_DAYS = [[], [], [], [], [], [], []];

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
  const [missingTable, setMissingTable] = useState(false);
  const [save, setSave] = useState<SaveState>("idle");
  const [copyAsk, setCopyAsk] = useState(false);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const [cu, frameRef] = usePreviewCu();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from("weekly_menus").select("day_index, meal, items").eq("week_start", weekStart);
    if (error) {
      setMissingTable(/weekly_menus|relation|schema cache/i.test(error.message));
      setTexts({});
    } else {
      setMissingTable(false);
      const t: Record<string, string> = {};
      for (const r of data ?? []) t[key(r.day_index, r.meal as Meal)] = r.items ?? "";
      setTexts(t);
    }
    setLoading(false);
  }, [supabase, weekStart]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setDay(todayIndex >= 0 ? todayIndex : 0); setCopyAsk(false); }, [weekStart]); // eslint-disable-line react-hooks/exhaustive-deps

  async function persist(d: number, meal: Meal, items: string) {
    setSave("saving");
    const { error } = await supabase
      .from("weekly_menus")
      .upsert({ week_start: weekStart, day_index: d, meal, items, updated_at: new Date().toISOString() }, { onConflict: "week_start,day_index,meal" });
    setSave(error ? "error" : "saved");
  }

  function change(meal: Meal, value: string) {
    const k = key(day, meal);
    setTexts(t => ({ ...t, [k]: value }));
    setSave("saving");
    clearTimeout(timers.current[k]);
    const d = day;
    timers.current[k] = setTimeout(() => persist(d, meal, value), 700);
  }

  async function copyPreviousWeek() {
    setCopyAsk(false);
    const prev = addDaysISO(weekStart, -7);
    const { data, error } = await supabase.from("weekly_menus").select("day_index, meal, items").eq("week_start", prev);
    if (error || !data?.length) { setSave("error"); return; }
    setSave("saving");
    const rows = data.map(r => ({ week_start: weekStart, day_index: r.day_index, meal: r.meal, items: r.items, updated_at: new Date().toISOString() }));
    const res = await supabase.from("weekly_menus").upsert(rows, { onConflict: "week_start,day_index,meal" });
    setSave(res.error ? "error" : "saved");
    load();
  }

  const menu = useMemo(() => {
    const rows: MenuRow[] = [];
    for (const [k, items] of Object.entries(texts)) {
      const [d, meal] = k.split("|");
      rows.push({ week_start: weekStart, day_index: Number(d), meal: meal as Meal, items });
    }
    return menuFromRows(rows);
  }, [texts, weekStart]);

  const filled = (d: number) => MEALS.filter(m => (texts[key(d, m)] ?? "").trim()).length;
  const weekEmpty = [0, 1, 2, 3, 4, 5, 6].every(d => filled(d) === 0);
  const weekLabel = weekOffset === 0 ? "השבוע" : weekOffset === 1 ? "שבוע הבא" : weekOffset === -1 ? "שבוע שעבר" : "";

  return (
    <div className="space-y-5">
      {missingTable && (
        <div className="rounded-2xl border border-[#FAB822]/60 bg-[#FDF0CC] p-4 text-[15px]">
          טבלת התפריט עוד לא קיימת. מריצים פעם אחת את <b dir="ltr">scripts/010_menu_physio_calendar.sql</b> ב-Supabase.
        </div>
      )}

      {/* שבוע */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
          <button type="button" aria-label="שבוע קודם" className="h-10 w-10 rounded-xl text-lg hover:bg-[#E3ECE7]" onClick={() => setWeekOffset(w => w - 1)}>›</button>
          <div className="min-w-[160px] px-2 text-center">
            <div className="text-[15px] font-bold">{weekLabel || "שבוע"} </div>
            <div className="text-xs text-[#3F2F2D]/60" dir="ltr">{shortDate(weekDates[0])}–{shortDate(weekDates[6])}</div>
          </div>
          <button type="button" aria-label="שבוע הבא" className="h-10 w-10 rounded-xl text-lg hover:bg-[#E3ECE7]" onClick={() => setWeekOffset(w => w + 1)}>‹</button>
        </div>
        <div className="flex items-center gap-3">
          <SaveChip state={save} />
          {copyAsk ? (
            <span className="flex items-center gap-2 text-sm">
              {weekEmpty ? "להעתיק את התפריט של השבוע הקודם?" : "זה יחליף את מה שכבר כתוב. להמשיך?"}
              <button type="button" className="rounded-xl bg-[#5A826F] px-3 py-2 font-semibold text-white" onClick={copyPreviousWeek}>כן, להעתיק</button>
              <button type="button" className={btnGhost + " !py-2"} onClick={() => setCopyAsk(false)}>לא</button>
            </span>
          ) : (
            <button type="button" className={btnGhost} onClick={() => setCopyAsk(true)} disabled={missingTable}>העתקה מהשבוע הקודם</button>
          )}
        </div>
      </div>

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
              <div className="mt-1.5 flex justify-center gap-1" aria-label={`${n} מתוך 3 ארוחות`}>
                {MEALS.map(m => <span key={m} title={MEAL_LABELS[m]} className={"h-1.5 w-1.5 rounded-full " + ((texts[key(i, m)] ?? "").trim() ? (on ? "bg-[#FAB822]" : "bg-[#5A826F]") : on ? "bg-[#F6F2EE]/25" : "bg-[#3F2F2D]/15")} />)}
              </div>
            </button>
          );
        })}
      </div>

      {/* ארוחות היום הנבחר */}
      <div className="grid gap-4 md:grid-cols-3">
        {MEALS.map(meal => (
          <section key={meal} className="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(63,47,45,0.06)]">
            <label htmlFor={"meal-" + meal} className="mb-2 flex items-baseline justify-between">
              <span className="text-lg font-bold">{MEAL_LABELS[meal]}</span>
              <span className="text-xs text-[#3F2F2D]/55">מנה בכל שורה</span>
            </label>
            <textarea id={"meal-" + meal} rows={6} disabled={loading || missingTable}
              className={textareaCls + " min-h-[150px] resize-y"}
              placeholder={PLACEHOLDER[meal]}
              value={texts[key(day, meal)] ?? ""}
              onChange={e => change(meal, e.target.value)} />
          </section>
        ))}
      </div>

      {/* איך זה ייראה במסך */}
      <div>
        <h2 className="mb-2 text-lg font-bold">כך זה ייראה במסכים</h2>
        <ScreenFrame frameRef={frameRef}>
          <DepartmentDisplay
            department={{ id: "preview", name: "כל המחלקות", color: null }}
            weekDates={weekDates}
            days={EMPTY_DAYS}
            settings={displaySettings({})}
            board={weeklyBoardSettings({})}
            topic={null}
            menu={menu}
            messages={[]}
            news={[]}
            media={[]}
            embeddedCu={cu}
            fixedView="menu"
          />
        </ScreenFrame>
        <p className="mt-2 text-sm text-[#3F2F2D]/60">במסכים התפריט מוצג בסבב אחרי הלוח השבועי והלוח היומי, והתפריט של היום מופיע גם בלוח היומי.</p>
      </div>
    </div>
  );
}

function SaveChip({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  const map = {
    saving: ["שומר…", "bg-[#FDF0CC] text-[#6b4e00]"],
    saved: ["נשמר", "bg-[#E3ECE7] text-[#2c4037]"],
    error: ["לא נשמר — בדקו את החיבור", "bg-[#FDE8E1] text-[#7a2e22]"],
  } as const;
  const [text, cls] = map[state];
  return <span role="status" className={"rounded-full px-3 py-1 text-sm font-semibold " + cls}>{text}</span>;
}

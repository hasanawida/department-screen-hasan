// טעינת כל מה שמסך מחלקה צריך — בצד השרת

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  activitiesByDay, displaySettings, israelDateISO, menuFromRows, weekDatesISO, weekStartISO, weeklyBoardSettings,
  type ActivityRow, type MenuRow,
} from "./week";
import { getN12Headlines } from "./news";
import { syncCalendarsIfStale } from "./calendar-sync";
import { resolveTopic } from "./topics";
import type { DepartmentDisplayProps } from "@/components/display/department-display";

export async function loadDepartmentDisplay(supabase: SupabaseClient, code: string): Promise<DepartmentDisplayProps | null> {
  const { data: department } = await supabase.from("departments").select("id, name, code, color").eq("code", code).maybeSingle();
  if (!department) return null;

  // יומני Outlook — מסונכרנים לכל היותר פעם ברבע שעה
  await syncCalendarsIfStale(supabase);

  const today = israelDateISO();
  const weekStart = weekStartISO(today);
  const weekDates = weekDatesISO(weekStart);

  const [acts, ann, tick, ss, media, topic, menuRows] = await Promise.all([
    supabase.from("activities").select("*").eq("department_id", department.id).eq("is_active", true),
    supabase.from("announcements").select("title, content, is_active, start_date, end_date").eq("department_id", department.id).eq("is_active", true),
    supabase.from("ticker_messages").select("message, display_order").or(`department_id.eq.${department.id},is_global.eq.true`).eq("is_active", true).order("display_order", { ascending: true }),
    supabase.from("screen_settings").select("display_settings, media_url, media_type").eq("department_id", department.id).maybeSingle(),
    supabase.from("department_media").select("media_url, media_type").eq("department_id", department.id).eq("is_active", true).order("display_order", { ascending: true }).limit(10),
    resolveTopic(supabase, department.id, weekStart),
    supabase.from("weekly_menus").select("week_start, day_index, meal, items").eq("week_start", weekStart),
  ]);

  const settings = displaySettings(ss.data?.display_settings);
  const board = weeklyBoardSettings(settings.weekly_board);

  const messages = [
    ...(tick.data ?? []).map((t: any) => String(t.message ?? "").trim()),
    ...(ann.data ?? [])
      .filter((a: any) => (!a.start_date || a.start_date <= today) && (!a.end_date || a.end_date >= today))
      .map((a: any) => String(a.content || a.title || "").trim()),
  ].filter(Boolean);

  const mediaList = (media.data ?? []).map((m: any) => ({ url: m.media_url, type: m.media_type || "image" }));
  if (mediaList.length === 0 && ss.data?.media_url) mediaList.push({ url: ss.data.media_url, type: ss.data.media_type || "image" });

  const news = settings.show_ticker && settings.ticker_source !== "messages" ? (await getN12Headlines()).map(n => n.title) : [];

  return {
    department: { id: department.id, name: department.name, color: department.color },
    weekDates,
    days: activitiesByDay((acts.data ?? []) as ActivityRow[], weekStart),
    settings,
    board,
    topic: topic.topic ? { title: topic.topic.title, description: topic.topic.description ?? "", image_url: topic.topic.image_url } : null,
    menu: menuFromRows((menuRows.data ?? []) as MenuRow[]),
    messages,
    news,
    media: mediaList,
  };
}

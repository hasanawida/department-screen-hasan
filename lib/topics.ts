// נושא השבוע: מאיפה הוא מגיע
// 1. שינוי ידני למחלקה ולשבוע הזה (weekly_topics)
// 2. התוכנית השנתית (annual_topics) — משתנה לבד כל שבוע
// 3. אם עוד אין תוכנית שנתית בכלל: הנושא האחרון שנקבע למחלקה (כמו שהיה עד עכשיו)

import type { SupabaseClient } from "@supabase/supabase-js";
import { addDaysISO } from "./week";

export type TopicData = { title: string; description: string | null; image_url: string | null };
export type TopicSource = "override" | "plan" | "earlier" | null;

export type ResolvedTopic = {
  topic: TopicData | null;
  source: TopicSource;
  /** השינוי הידני של המחלקה לשבוע הזה, אם יש */
  override: (TopicData & { id: string }) | null;
  /** הנושא מהתוכנית השנתית לשבוע הזה, אם יש */
  plan: (TopicData & { id: string }) | null;
  /** האם יש בכלל תוכנית שנתית */
  hasPlan: boolean;
  /** כשהנושא נלקח משבוע קודם — מאיזה תאריך */
  earlierFrom?: string;
};

const pick = (r: any): TopicData => ({ title: String(r.title ?? ""), description: r.description ?? null, image_url: r.image_url ?? null });

export async function resolveTopic(supabase: SupabaseClient, departmentId: string, weekStart: string): Promise<ResolvedTopic> {
  const weekEnd = addDaysISO(weekStart, 6);

  const [ov, pl, count] = await Promise.all([
    supabase.from("weekly_topics").select("id, title, description, image_url, week_start")
      .eq("department_id", departmentId).eq("is_active", true)
      .gte("week_start", weekStart).lte("week_start", weekEnd)
      .order("week_start", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("annual_topics").select("id, title, description, image_url, week_start")
      .gte("week_start", weekStart).lte("week_start", weekEnd).limit(1).maybeSingle(),
    supabase.from("annual_topics").select("id", { count: "exact", head: true }),
  ]);

  // לפני שהורץ קובץ ה-SQL — אין טבלת תוכנית
  const planReady = !pl.error && !count.error;
  const hasPlan = planReady && (count.count ?? 0) > 0;

  const override = ov.data && String(ov.data.title ?? "").trim() ? { id: String(ov.data.id), ...pick(ov.data) } : null;
  const plan = planReady && pl.data && String(pl.data.title ?? "").trim() ? { id: String(pl.data.id), ...pick(pl.data) } : null;

  if (override) return { topic: override, source: "override", override, plan, hasPlan };
  if (plan) return { topic: plan, source: "plan", override, plan, hasPlan };

  if (!hasPlan) {
    const { data: prev } = await supabase.from("weekly_topics").select("title, description, image_url, week_start")
      .eq("department_id", departmentId).eq("is_active", true).lt("week_start", weekStart)
      .order("week_start", { ascending: false }).limit(1).maybeSingle();
    if (prev && String(prev.title ?? "").trim()) {
      return { topic: pick(prev), source: "earlier", override, plan, hasPlan, earlierFrom: prev.week_start };
    }
  }
  return { topic: null, source: null, override, plan, hasPlan };
}

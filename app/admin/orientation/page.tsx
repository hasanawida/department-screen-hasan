"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageShell } from "@/components/admin/brand-ui";
import ScreensPanel, { type ScreenItem } from "@/components/admin/screens-panel";

const langLabels: Record<string, string> = {
  he: "עב׳", ar: "ערב׳", ru: "רוס׳", en: "אנג׳",
};

export default function AdminOrientationPage() {
  // הלקוח של הניהול (עם ההתחברות של המנהל/ת), כמו בשאר עמודי הניהול
  const supabase = useMemo(() => createClient(), []);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  async function loadDepartments() {
    const { data, error } = await supabase
      .from("departments")
      .select("id, name, code, color, view_token, orientation_settings, created_at")
      .order("created_at", { ascending: true });

    setLoadError(!!error);
    if (data) {
      // לכל מחלקה קישור משלה למסך ההתמצאות (נוצר במסד כשהמחלקה נוצרת; כאן רק השלמה למחלקה ישנה שחסר לה)
      for (const dept of data) {
        if (!dept.view_token) {
          const newToken = crypto.randomUUID();
          const res = await supabase.from("departments").update({ view_token: newToken }).eq("id", dept.id);
          if (!res.error) dept.view_token = newToken;
        }
      }
      setDepartments(data.filter(d => !!d.view_token));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadDepartments();

    // מחלקה חדשה מופיעה מיד
    const channel = supabase
      .channel("departments-orientation")
      .on("postgres_changes" as any, { event: "*", schema: "public", table: "departments" }, () => loadDepartments())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]); // eslint-disable-line react-hooks/exhaustive-deps

  const items: ScreenItem[] = departments.map(dept => {
    const langs: string[] = Array.isArray(dept.orientation_settings?.languages)
      ? dept.orientation_settings.languages
      : ["he", "ar", "ru", "en"];
    const interval: number = dept.orientation_settings?.lang_interval_seconds ?? 20;
    return {
      id: dept.id,
      name: dept.name,
      color: dept.color,
      // קישור קצר (נוח להקליד בשלט של הטלוויזיה), ובלי קוד מחלקה — הקישור המלא
      screenPath: dept.code ? `/o/${dept.code}` : `/orientation/${dept.view_token}`,
      settingsHref: `/settings/${dept.view_token}`,
      settingsNewTab: true,
      sub: `שפות: ${langs.map(l => langLabels[l] ?? l).join(" · ")} · כל ${interval} שנ׳`,
    };
  });

  return (
    <PageShell
      title="מסכי התמצאות"
      subtitle="איזו טלוויזיה מחוברת בכל מחלקה, הקישור שמכניסים בה, ורענון מרחוק."
    >
      {loading
        ? <p className="rounded-2xl bg-white p-6 text-center text-[#3F2F2D]/60">טוען…</p>
        : loadError && items.length === 0
          ? <p role="alert" className="rounded-2xl bg-[#FDE8E1] p-6 text-center text-[#7a2e22]">רשימת המחלקות לא נטענה. בדקו את החיבור ורעננו את העמוד.</p>
        : items.length === 0
          ? <p className="rounded-2xl bg-white p-6 text-center text-[#3F2F2D]/60">אין מחלקות עדיין</p>
          : <ScreensPanel kind="orientation" items={items} />}
    </PageShell>
  );
}

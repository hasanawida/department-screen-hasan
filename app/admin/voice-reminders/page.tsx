"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Volume2, Plus, Trash2, Play, Check } from "lucide-react";

type Department = { id: string; name: string };
type LangKey = "he" | "ar" | "ru" | "en";

const LANG_LABELS: Record<LangKey, string> = {
  he: "עברית",
  ar: "ערבית",
  ru: "רוסית",
  en: "אנגלית",
};

const DAY_CODES = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"];
const DAY_LABELS: Record<string, string> = {
  "א'": "ראשון", "ב'": "שני", "ג'": "שלישי", "ד'": "רביעי",
  "ה'": "חמישי", "ו'": "שישי", "ש'": "שבת",
};

type Reminder = {
  id: string;
  department_id: string | null;
  title: string | null;
  messages: Record<string, string>;
  scheduled_time: string;
  days_of_week: string[];
  repetitions: number;
  languages: string[];
  is_active: boolean;
  departments?: { name: string } | null;
};

const LANG_VOICE_MAP: Record<string, string> = { he: "he-IL", ar: "ar", ru: "ru-RU", en: "en-US" };

function testSpeak(text: string, lang: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = LANG_VOICE_MAP[lang] || lang;
  const voices = window.speechSynthesis.getVoices();
  const v = voices.find((x) => x.lang.toLowerCase() === u.lang.toLowerCase())
         || voices.find((x) => x.lang.toLowerCase().startsWith(lang.toLowerCase()));
  if (v) u.voice = v;
  window.speechSynthesis.speak(u);
}

export default function VoiceRemindersPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [list, setList] = useState<Reminder[]>([]);
  const [saved, setSaved] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  const [form, setForm] = useState({
    department_id: "all",
    title: "",
    message_he: "",
    scheduled_time: "10:00",
    days_of_week: [...DAY_CODES],
    repetitions: 1,
    languages: ["he"] as LangKey[],
    is_active: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  async function loadAll() {
    const supabase = createClient();
    const [depsRes, remsRes] = await Promise.all([
      supabase.from("departments").select("id, name").order("name"),
      supabase.from("voice_reminders").select("*, departments(name)").order("scheduled_time", { ascending: true }),
    ]);
    setDepartments(depsRes.data ?? []);
    if (remsRes.error) {
      setTableMissing(true);
      setList([]);
    } else {
      setTableMissing(false);
      setList((remsRes.data as Reminder[]) ?? []);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function toggleDay(code: string) {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(code)
        ? f.days_of_week.filter((x) => x !== code)
        : [...f.days_of_week, code],
    }));
  }

  function toggleLang(lang: LangKey) {
    setForm((f) => ({
      ...f,
      languages: f.languages.includes(lang)
        ? f.languages.filter((x) => x !== lang)
        : [...f.languages, lang],
    }));
  }

  async function handleAdd() {
    if (form.languages.length === 0) { alert("בחר לפחות שפה אחת"); return; }
    if (!form.message_he.trim()) { alert("הקלד הודעה בעברית"); return; }

    setIsSaving(true);
    let translated: Record<string, string> = { he: form.message_he };
    try {
      const res = await fetch("/api/translate-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: form.message_he, targetLangs: form.languages }),
      });
      const data = await res.json();
      if (res.ok && data.messages) translated = data.messages;
      else console.warn("Translation failed:", data.error);
    } catch (e) {
      console.warn("Translation fetch error:", e);
    }

    const supabase = createClient();
    const cleanedMessages: Record<string, string> = {};
    for (const l of form.languages) cleanedMessages[l] = translated[l] || translated.he || form.message_he;

    const { error } = await supabase.from("voice_reminders").insert({
      department_id: form.department_id === "all" ? null : form.department_id,
      title: form.title || null,
      messages: cleanedMessages,
      scheduled_time: form.scheduled_time,
      days_of_week: form.days_of_week,
      repetitions: form.repetitions,
      languages: form.languages,
      is_active: form.is_active,
    });

    setIsSaving(false);
    if (error) {
      alert("שגיאה בשמירה: " + error.message + "\n\nאם הטבלה לא קיימת — ראה הוראה בחלק העליון של הדף.");
      setTableMissing(true);
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
    setForm((f) => ({ ...f, title: "", message_he: "" }));
    loadAll();
  }

  async function toggleActive(id: string, cur: boolean) {
    const supabase = createClient();
    await supabase.from("voice_reminders").update({ is_active: !cur }).eq("id", id);
    loadAll();
  }

  async function remove(id: string) {
    const supabase = createClient();
    await supabase.from("voice_reminders").delete().eq("id", id);
    loadAll();
  }

  return (
    <div dir="rtl" className="p-6 md:p-8 max-w-4xl">
      <div className="mb-6 flex items-center gap-3">
        <Volume2 className="h-8 w-8 text-emerald-700" />
        <div>
          <h1 className="text-3xl font-bold">תזכורת קולית</h1>
          <p className="text-muted-foreground">הודעות שהמערכת תקריא במועד שתגדיר</p>
        </div>
      </div>

      {tableMissing && (
        <Card className="mb-6 border-amber-300 bg-amber-50">
          <CardContent className="p-5 space-y-2">
            <div className="font-bold text-amber-800">⚠ הטבלה voice_reminders לא קיימת ב-Supabase</div>
            <p className="text-sm text-amber-800">הרץ את ה-SQL הבא ב-Supabase → SQL Editor:</p>
            <pre className="text-xs bg-white border border-amber-200 rounded p-3 overflow-auto"><code>{`CREATE TABLE IF NOT EXISTS voice_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,
  title TEXT,
  messages JSONB DEFAULT '{}'::jsonb,
  scheduled_time TIME NOT NULL,
  days_of_week TEXT[] DEFAULT '{}',
  repetitions INT DEFAULT 1,
  languages TEXT[] DEFAULT ARRAY['he'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE voice_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read voice_reminders" ON voice_reminders FOR SELECT USING (true);
CREATE POLICY "auth write voice_reminders" ON voice_reminders FOR ALL USING (auth.role() = 'authenticated');`}</code></pre>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader><CardTitle>תזכורת חדשה</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">מחלקה</label>
              <Select value={form.department_id} onValueChange={(v) => setForm({ ...form, department_id: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המחלקות</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">שעה</label>
              <Input type="time" value={form.scheduled_time} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">כותרת (אופציונלי)</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="לדוגמה: תזכורת ארוחת צהריים" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">ימים בשבוע</label>
            <div className="flex flex-wrap gap-2">
              {DAY_CODES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleDay(c)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    form.days_of_week.includes(c)
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >{DAY_LABELS[c]}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">שפות</label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(LANG_LABELS) as LangKey[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => toggleLang(l)}
                  className={`px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
                    form.languages.includes(l)
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >{LANG_LABELS[l]}</button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium">הודעה בעברית</label>
              <Button
                type="button" variant="outline" size="sm"
                onClick={() => testSpeak(form.message_he || form.title, "he")}
                disabled={!form.message_he && !form.title}
              ><Play className="h-3 w-3 me-1" /> נגן בעברית</Button>
            </div>
            <Textarea
              rows={3}
              value={form.message_he}
              onChange={(e) => setForm({ ...form, message_he: e.target.value })}
              placeholder="לדוגמה: שלום, בעוד 10 דקות ארוחת הצהריים"
            />
            {form.languages.filter((l) => l !== "he").length > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                תתורגם אוטומטית (Claude AI) ל: {form.languages.filter((l) => l !== "he").map((l) => LANG_LABELS[l]).join(", ")}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">מספר חזרות</label>
              <Input type="number" min={1} max={5} value={form.repetitions} onChange={(e) => setForm({ ...form, repetitions: Math.max(1, Math.min(5, parseInt(e.target.value) || 1)) })} />
            </div>
            <div className="flex items-center gap-2 md:mt-6">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <span className="text-sm">פעיל</span>
            </div>
          </div>

          <Button onClick={handleAdd} disabled={isSaving} className="w-full gap-2">
            {saved ? <><Check className="h-4 w-4" /> נשמר!</> : isSaving ? "מתרגם ושומר..." : <><Plus className="h-4 w-4" /> הוסף תזכורת</>}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>תזכורות קיימות ({list.length})</CardTitle></CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-muted-foreground text-center py-6">אין תזכורות</p>
          ) : (
            <div className="space-y-2">
              {list.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-xl border p-3">
                  <Switch checked={r.is_active} onCheckedChange={() => toggleActive(r.id, r.is_active)} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{r.title || "(ללא כותרת)"}</span>
                      <span className="text-xs rounded-full bg-slate-100 px-2 py-0.5">{r.scheduled_time?.slice(0, 5)}</span>
                      <span className="text-xs text-muted-foreground">{r.departments?.name || "כל המחלקות"}</span>
                      {r.repetitions > 1 && <span className="text-xs text-muted-foreground">×{r.repetitions}</span>}
                    </div>
                    <div className="text-sm text-slate-600 truncate mt-0.5">
                      {(r.languages || []).map((l) => r.messages?.[l] || "").filter(Boolean).join(" · ")}
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {(r.days_of_week || []).map((d) => (
                        <span key={d} className="text-xs rounded bg-emerald-50 text-emerald-700 px-1.5 py-0.5">{DAY_LABELS[d] || d}</span>
                      ))}
                      {(r.languages || []).map((l) => (
                        <span key={l} className="text-xs rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.5">{LANG_LABELS[l as LangKey] || l}</span>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

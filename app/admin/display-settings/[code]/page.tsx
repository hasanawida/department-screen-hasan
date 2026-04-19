"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, Settings, Bell, MessageSquare, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

type DisplaySettings = {
  show_daily: boolean;
  show_weekly: boolean;
  show_media: boolean;
  show_ticker: boolean;
  show_announcements: boolean;
  view_interval_seconds: number;
};

const DEFAULT: DisplaySettings = {
  show_daily: true,
  show_weekly: true,
  show_media: true,
  show_ticker: true,
  show_announcements: true,
  view_interval_seconds: 20,
};

const SECTION_LABELS: { key: keyof DisplaySettings; label: string; desc: string }[] = [
  { key: "show_daily",         label: "תצוגה יומית",    desc: "עכשיו / בהמשך היום" },
  { key: "show_weekly",        label: "תצוגה שבועית",   desc: "לוח פעילויות שבועי" },
  { key: "show_media",         label: "מדיה",           desc: "תמונות ו-PDF" },
  { key: "show_ticker",        label: "שורת רצה",       desc: "הודעות מתחלפות בתחתית" },
  { key: "show_announcements", label: "הודעות חשובות",  desc: "הודעות מחלקה" },
];

type Announcement = { id: string; title: string; content: string; is_active: boolean };
type Ticker = { id: string; message: string; display_order: number; is_active: boolean };
type Media = { id: string; media_url: string; media_type: string; display_order: number };

export default function DisplaySettingsPage({ params }: { params: { code: string } }) {
  const code = params.code;

  const [deptId, setDeptId] = useState<string>("");
  const [deptName, setDeptName] = useState("");
  const [settingsId, setSettingsId] = useState("");
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT);
  const [welcome, setWelcome] = useState("");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [newAnn, setNewAnn] = useState({ title: "", content: "" });

  const [tickers, setTickers] = useState<Ticker[]>([]);
  const [newTicker, setNewTicker] = useState("");

  const [media, setMedia] = useState<Media[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    async function load() {
      let dept: any = null;
      const { data: byCode } = await supabase.from("departments").select("id, name").eq("code", code).single();
      if (byCode) dept = byCode;
      else {
        const { data: bySlug } = await supabase.from("departments").select("id, name").eq("slug", code).single();
        dept = bySlug;
      }
      if (!dept) { setNotFound(true); setLoading(false); return; }

      setDeptId(dept.id);
      setDeptName(dept.name);

      const [ss, anns, tks, md] = await Promise.all([
        supabase.from("screen_settings").select("id, display_settings, welcome_message").eq("department_id", dept.id).single(),
        supabase.from("announcements").select("id, title, content, is_active").eq("department_id", dept.id).order("created_at", { ascending: false }),
        supabase.from("ticker_messages").select("id, message, display_order, is_active").eq("department_id", dept.id).order("display_order", { ascending: true }),
        supabase.from("department_media").select("id, media_url, media_type, display_order").eq("department_id", dept.id).eq("is_active", true).order("display_order", { ascending: true }),
      ]);

      if (ss.data) {
        setSettingsId(ss.data.id);
        setSettings({ ...DEFAULT, ...(ss.data.display_settings ?? {}) });
        setWelcome(ss.data.welcome_message ?? "");
      }
      setAnnouncements(anns.data ?? []);
      setTickers(tks.data ?? []);
      setMedia(md.data ?? []);
      setLoading(false);
    }
    load();
  }, [code]);

  async function handleSaveSettings() {
    if (!settingsId) return;
    await supabase.from("screen_settings").update({ display_settings: settings, welcome_message: welcome }).eq("id", settingsId);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  async function addAnnouncement() {
    if (!newAnn.title && !newAnn.content) return;
    const { data } = await supabase.from("announcements").insert({
      department_id: deptId,
      title: newAnn.title || "הודעה",
      content: newAnn.content || newAnn.title,
      is_active: true,
    }).select().single();
    if (data) setAnnouncements((a) => [data as Announcement, ...a]);
    setNewAnn({ title: "", content: "" });
  }

  async function toggleAnnouncement(id: string, cur: boolean) {
    await supabase.from("announcements").update({ is_active: !cur }).eq("id", id);
    setAnnouncements((a) => a.map((x) => (x.id === id ? { ...x, is_active: !cur } : x)));
  }

  async function deleteAnnouncement(id: string) {
    await supabase.from("announcements").delete().eq("id", id);
    setAnnouncements((a) => a.filter((x) => x.id !== id));
  }

  async function addTicker() {
    if (!newTicker.trim()) return;
    const nextOrder = tickers.length > 0 ? Math.max(...tickers.map((t) => t.display_order)) + 1 : 0;
    const { data } = await supabase.from("ticker_messages").insert({
      department_id: deptId,
      message: newTicker.trim(),
      display_order: nextOrder,
      is_active: true,
      is_global: false,
    }).select().single();
    if (data) setTickers((t) => [...t, data as Ticker]);
    setNewTicker("");
  }

  async function toggleTicker(id: string, cur: boolean) {
    await supabase.from("ticker_messages").update({ is_active: !cur }).eq("id", id);
    setTickers((t) => t.map((x) => (x.id === id ? { ...x, is_active: !cur } : x)));
  }

  async function deleteTicker(id: string) {
    await supabase.from("ticker_messages").delete().eq("id", id);
    setTickers((t) => t.filter((x) => x.id !== id));
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    if (media.length + files.length > 10) { alert("ניתן להעלות עד 10 תמונות/PDF"); return; }
    setIsUploading(true);

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const mediaType = ext === "pdf" ? "pdf" : "image";
      const fileName = `media/${deptId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("department-media").upload(fileName, file, { upsert: true });
      if (error) { alert("שגיאה: " + error.message); continue; }
      const { data: urlData } = supabase.storage.from("department-media").getPublicUrl(fileName);
      const { data } = await supabase.from("department_media").insert({
        department_id: deptId,
        media_url: urlData.publicUrl,
        media_type: mediaType,
        display_order: media.length,
        is_active: true,
      }).select().single();
      if (data) setMedia((m) => [...m, data as Media]);
    }
    setIsUploading(false);
    e.target.value = "";
  }

  async function deleteMedia(id: string) {
    await supabase.from("department_media").delete().eq("id", id);
    setMedia((m) => m.filter((x) => x.id !== id));
  }

  function toggle(key: keyof DisplaySettings) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] } as DisplaySettings));
  }

  if (loading) return <div dir="rtl" className="flex min-h-screen items-center justify-center"><p className="text-2xl text-slate-500">טוען...</p></div>;
  if (notFound) return <div dir="rtl" className="flex min-h-screen items-center justify-center"><p className="text-2xl text-red-500">מחלקה לא נמצאה</p></div>;

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-3xl space-y-6">

        <div className="flex items-center gap-3">
          <Settings className="h-8 w-8 text-emerald-700" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">הגדרות מחלקה</h1>
            <p className="text-xl text-slate-500">{deptName}</p>
          </div>
        </div>

        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-auto">
            <TabsTrigger value="settings" className="gap-2 py-2"><Settings className="h-4 w-4" />הגדרות</TabsTrigger>
            <TabsTrigger value="announcements" className="gap-2 py-2"><Bell className="h-4 w-4" />הודעות</TabsTrigger>
            <TabsTrigger value="ticker" className="gap-2 py-2"><MessageSquare className="h-4 w-4" />שורת רצה</TabsTrigger>
            <TabsTrigger value="media" className="gap-2 py-2"><ImageIcon className="h-4 w-4" />מדיה</TabsTrigger>
          </TabsList>

          {/* ===== הגדרות ===== */}
          <TabsContent value="settings" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-4">
                <h2 className="text-xl font-bold">מה להציג במסך</h2>
                <div className="space-y-3">
                  {SECTION_LABELS.map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{label}</p>
                        <p className="text-xs text-slate-500">{desc}</p>
                      </div>
                      <Switch checked={!!settings[key]} onCheckedChange={() => toggle(key)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-bold">מהירות החלפת תצוגות</h2>
                <p className="text-sm text-slate-500">כל כמה שניות המסך עובר לתצוגה הבאה</p>
                <div className="flex items-center gap-4">
                  <Slider min={5} max={60} step={5} value={[settings.view_interval_seconds]} onValueChange={([v]) => setSettings((prev) => ({ ...prev, view_interval_seconds: v }))} className="flex-1" />
                  <span className="w-20 text-center text-xl font-bold text-emerald-700">{settings.view_interval_seconds} שנ׳</span>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-bold">הודעת ברכה</h2>
                <Input value={welcome} onChange={(e) => setWelcome(e.target.value)} placeholder="ברוכים הבאים" />
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} className="w-full rounded-2xl py-5 text-lg font-bold bg-emerald-600 hover:bg-emerald-700">
              {saved ? <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> נשמר בהצלחה!</span> : "שמור הגדרות"}
            </Button>
          </TabsContent>

          {/* ===== הודעות ===== */}
          <TabsContent value="announcements" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-bold">הודעה חדשה</h2>
                <Input placeholder="כותרת (אופציונלי)" value={newAnn.title} onChange={(e) => setNewAnn({ ...newAnn, title: e.target.value })} />
                <Textarea placeholder="תוכן ההודעה" value={newAnn.content} onChange={(e) => setNewAnn({ ...newAnn, content: e.target.value })} rows={3} />
                <Button onClick={addAnnouncement} className="gap-2"><Plus className="h-4 w-4" /> הוסף הודעה</Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-2">
                <h2 className="text-xl font-bold mb-2">הודעות קיימות ({announcements.length})</h2>
                {announcements.length === 0 && <p className="text-slate-500 text-center py-4">אין הודעות</p>}
                {announcements.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <Switch checked={a.is_active} onCheckedChange={() => toggleAnnouncement(a.id, a.is_active)} />
                    <div className="flex-1 min-w-0">
                      {a.title && <p className="font-semibold truncate">{a.title}</p>}
                      <p className="text-sm text-slate-600 truncate">{a.content}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteAnnouncement(a.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== שורת רצה ===== */}
          <TabsContent value="ticker" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-bold">הודעה חדשה לשורת הרצה</h2>
                <div className="flex gap-2">
                  <Input placeholder="תוכן ההודעה" value={newTicker} onChange={(e) => setNewTicker(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") addTicker(); }} />
                  <Button onClick={addTicker} className="gap-2 shrink-0"><Plus className="h-4 w-4" /> הוסף</Button>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-2">
                <h2 className="text-xl font-bold mb-2">הודעות קיימות ({tickers.length})</h2>
                {tickers.length === 0 && <p className="text-slate-500 text-center py-4">אין הודעות</p>}
                {tickers.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 rounded-xl border p-3">
                    <Switch checked={t.is_active} onCheckedChange={() => toggleTicker(t.id, t.is_active)} />
                    <p className="flex-1 min-w-0 truncate text-sm">{t.message}</p>
                    <Button variant="ghost" size="sm" onClick={() => deleteTicker(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== מדיה ===== */}
          <TabsContent value="media" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-bold">העלאת תמונות ו-PDF</h2>
                <p className="text-sm text-slate-500">עד 10 קבצים. יוצגו במסך לסירוגין.</p>
                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 hover:bg-slate-50">
                  <ImageIcon className="h-5 w-5" />
                  <span>{isUploading ? "מעלה..." : "בחר קבצים"}</span>
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleMediaUpload} disabled={isUploading} />
                </label>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6">
                <h2 className="text-xl font-bold mb-3">קבצים ({media.length})</h2>
                {media.length === 0 && <p className="text-slate-500 text-center py-4">לא הועלו קבצים</p>}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {media.map((m) => (
                    <div key={m.id} className="relative rounded-xl overflow-hidden border group">
                      {m.media_type === "pdf" ? (
                        <div className="h-28 flex items-center justify-center bg-slate-100 text-slate-500 text-sm">PDF</div>
                      ) : (
                        <img src={m.media_url} alt="" className="h-28 w-full object-cover" />
                      )}
                      <Button variant="destructive" size="sm" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => deleteMedia(m.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <p className="text-center text-slate-400 text-sm">
          קישור למסך:{" "}
          <a href={`/display/${code}`} target="_blank" className="text-emerald-600 underline">/display/{code}</a>
        </p>

      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
// הלקוח של המערכת (עם ההתחברות של המנהל). לקוח "אנונימי" נחסם בהעלאת קבצים — לכן תמונות לא נקלטו
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CheckCircle, Settings, Image as ImageIcon, X, Palette, Megaphone, ArrowRight, ArrowLeft, Loader2, ImagePlus } from "lucide-react";
import Link from "next/link";
import { refreshDepartmentScreens, uploadImage } from "@/lib/screens";
import DepartmentDisplay from "@/components/display/department-display";
import { ScreenFrame, usePreviewCu } from "@/components/admin/brand-ui";
import {
  NOTICE_MAX_IMAGES, displaySettings, israelDateISO, weekDatesISO, weekStartISO, weeklyBoardSettings, type NoticeContent,
} from "@/lib/week";

type DisplaySettings = {
  show_weekly: boolean;
  show_daily: boolean;
  show_notice: boolean;
  show_menu: boolean;
  show_menu_today: boolean;
  show_physio: boolean;
  show_media: boolean;
  show_ticker: boolean;
  show_announcements: boolean;
  ticker_source: "both" | "news" | "messages";
  view_interval_seconds: number;
};

const DEFAULT: DisplaySettings = {
  show_weekly: true,
  show_daily: true,
  show_notice: true,
  show_menu: true,
  show_menu_today: true,
  show_physio: true,
  show_media: true,
  show_ticker: true,
  show_announcements: true,
  ticker_source: "news",
  view_interval_seconds: 20,
};

type BoolKey = Exclude<keyof DisplaySettings, "ticker_source" | "view_interval_seconds">;

const SECTION_LABELS: { key: BoolKey; label: string; desc: string }[] = [
  { key: "show_weekly",        label: "לוח שבועי",       desc: "מוצג ראשון בסבב" },
  { key: "show_daily",         label: "לוח היום",        desc: "מה קורה עכשיו ובהמשך היום" },
  { key: "show_notice",        label: "מודעה",           desc: "כתב מימין ותמונות מתחלפות משמאל (בלשונית מודעה)" },
  { key: "show_physio",        label: "פיזיותרפיה",      desc: "מי מהמחלקה מוזמן היום, ומתי" },
  { key: "show_menu_today",    label: "תפריט היום",      desc: "הארוחות של היום, בגדול" },
  { key: "show_menu",          label: "תפריט שבועי",     desc: "מה שהדיאטנית כתבה לשבוע" },
  { key: "show_media",         label: "תמונות ו-PDF",    desc: "הקבצים שהועלו בלשונית מדיה" },
  { key: "show_ticker",        label: "שורת חדשות",      desc: "כותרות N12 בתחתית המסך (כותרות קשות מסוננות)" },
];

type Media = { id: string; media_url: string; media_type: string; display_order: number };
type Msg = { ok: boolean; text: string } | null;

const MAX_MEDIA = 10;
const MAX_PDF_BYTES = 20 * 1024 * 1024;
const rand = () => Math.random().toString(36).slice(2, 10);

export default function DisplaySettingsPage({ params }: { params: { code: string } }) {
  const code = params.code;
  const supabase = useMemo(() => createClient(), []);

  const [deptId, setDeptId] = useState<string>("");
  const [deptName, setDeptName] = useState("");
  const [deptColor, setDeptColor] = useState<string | null>(null);
  const [settings, setSettings] = useState<DisplaySettings>(DEFAULT);
  // כל ההגדרות של המסך (גם של הלוח) — לתצוגה המקדימה
  const [rawDisplay, setRawDisplay] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [notFound, setNotFound] = useState(false);


  const [media, setMedia] = useState<Media[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [mediaMsg, setMediaMsg] = useState<Msg>(null);

  // מודעה
  const [notice, setNotice] = useState<NoticeContent>({});
  // המודעה כמו שהיא עכשיו על המסך (גם מה שנכתב בזמן שתמונה עלתה)
  const noticeRef = useRef<NoticeContent>({});
  noticeRef.current = notice;
  const [noticeDirty, setNoticeDirty] = useState(false);
  const [noticeBusy, setNoticeBusy] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState<Msg>(null);
  const [copyAllAsk, setCopyAllAsk] = useState(false);
  const [cu, frameRef] = usePreviewCu();
  const previewWeek = useMemo(() => weekDatesISO(weekStartISO(israelDateISO())), []);

  useEffect(() => {
    async function load() {
      let dept: any = null;
      const { data: byCode } = await supabase.from("departments").select("id, name, color").eq("code", code).maybeSingle();
      if (byCode) dept = byCode;
      else {
        const { data: bySlug } = await supabase.from("departments").select("id, name, color").eq("slug", code).maybeSingle();
        dept = bySlug;
      }
      if (!dept) { setNotFound(true); setLoading(false); return; }

      setDeptId(dept.id);
      setDeptName(dept.name);
      setDeptColor(dept.color ?? null);

      const [ss, md] = await Promise.all([
        supabase.from("screen_settings").select("id, display_settings").eq("department_id", dept.id).maybeSingle(),
        supabase.from("department_media").select("id, media_url, media_type, display_order").eq("department_id", dept.id).eq("is_active", true).order("display_order", { ascending: true }),
      ]);

      const ds = (ss.data?.display_settings ?? {}) as Record<string, any>;
      setRawDisplay(ds);
      // "רק הודעות" מפעם = בלי חדשות
      setSettings({ ...DEFAULT, ...ds, show_notice: ds.show_notice !== false, show_ticker: (ds.show_ticker ?? true) !== false && ds.ticker_source !== "messages" });
      setNotice((ds.notice ?? {}) as NoticeContent);
      setMedia(md.data ?? []);
      setLoading(false);
    }
    load();
  }, [code, supabase]);

  /** מיזוג שינוי לתוך הגדרות המסך של מחלקה, בלי לדרוס הגדרות אחרות (הלוח, האייקונים…) */
  async function mergeDisplay(departmentId: string, patch: Record<string, unknown>) {
    const { data: cur } = await supabase.from("screen_settings").select("id, display_settings").eq("department_id", departmentId).maybeSingle();
    const merged = { ...((cur?.display_settings as any) || {}), ...patch };
    const res = cur?.id
      ? await supabase.from("screen_settings").update({ display_settings: merged }).eq("id", cur.id)
      : await supabase.from("screen_settings").insert({ department_id: departmentId, display_settings: merged });
    if (!res.error && departmentId === deptId) setRawDisplay(merged);
    return res.error;
  }

  async function handleSaveSettings() {
    // שומרים רק את המפתחות של הדף הזה
    const managed = Object.fromEntries((Object.keys(DEFAULT) as (keyof DisplaySettings)[]).map(k => [k, settings[k]]));
    const error = await mergeDisplay(deptId, { ...managed, ticker_source: "news" });
    if (error) { alert("לא נשמר: " + error.message); return; }
    refreshDepartmentScreens(supabase, deptId, 0);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  /* ── מדיה: תמונות ו-PDF בסבב ── */
  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files: File[] = Array.from(input.files ?? []);
    input.value = ""; // כדי שאפשר יהיה לבחור שוב את אותו קובץ
    if (!files.length) return;
    setMediaMsg(null);
    if (media.length + files.length > MAX_MEDIA) {
      setMediaMsg({ ok: false, text: `אפשר עד ${MAX_MEDIA} קבצים. יש כבר ${media.length} — אפשר להוסיף עוד ${Math.max(0, MAX_MEDIA - media.length)}.` });
      return;
    }
    setIsUploading(true);
    let order = media.reduce((m, x) => Math.max(m, x.display_order ?? 0), -1) + 1;
    const errors: string[] = [];
    let added = 0;
    for (const file of files) {
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      let url = "";
      if (isPdf) {
        if (file.size > MAX_PDF_BYTES) { errors.push(`${file.name}: קובץ PDF גדול מדי (עד 20MB)`); continue; }
        const path = `media/${deptId}-${Date.now()}-${rand()}.pdf`;
        const { error } = await supabase.storage.from("department-media").upload(path, file, { upsert: true, contentType: "application/pdf" });
        if (error) { errors.push(`${file.name}: ההעלאה נכשלה (${error.message})`); continue; }
        url = supabase.storage.from("department-media").getPublicUrl(path).data.publicUrl;
      } else {
        const res = await uploadImage(supabase, file, "media");
        if ("error" in res) { errors.push(`${file.name}: ${res.error}`); continue; }
        url = res.url;
      }
      const { data, error } = await supabase.from("department_media").insert({
        department_id: deptId,
        media_url: url,
        media_type: isPdf ? "pdf" : "image",
        display_order: order++,
        is_active: true,
      }).select("id, media_url, media_type, display_order").single();
      if (error || !data) { errors.push(`${file.name}: הקובץ עלה אבל לא נשמר ברשימה (${error?.message ?? "שגיאה"})`); continue; }
      setMedia((m) => [...m, data as Media]);
      added++;
    }
    setIsUploading(false);
    if (errors.length) setMediaMsg({ ok: false, text: (added ? `הועלו ${added}. ` : "") + "לא הועלו: " + errors.join(" · ") });
    else setMediaMsg({ ok: true, text: added === 1 ? "הקובץ הועלה ויוצג במסך בסבב." : `${added} קבצים הועלו ויוצגו במסך בסבב.` });
    if (added) refreshDepartmentScreens(supabase, deptId);
  }

  async function deleteMedia(id: string) {
    await supabase.from("department_media").delete().eq("id", id);
    setMedia((m) => m.filter((x) => x.id !== id));
    refreshDepartmentScreens(supabase, deptId);
  }

  /* ── מודעה ── */
  async function saveNotice(next: NoticeContent = notice, msg = "המודעה נשמרה ותוצג במסך.") {
    setNoticeBusy(true);
    const clean: NoticeContent = {
      title: String(next.title ?? "").trim(),
      text: String(next.text ?? "").trim(),
      images: (next.images ?? []).filter(Boolean).slice(0, NOTICE_MAX_IMAGES),
    };
    const error = await mergeDisplay(deptId, { notice: clean });
    setNoticeBusy(false);
    if (error) { setNoticeMsg({ ok: false, text: "לא נשמר: " + error.message }); return; }
    setNoticeDirty(false);
    setNoticeMsg({ ok: true, text: msg });
    refreshDepartmentScreens(supabase, deptId);
  }

  const noticeImgs = (notice.images ?? []).filter(Boolean);

  async function addNoticeImages(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const files: File[] = Array.from(input.files ?? []);
    input.value = "";
    if (!files.length) return;
    const room = NOTICE_MAX_IMAGES - noticeImgs.length;
    if (room <= 0) { setNoticeMsg({ ok: false, text: `עד ${NOTICE_MAX_IMAGES} תמונות במודעה.` }); return; }
    setNoticeBusy(true);
    setNoticeMsg(null);
    const urls: string[] = [];
    const errors: string[] = [];
    for (const file of files.slice(0, room)) {
      const res = await uploadImage(supabase, file, "notice");
      if ("error" in res) errors.push(`${file.name}: ${res.error}`);
      else urls.push(res.url);
    }
    const latest = noticeRef.current;
    const next = { ...latest, images: [...(latest.images ?? []).filter(Boolean), ...urls].slice(0, NOTICE_MAX_IMAGES) };
    setNotice(next);
    if (urls.length) await saveNotice(next, urls.length === 1 ? "התמונה נוספה למודעה." : `${urls.length} תמונות נוספו למודעה.`);
    else setNoticeBusy(false);
    const skipped = files.length - Math.min(files.length, room);
    if (errors.length || skipped) {
      setNoticeMsg({ ok: false, text: [errors.length ? "לא הועלו: " + errors.join(" · ") : "", skipped ? `${skipped} תמונות לא נכנסו (עד ${NOTICE_MAX_IMAGES}).` : ""].filter(Boolean).join(" ") });
    }
  }

  function removeNoticeImage(i: number) {
    const next = { ...notice, images: noticeImgs.filter((_, k) => k !== i) };
    setNotice(next);
    saveNotice(next, "התמונה הוסרה מהמודעה.");
  }

  function moveNoticeImage(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= noticeImgs.length) return;
    const imgs = [...noticeImgs];
    [imgs[i], imgs[j]] = [imgs[j], imgs[i]];
    const next = { ...notice, images: imgs };
    setNotice(next);
    saveNotice(next, "הסדר נשמר.");
  }

  async function setShowNotice(on: boolean) {
    setSettings(prev => ({ ...prev, show_notice: on }));
    const error = await mergeDisplay(deptId, { show_notice: on });
    if (error) { setNoticeMsg({ ok: false, text: "לא נשמר: " + error.message }); return; }
    refreshDepartmentScreens(supabase, deptId, 0);
  }

  /** אותה מודעה בכל המחלקות */
  async function copyNoticeToAll() {
    setCopyAllAsk(false);
    setNoticeBusy(true);
    const clean: NoticeContent = { title: String(notice.title ?? "").trim(), text: String(notice.text ?? "").trim(), images: noticeImgs.slice(0, NOTICE_MAX_IMAGES) };
    const { data: depts } = await supabase.from("departments").select("id");
    let ok = 0;
    for (const d of depts ?? []) {
      const error = await mergeDisplay(d.id, { notice: clean, show_notice: true });
      if (!error) { ok++; refreshDepartmentScreens(supabase, d.id); }
    }
    setNoticeBusy(false);
    setNoticeDirty(false);
    if (ok) setSettings(prev => ({ ...prev, show_notice: true }));
    setNoticeMsg({ ok: ok === (depts ?? []).length, text: `המודעה נשמרה ב-${ok} מחלקות${ok < (depts ?? []).length ? ` מתוך ${(depts ?? []).length}` : ""}.` });
  }

  function toggle(key: BoolKey) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] } as DisplaySettings));
  }

  if (loading) return <div dir="rtl" className="flex min-h-screen items-center justify-center"><p className="text-2xl text-slate-500">טוען...</p></div>;
  if (notFound) return <div dir="rtl" className="flex min-h-screen items-center justify-center"><p className="text-2xl text-red-500">מחלקה לא נמצאה</p></div>;

  const hasNoticeContent = !!(String(notice.title ?? "").trim() || String(notice.text ?? "").trim() || noticeImgs.length);

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
            <TabsTrigger value="design" className="gap-2 py-2"><Palette className="h-4 w-4" />הלוח</TabsTrigger>
            <TabsTrigger value="notice" className="gap-2 py-2"><Megaphone className="h-4 w-4" />מודעה</TabsTrigger>
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
                <p className="text-sm text-slate-500">כל כמה שניות המסך עובר לתצוגה הבאה. במודעה עם כמה תמונות — עד שכל התמונות הוצגו (עד דקה).</p>
                <div className="flex items-center gap-4">
                  <Slider min={5} max={60} step={5} value={[settings.view_interval_seconds]} onValueChange={([v]) => setSettings((prev) => ({ ...prev, view_interval_seconds: v }))} className="flex-1" />
                  <span className="w-20 text-center text-xl font-bold text-emerald-700">{settings.view_interval_seconds} שנ׳</span>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveSettings} className="w-full rounded-2xl py-5 text-lg font-bold bg-emerald-600 hover:bg-emerald-700">
              {saved ? <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5" /> נשמר בהצלחה!</span> : "שמור הגדרות"}
            </Button>
          </TabsContent>

          {/* ===== הלוח ===== */}
          <TabsContent value="design" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Palette className="h-6 w-6 text-emerald-600" />
                  <h2 className="text-xl font-bold">עריכת הלוח והמסך</h2>
                </div>
                <p className="text-sm text-slate-600">
                  פעילויות, נושא השבוע, מה רואים בלוח וגודל הטקסט — עם תצוגה חיה של המסך.
                </p>
                <Link href={`/admin/weekly?dept=${encodeURIComponent(code)}`}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-4 text-lg font-bold text-white hover:bg-emerald-700">
                  <Palette className="h-5 w-5" />
                  פתיחת עורך הלוח השבועי
                </Link>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== מודעה ===== */}
          <TabsContent value="notice" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-bold">מודעה במסך</h2>
                    <p className="text-sm text-slate-500">כתב מימין, ומשמאל עד {NOTICE_MAX_IMAGES} תמונות שמתחלפות. מוצגת בסבב אחרי לוח היום.</p>
                  </div>
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <Switch checked={settings.show_notice} onCheckedChange={(v) => setShowNotice(!!v)} />
                    להציג במסך
                  </label>
                </div>

                <Input placeholder="כותרת המודעה" value={notice.title ?? ""} onChange={(e) => { setNotice({ ...notice, title: e.target.value }); setNoticeDirty(true); }} className="text-lg" />
                <Textarea placeholder="הטקסט של המודעה (אפשר כמה שורות)" value={notice.text ?? ""} rows={5}
                  onChange={(e) => { setNotice({ ...notice, text: e.target.value }); setNoticeDirty(true); }} />

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-semibold">תמונות ({noticeImgs.length}/{NOTICE_MAX_IMAGES})</span>
                    {noticeImgs.length < NOTICE_MAX_IMAGES && (
                      <label className={"inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 " + (noticeBusy ? "pointer-events-none opacity-60" : "")}>
                        {noticeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} הוספת תמונות
                        <input type="file" multiple accept="image/*" className="sr-only" onChange={addNoticeImages} disabled={noticeBusy} />
                      </label>
                    )}
                  </div>
                  {noticeImgs.length === 0 ? (
                    <p className="rounded-xl bg-slate-50 py-4 text-center text-sm text-slate-500">אין תמונות — המודעה תוצג רק עם הכתב.</p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {noticeImgs.map((src, i) => (
                        <li key={src + i} className="overflow-hidden rounded-xl border bg-white">
                          <img src={src} alt="" className="h-24 w-full object-cover" />
                          <div className="flex items-center justify-between px-1 py-1">
                            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === 0 || noticeBusy} onClick={() => moveNoticeImage(i, -1)} aria-label="להקדים">
                              <ArrowRight className="h-4 w-4" />
                            </button>
                            <span className="text-xs text-slate-400">{i + 1}</span>
                            <button type="button" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 disabled:opacity-30" disabled={i === noticeImgs.length - 1 || noticeBusy} onClick={() => moveNoticeImage(i, 1)} aria-label="לאחר">
                              <ArrowLeft className="h-4 w-4" />
                            </button>
                            <button type="button" className="rounded-lg p-1.5 text-red-500 hover:bg-red-50" disabled={noticeBusy} onClick={() => removeNoticeImage(i)} aria-label="הסרת התמונה">
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => saveNotice()} disabled={noticeBusy} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                    {noticeBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />} שמירת המודעה
                  </Button>
                  {copyAllAsk ? (
                    <span className="flex flex-wrap items-center gap-2 text-sm">
                      להחליף את המודעה בכל המחלקות במודעה הזו?
                      <Button size="sm" onClick={copyNoticeToAll} disabled={noticeBusy}>כן, לכל המחלקות</Button>
                      <Button size="sm" variant="ghost" onClick={() => setCopyAllAsk(false)}>לא</Button>
                    </span>
                  ) : (
                    <Button variant="outline" onClick={() => setCopyAllAsk(true)} disabled={noticeBusy || !hasNoticeContent}>גם בכל המחלקות</Button>
                  )}
                  {noticeDirty && !noticeBusy && <span className="text-sm text-amber-700">יש שינויים שלא נשמרו</span>}
                </div>
                {noticeMsg && <p role="status" className={"text-sm font-semibold " + (noticeMsg.ok ? "text-emerald-700" : "text-red-600")}>{noticeMsg.text}</p>}
              </CardContent>
            </Card>

            {hasNoticeContent && (
              <div>
                <h2 className="mb-2 text-lg font-bold">כך זה ייראה במסך</h2>
                <ScreenFrame frameRef={frameRef}>
                  <DepartmentDisplay
                    department={{ id: deptId, name: deptName, color: deptColor }}
                    weekDates={previewWeek}
                    days={[[], [], [], [], [], [], []]}
                    settings={displaySettings({ ...rawDisplay, notice, show_notice: true })}
                    board={weeklyBoardSettings(rawDisplay.weekly_board)}
                    topic={null}
                    menu={{}}
                    messages={[]}
                    news={[]}
                    media={[]}
                    embeddedCu={cu}
                    fixedView="notice"
                  />
                </ScreenFrame>
              </div>
            )}
          </TabsContent>

          {/* ===== מדיה ===== */}
          <TabsContent value="media" className="mt-4 space-y-4">
            <Card className="rounded-2xl border-0 shadow-md">
              <CardContent className="p-6 space-y-3">
                <h2 className="text-xl font-bold">העלאת תמונות ו-PDF</h2>
                <p className="text-sm text-slate-500">עד {MAX_MEDIA} קבצים. כל קובץ מוצג במסך כתצוגה בסבב. צילומים גדולים מוקטנים לבד.</p>
                <label className={"flex cursor-pointer items-center gap-2 rounded-md border border-dashed px-4 py-3 hover:bg-slate-50 " + (isUploading ? "pointer-events-none opacity-60" : "")}>
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
                  <span>{isUploading ? "מעלה…" : "בחירת קבצים"}</span>
                  <input type="file" multiple accept="image/*,application/pdf" className="hidden" onChange={handleMediaUpload} disabled={isUploading} />
                </label>
                {mediaMsg && <p role="status" className={"text-sm font-semibold " + (mediaMsg.ok ? "text-emerald-700" : "text-red-600")}>{mediaMsg.text}</p>}
                {!settings.show_media && (
                  <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">התצוגה &quot;תמונות ו-PDF&quot; כבויה בלשונית הגדרות — הקבצים לא יוצגו עד שמפעילים אותה.</p>
                )}
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
                      <Button variant="destructive" size="sm" className="absolute top-1 right-1 h-7 w-7 p-0" onClick={() => deleteMedia(m.id)} aria-label="מחיקה">
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

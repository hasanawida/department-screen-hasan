"use client";

// עריכת האייקונים והתמונות שבמסכים: תמונה לכל סוג פעילות ולכל ארוחה, המילים שמזהות כל סוג,
// סוגים חדשים, ובחירה ידנית של אייקון לשם פעילות מסוים.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ImagePlus, Loader2, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage, refreshDepartmentScreens } from "@/lib/screens";
import { Card, PageShell, btnGhost, btnPrimary, inputCls, textareaCls } from "@/components/admin/brand-ui";
import { activityKey } from "@/components/display/icons";
import {
  ACTIVITY_TYPES, activityImage, activityTypeLabel, latestIconConfig, mealImage, parseWords,
  type CustomIconType, type IconConfig,
} from "@/lib/icon-config";
import { MEALS, MEAL_LABELS, type Meal } from "@/lib/week";

type Row = { id: string; department_id: string; display_settings: any };

export default function IconsManager() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [deptIds, setDeptIds] = useState<string[]>([]);
  const [titles, setTitles] = useState<string[]>([]);

  // מה שנערך (נשמר רק בלחיצה על "שמירה")
  const [images, setImages] = useState<Record<string, string>>({});       // סוג מובנה ← תמונה שהועלתה
  const [wordsText, setWordsText] = useState<Record<string, string>>({}); // סוג מובנה ← מילים (טקסט חופשי)
  const [custom, setCustom] = useState<CustomIconType[]>([]);
  const [byTitle, setByTitle] = useState<Record<string, string>>({});
  const [meals, setMeals] = useState<Partial<Record<Meal, string>>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(null), 3500); };
  const touch = () => setDirty(true);

  /* ── טעינה ── */
  useEffect(() => {
    (async () => {
      const [depts, ss, acts] = await Promise.all([
        supabase.from("departments").select("id"),
        supabase.from("screen_settings").select("id, department_id, display_settings"),
        supabase.from("activities").select("title").eq("is_active", true),
      ]);
      setDeptIds((depts.data ?? []).map((d: any) => String(d.id)));
      const cfg = latestIconConfig((ss.data ?? []) as Row[]);
      const img: Record<string, string> = {}, words: Record<string, string> = {};
      for (const [k, v] of Object.entries(cfg.types ?? {})) {
        if (v?.image) img[k] = v.image;
        if (v?.words?.length) words[k] = v.words.join(", ");
      }
      setImages(img); setWordsText(words);
      setCustom(cfg.custom ?? []);
      setByTitle(cfg.titles ?? {});
      setMeals(cfg.meals ?? {});
      const names: string[] = Array.from(new Set<string>((acts.data ?? []).map((a: any) => String(a.title ?? "").trim()).filter(Boolean)));
      setTitles(names.sort((a, b) => a.localeCompare(b, "he")));
      setLoading(false);
    })();
  }, [supabase]);

  /** ההגדרה כפי שהיא עכשיו בעריכה (גם לתצוגה וגם לשמירה) */
  const config: IconConfig = useMemo(() => {
    const types: IconConfig["types"] = {};
    for (const t of ACTIVITY_TYPES) {
      const image = images[t.key];
      const words = parseWords(wordsText[t.key] ?? "");
      if (image || words.length) types[t.key] = { image: image || null, words: words.length ? words : null };
    }
    return { types, custom, titles: byTitle, meals };
  }, [images, wordsText, custom, byTitle, meals]);

  /* ── העלאת תמונה ── */
  const upload = async (key: string, file: File | undefined, done: (url: string) => void) => {
    if (!file) return;
    setBusyKey(key);
    const res = await uploadImage(supabase, file, "icons");
    setBusyKey(null);
    if ("error" in res) { flash(res.error); return; }
    done(res.url); touch();
  };

  /* ── שמירה: לכל המחלקות, ורענון המסכים ── */
  const save = useCallback(async () => {
    setSaving(true);
    const icons: IconConfig = { ...config, updated_at: new Date().toISOString() };
    const { data: rows } = await supabase.from("screen_settings").select("id, department_id, display_settings");
    const byDept = new Map(((rows ?? []) as Row[]).map(r => [String(r.department_id), r]));
    let failed = 0;
    for (const deptId of deptIds) {
      const cur = byDept.get(deptId);
      const merged = { ...(cur?.display_settings ?? {}), icons };
      const res = cur
        ? await supabase.from("screen_settings").update({ display_settings: merged }).eq("id", cur.id)
        : await supabase.from("screen_settings").insert({ department_id: deptId, display_settings: merged });
      if (res.error) failed++;
      else refreshDepartmentScreens(supabase, deptId);
    }
    setSaving(false);
    if (failed) flash(`לא נשמר ב-${failed} מחלקות. נסו שוב.`);
    else { setDirty(false); flash("נשמר. המסכים מתעדכנים."); }
  }, [config, deptIds, supabase]);

  /* ── סוג חדש ── */
  const [newLabel, setNewLabel] = useState("");
  const [newWords, setNewWords] = useState("");
  const [newImage, setNewImage] = useState("");
  const addCustom = () => {
    const label = newLabel.trim();
    if (!label || !newImage) return;
    const key = "custom-" + Date.now().toString(36);
    setCustom(list => [...list, { key, label, image: newImage, words: parseWords(newWords) }]);
    setNewLabel(""); setNewWords(""); setNewImage(""); touch();
  };

  const allTypes = [...ACTIVITY_TYPES.map(t => ({ key: t.key, label: t.label })), ...custom.map(c => ({ key: c.key, label: c.label }))];
  const shownTitles = titles.filter(t => !query.trim() || t.includes(query.trim()));

  if (loading) {
    return (
      <PageShell title="אייקונים ותמונות">
        <div className="flex items-center gap-2 text-[#3F2F2D]/60"><Loader2 className="h-4 w-4 animate-spin" /> טוען…</div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="אייקונים ותמונות"
      subtitle="התמונות שליד כל פעילות בלוח השבועי ובתפריט היום. השינויים חלים על כל המחלקות."
      actions={
        <>
          {msg && <span className="text-sm font-semibold text-[#5A826F]" role="status">{msg}</span>}
          <button type="button" className={btnPrimary} onClick={save} disabled={!dirty || saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} שמירה
          </button>
        </>
      }
    >
      <div className="space-y-6">
        {/* ── סוגי פעילויות ── */}
        <Card title="אייקון לכל סוג פעילות">
          <p className="mb-4 text-sm text-[#3F2F2D]/65">
            המסך בוחר תמונה לפי המילים שבשם הפעילות. אפשר להחליף תמונה ולשנות את המילים. מילה בתוך מירכאות, למשל "שיר", מתאימה רק כמילה שלמה.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ACTIVITY_TYPES.map(t => (
              <TypeCard
                key={t.key}
                label={t.label}
                image={activityImage(t.key, config)}
                busy={busyKey === t.key}
                changedImage={!!images[t.key]}
                onUpload={f => upload(t.key, f, url => setImages(m => ({ ...m, [t.key]: url })))}
                onResetImage={() => { setImages(m => { const n = { ...m }; delete n[t.key]; return n; }); touch(); }}
              >
                {t.key !== "other" && (
                  <>
                    <textarea
                      className={textareaCls + " text-sm"} rows={2}
                      value={wordsText[t.key] ?? ""} placeholder={t.defaultWords}
                      aria-label={`מילים שמזהות ${t.label}`}
                      onChange={e => { const v = e.target.value; setWordsText(m => ({ ...m, [t.key]: v })); touch(); }}
                    />
                    <div className="mt-1 text-xs text-[#3F2F2D]/50">
                      {wordsText[t.key]?.trim() ? "מילים שנערכו" : "ריק = מילות ברירת המחדל"}
                    </div>
                  </>
                )}
              </TypeCard>
            ))}
            {custom.map(c => (
              <TypeCard
                key={c.key}
                label={c.label}
                image={c.image}
                busy={busyKey === c.key}
                onUpload={f => upload(c.key, f, url => setCustom(list => list.map(x => (x.key === c.key ? { ...x, image: url } : x))))}
                onDelete={() => { setCustom(list => list.filter(x => x.key !== c.key)); touch(); }}
              >
                <input
                  className={inputCls + " mb-2 text-sm"} value={c.label} aria-label="שם הסוג"
                  onChange={e => { const v = e.target.value; setCustom(list => list.map(x => (x.key === c.key ? { ...x, label: v } : x))); touch(); }}
                />
                <textarea
                  className={textareaCls + " text-sm"} rows={2} defaultValue={c.words.join(", ")} placeholder="מילים, מופרדות בפסיק"
                  aria-label={`מילים שמזהות ${c.label}`}
                  onChange={e => { const v = parseWords(e.target.value); setCustom(list => list.map(x => (x.key === c.key ? { ...x, words: v } : x))); touch(); }}
                />
              </TypeCard>
            ))}
          </div>
        </Card>

        {/* ── סוג חדש ── */}
        <Card title="הוספת סוג אייקון חדש">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
            <label className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-[#A9C8B8] bg-[#F6F2EE] text-[#5A826F]" title="העלאת תמונה">
              {busyKey === "__new" ? <Loader2 className="h-5 w-5 animate-spin" /> : newImage ? <img src={newImage} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
              <input type="file" accept="image/*" className="sr-only" aria-label="תמונה לסוג החדש"
                onChange={e => upload("__new", e.target.files?.[0], url => setNewImage(url))} />
            </label>
            <div>
              <span className="mb-1 block text-sm font-semibold text-[#5A826F]">שם</span>
              <input className={inputCls} value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="למשל: תפילה" />
            </div>
            <div>
              <span className="mb-1 block text-sm font-semibold text-[#5A826F]">מילים בשם הפעילות</span>
              <input className={inputCls} value={newWords} onChange={e => setNewWords(e.target.value)} placeholder="תפילה, בית כנסת" />
            </div>
            <button type="button" className={btnGhost} onClick={addCustom} disabled={!newLabel.trim() || !newImage}>
              <Plus className="h-4 w-4" /> הוספה
            </button>
          </div>
          <p className="mt-2 text-xs text-[#3F2F2D]/55">סוג חדש גובר על הסוגים המובנים כשהמילים שלו מופיעות בשם הפעילות.</p>
        </Card>

        {/* ── לפי שם פעילות ── */}
        <Card
          title="אייקון לפעילות מסוימת"
          aside={
            <div className="relative w-56">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F2F2D]/40" />
              <input className={inputCls + " pr-9 text-sm"} value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש פעילות" aria-label="חיפוש פעילות" />
            </div>
          }
        >
          <p className="mb-3 text-sm text-[#3F2F2D]/65">כל שמות הפעילויות שבלוחות. אם האייקון שנבחר אוטומטית לא מתאים — בוחרים אחר.</p>
          {shownTitles.length === 0 ? (
            <p className="text-sm text-[#3F2F2D]/55">אין פעילויות.</p>
          ) : (
            <ul className="divide-y divide-[#3F2F2D]/10">
              {shownTitles.map(title => {
                const manual = byTitle[title];
                const key = activityKey(title, config);
                return (
                  <li key={title} className="flex flex-wrap items-center gap-3 py-2.5">
                    <img src={activityImage(key, config)} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-[#3F2F2D]/10" />
                    <span className="min-w-0 flex-1 font-semibold">{title}</span>
                    <select
                      className={inputCls + " w-60 text-sm"} value={manual ?? ""} aria-label={`אייקון ל${title}`}
                      onChange={e => {
                        const v = e.target.value;
                        setByTitle(m => { const n = { ...m }; if (v) n[title] = v; else delete n[title]; return n; });
                        touch();
                      }}
                    >
                      <option value="">אוטומטי ({activityTypeLabel(activityKey(title, { ...config, titles: {} }), config)})</option>
                      {allTypes.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* ── ארוחות ── */}
        <Card title="תמונה לכל ארוחה (תפריט היום)">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {MEALS.map(m => (
              <TypeCard
                key={m}
                label={MEAL_LABELS[m]}
                image={mealImage(m, config)}
                round
                busy={busyKey === "meal-" + m}
                changedImage={!!meals[m]}
                onUpload={f => upload("meal-" + m, f, url => setMeals(x => ({ ...x, [m]: url })))}
                onResetImage={() => { setMeals(x => { const n = { ...x }; delete n[m]; return n; }); touch(); }}
              />
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

/** כרטיס של סוג אחד: תמונה, החלפה, חזרה למקורית, ושדות נוספים */
function TypeCard({
  label, image, busy, changedImage, round, onUpload, onResetImage, onDelete, children,
}: {
  label: string; image: string; busy?: boolean; changedImage?: boolean; round?: boolean;
  onUpload: (f: File | undefined) => void; onResetImage?: () => void; onDelete?: () => void; children?: React.ReactNode;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [image]);
  return (
    <div className="rounded-xl border border-[#3F2F2D]/10 bg-[#F6F2EE]/60 p-3">
      <div className="mb-2 flex items-center gap-3">
        <div className={"relative h-16 w-16 shrink-0 overflow-hidden bg-white ring-1 ring-[#3F2F2D]/10 " + (round ? "rounded-full" : "rounded-xl")}>
          {broken
            ? <div className="flex h-full w-full items-center justify-center text-[11px] text-[#3F2F2D]/45">אין תמונה</div>
            : <img src={image} alt="" className="h-full w-full object-cover" onError={() => setBroken(true)} />}
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/70"><Loader2 className="h-5 w-5 animate-spin" /></div>}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold leading-tight">{label}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-semibold text-[#5A826F] ring-1 ring-[#3F2F2D]/10 hover:bg-[#E3ECE7]">
              <ImagePlus className="h-3.5 w-3.5" /> החלפת תמונה
              <input type="file" accept="image/*" className="sr-only" aria-label={`תמונה חדשה ל${label}`} onChange={e => { onUpload(e.target.files?.[0]); e.currentTarget.value = ""; }} />
            </label>
            {changedImage && onResetImage && (
              <button type="button" onClick={onResetImage} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#3F2F2D]/65 hover:bg-white">
                <RotateCcw className="h-3.5 w-3.5" /> לתמונה המקורית
              </button>
            )}
            {onDelete && (
              <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#B56262] hover:bg-white">
                <Trash2 className="h-3.5 w-3.5" /> מחיקה
              </button>
            )}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

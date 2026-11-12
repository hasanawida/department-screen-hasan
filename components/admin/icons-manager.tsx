"use client";

// עריכת האייקונים והתמונות שבמסכים: תמונה לכל סוג פעילות ולכל מנה בתפריט, המילים שמזהות כל אחד,
// סוגים ומנות חדשים, ובחירה ידנית של אייקון לשם פעילות מסוים.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, RotateCcw, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadImage } from "@/lib/screens";
import { loadIconConfig, saveIconConfig } from "@/lib/icon-config-db";
import { mergeIconConfig } from "@/lib/icon-config-merge";
import { Card, PageShell, Toggle, btnGhost, btnPrimary, inputCls, textareaCls } from "@/components/admin/brand-ui";
import { activityKey } from "@/components/display/icons";
import {
  ACTIVITY_TYPES, activityImage, activityTypeLabel, latestIconConfig, menuLinePhotos, parseWords,
  type CustomIconType, type IconConfig,
} from "@/lib/icon-config";
import { DISH_LIST, dishImage } from "@/lib/dishes";

type Row = { id: string; department_id: string; display_settings: any };

/** מה שנערך בעמוד, בצורה שנוחה לטופס */
type Parts = {
  images: Record<string, string>;       // סוג מובנה ← תמונה שהועלתה
  wordsText: Record<string, string>;    // סוג מובנה ← מילים (טקסט חופשי)
  custom: CustomIconType[];
  byTitle: Record<string, string>;
  meals: NonNullable<IconConfig["meals"]>;
  dishImages: Record<string, string>;
  dishWords: Record<string, string>;
  dishCustom: CustomIconType[];
  /** בחירות לשורות מסוימות בתפריט (נעשות בטופס התפריט) — נשמרות כמו שהן */
  dishLines: Record<string, string>;
  menuLines: NonNullable<IconConfig["menu_lines"]>;
};

function partsOf(cfg: IconConfig): Parts {
  const images: Record<string, string> = {}, wordsText: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg.types ?? {})) {
    if (v?.image) images[k] = v.image;
    if (v?.words?.length) wordsText[k] = v.words.join(", ");
  }
  const dishImages: Record<string, string> = {}, dishWords: Record<string, string> = {};
  for (const [k, v] of Object.entries(cfg.dishes?.types ?? {})) {
    if (v?.image) dishImages[k] = v.image;
    if (v?.words?.length) dishWords[k] = v.words.join(", ");
  }
  return {
    images, wordsText, custom: cfg.custom ?? [], byTitle: cfg.titles ?? {}, meals: cfg.meals ?? {},
    dishImages, dishWords, dishCustom: cfg.dishes?.custom ?? [], dishLines: cfg.dishes?.lines ?? {}, menuLines: cfg.menu_lines ?? {},
  };
}

function configOf(p: Parts): IconConfig {
  const types: IconConfig["types"] = {};
  for (const t of ACTIVITY_TYPES) {
    const image = p.images[t.key];
    const words = parseWords(p.wordsText[t.key] ?? "");
    if (image || words.length) types[t.key] = { image: image || null, words: words.length ? words : null };
  }
  const dTypes: NonNullable<IconConfig["dishes"]>["types"] = {};
  for (const d of DISH_LIST) {
    const image = p.dishImages[d.key];
    const words = parseWords(p.dishWords[d.key] ?? "");
    if (image || words.length) dTypes[d.key] = { image: image || null, words: words.length ? words : null };
  }
  return { types, custom: p.custom, titles: p.byTitle, meals: p.meals, dishes: { types: dTypes, custom: p.dishCustom, lines: p.dishLines }, menu_lines: p.menuLines };
}

export default function IconsManager() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [titles, setTitles] = useState<string[]>([]);
  // ההגדרה כפי שנטענה (או נשמרה) לאחרונה — כדי לדעת בשמירה מה באמת השתנה כאן, ומה נשמר בינתיים ממקום אחר
  const baseRef = useRef<IconConfig>({});
  const stampRef = useRef("");
  const [rev, setRev] = useState(0);

  // מה שנערך (נשמר רק בלחיצה על "שמירה")
  const [images, setImages] = useState<Record<string, string>>({});       // סוג מובנה ← תמונה שהועלתה
  const [wordsText, setWordsText] = useState<Record<string, string>>({}); // סוג מובנה ← מילים (טקסט חופשי)
  const [custom, setCustom] = useState<CustomIconType[]>([]);
  const [byTitle, setByTitle] = useState<Record<string, string>>({});
  const [meals, setMeals] = useState<IconConfig["meals"]>({});
  // מנות בתפריט
  const [dishImages, setDishImages] = useState<Record<string, string>>({});
  const [dishWords, setDishWords] = useState<Record<string, string>>({});
  const [dishCustom, setDishCustom] = useState<CustomIconType[]>([]);
  const [dishQuery, setDishQuery] = useState("");
  const [menuLines, setMenuLines] = useState<NonNullable<IconConfig["menu_lines"]>>({});
  // בחירות לשורות מסוימות בתפריט (נעשות בטופס התפריט) — נשמרות כמו שהן
  const [dishLines, setDishLines] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad: boolean } | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (text: string, bad = false) => {
    if (msgTimer.current) clearTimeout(msgTimer.current);
    setMsg({ text, bad });
    msgTimer.current = setTimeout(() => setMsg(null), bad ? 8000 : 4000);
  };
  const touch = () => setDirty(true);

  const applyParts = useCallback((p: Parts) => {
    setImages(p.images); setWordsText(p.wordsText); setCustom(p.custom); setByTitle(p.byTitle); setMeals(p.meals);
    setDishImages(p.dishImages); setDishWords(p.dishWords); setDishCustom(p.dishCustom); setDishLines(p.dishLines); setMenuLines(p.menuLines);
    setRev(n => n + 1);
  }, []);

  /* ── טעינה ── */
  const load = useCallback(async () => {
    setLoading(true); setLoadError(null);
    const [ss, acts] = await Promise.all([
      supabase.from("screen_settings").select("id, department_id, display_settings"),
      supabase.from("activities").select("title").eq("is_active", true),
    ]);
    // אם ההגדרות לא נטענו — לא מציגים עמוד ריק שאפשר לשמור (זה היה מוחק את ההגדרות האמיתיות)
    if (ss.error || !ss.data || acts.error) {
      setLoadError((ss.error ?? acts.error)?.message ?? "ההגדרות לא נטענו");
      setLoading(false);
      return;
    }
    const cfg = latestIconConfig(ss.data as Row[]);
    const parts = partsOf(cfg);
    applyParts(parts);
    baseRef.current = configOf(parts);
    stampRef.current = cfg.updated_at ?? "";
    const names: string[] = Array.from(new Set<string>((acts.data ?? []).map((a: any) => String(a.title ?? "").trim()).filter(Boolean)));
    setTitles(names.sort((a, b) => a.localeCompare(b, "he")));
    setDirty(false);
    setLoading(false);
  }, [supabase, applyParts]);
  useEffect(() => { load(); }, [load]);

  /** ההגדרה כפי שהיא עכשיו בעריכה (גם לתצוגה וגם לשמירה) */
  const config: IconConfig = useMemo(
    () => configOf({ images, wordsText, custom, byTitle, meals: meals ?? {}, dishImages, dishWords, dishCustom, dishLines, menuLines }),
    [images, wordsText, custom, byTitle, meals, dishImages, dishWords, dishCustom, dishLines, menuLines],
  );
  const configRef = useRef(config);
  configRef.current = config;

  /* ── העלאת תמונה ── */
  const upload = async (key: string, file: File | undefined, done: (url: string) => void) => {
    if (!file) return;
    setBusyKey(key);
    const res = await uploadImage(supabase, file, "icons");
    setBusyKey(null);
    if ("error" in res) { flash(res.error, true); return; }
    done(res.url); touch();
  };

  /* ── שמירה: לכל המחלקות ── */
  const save = useCallback(async () => {
    setSaving(true);
    const mine = config;
    // קוראים קודם את מה ששמור עכשיו: אם מישהו שינה בינתיים (למשל תמונה למנה מטופס התפריט),
    // ממזגים את השינויים שלו עם שלנו במקום לדרוס אותם
    let latest: IconConfig;
    try {
      latest = await loadIconConfig(supabase);
    } catch {
      setSaving(false);
      flash("לא נשמר — אין חיבור. נסו שוב.", true);
      return;
    }
    const changedElsewhere = (latest.updated_at ?? "") !== stampRef.current;
    const { error, saved } = await saveIconConfig(supabase, changedElsewhere ? mergeIconConfig(baseRef.current, mine, latest) : mine);
    setSaving(false);
    if (saved) {
      const parts = partsOf(saved);
      baseRef.current = configOf(parts);
      stampRef.current = saved.updated_at ?? "";
      // אם המשיכו לערוך בזמן השמירה — משאירים את העריכה, והיא תישמר בלחיצה הבאה
      if (configRef.current === mine) { applyParts(parts); setDirty(!!error); }
    }
    if (error) flash(error, true);
    else flash(changedElsewhere ? "נשמר, יחד עם שינויים שנעשו בינתיים ממקום אחר. יופיע במסכים בתוך כמה דקות." : "נשמר. יופיע במסכים בתוך כמה דקות.");
  }, [config, supabase, applyParts]);

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

  /* ── מנה חדשה ── */
  const [newDishLabel, setNewDishLabel] = useState("");
  const [newDishWords, setNewDishWords] = useState("");
  const [newDishImage, setNewDishImage] = useState("");
  const addDish = () => {
    const label = newDishLabel.trim();
    if (!label || !newDishImage) return;
    const words = parseWords(newDishWords);
    setDishCustom(list => [...list, { key: "dish-" + Date.now().toString(36), label, image: newDishImage, words: words.length ? words : [label] }]);
    setNewDishLabel(""); setNewDishWords(""); setNewDishImage(""); touch();
  };
  const q = dishQuery.trim();
  const shownDishes = DISH_LIST.filter(d => !q || d.label.includes(q) || d.words.some(w => w.includes(q) || q.includes(w)));

  const allTypes = [...ACTIVITY_TYPES.map(t => ({ key: t.key, label: t.label })), ...custom.map(c => ({ key: c.key, label: c.label }))];
  const shownTitles = titles.filter(t => !query.trim() || t.includes(query.trim()));

  if (loading) {
    return (
      <PageShell title="אייקונים ותמונות">
        <div className="flex items-center gap-2 text-[#3F2F2D]/60"><Loader2 className="h-4 w-4 animate-spin" /> טוען…</div>
      </PageShell>
    );
  }
  if (loadError) {
    return (
      <PageShell title="אייקונים ותמונות">
        <div className="rounded-xl border border-[#B56262]/30 bg-[#B56262]/10 p-4 text-[#3F2F2D]" role="alert">
          <div className="font-bold">ההגדרות לא נטענו</div>
          <p className="mt-1 text-sm text-[#3F2F2D]/70">בדקו את החיבור לאינטרנט ונסו שוב. כלום לא נמחק.</p>
          <button type="button" className={btnPrimary + " mt-3"} onClick={load}>ניסיון נוסף</button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="אייקונים ותמונות"
      subtitle="התמונות שליד כל פעילות בלוח השבועי ובתפריט היום. השינויים חלים על כל המחלקות."
      actions={
        <>
          {msg && <span className={"text-sm font-semibold " + (msg.bad ? "text-[#B56262]" : "text-[#5A826F]")} role={msg.bad ? "alert" : "status"}>{msg.text}</span>}
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
                      {wordsText[t.key]?.trim() ? "המילים האלה מחליפות את מילות ברירת המחדל" : "ריק = מילות ברירת המחדל"}
                    </div>
                  </>
                )}
              </TypeCard>
            ))}
            {custom.map(c => (
              <TypeCard
                key={c.key + ":" + rev}
                label={c.label}
                image={c.image}
                busy={busyKey === c.key}
                onUpload={f => upload(c.key, f, url => setCustom(list => list.map(x => (x.key === c.key ? { ...x, image: url } : x))))}
                onDelete={() => {
                  setCustom(list => list.filter(x => x.key !== c.key));
                  // פעילויות שהאייקון הזה נבחר להן חוזרות לבחירה האוטומטית
                  setByTitle(m => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== c.key)));
                  touch();
                }}
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

        {/* ── מנות בתפריט ── */}
        <Card
          title="תמונות למנות בתפריט"
          aside={
            <div className="relative w-56">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3F2F2D]/40" />
              <input className={inputCls + " pr-9 text-sm"} value={dishQuery} onChange={e => setDishQuery(e.target.value)} placeholder="חיפוש מנה" aria-label="חיפוש מנה" />
            </div>
          }
        >
          <p className="mb-4 text-sm text-[#3F2F2D]/65">
            התמונה של כל מנה נבחרת לפי המילים שבשורה בתפריט. מנה שלא מזוהה מופיעה בלי תמונה.
            אפשר להחליף תמונה, לשנות מילים ולהוסיף מנה חדשה.
          </p>
          <div className="mb-5 rounded-xl bg-[#F6F2EE] px-4 py-1">
            <Toggle label="תמונה ליד כל מנה (בתפריט היום ובתפריט השבועי). כבוי — תמונה רק ליד שם הארוחה"
              on={menuLinePhotos(config, "today") || menuLinePhotos(config, "week")}
              onChange={v => { setMenuLines({ today: v, week: v }); touch(); }} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shownDishes.map(d => (
              <TypeCard
                key={d.key}
                label={d.label}
                image={dishImage(d.key, config)}
                round
                busy={busyKey === "dish-" + d.key}
                changedImage={!!dishImages[d.key]}
                onUpload={f => upload("dish-" + d.key, f, url => setDishImages(m => ({ ...m, [d.key]: url })))}
                onResetImage={() => { setDishImages(m => { const n = { ...m }; delete n[d.key]; return n; }); touch(); }}
              >
                <textarea
                  className={textareaCls + " text-sm"} rows={2}
                  value={dishWords[d.key] ?? ""} placeholder={d.words.join(", ")}
                  aria-label={`מילים שמזהות ${d.label}`}
                  onChange={e => { const v = e.target.value; setDishWords(m => ({ ...m, [d.key]: v })); touch(); }}
                />
                <div className="mt-1 text-xs text-[#3F2F2D]/50">{dishWords[d.key]?.trim() ? "המילים האלה מחליפות את מילות ברירת המחדל" : "ריק = מילות ברירת המחדל"}</div>
              </TypeCard>
            ))}
            {dishCustom.filter(c => !q || c.label.includes(q)).map(c => (
              <TypeCard
                key={c.key + ":" + rev}
                label={c.label}
                image={c.image}
                round
                busy={busyKey === c.key}
                onUpload={f => upload(c.key, f, url => setDishCustom(list => list.map(x => (x.key === c.key ? { ...x, image: url } : x))))}
                onDelete={() => {
                  setDishCustom(list => list.filter(x => x.key !== c.key));
                  // שורות בתפריט שהמנה הזו נבחרה להן חוזרות לזיהוי האוטומטי
                  setDishLines(m => Object.fromEntries(Object.entries(m).filter(([, v]) => v !== c.key)));
                  touch();
                }}
              >
                <input
                  className={inputCls + " mb-2 text-sm"} value={c.label} aria-label="שם המנה"
                  onChange={e => { const v = e.target.value; setDishCustom(list => list.map(x => (x.key === c.key ? { ...x, label: v } : x))); touch(); }}
                />
                <textarea
                  className={textareaCls + " text-sm"} rows={2} defaultValue={c.words.join(", ")} placeholder="מילים, מופרדות בפסיק"
                  aria-label={`מילים שמזהות ${c.label}`}
                  onChange={e => { const v = parseWords(e.target.value); setDishCustom(list => list.map(x => (x.key === c.key ? { ...x, words: v } : x))); touch(); }}
                />
              </TypeCard>
            ))}
          </div>

          <div className="mt-5 border-t border-[#3F2F2D]/10 pt-4">
            <div className="mb-2 font-bold">הוספת מנה חדשה</div>
            <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr_auto] sm:items-end">
              <label className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#A9C8B8] bg-[#F6F2EE] text-[#5A826F]" title="העלאת תמונה">
                {busyKey === "__newdish" ? <Loader2 className="h-5 w-5 animate-spin" /> : newDishImage ? <img src={newDishImage} alt="" className="h-full w-full object-cover" /> : <ImagePlus className="h-6 w-6" />}
                <input type="file" accept="image/*" className="sr-only" aria-label="תמונה למנה החדשה"
                  onChange={e => upload("__newdish", e.target.files?.[0], url => setNewDishImage(url))} />
              </label>
              <div>
                <span className="mb-1 block text-sm font-semibold text-[#5A826F]">שם המנה</span>
                <input className={inputCls} value={newDishLabel} onChange={e => setNewDishLabel(e.target.value)} placeholder="למשל: מוסקה" />
              </div>
              <div>
                <span className="mb-1 block text-sm font-semibold text-[#5A826F]">מילים בתפריט</span>
                <input className={inputCls} value={newDishWords} onChange={e => setNewDishWords(e.target.value)} placeholder="מוסקה, חצילים ממולאים" />
              </div>
              <button type="button" className={btnGhost} onClick={addDish} disabled={!newDishLabel.trim() || !newDishImage}>
                <Plus className="h-4 w-4" /> הוספה
              </button>
            </div>
            <p className="mt-2 text-xs text-[#3F2F2D]/55">מנה חדשה גוברת על המנות המובנות כשהמילים שלה מופיעות בשורה.</p>
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

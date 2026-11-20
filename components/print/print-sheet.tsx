"use client";

// דף להדפסה ולשיתוף: לוח הפעילויות או התפריט של שבוע, באותו עיצוב של המסך, על דף A4 לרוחב.
// במסך רואים את הדף (מוקטן לגודל החלון) עם כפתורים: הדפסה, הורדה (PDF או תמונה), שליחה בוואטסאפ ובמייל,
// ומעבר בין שבועות. בהדפסה — רק הדף.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FileDown, ImageDown, Loader2, Mail, MessageCircle, Printer, X } from "lucide-react";
import DepartmentDisplay, { type DepartmentDisplayProps, type ViewKind } from "@/components/display/department-display";
import { addDaysISO, shortDate } from "@/lib/week";
import { canvasBlob, snapshotCanvas } from "@/lib/snapshot";
import { jpegToPdf } from "@/lib/pdf-from-jpeg";
import { canShareFile, copyImage, mailLinks, pasteKeys, safeFileName, saveBlob } from "@/lib/share-file";

// A4 לרוחב עם שוליים של 6 מ"מ (רוב המדפסות לא מדפיסות עד הקצה): נשארים 285×198 מ"מ.
// הדף קצת קטן מזה (284×196), כדי שעיגול של פיקסל לא ידחוף אותו לדף שני
const MM = 96 / 25.4;
const PAPER_W = 284 * MM;
const PAPER_H = 196 * MM;
// אותה יחידה שהמסך מחשב לחלון בגודל הזה
const CU = Math.min(PAPER_H / 100, (0.5625 * PAPER_W) / 100);

const PRINT_CSS = `
@page { size: A4 landscape; margin: 6mm; }
html, body { background: #e9e3dc; }
.print-root * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
.print-root { min-height: 100vh; padding: 12px; font-family: "Rubik", "Assistant", system-ui, sans-serif; color: #3f2f2d; overflow-x: clip; }
.print-toolbar { max-width: ${Math.round(PAPER_W)}px; margin: 0 auto 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.print-toolbar h1 { font-size: 18px; font-weight: 800; margin: 0; margin-inline-end: auto; }
.print-toolbar h1 bdi { white-space: nowrap; }
.print-actions { width: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.print-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 8px 16px; font-size: 15px; font-weight: 600; background: #fff; color: #3f2f2d; border: 1px solid rgba(63,47,45,.15); text-decoration: none; cursor: pointer; font-family: inherit; line-height: 1.4; }
.print-btn svg { width: 18px; height: 18px; flex: none; }
.print-btn:hover { background: #e3ece7; }
.print-btn:disabled { opacity: .55; cursor: progress; }
.print-btn-main { background: #3f2f2d; color: #f6f2ee; border-color: #3f2f2d; }
.print-btn-main:hover { background: #2c201f; }
.print-btn-wa { background: #e6f4ea; border-color: #b7dcc3; }
.print-btn-wa:hover { background: #d3ecdb; }
.print-tip { width: 100%; font-size: 13px; color: rgba(63,47,45,.65); margin: 0; }
.print-note { width: 100%; display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px; background: #fff; border: 1px solid #b7dcc3; border-radius: 16px; padding: 10px 14px; font-size: 15px; }
.print-note-err { background: #fdf0ee; border-color: #f0c6bd; }
.print-note-text { flex: 1 1 280px; font-weight: 600; }
.print-note .print-btn { padding: 6px 14px; font-size: 14px; }
.print-note-x { border: 0; background: none; color: rgba(63,47,45,.6); padding: 4px; cursor: pointer; display: inline-flex; }
.print-note-x svg { width: 18px; height: 18px; }
@keyframes print-spin { to { transform: rotate(360deg); } }
.print-spin { animation: print-spin 1s linear infinite; }
.print-empty { max-width: 640px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 24px; text-align: center; font-size: 18px; }
.print-scaler { position: relative; margin: 0 auto; }
.print-paper { position: relative; overflow: hidden; background: #f6f2ee; transform-origin: top right; box-shadow: 0 2px 14px rgba(63,47,45,.18); }
@media print {
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; min-height: 0 !important; }
  .print-root { padding: 0 !important; min-height: 0 !important; }
  .print-toolbar, .print-empty { display: none !important; }
  .print-scaler { width: auto !important; height: auto !important; margin: 0 !important; }
  .print-paper { transform: none !important; box-shadow: none !important; }
}
`;

/** הקבצים של הדף: תמונה (לוואטסאפ ולהורדה) ו-PDF (להורדה ולמייל) */
type Files = { jpg: Blob; pdf: Blob; png: () => Promise<Blob> };
type Action = "pdf" | "jpg" | "whatsapp" | "email";
type Note = {
  text: string;
  links?: Array<{ label: string; href: string; newTab?: boolean }>;
  extra?: { label: string; run: () => void };
  error?: boolean;
};

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));

/** מחכה שכל התמונות בתוך האלמנט ייטענו (או ייכשלו), עד timeout */
function imagesLoaded(root: ParentNode, timeout: number): Promise<void> {
  const pending = Array.from(root.querySelectorAll("img")).filter(img => !img.complete);
  if (!pending.length) return Promise.resolve();
  const all = Promise.all(pending.map(img => new Promise<void>(res => {
    img.addEventListener("load", () => res(), { once: true });
    img.addEventListener("error", () => res(), { once: true });
  })));
  return Promise.race([all.then(() => undefined), sleep(timeout)]);
}

export default function PrintSheet({ data, view, title, heading, shareWhat, hideDepartment, basePath, autoPrint, emptyText }: {
  data: DepartmentDisplayProps;
  view: ViewKind;
  /** בכותרת הדף המודפס */
  title: string;
  /** בסרגל שמעל הדף (לא מודפס), בשם הקובץ ובנושא המייל */
  heading: string;
  /** מה שמצורף, למשפט במייל: "מצורף <shareWhat> לשבוע ..." */
  shareWhat: string;
  hideDepartment?: boolean;
  /** הכתובת של הדף בלי ?week — למעבר בין שבועות */
  basePath: string;
  autoPrint?: boolean;
  /** כשאין מה להדפיס */
  emptyText?: string;
}) {
  const first = data.weekDates[0];
  const last = data.weekDates[6];
  const range = `${shortDate(first)}–${shortDate(last)}.${last.slice(0, 4)}`;
  const fileBase = safeFileName(`${heading.replace(/\s*—\s*/g, " - ")} - ${range}`);
  const subject = `${heading} · ${range}`;
  const mailBody = `שלום,\r\n\r\nמצורף ${shareWhat} לשבוע ${range}.\r\n`;

  // במסך: הדף מוקטן לרוחב החלון (בטלפון). בהדפסה — בגודל מלא.
  // רוחב המסך מ-clientWidth: בטלפון innerWidth גדל כשהדף רחב מהמסך (הדפדפן מקטין את כל הדף),
  // ואז הדף היה נשאר רחב והכפתורים זעירים
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, ((document.documentElement.clientWidth || window.innerWidth) - 24) / PAPER_W));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // נפתח עם ?auto=1 — חלון ההדפסה נפתח לבד, אחרי שהתמונות נטענו והכתב הותאם לדף
  useEffect(() => {
    if (!autoPrint || emptyText) return;
    let cancelled = false;
    imagesLoaded(document, 4000)
      .then(() => sleep(800))
      .then(() => { if (!cancelled) window.print(); });
    return () => { cancelled = true; };
  }, [autoPrint, emptyText]);

  // ── קבצים להורדה ולשליחה: צילום של הדף כמו שהוא על המסך ──
  const paperRef = useRef<HTMLDivElement>(null);
  const filesRef = useRef<Promise<Files> | null>(null);
  // כשהקבצים מוכנים — כדי ששליחה מהטלפון תיפתח מיד בלחיצה (אחרי המתנה הדפדפן כבר לא מרשה)
  const readyRef = useRef<Files | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [note, setNote] = useState<Note | null>(null);

  const prepare = useCallback((): Promise<Files> => {
    if (!filesRef.current) {
      const job = (async (): Promise<Files> => {
        const paper = paperRef.current;
        if (!paper) throw new Error("no paper");
        // הגופן, התמונות, והתאמת הכתב לדף (שרצה שוב אחרי שהגופן נטען)
        await document.fonts?.ready;
        await imagesLoaded(paper, 5000);
        await sleep(400);
        const phone = !!window.matchMedia?.("(pointer: coarse)").matches;
        const canvas = await snapshotCanvas(paper, {
          scale: phone ? 2 : 2.5,
          background: "#ffffff",
          rootStyle: { transform: "none", "box-shadow": "none", margin: "0" },
        });
        const jpg = await canvasBlob(canvas, "image/jpeg", 0.9);
        const pdf = jpegToPdf(new Uint8Array(await jpg.arrayBuffer()), canvas.width, canvas.height, { title: subject });
        // PNG — להעתקה ללוח (וואטסאפ במחשב). במחשב מכינים אותו כבר עכשיו, כדי שההעתקה תהיה מיידית
        let png: Promise<Blob> | null = phone ? null : canvasBlob(canvas, "image/png");
        png?.catch(() => { png = null; });
        return { jpg, pdf, png: () => (png ??= canvasBlob(canvas, "image/png")) };
      })();
      filesRef.current = job;
      job.then(f => { if (filesRef.current === job) readyRef.current = f; }, () => { if (filesRef.current === job) filesRef.current = null; });
    }
    return filesRef.current;
  }, [subject]);

  // שבוע אחר / מחלקה אחרת — הקבצים הקודמים כבר לא נכונים
  useEffect(() => () => { filesRef.current = null; readyRef.current = null; }, [subject]);

  // מכינים את הקבצים ברקע כשהדף נפתח, כך שהכפתורים עובדים מיד
  useEffect(() => {
    if (emptyText) return;
    const t = window.setTimeout(() => { prepare().catch(() => undefined); }, 1200);
    return () => window.clearTimeout(t);
  }, [prepare, emptyText]);

  /**
   * מריץ פעולה עם הקבצים. כשהם כבר מוכנים — באותו רגע של הלחיצה (שליחה מהטלפון והעתקה ללוח
   * מותרות רק מיד אחרי לחיצה); אחרת מכינים אותם קודם, עם סימן טעינה על הכפתור.
   */
  const withFiles = (action: Action, run: (f: Files) => void | Promise<void>) => {
    setNote(null);
    if (readyRef.current) {
      void run(readyRef.current);
      return;
    }
    setBusy(action);
    prepare().then(
      f => { setBusy(null); void run(f); },
      () => {
        setBusy(null);
        setNote({ error: true, text: 'לא הצלחנו להכין את הקובץ בדפדפן הזה. אפשר ללחוץ "הדפסה" ולבחור שם "שמירה כ-PDF".' });
      },
    );
  };

  /** שליחה דרך הטלפון לא הצליחה */
  const shareFailed = (e: unknown, fallback: () => void) => {
    const name = (e as { name?: string } | null)?.name;
    if (name === "AbortError") return; // סגרו את תפריט השיתוף
    if (name === "NotAllowedError") {
      // הדפדפן מרשה לפתוח את תפריט השיתוף רק מיד אחרי לחיצה — ועכשיו הקובץ כבר מוכן
      setNote({ text: "הקובץ מוכן — לחצו שוב על הכפתור כדי לשלוח." });
      return;
    }
    fallback();
  };

  const download = (kind: "pdf" | "jpg") => withFiles(kind, f => {
    const name = `${fileBase}.${kind}`;
    saveBlob(kind === "pdf" ? f.pdf : f.jpg, name);
    setNote({ text: `הקובץ "${name}" ירד (לתיקיית ההורדות).` });
  });

  const whatsapp = () => withFiles("whatsapp", async f => {
    const name = `${fileBase}.jpg`;
    const web = { label: "פתיחת WhatsApp Web", href: "https://web.whatsapp.com/", newTab: true };
    const viaDownload = () => {
      saveBlob(f.jpg, name);
      setNote({ text: `התמונה "${name}" ירדה. בוואטסאפ פתחו את השיחה או הקבוצה, לחצו על המהדק (צירוף) ובחרו אותה.`, links: [web] });
    };
    // טלפון: תפריט השיתוף של המכשיר, ובו וואטסאפ — התמונה נשלחת כמו שהיא
    const file = new File([f.jpg], name, { type: "image/jpeg" });
    if (canShareFile(file)) {
      try { await navigator.share({ files: [file] }); } catch (e) { shareFailed(e, viaDownload); }
      return;
    }
    // מחשב: מעתיקים את התמונה, ובוואטסאפ מדביקים אותה בשיחה
    const copying = copyImage(f.png());
    setBusy("whatsapp");
    const copied = await copying;
    setBusy(null);
    if (copied) {
      setNote({
        text: `התמונה הועתקה. פתחו בוואטסאפ את השיחה או הקבוצה, הדביקו (${pasteKeys()}) ושלחו.`,
        links: [web],
        extra: { label: "או הורדת התמונה", run: () => saveBlob(f.jpg, name) },
      });
    } else {
      viaDownload();
    }
  });

  const email = () => withFiles("email", async f => {
    const name = `${fileBase}.pdf`;
    const mail = mailLinks(subject, mailBody);
    const viaDownload = () => {
      saveBlob(f.pdf, name);
      setNote({
        text: `הקובץ "${name}" ירד. פתחו מייל חדש (הנושא והטקסט כבר כתובים) וצרפו אליו את הקובץ:`,
        links: [
          { label: "תוכנת המייל במחשב", href: mail.app },
          { label: "Gmail", href: mail.gmail, newTab: true },
          { label: "Outlook באינטרנט", href: mail.outlook, newTab: true },
        ],
      });
    };
    // טלפון: תפריט השיתוף של המכשיר — הקובץ כבר מצורף למייל
    const file = new File([f.pdf], name, { type: "application/pdf" });
    if (canShareFile(file)) {
      try { await navigator.share({ files: [file], title: subject, text: mailBody }); } catch (e) { shareFailed(e, viaDownload); }
      return;
    }
    viaDownload();
  });

  const icon = (action: Action, Icon: typeof Printer) =>
    busy === action ? <Loader2 className="print-spin" aria-hidden="true" /> : <Icon aria-hidden="true" />;

  return (
    <div className="print-root" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="print-toolbar">
        <h1>{heading} · <bdi dir="ltr">{range}</bdi></h1>
        <a className="print-btn" href={`${basePath}?week=${addDaysISO(first, -7)}`}>→ השבוע הקודם</a>
        <a className="print-btn" href={`${basePath}?week=${addDaysISO(first, 7)}`}>השבוע הבא ←</a>
        {!emptyText && (
          <div className="print-actions">
            <button type="button" className="print-btn print-btn-main" onClick={() => window.print()}>
              <Printer aria-hidden="true" /> הדפסה
            </button>
            <button type="button" className="print-btn" disabled={busy !== null} aria-busy={busy === "pdf"} onClick={() => download("pdf")}>
              {icon("pdf", FileDown)} הורדת PDF
            </button>
            <button type="button" className="print-btn" disabled={busy !== null} aria-busy={busy === "jpg"} onClick={() => download("jpg")}>
              {icon("jpg", ImageDown)} הורדת תמונה
            </button>
            <button type="button" className="print-btn print-btn-wa" disabled={busy !== null} aria-busy={busy === "whatsapp"} onClick={whatsapp}>
              {icon("whatsapp", MessageCircle)} שליחה בוואטסאפ
            </button>
            <button type="button" className="print-btn" disabled={busy !== null} aria-busy={busy === "email"} onClick={email}>
              {icon("email", Mail)} שליחה במייל
            </button>
          </div>
        )}
        {!emptyText && <p className="print-tip">בחלון ההדפסה: גודל דף A4, לרוחב. ההדפסה, ההורדה והשליחה — בדיוק כמו שרואים כאן.</p>}
        {note && (
          <div className={"print-note" + (note.error ? " print-note-err" : "")} role="status">
            <span className="print-note-text">{note.text}</span>
            {note.links?.map(l => (
              <a key={l.href} className="print-btn" href={l.href} {...(l.newTab ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{l.label}</a>
            ))}
            {note.extra && <button type="button" className="print-btn" onClick={note.extra.run}>{note.extra.label}</button>}
            <button type="button" className="print-note-x" aria-label="סגירה" onClick={() => setNote(null)}><X aria-hidden="true" /></button>
          </div>
        )}
      </div>

      {emptyText ? (
        <div className="print-empty">{emptyText}</div>
      ) : (
        <div className="print-scaler" style={{ width: PAPER_W * scale, height: PAPER_H * scale }}>
          <div ref={paperRef} className="print-paper" style={{ width: PAPER_W, height: PAPER_H, transform: scale < 1 ? `scale(${scale})` : undefined }}>
            <DepartmentDisplay {...data} fixedView={view} embeddedCu={CU} print={{ title, range, hideDepartment }} />
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

// דף להדפסה: לוח הפעילויות או התפריט של שבוע, באותו עיצוב של המסך, על דף A4 לרוחב.
// במסך רואים את הדף (מוקטן לגודל החלון) עם כפתור הדפסה ומעבר בין שבועות; בהדפסה — רק הדף.

import React, { useEffect, useState } from "react";
import DepartmentDisplay, { type DepartmentDisplayProps, type ViewKind } from "@/components/display/department-display";
import { addDaysISO, shortDate } from "@/lib/week";

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
.print-root { min-height: 100vh; padding: 12px; font-family: "Rubik", "Assistant", system-ui, sans-serif; color: #3f2f2d; }
.print-toolbar { max-width: ${Math.round(PAPER_W)}px; margin: 0 auto 12px; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.print-toolbar h1 { font-size: 18px; font-weight: 800; margin: 0; margin-inline-end: auto; }
.print-btn { display: inline-flex; align-items: center; gap: 6px; border-radius: 999px; padding: 8px 16px; font-size: 15px; font-weight: 600; background: #fff; color: #3f2f2d; border: 1px solid rgba(63,47,45,.15); text-decoration: none; cursor: pointer; }
.print-btn:hover { background: #e3ece7; }
.print-btn-main { background: #3f2f2d; color: #f6f2ee; border-color: #3f2f2d; }
.print-btn-main:hover { background: #2c201f; }
.print-tip { width: 100%; font-size: 13px; color: rgba(63,47,45,.65); margin: 0; }
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

export default function PrintSheet({ data, view, title, heading, hideDepartment, basePath, autoPrint, emptyText }: {
  data: DepartmentDisplayProps;
  view: ViewKind;
  /** בכותרת הדף המודפס */
  title: string;
  /** בסרגל שמעל הדף (לא מודפס) */
  heading: string;
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

  // במסך: הדף מוקטן לרוחב החלון (בטלפון). בהדפסה — בגודל מלא
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 24) / PAPER_W));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // נפתח מהכפתור "הדפסה" — חלון ההדפסה נפתח לבד, אחרי שהתמונות נטענו והכתב הותאם לדף
  useEffect(() => {
    if (!autoPrint || emptyText) return;
    let cancelled = false;
    const pending = Array.from(document.images).filter(img => !img.complete);
    const loaded = Promise.all(pending.map(img => new Promise<void>(res => {
      img.addEventListener("load", () => res(), { once: true });
      img.addEventListener("error", () => res(), { once: true });
    })));
    Promise.race([loaded, new Promise<void>(res => setTimeout(res, 4000))])
      .then(() => new Promise<void>(res => setTimeout(res, 800)))
      .then(() => { if (!cancelled) window.print(); });
    return () => { cancelled = true; };
  }, [autoPrint, emptyText]);

  return (
    <div className="print-root" dir="rtl">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="print-toolbar">
        <h1>{heading} · <bdi dir="ltr">{range}</bdi></h1>
        <a className="print-btn" href={`${basePath}?week=${addDaysISO(first, -7)}`}>→ השבוע הקודם</a>
        <a className="print-btn" href={`${basePath}?week=${addDaysISO(first, 7)}`}>השבוע הבא ←</a>
        {!emptyText && <button type="button" className="print-btn print-btn-main" onClick={() => window.print()}>הדפסה</button>}
        {!emptyText && <p className="print-tip">בחלון ההדפסה: גודל דף A4, לרוחב. מה שרואים כאן הוא בדיוק מה שיודפס.</p>}
      </div>

      {emptyText ? (
        <div className="print-empty">{emptyText}</div>
      ) : (
        <div className="print-scaler" style={{ width: PAPER_W * scale, height: PAPER_H * scale }}>
          <div className="print-paper" style={{ width: PAPER_W, height: PAPER_H, transform: scale < 1 ? `scale(${scale})` : undefined }}>
            <DepartmentDisplay {...data} fixedView={view} embeddedCu={CU} print={{ title, range, hideDepartment }} />
          </div>
        </div>
      )}
    </div>
  );
}

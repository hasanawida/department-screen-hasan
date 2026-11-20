// קובץ PDF של עמוד אחד עם תמונת JPEG, בלי ספרייה: מבנה ה-PDF פשוט מספיק כדי לכתוב אותו ישירות.
// ה-JPEG נכנס לקובץ כמו שהוא (DCTDecode), כך שהאיכות לא נפגעת.

// A4 ו-A3 לרוחב, בנקודות (1/72 אינץ')
export const A4_LANDSCAPE = { width: 841.89, height: 595.28 };
export const A3_LANDSCAPE = { width: 1190.55, height: 841.89 };
const MM = 72 / 25.4;

/** טקסט ב-PDF (כמו כותרת המסמך): UTF-16 עם BOM, בהקסדצימלי — עובד גם לעברית */
function pdfText(s: string): string {
  let hex = "FEFF";
  for (let i = 0; i < s.length; i++) hex += s.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  return `<${hex}>`;
}

const num = (n: number) => (Math.round(n * 100) / 100).toString();

function pdfDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `D:${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function jpegToPdf(jpeg: Uint8Array, imgWidth: number, imgHeight: number, opts: {
  title?: string;
  page?: { width: number; height: number };
  /** שוליים סביב התמונה, במ"מ */
  marginMm?: number;
} = {}): Blob {
  const page = opts.page ?? A4_LANDSCAPE;
  const margin = (opts.marginMm ?? 6) * MM;
  // התמונה כמה שיותר גדולה בתוך השוליים, באמצע הדף, בלי לעוות
  const k = Math.min((page.width - 2 * margin) / imgWidth, (page.height - 2 * margin) / imgHeight);
  const w = imgWidth * k, h = imgHeight * k;
  const x = (page.width - w) / 2, y = (page.height - h) / 2;

  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets: number[] = [];
  let pos = 0;
  const push = (chunk: string | Uint8Array) => {
    const bytes = typeof chunk === "string" ? enc.encode(chunk) : chunk;
    parts.push(bytes);
    pos += bytes.length;
  };
  const obj = (n: number, body: string) => {
    offsets[n] = pos;
    push(`${n} 0 obj\n${body}\nendobj\n`);
  };

  push("%PDF-1.4\n");
  // שורת הערה עם תווים "בינאריים" — כך תוכנות יודעות שהקובץ בינארי
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  obj(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${num(page.width)} ${num(page.height)}] /Resources << /XObject << /Im0 4 0 R >> /ProcSet [/PDF /ImageC] >> /Contents 5 0 R >>`);
  offsets[4] = pos;
  push(`4 0 obj\n<< /Type /XObject /Subtype /Image /Width ${imgWidth} /Height ${imgHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);
  push(jpeg);
  push("\nendstream\nendobj\n");
  const draw = `q ${num(w)} 0 0 ${num(h)} ${num(x)} ${num(y)} cm /Im0 Do Q`;
  obj(5, `<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  obj(6, `<< ${opts.title ? `/Title ${pdfText(opts.title)} ` : ""}/Creator ${pdfText("אשכולות")} /CreationDate (${pdfDate(new Date())}) >>`);

  const xref = pos;
  let table = "xref\n0 7\n0000000000 65535 f \n";
  for (let n = 1; n <= 6; n++) table += String(offsets[n]).padStart(10, "0") + " 00000 n \n";
  push(table + `trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

// צילום של חלק מהדף לתמונה, בדפדפן ובלי ספרייה חיצונית.
// משכפלים את האלמנט ואת כל מה שבתוכו עם הסגנון המחושב של כל אלמנט (כך שלא צריך את קובצי ה-CSS),
// מטמיעים בשכפול את הגופנים והתמונות, ומציירים את הכול דרך SVG עם <foreignObject> על קנבס.
// משמש להורדה של הלוח/התפריט כקובץ ולשליחה בוואטסאפ ובמייל.

const SVG_NS = "http://www.w3.org/2000/svg";

// אלמנטים שלא מצטלמים
const SKIP_TAGS = new Set(["script", "noscript", "template", "style", "link", "meta", "title", "iframe", "video", "audio", "object", "embed"]);
// תנועה ומצבי עכבר לא שייכים לתמונה. משתני CSS כבר מחושבים בתוך הערכים עצמם
const SKIP_PROP = /^(--|animation|transition|will-change|cursor|pointer-events|user-select|-webkit-user-select|caret-color|-webkit-tap-highlight-color)/;
// עובי מסגרת תלוי בסגנון שלה: בלי מסגרת הוא מחושב ל-0, אבל עם "solid" ובלי עובי כתוב הוא חוזר לברירת המחדל (3px).
// לכן הם נכתבים תמיד, גם כשהם שווים לברירת המחדל
const ALWAYS = new Set([
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "border-block-start-width", "border-block-end-width", "border-inline-start-width", "border-inline-end-width",
  "outline-width", "column-rule-width",
]);
// מאפיינים שיכולים להכיל תמונה — url(...)
const URL_PROPS = new Set(["background-image", "mask-image", "-webkit-mask-image", "border-image-source", "list-style-image"]);
// תווים שאסורים ב-XML (ה-SVG הוא XML)
const BAD_XML = /[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g;
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export type SnapshotOptions = {
  /** כמה פיקסלים בתמונה לכל פיקסל של הדף (חדות) */
  scale?: number;
  /** צבע הרקע מתחת לצילום */
  background?: string;
  /** תיקונים לשורש הצילום — למשל לבטל הקטנה שיש לו על המסך */
  rootStyle?: Record<string, string>;
};

type Ctx = {
  /** מסמך "מת" לשכפולים: תמונות בו לא נטענות ושום דבר לא מוצג */
  doc: Document;
  defaults: Defaults;
  scale: number;
  /** כללים ל-::before / ::after (אין להם אלמנט לשים עליו style) */
  css: string[];
  families: Set<string>;
  chars: Set<number>;
  jobs: Promise<void>[];
  count: number;
  pseudo: number;
  lastFamily: string;
};

const sleep = (ms: number) => new Promise<void>(res => setTimeout(res, ms));
const cleanFamily = (f: string) => f.trim().replace(/^["']|["']$/g, "").toLowerCase();

/**
 * הסגנון שיש לכל סוג אלמנט בלי שום CSS של האתר — כדי לכתוב בשכפול רק מה ששונה ממנו.
 * נמדד בתוך iframe ריק ונסתר.
 */
class Defaults {
  private frame: HTMLIFrameElement;
  private cache = new Map<string, Map<string, string>>();

  constructor() {
    this.frame = document.createElement("iframe");
    this.frame.setAttribute("aria-hidden", "true");
    this.frame.tabIndex = -1;
    this.frame.style.cssText = "position:fixed;left:-10000px;top:0;width:300px;height:300px;border:0;visibility:hidden;pointer-events:none";
    document.body.appendChild(this.frame);
    const d = this.frame.contentDocument;
    if (d) {
      // standards mode, כמו הדף עצמו
      d.open();
      d.write("<!DOCTYPE html><html><head><meta charset=\"utf-8\"></head><body></body></html>");
      d.close();
    }
  }

  get(el: Element): Map<string, string> {
    const ns = el.namespaceURI ?? "";
    const key = ns + "|" + el.localName;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const map = new Map<string, string>();
    const d = this.frame.contentDocument;
    const win = this.frame.contentWindow;
    if (d && win && d.body) {
      const probe = ns && ns !== "http://www.w3.org/1999/xhtml" ? d.createElementNS(ns, el.localName) : d.createElement(el.localName);
      // אלמנט של SVG צריך <svg> סביבו כדי לקבל את הסגנון הרגיל שלו
      const host = ns === SVG_NS && el.localName !== "svg" ? d.body.appendChild(d.createElementNS(SVG_NS, "svg")) : d.body;
      host.appendChild(probe);
      const cs = win.getComputedStyle(probe);
      for (let i = 0; i < cs.length; i++) map.set(cs[i], cs.getPropertyValue(cs[i]));
      (host === d.body ? probe : host).remove();
    }
    this.cache.set(key, map);
    return map;
  }

  /** ברירת המחדל של ::before / ::after — כמו span */
  pseudo(): Map<string, string> {
    return this.get(document.createElement("span"));
  }

  dispose() {
    this.frame.remove();
  }
}

/** הורדה של קובץ (גופן, תמונה) והפיכה ל-data: URL. נשמר בזיכרון לצילום הבא */
const fetched = new Map<string, Promise<string | null>>();
function fetchDataUrl(url: string): Promise<string | null> {
  if (url.startsWith("data:")) return Promise.resolve(url);
  let p = fetched.get(url);
  if (!p) {
    p = fetch(url, { mode: "cors" })
      .then(r => (r.ok ? r.blob() : null))
      .then(b => (b ? blobToDataUrl(b) : null))
      .catch(() => null);
    fetched.set(url, p);
  }
  return p;
}

function blobToDataUrl(blob: Blob): Promise<string | null> {
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => res(typeof r.result === "string" ? r.result : null);
    r.onerror = () => res(null);
    r.readAsDataURL(blob);
  });
}

/** מחליף כל url(...) בטקסט של CSS בתוכן הקובץ עצמו */
async function inlineUrls(css: string, base: string): Promise<string> {
  const re = /url\(\s*(['"]?)([^'")]+?)\1\s*\)/g;
  const raws = new Set<string>();
  for (const m of Array.from(css.matchAll(re))) if (!m[2].startsWith("data:")) raws.add(m[2]);
  if (!raws.size) return css;
  const found = new Map<string, string>();
  await Promise.all(Array.from(raws).map(async raw => {
    let abs: string;
    try { abs = new URL(raw, base).href; } catch { return; }
    const data = await fetchDataUrl(abs);
    if (data) found.set(raw, data);
  }));
  return css.replace(re, (m: string, _q: string, raw: string) => {
    const data = found.get(raw);
    return data ? `url("${data}")` : m;
  });
}

/**
 * תמונה לשכפול. מקטינים לגודל שבו היא מוצגת (×חדות), כדי שהצילום לא יכבד בלי צורך;
 * תמונה מאתר אחר שאסור לצייר — מורידים אותה כמו שהיא.
 */
async function imageData(img: HTMLImageElement, cs: CSSStyleDeclaration, scale: number): Promise<string> {
  const url = img.currentSrc || img.src;
  if (!url) return BLANK;
  if (url.startsWith("data:")) return url;
  try {
    if (!img.complete) await img.decode().catch(() => undefined);
    const nw = img.naturalWidth, nh = img.naturalHeight;
    if (nw && nh) {
      const boxW = parseFloat(cs.width) || nw, boxH = parseFloat(cs.height) || nh;
      // מספיק פיקסלים גם כשהתמונה "ממלאת" (object-fit: cover) וגם כשהיא "נכנסת"
      const k = Math.min(1, Math.max(boxW / nw, boxH / nh) * scale * 1.15);
      const w = Math.max(1, Math.round(nw * k)), h = Math.max(1, Math.round(nh * k));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const g = c.getContext("2d");
      if (g) {
        g.imageSmoothingEnabled = true;
        g.imageSmoothingQuality = "high";
        g.drawImage(img, 0, 0, w, h);
        const photo = /\.jpe?g($|[?#])/i.test(url);
        // נזרק כשהתמונה מאתר אחר בלי הרשאה — ואז מורידים אותה
        return c.toDataURL(photo ? "image/jpeg" : "image/png", 0.9);
      }
    }
  } catch { /* ממשיכים להורדה */ }
  return (await fetchDataUrl(url)) ?? BLANK;
}

function rangeUsed(range: string, chars: Set<number>): boolean {
  if (!range.trim()) return true;
  const spans: Array<[number, number]> = [];
  for (const part of range.split(",")) {
    const s = part.trim().replace(/^u\+/i, "");
    if (!s) continue;
    if (s.includes("?")) spans.push([parseInt(s.replace(/\?/g, "0"), 16), parseInt(s.replace(/\?/g, "F"), 16)]);
    else {
      const [a, b] = s.split("-");
      spans.push([parseInt(a, 16), parseInt(b ?? a, 16)]);
    }
  }
  for (const c of Array.from(chars)) for (const [a, b] of spans) if (c >= a && c <= b) return true;
  return false;
}

/** ה-@font-face של הגופנים שבשימוש בצילום (רק החלקים של האותיות שמופיעות בו), עם הקבצים בפנים */
async function fontCss(ctx: Ctx): Promise<string> {
  const rules: Array<{ css: string; base: string }> = [];
  const visit = (list: CSSRuleList, base: string) => {
    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      if (r instanceof CSSFontFaceRule) {
        if (!ctx.families.has(cleanFamily(r.style.getPropertyValue("font-family")))) continue;
        if (!rangeUsed(r.style.getPropertyValue("unicode-range"), ctx.chars)) continue;
        rules.push({ css: r.cssText, base });
      } else if (r instanceof CSSImportRule) {
        try { if (r.styleSheet) visit(r.styleSheet.cssRules, r.styleSheet.href ?? base); } catch { /* מאתר אחר */ }
      } else if ("cssRules" in r) {
        try { visit((r as CSSGroupingRule).cssRules, base); } catch { /* */ }
      }
    }
  };
  for (const sheet of Array.from(document.styleSheets)) {
    try { visit(sheet.cssRules, sheet.href ?? document.baseURI); } catch { /* גיליון מאתר אחר — אי אפשר לקרוא */ }
  }
  const out = await Promise.all(rules.map(r => inlineUrls(r.css, r.base)));
  return out.join("\n");
}

/** כותב על השכפול רק את מה ששונה מברירת המחדל או ממה שהוא יורש מההורה */
function styleText(cs: CSSStyleDeclaration, parent: CSSStyleDeclaration | null, defaults: Map<string, string>): { text: string; urls: string[] } {
  const decl: string[] = [];
  const urls: string[] = [];
  for (let i = 0; i < cs.length; i++) {
    const name = cs[i];
    if (SKIP_PROP.test(name)) continue;
    const value = cs.getPropertyValue(name);
    if (!value) continue;
    if (!ALWAYS.has(name) && value === defaults.get(name) && (!parent || parent.getPropertyValue(name) === value)) continue;
    decl.push(`${name}:${value}`);
    if (URL_PROPS.has(name) && value.includes("url(")) urls.push(name);
  }
  return { text: decl.join(";"), urls };
}

function setStyle(out: Element, cs: CSSStyleDeclaration, parent: CSSStyleDeclaration | null, ctx: Ctx, src: Element) {
  const { text, urls } = styleText(cs, parent, ctx.defaults.get(src));
  if (!urls.length) {
    out.setAttribute("style", text);
    return;
  }
  // תמונת רקע: קודם מורידים אותה, ואז כותבים את הסגנון
  ctx.jobs.push(inlineUrls(text, document.baseURI).then(t => out.setAttribute("style", t)));
}

function copyPseudo(src: Element, out: Element, cs: CSSStyleDeclaration, ctx: Ctx) {
  for (const which of ["::before", "::after"]) {
    const ps = getComputedStyle(src, which);
    const content = ps.getPropertyValue("content");
    if (!content || content === "none" || content === "normal") continue;
    const cls = `snapshot-p${ctx.pseudo++}`;
    out.setAttribute("class", `${out.getAttribute("class") ?? ""} ${cls}`.trim());
    const defaults = ctx.defaults.pseudo();
    const decl: string[] = [`content:${content}`];
    for (let i = 0; i < ps.length; i++) {
      const name = ps[i];
      if (name === "content" || SKIP_PROP.test(name)) continue;
      const value = ps.getPropertyValue(name);
      if (!value || (!ALWAYS.has(name) && value === defaults.get(name) && cs.getPropertyValue(name) === value)) continue;
      decl.push(`${name}:${value}`);
    }
    ctx.css.push(`.${cls}${which}{${decl.join(";")}}`);
    for (const ch of content) ctx.chars.add(ch.codePointAt(0) ?? 0);
  }
}

async function cloneTree(src: Element, parent: CSSStyleDeclaration | null, ctx: Ctx): Promise<Element | null> {
  if (SKIP_TAGS.has(src.localName)) return null;
  const cs = getComputedStyle(src);
  if (cs.display === "none") return null;
  // לא לתקוע את הדף: הפסקה קטנה כל כמה עשרות אלמנטים
  if (++ctx.count % 120 === 0) await sleep(0);

  let out: Element;
  if (src instanceof HTMLCanvasElement) {
    out = ctx.doc.createElement("img");
    try { out.setAttribute("src", src.toDataURL()); } catch { out.setAttribute("src", BLANK); }
  } else {
    out = ctx.doc.importNode(src, false) as Element;
  }
  setStyle(out, cs, parent, ctx, src);
  copyPseudo(src, out, cs, ctx);

  if (cs.fontFamily !== ctx.lastFamily) {
    ctx.lastFamily = cs.fontFamily;
    for (const f of cs.fontFamily.split(",")) ctx.families.add(cleanFamily(f));
  }

  if (src instanceof HTMLImageElement) {
    for (const a of ["srcset", "sizes", "loading", "alt", "decoding"]) out.removeAttribute(a);
    out.setAttribute("src", BLANK);
    const img = out;
    ctx.jobs.push(imageData(src, cs, ctx.scale).then(url => img.setAttribute("src", url)));
  }

  for (let c = src.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === Node.TEXT_NODE) {
      const t = (c.nodeValue ?? "").replace(BAD_XML, "");
      for (const ch of t) ctx.chars.add(ch.codePointAt(0) ?? 0);
      out.appendChild(ctx.doc.createTextNode(t));
    } else if (c.nodeType === Node.ELEMENT_NODE) {
      const k = await cloneTree(c as Element, cs, ctx);
      if (k) out.appendChild(k);
    }
  }
  return out;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(() => reject(new Error("snapshot: timeout")), 30000);
    img.onload = () => {
      clearTimeout(timer);
      // decode: שהתמונה מוכנה לציור ולא רק "נטענה"
      (img.decode ? img.decode() : Promise.resolve()).catch(() => undefined).then(() => resolve(img));
    };
    img.onerror = () => { clearTimeout(timer); reject(new Error("snapshot: render failed")); };
    img.src = src;
  });
}

/** מצלם את האלמנט (בגודל שלו בדף, בלי הקטנות של המסך) לקנבס */
export async function snapshotCanvas(node: HTMLElement, opts: SnapshotOptions = {}): Promise<HTMLCanvasElement> {
  const scale = opts.scale ?? 2;
  if (document.fonts?.ready) await document.fonts.ready;
  const rootCs = getComputedStyle(node);
  const width = Math.ceil(parseFloat(rootCs.width) || node.offsetWidth);
  const height = Math.ceil(parseFloat(rootCs.height) || node.offsetHeight);
  if (!width || !height) throw new Error("snapshot: empty element");

  const ctx: Ctx = {
    doc: document.implementation.createHTMLDocument(""),
    defaults: new Defaults(),
    scale,
    css: [],
    families: new Set(),
    chars: new Set(),
    jobs: [],
    count: 0,
    pseudo: 0,
    lastFamily: "",
  };
  let root: Element | null;
  try {
    root = await cloneTree(node, null, ctx);
  } finally {
    ctx.defaults.dispose();
  }
  if (!root) throw new Error("snapshot: nothing to draw");
  await Promise.all(ctx.jobs);

  const rs = (root as HTMLElement).style;
  for (const [k, v] of Object.entries(opts.rootStyle ?? {})) rs.setProperty(k, v);
  const style = ctx.doc.createElement("style");
  style.textContent = (await fontCss(ctx)) + "\n" + ctx.css.join("\n");
  root.insertBefore(style, root.firstChild);

  const xhtml = new XMLSerializer().serializeToString(root);
  const svg = `<svg xmlns="${SVG_NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`;
  const img = await loadImage("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const g = canvas.getContext("2d");
  if (!g) throw new Error("snapshot: no canvas");
  const paint = () => {
    g.fillStyle = opts.background ?? "#ffffff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  paint();
  // ספארי (וכל דפדפן באייפון) מצייר לפעמים את התמונות שבתוך ה-SVG רק בציור השני
  if (/apple/i.test(navigator.vendor)) {
    for (let i = 0; i < 2; i++) {
      await sleep(150);
      paint();
    }
  }
  return canvas;
}

export function canvasBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error("snapshot: encode failed"))), type, quality);
  });
}

/** עותק מוקטן של הקנבס (לרוחב מקסימלי) — למשל לתמונה שמודבקת במייל, כדי שלא תהיה כבדה */
export function shrinkCanvas(canvas: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
  if (canvas.width <= maxWidth) return canvas;
  const c = document.createElement("canvas");
  c.width = maxWidth;
  c.height = Math.round((canvas.height * maxWidth) / canvas.width);
  const g = c.getContext("2d");
  if (!g) return canvas;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(canvas, 0, 0, c.width, c.height);
  return c;
}

// כותרות חדשות N12 (mako) לשורת הרצה — נקרא בצד השרת ונשמר בזיכרון 10 דקות

const N12_FEED = "https://rcs.mako.co.il/rss/news-israel.xml";
const REFRESH_SECONDS = 600;
const MAX_ITEMS = 12;
const MAX_AGE_HOURS = 36;

// כותרות קשות לא מתאימות למסך בבית אבות — מסננים אותן.
// מילים בודדות נבדקות כמילה שלמה (גם עם ו/ה/ב/ל/מ/ש/כ בתחילתה), ביטויים — בכל מקום בכותרת.
const HARD_WORDS = new Set([
  "הרוג", "הרוגים", "נהרג", "נהרגה", "נהרגו", "נרצח", "נרצחה", "נרצחו", "רצח", "פיגוע", "פיגועים", "מחבל", "מחבלים",
  "דקירה", "ירי", "נורה", "נורתה", "אונס", "התאבד", "התאבדה", "גופה", "גופת", "טבע", "טבעה", "מוות", "מותו", "מותה",
  "הלוויה", "הלווייתו", "אסון", "שריפה", "רקטה", "רקטות", "טיל", "טילים", "אזעקה", "אזעקות", "יירוט", "חטוף", "חטופים",
  "חטופה", "מלחמה", "תאונה", "תאונת", "פצוע", "פצועה", "פצועים", "נפצע", "נפצעה", "נפצעו", "מת", "מתה", "מתו",
]);
const HARD_PHRASES = ["מעשה מגונה", "למנוחות", "במצב קשה", "פצוע קשה", "פצועה קשה"];
const PREFIXES = "והבכלמש";

function isHard(title: string): boolean {
  if (HARD_PHRASES.some(p => title.includes(p))) return true;
  for (const raw of title.split(/[^\u0590-\u05FF]+/)) {
    let w = raw.replace(/[\u0591-\u05C7]/g, "");
    for (let i = 0; i < 3 && w.length > 1; i++) {
      if (HARD_WORDS.has(w)) return true;
      if (!PREFIXES.includes(w[0])) break;
      w = w.slice(1);
    }
  }
  return false;
}

export type NewsItem = { title: string; pubDate: string };

function decode(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

export async function getN12Headlines(): Promise<NewsItem[]> {
  try {
    const res = await fetch(N12_FEED, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; EshkolotScreens/1.0)", Accept: "application/rss+xml, application/xml, text/xml" },
      next: { revalidate: REFRESH_SECONDS },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const items: NewsItem[] = [];
    const now = Date.now();
    for (const block of xml.match(/<item>[\s\S]*?<\/item>/g) ?? []) {
      const title = decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
      const pubDate = decode(block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] ?? "");
      if (!title) continue;
      const t = Date.parse(pubDate);
      if (!Number.isNaN(t) && now - t > MAX_AGE_HOURS * 3600 * 1000) continue;
      if (isHard(title)) continue;
      items.push({ title, pubDate });
      if (items.length >= MAX_ITEMS) break;
    }
    return items;
  } catch {
    return [];
  }
}

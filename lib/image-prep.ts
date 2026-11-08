// הכנת תמונה לפני העלאה (בדפדפן בלבד):
// תמונה גדולה (צילום מהטלפון) מוקטנת ל-1920 פיקסלים ונשמרת כ-JPG — עולה מהר ונטענת מהר במסך.
// קובץ HEIC של אייפון מומר ל-JPG כשהדפדפן יודע לפתוח אותו (ספארי), ואחרת מקבלים הסבר.

const MAX_SIDE = 1920;
const SHRINK_OVER_BYTES = 1.5 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const isHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
export const looksLikeImage = (f: File) => f.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|hei[cf])$/i.test(f.name);

async function decode(file: File): Promise<{ img: CanvasImageSource; w: number; h: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bmp = await createImageBitmap(file);
      return { img: bmp, w: bmp.width, h: bmp.height };
    } catch { /* ננסה דרך תגית תמונה */ }
  }
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve({ img, w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("decode")); };
    img.src = url;
  });
}

export async function prepareImage(file: File): Promise<{ file: File } | { error: string }> {
  const heic = isHeic(file);
  if (!heic && file.size <= SHRINK_OVER_BYTES) return { file };
  try {
    const { img, w, h } = await decode(file);
    if (!w || !h) throw new Error("size");
    const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
    const cw = Math.max(1, Math.round(w * scale)), ch = Math.max(1, Math.round(h * scale));
    const canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.fillStyle = "#fff"; // שקיפות ← לבן (ולא שחור)
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);
    const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, "image/jpeg", 0.86));
    if (!blob) throw new Error("encode");
    const name = (file.name.replace(/\.[^.]+$/, "") || "image") + ".jpg";
    return { file: new File([blob], name, { type: "image/jpeg" }) };
  } catch {
    if (heic) return { error: "קובץ HEIC (מאייפון) לא נפתח בדפדפן הזה. שומרים את התמונה כ-JPG, או מעלים אותה ישר מהאייפון." };
    return file.size <= MAX_UPLOAD_BYTES ? { file } : { error: "התמונה גדולה מדי (עד 8MB) ולא הצלחנו להקטין אותה." };
  }
}

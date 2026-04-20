import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const LANG_NAMES: Record<string, string> = {
  he: "Hebrew",
  ar: "Arabic",
  ru: "Russian",
  en: "English",
};

export async function POST(req: NextRequest) {
  try {
    // בדיקת אימות — רק משתמשים מחוברים
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { text, targetLangs } = (await req.json()) as { text: string; targetLangs: string[] };
    if (!text || !Array.isArray(targetLangs) || targetLangs.length === 0) {
      return NextResponse.json({ error: "Missing text or targetLangs" }, { status: 400 });
    }

    const others = targetLangs.filter((l) => l !== "he");
    const result: Record<string, string> = { he: text };
    if (others.length === 0) return NextResponse.json({ messages: result });

    const targetsList = others.map((l) => `${l} (${LANG_NAMES[l] || l})`).join(", ");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        messages: [
          {
            role: "user",
            content:
              `Translate the following Hebrew text for a voice reminder in a nursing home. ` +
              `Keep it natural, short, and spoken-style (it will be read aloud). ` +
              `Return ONLY a JSON object with keys: ${others.join(", ")}. ` +
              `No explanation, no markdown, just the JSON.\n\n` +
              `Target languages: ${targetsList}\n` +
              `Hebrew text: "${text}"`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: "Anthropic API error: " + errText }, { status: 500 });
    }

    const data = await response.json();
    const body = data.content?.[0]?.text ?? "{}";
    const cleaned = body.replace(/```json|```/g, "").trim();
    let parsed: Record<string, string> = {};
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse translation output", raw: body }, { status: 500 });
    }

    for (const l of others) if (parsed[l]) result[l] = parsed[l];
    return NextResponse.json({ messages: result });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
  }
}

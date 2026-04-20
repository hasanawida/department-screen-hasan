import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"
import { createClient } from "@/lib/supabase/server"
const client = new Anthropic()
export async function POST(request: NextRequest) {
  try {
    // בדיקת אימות — רק משתמשים מחוברים
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { base64, mediaType, fileName } = await request.json()
    const isPDF = mediaType === "application/pdf" || fileName?.toLowerCase().endsWith(".pdf")
    const prompt = `נתח את לוח הפעילויות והחזר JSON בלבד בפורמט הבא:
{
  "weekly_topic": "נושא השבוע אם קיים או null",
  "activities": [
    {
      "title": "שם הפעילות",
      "day_of_week": "א'",
      "start_time": "09:00",
      "end_time": "10:00",
      "location": "מיקום או null",
      "instructor_name": "שם המדריך או null",
      "activity_date": "2026-04-05 או null אם אין תאריך ספציפי",
      "is_recurring": false
    }
  ]
}
חשוב:
- day_of_week חייב להיות אחד מ: "א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"
- אם יש תאריך ספציפי בלוח (כמו 5.4.26 או 5/4/2026) תמלא את activity_date בפורמט YYYY-MM-DD
- תאריכים בפורמט DD.MM.YY כמו 5.4.26 הם 2026-04-05
- אם אין תאריך ספציפי תגדיר activity_date=null ו-is_recurring=true
- החזר JSON בלבד ללא טקסט נוסף`
    let content: any[]
    if (isPDF) {
      content = [
        { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } },
        { type: "text", text: prompt },
      ]
    } else {
      content = [
        { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: base64 } },
        { type: "text", text: prompt },
      ]
    }
    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 4000,
      messages: [{ role: "user", content }],
    })
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const clean = text.replace(/```json|```/g, "").trim()
    try {
      const parsed = JSON.parse(clean)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ error: "לא הצלחתי לנתח את הקובץ" }, { status: 400 })
    }
  } catch (error: any) {
    return NextResponse.json({ error: "אירעה שגיאה" }, { status: 500 })
  }
}
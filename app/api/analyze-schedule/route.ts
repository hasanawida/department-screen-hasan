import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
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
      "instructor_name": "שם המדריך או null"
    }
  ]
}
חשוב: day_of_week חייב להיות אחד מ: "א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'". החזר JSON בלבד ללא טקסט נוסף.`

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
      max_tokens: 2000,
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
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "אירעה שגיאה" }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { base64, mediaType } = body

    if (!base64) return NextResponse.json({ error: "לא נבחר קובץ" }, { status: 400 })

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType || "image/jpeg", data: base64 }
          },
          {
            type: "text",
            text: "זהו לוח פעילויות שבועי. חלץ את כל הפעילויות עם כל הפרטים שלהן. החזר JSON בלבד ללא markdown וללא הסבר. הפורמט חייב להיות: [{\"name\":\"שם הפעילות\",\"facilitator\":\"שם המפעיל או null\",\"day_of_week\":\"יום בעברית\",\"start_time\":\"HH:MM\",\"end_time\":\"HH:MM או null\",\"location\":\"מיקום או null\"}]. חשוב מאוד: חלץ את שם הפעילות בדיוק כפי שכתוב בלוח."
          }
        ]
      }]
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const cleaned = text.replace(/```json\n?|\n?```/g, "").trim()
    const activities = JSON.parse(cleaned)
    return NextResponse.json({ activities })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "אירעה שגיאה" }, { status: 500 })
  }
}
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

<<<<<<< HEAD
const client = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    const { base64, mediaType } = await request.json()

    const response = await client.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            {
              type: "text",
              text: `נתח את לוח הפעילויות בתמונה והחזר JSON בלבד בפורמט הבא:
{
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

חשוב מאוד:
- day_of_week חייב להיות אחד מ: "א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"
- start_time ו-end_time בפורמט HH:MM
- אל תוסיף activity_date
- החזר JSON בלבד ללא טקסט נוסף`,
            },
          ],
        },
      ],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 })
=======
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
>>>>>>> 5e8d02786103f654c4caabd6b54b3308e7ae6bf0
  }
}
import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

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
  }
}
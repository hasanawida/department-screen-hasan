import Anthropic from "@anthropic-ai/sdk"
import { NextRequest, NextResponse } from "next/server"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { base64, mediaType } = await request.json()

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: `אתה מנתח לוח פעילויות של בית אבות. 
חלץ את כל הפעילויות מהתמונה והחזר JSON בלבד, ללא טקסט נוסף.

פורמט:
{
  "activities": [
    {
      "title": "שם הפעילות",
      "date": "YYYY-MM-DD",
      "start_time": "HH:MM",
      "end_time": "HH:MM",
      "location": "מיקום",
      "instructor_name": "שם המנחה"
    }
  ]
}

אם תאריך לא ברור השתמש בתאריכים של השבוע הנוכחי לפי יום בשבוע.
אם שדה חסר השאר ריק "".
החזר JSON בלבד.`,
            },
          ],
        },
      ],
    })

    const text = message.content[0].type === "text" ? message.content[0].text : ""
    const clean = text.replace(/```json|```/g, "").trim()
    const parsed = JSON.parse(clean)

    return NextResponse.json(parsed)
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Failed to analyze" }, { status: 500 })
  }
}
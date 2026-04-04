"use client"

import { useState, useEffect } from "react"

const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
const hebrewMonths = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
]

interface ClockProps {
  showDate?: boolean
  showTime?: boolean
}

export function Clock({ showDate = true, showTime = true }: ClockProps) {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatDate = (date: Date) => {
    const dayName = hebrewDays[date.getDay()]
    const day = date.getDate()
    const month = hebrewMonths[date.getMonth()]
    const year = date.getFullYear()
    return `יום ${dayName}, ${day} ב${month} ${year}`
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      {showTime && (
        <div className="text-6xl font-bold tracking-tight tabular-nums">
          {formatTime(currentTime)}
        </div>
      )}
      {showDate && (
        <div className="text-xl text-muted-foreground">
          {formatDate(currentTime)}
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import type { TickerMessage } from "@/lib/types"

interface TickerProps {
  messages: TickerMessage[]
}

export function Ticker({ messages }: TickerProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  if (!messages || messages.length === 0) {
    return null
  }

  const combinedText = messages.map((m) => m.message).join("   •   ")

  return (
    <div className="w-full overflow-hidden bg-primary text-primary-foreground py-3">
      <div
        className={`flex whitespace-nowrap transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="animate-ticker inline-flex gap-16 text-lg font-medium">
          <span>{combinedText}</span>
          <span>{combinedText}</span>
        </div>
      </div>
    </div>
  )
}

"use client"

import { AlertTriangle, Bell, Info } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Announcement } from "@/lib/types"

interface AnnouncementsPanelProps {
  announcements: Announcement[]
}

const priorityConfig = {
  low: {
    icon: Info,
    bgColor: "bg-muted",
    textColor: "text-muted-foreground",
    borderColor: "border-muted",
  },
  normal: {
    icon: Bell,
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    borderColor: "border-blue-200",
  },
  high: {
    icon: AlertTriangle,
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
  },
  urgent: {
    icon: AlertTriangle,
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    borderColor: "border-red-300",
  },
}

export function AnnouncementsPanel({ announcements }: AnnouncementsPanelProps) {
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 }
    return priorityOrder[a.priority] - priorityOrder[b.priority]
  })

  if (sortedAnnouncements.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            הודעות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-lg text-center py-8">
            אין הודעות חדשות
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6" />
          הודעות
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedAnnouncements.map((announcement) => {
          const config = priorityConfig[announcement.priority]
          const Icon = config.icon

          return (
            <div
              key={announcement.id}
              className={`p-4 rounded-lg border-2 ${config.bgColor} ${config.borderColor}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`h-6 w-6 shrink-0 mt-0.5 ${config.textColor}`} />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-lg font-semibold ${config.textColor}`}>
                    {announcement.title}
                  </h3>
                  <p className="text-foreground mt-1">
                    {announcement.content}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

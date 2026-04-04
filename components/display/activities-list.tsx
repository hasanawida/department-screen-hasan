"use client"

import { Clock, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity } from "@/lib/types"

interface ActivitiesListProps {
  activities: Activity[]
  departmentColor?: string
}

export function ActivitiesList({ activities, departmentColor = "#3B82F6" }: ActivitiesListProps) {
  const formatTime = (time: string) => {
    return time.slice(0, 5)
  }

  const sortedActivities = [...activities].sort((a, b) => {
    return a.start_time.localeCompare(b.start_time)
  })

  const getCurrentActivity = () => {
    const now = new Date()
    const currentTimeStr = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`
    
    return sortedActivities.find((activity) => {
      const start = activity.start_time.slice(0, 5)
      const end = activity.end_time?.slice(0, 5) || "23:59"
      return currentTimeStr >= start && currentTimeStr <= end
    })
  }

  const currentActivity = getCurrentActivity()

  if (sortedActivities.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <div 
              className="w-2 h-8 rounded-full" 
              style={{ backgroundColor: departmentColor }}
            />
            לוח פעילויות היום
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-lg text-center py-8">
            אין פעילויות מתוכננות להיום
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <div 
            className="w-2 h-8 rounded-full" 
            style={{ backgroundColor: departmentColor }}
          />
          לוח פעילויות היום
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedActivities.map((activity) => {
          const isCurrent = currentActivity?.id === activity.id
          return (
            <div
              key={activity.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className={`text-xl font-semibold truncate ${isCurrent ? "text-primary" : ""}`}>
                    {activity.title}
                  </h3>
                  {activity.description && (
                    <p className="text-muted-foreground mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.location && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{activity.location}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 text-lg font-medium shrink-0">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <span dir="ltr">
                    {formatTime(activity.start_time)}
                    {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                  </span>
                </div>
              </div>
              {isCurrent && (
                <div 
                  className="mt-3 px-3 py-1 rounded-full text-sm font-medium w-fit"
                  style={{ 
                    backgroundColor: departmentColor,
                    color: "white"
                  }}
                >
                  מתקיים עכשיו
                </div>
              )}
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}

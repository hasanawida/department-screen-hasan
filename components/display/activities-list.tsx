"use client"

import { useState } from "react"
import { Clock, MapPin, User, Users, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Activity } from "@/lib/types"

interface ActivitiesListProps {
  activities: Activity[]
  departmentColor?: string
}

const hebrewDays = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]

export function ActivitiesList({ activities, departmentColor = "#3B82F6" }: ActivitiesListProps) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [activeDay, setActiveDay] = useState<number>(new Date().getDay())

  const formatTime = (time: string) => time.slice(0, 5)

  const today = new Date()
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    return d
  })

  const activitiesForDay = (dayIndex: number) => {
    return activities.filter(a => {
      if (a.activity_date) {
        const d = new Date(a.activity_date)
        return d.getDay() === dayIndex && d >= weekDays[0] && d <= weekDays[6]
      }
      return a.day_of_week === dayIndex && a.is_active
    }).sort((a, b) => a.start_time.localeCompare(b.start_time))
  }

  const todayActivities = activitiesForDay(activeDay)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl font-bold flex items-center gap-2">
          <div className="w-2 h-8 rounded-full" style={{ backgroundColor: departmentColor }} />
          לוח פעילויות שבועי
        </CardTitle>
        <div className="flex gap-1 mt-2 flex-wrap">
          {weekDays.map((day, i) => (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                activeDay === i ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              style={activeDay === i ? { backgroundColor: departmentColor } : {}}
            >
              {hebrewDays[i]}
              <span className="mr-1 text-xs opacity-75">{day.getDate()}/{day.getMonth() + 1}</span>
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {todayActivities.length === 0 ? (
          <p className="text-muted-foreground text-lg text-center py-8">
            אין פעילויות ביום {hebrewDays[activeDay]}
          </p>
        ) : (
          todayActivities.map((activity) => {
            const isSelected = selectedActivity?.id === activity.id
            const now = new Date()
            const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
            const isCurrent = activeDay === today.getDay() &&
              currentTime >= activity.start_time.slice(0,5) &&
              currentTime <= (activity.end_time?.slice(0,5) || "23:59")

            return (
              <div
                key={activity.id}
                className={`rounded-lg border-2 transition-all cursor-pointer ${
                  isCurrent ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card"
                }`}
                onClick={() => setSelectedActivity(isSelected ? null : activity)}
              >
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className={`text-xl font-semibold ${isCurrent ? "text-primary" : ""}`}>
                      {activity.title}
                    </h3>
                    {activity.description && (
                      <p className="text-muted-foreground mt-1 line-clamp-2">{activity.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2">
                      {activity.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span>{activity.location}</span>
                        </div>
                      )}
                      {activity.instructor_name && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{activity.instructor_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 text-lg font-medium" dir="ltr">
                      <Clock className="h-5 w-5 text-muted-foreground" />
                      {formatTime(activity.start_time)}
                      {activity.end_time && ` - ${formatTime(activity.end_time)}`}
                    </div>
                    {isSelected ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </div>
                {isSelected && (
                  <div className="px-4 pb-4 border-t pt-3 space-y-3">
                    {activity.instructor_name && (
                      <div className="flex items-center gap-2">
                        <User className="h-5 w-5" style={{ color: departmentColor }} />
                        <span className="font-medium">מנחה:</span>
                        <span>{activity.instructor_name}</span>
                      </div>
                    )}
                    {activity.participants && (
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Users className="h-5 w-5" style={{ color: departmentColor }} />
                          <span className="font-medium">משתתפים:</span>
                        </div>
                        <p className="text-muted-foreground mr-7">{activity.participants}</p>
                      </div>
                    )}
                    {activity.image_url && (
                      <img src={activity.image_url} alt={activity.title} className="rounded-lg max-h-48 object-cover w-full" />
                    )}
                    {isCurrent && (
                      <div className="px-3 py-1 rounded-full text-sm font-medium w-fit text-white" style={{ backgroundColor: departmentColor }}>
                        מתקיים עכשיו
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
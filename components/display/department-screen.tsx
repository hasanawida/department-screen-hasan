"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Clock } from "./clock"
import { Ticker } from "./ticker"
import { ActivitiesList } from "./activities-list"
import { AnnouncementsPanel } from "./announcements-panel"
import type { DepartmentData, Activity, Announcement, TickerMessage } from "@/lib/types"

interface DepartmentScreenProps {
  data: DepartmentData
}

export function DepartmentScreen({ data: initialData }: DepartmentScreenProps) {
  const [activities, setActivities] = useState<Activity[]>(initialData.activities)
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialData.announcements)
  const [tickerMessages, setTickerMessages] = useState<TickerMessage[]>(initialData.tickerMessages)
  const { department, settings } = initialData

  const fetchActivities = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("activities")
      .select("*")
      .eq("department_id", department.id)
      .eq("is_active", true)
      .order("start_time", { ascending: true })
    if (data) setActivities(data)
  }, [department.id])

  const fetchAnnouncements = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("announcements")
      .select("*")
      .eq("department_id", department.id)
      .eq("is_active", true)
      .order("priority", { ascending: false })
    if (data) setAnnouncements(data)
  }, [department.id])

  const fetchTicker = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("ticker_messages")
      .select("*")
      .or(`department_id.eq.${department.id},is_global.eq.true`)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
    if (data) setTickerMessages(data)
  }, [department.id])

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`dept-${department.id}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "activities",
        filter: `department_id=eq.${department.id}`,
      }, () => fetchActivities())
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "announcements",
        filter: `department_id=eq.${department.id}`,
      }, () => fetchAnnouncements())
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "ticker_messages",
      }, () => fetchTicker())
      .subscribe()

    // Also poll every 60 seconds as a fallback
    const interval = setInterval(() => {
      fetchActivities()
      fetchAnnouncements()
      fetchTicker()
    }, 60_000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [department.id, fetchActivities, fetchAnnouncements, fetchTicker])

  return (
    <div className="min-h-screen flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <header
        className="px-8 py-6 text-white"
        style={{ backgroundColor: department.color }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">{department.name}</h1>
            {settings?.welcome_message && (
              <p className="text-xl mt-1 opacity-90">{settings.welcome_message}</p>
            )}
          </div>
          <Clock
            showDate={settings?.show_date ?? true}
            showTime={settings?.show_time ?? true}
          />
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
          <div className="lg:col-span-2">
            <ActivitiesList
              activities={activities}
              departmentColor={department.color}
            />
          </div>
          <div>
            <AnnouncementsPanel announcements={announcements} />
          </div>
        </div>
      </main>

      {/* Ticker at bottom */}
      <Ticker messages={tickerMessages} />
    </div>
  )
}

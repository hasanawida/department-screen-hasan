import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Calendar, Bell, MessageSquare } from "lucide-react"
import Link from "next/link"

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  // Get counts for all entities
  const [deptResult, actResult, annResult, tickerResult] = await Promise.all([
    supabase.from("departments").select("id", { count: "exact", head: true }),
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("ticker_messages").select("id", { count: "exact", head: true }).eq("is_active", true),
  ])

  const stats = [
    { 
      label: "מחלקות", 
      count: deptResult.count || 0, 
      icon: Building2, 
      href: "/admin/departments",
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    { 
      label: "פעילויות פעילות", 
      count: actResult.count || 0, 
      icon: Calendar, 
      href: "/admin/activities",
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    { 
      label: "הודעות פעילות", 
      count: annResult.count || 0, 
      icon: Bell, 
      href: "/admin/announcements",
      color: "text-amber-500",
      bgColor: "bg-amber-50"
    },
    { 
      label: "הודעות שורת רצה", 
      count: tickerResult.count || 0, 
      icon: MessageSquare, 
      href: "/admin/ticker",
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
  ]

  // Get recent activities
  const { data: recentActivities } = await supabase
    .from("activities")
    .select("*, departments(name)")
    .order("created_at", { ascending: false })
    .limit(5)

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">לוח בקרה</h1>
        <p className="text-muted-foreground mt-1">ברוכים הבאים למערכת ניהול מסך המחלקה</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Link key={stat.href} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.count}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>פעילויות אחרונות</CardTitle>
          <CardDescription>הפעילויות האחרונות שנוספו למערכת</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivities && recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{activity.title}</div>
                    <div className="text-sm text-muted-foreground">
                      {activity.departments?.name} | {activity.start_time?.slice(0, 5)}
                      {activity.end_time && ` - ${activity.end_time.slice(0, 5)}`}
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded text-xs ${activity.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {activity.is_active ? "פעיל" : "לא פעיל"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              אין פעילויות במערכת
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

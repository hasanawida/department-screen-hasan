import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Monitor, Settings } from "lucide-react"

export default async function HomePage() {
  const supabase = await createClient()
  
  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .order("name", { ascending: true })

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">מסך המחלקה</h1>
              <p className="text-muted-foreground mt-1">מערכת תצוגת מידע למחלקות בית האבות</p>
            </div>
            <Link href="/admin">
              <Button variant="outline" className="gap-2">
                <Settings className="h-4 w-4" />
                ניהול
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-semibold mb-6">בחר מחלקה לתצוגה</h2>
        
        {!departments || departments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-lg">
                אין מחלקות במערכת. עבור לדשבורד הניהול כדי להוסיף מחלקות.
              </p>
              <Link href="/admin">
                <Button className="mt-4">עבור לניהול</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept) => (
              <Card 
                key={dept.id} 
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div 
                  className="h-2" 
                  style={{ backgroundColor: dept.color }}
                />
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dept.color }}
                    />
                    {dept.name}
                  </CardTitle>
                  <CardDescription>קוד: {dept.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Link href={`/display/${dept.code}`}>
                    <Button className="w-full gap-2">
                      <Monitor className="h-4 w-4" />
                      פתח מסך תצוגה
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

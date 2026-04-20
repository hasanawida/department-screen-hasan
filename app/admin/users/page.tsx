"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Trash2, ShieldCheck, Check } from "lucide-react";

type Admin = { email: string; created_at: string; created_by: string | null };

export default function AdminUsersPage() {
  const [list, setList] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saved, setSaved] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admins/list");
      const data = await res.json();
      if (!res.ok) setError(data.error || "שגיאה בטעינה");
      else setList(data.admins || []);
    } catch (e: any) {
      setError(e?.message || "שגיאה בטעינה");
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd() {
    if (!newEmail || !newPassword) { alert("חובה אימייל וסיסמה"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/admins/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert("שגיאה: " + (data.error || "לא הצלחתי להוסיף"));
      } else {
        setNewEmail("");
        setNewPassword("");
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        load();
      }
    } catch (e: any) {
      alert("שגיאה: " + (e?.message || "לא הצלחתי להוסיף"));
    }
    setAdding(false);
  }

  async function handleRemove(email: string) {
    const alsoDelete = confirm(
      `להסיר גישה ל-${email}?\n\n` +
      "לחץ OK — רק הסרה מרשימת המנהלים (החשבון נשאר, רק לא יוכל להיכנס).\n" +
      "לחץ Cancel כדי לבטל."
    );
    if (!alsoDelete) return;

    const res = await fetch("/api/admins/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, alsoDeleteAuth: false }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert("שגיאה: " + (data.error || ""));
    } else {
      load();
    }
  }

  return (
    <div dir="rtl" className="p-6 md:p-8 max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-emerald-700" />
        <div>
          <h1 className="text-3xl font-bold">מנהלי מערכת</h1>
          <p className="text-muted-foreground">משתמשים שיכולים להיכנס לניהול</p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" /> הוספת מנהל חדש
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">אימייל</label>
              <Input
                dir="ltr"
                type="email"
                placeholder="name@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">סיסמה ראשונית</label>
              <Input
                dir="ltr"
                type="text"
                placeholder="לפחות 6 תווים"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-slate-500">
            מסור למנהל את הסיסמה הזו ובקש שישנה אותה אחרי הכניסה הראשונה.
          </p>
          <Button onClick={handleAdd} disabled={adding} className="gap-2">
            {saved ? (<><Check className="h-4 w-4" /> נוסף!</>)
             : adding ? "יוצר..." : (<><Plus className="h-4 w-4" /> הוסף מנהל</>)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> מנהלים קיימים ({list.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-4 mb-3 text-sm text-amber-800 whitespace-pre-wrap">
              {error}
            </div>
          )}
          {loading ? (
            <p className="text-slate-500 text-center py-6">טוען...</p>
          ) : list.length === 0 ? (
            <p className="text-slate-500 text-center py-6">
              אין מנהלים בטבלה. אם אתה הראשון — צור טבלה + הוסף את עצמך דרך ה-SQL שבקליפבורד.
            </p>
          ) : (
            <div className="space-y-2">
              {list.map((a) => (
                <div key={a.email} className="flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="font-semibold" dir="ltr">{a.email}</p>
                    <p className="text-xs text-slate-500">
                      נוסף ב-{new Date(a.created_at).toLocaleDateString("he-IL")}
                      {a.created_by ? " · ע״י " + a.created_by : ""}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleRemove(a.email)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

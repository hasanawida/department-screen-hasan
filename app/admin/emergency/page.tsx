"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function EmergencyPage() {
  const [message, setMessage] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [saved, setSaved] = useState(false);
  const [refreshed, setRefreshed] = useState(false);

  useEffect(() => {
    loadDepartments();
  }, []);

  async function loadDepartments() {
    const { data } = await supabase
      .from("departments")
      .select("id, name, color, emergency_active, emergency_message");
    setDepartments(data ?? []);
    if (data && data[0]) {
      setMessage(data[0].emergency_message ?? "");
    }
  }

  async function handleEmergency(active: boolean) {
    await supabase
      .from("departments")
      .update({
        emergency_active: active,
        emergency_message: active ? message : "",
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadDepartments();
  }

  async function handleRefresh() {
    await supabase
      .from("departments")
      .update({ force_refresh: true })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 3000);
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-red-600" />
          <div>
            <h1 className="text-3xl font-black text-slate-900">שליטה מרחוק</h1>
            <p className="text-slate-500">הודעת חירום ורענון מסכים</p>
          </div>
        </div>

        {/* Emergency */}
        <div className="rounded-2xl bg-white shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-6 w-6" />
            הודעת חירום
          </h2>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="כתוב כאן את הודעת החירום..."
            className="w-full rounded-xl border border-slate-200 p-4 text-xl text-right resize-none h-32 focus:outline-none focus:ring-2 focus:ring-red-400"
          />

          <div className="flex gap-3">
            <button
              onClick={() => handleEmergency(true)}
              disabled={!message}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-4 text-xl font-bold transition-colors"
            >
              <AlertTriangle className="h-5 w-5" />
              הפעל על כל המסכים
            </button>
            <button
              onClick={() => handleEmergency(false)}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-600 hover:bg-slate-700 text-white py-4 text-xl font-bold transition-colors"
            >
              <XCircle className="h-5 w-5" />
              כבה הודעה
            </button>
          </div>

          {saved && (
            <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
              <CheckCircle className="h-5 w-5" />
              נשמר בהצלחה!
            </div>
          )}

          <div className="space-y-2 mt-4">
            <p className="font-bold text-slate-700">סטטוס מחלקות:</p>
            {departments.map((dept) => (
              <div key={dept.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: dept.color }} />
                  <span className="font-medium">{dept.name}</span>
                </div>
                <span className={`text-sm font-bold ${dept.emergency_active ? "text-red-600" : "text-green-600"}`}>
                  {dept.emergency_active ? "🔴 חירום פעיל" : "🟢 תקין"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Remote Refresh */}
        <div className="rounded-2xl bg-white shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            רענון מסכים מרחוק
          </h2>
          <p className="text-slate-500">לחץ כדי לרענן את כל המסכים בבת אחת</p>
          <button
            onClick={handleRefresh}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-4 text-xl font-bold transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            רענן את כל המסכים
          </button>
          {refreshed && (
            <div className="flex items-center gap-2 text-green-600 font-bold text-lg">
              <CheckCircle className="h-5 w-5" />
              פקודת רענון נשלחה!
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Monitor, LayoutDashboard } from "lucide-react";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export default function EmergencyPage() {
  const [message, setMessage] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [targetOrientation, setTargetOrientation] = useState(true);
  const [targetDisplay, setTargetDisplay] = useState(true);
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
    // ברירת מחדל — כל המחלקות מסומנות
    setSelectedIds(new Set((data ?? []).map((d: any) => d.id)));
    if (data && data[0]) {
      setMessage(data[0].emergency_message ?? "");
    }
  }

  function toggleDept(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(departments.map(d => d.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  async function handleEmergency(active: boolean) {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await supabase
        .from("departments")
        .update({
          emergency_active: active,
          emergency_message: active ? message : "",
          emergency_orientation: active ? targetOrientation : false,
          emergency_display: active ? targetDisplay : false,
        })
        .eq("id", id);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    loadDepartments();
  }

  async function handleRefresh() {
    if (selectedIds.size === 0) return;
    for (const id of selectedIds) {
      await supabase
        .from("departments")
        .update({ force_refresh: true })
        .eq("id", id);
    }
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

        {/* בחירת מחלקות */}
        <div className="rounded-2xl bg-white shadow-md p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">בחר מחלקות</h2>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-sm text-emerald-600 font-bold hover:underline">
                בחר הכל
              </button>
              <span className="text-slate-300">|</span>
              <button onClick={deselectAll} className="text-sm text-slate-500 font-bold hover:underline">
                נקה הכל
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {departments.map((dept) => (
              <label
                key={dept.id}
                className={`flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors ${
                  selectedIds.has(dept.id) ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(dept.id)}
                    onChange={() => toggleDept(dept.id)}
                    className="h-5 w-5 accent-emerald-600"
                  />
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: dept.color }} />
                  <span className="font-medium">{dept.name}</span>
                </div>
                <span className={`text-sm font-bold ${dept.emergency_active ? "text-red-600" : "text-green-600"}`}>
                  {dept.emergency_active ? "🔴 חירום פעיל" : "🟢 תקין"}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* בחירת סוג מסך */}
        <div className="rounded-2xl bg-white shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">על אילו מסכים להציג</h2>
          <div className="flex gap-4">
            <label className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border-2 transition-colors ${
              targetOrientation ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50"
            }`}>
              <input
                type="checkbox"
                checked={targetOrientation}
                onChange={() => setTargetOrientation(p => !p)}
                className="h-5 w-5 accent-emerald-600"
              />
              <Monitor className="h-5 w-5 text-emerald-600" />
              <span className="font-bold">לוח התמצאות</span>
            </label>
            <label className={`flex-1 flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer border-2 transition-colors ${
              targetDisplay ? "border-blue-500 bg-blue-50" : "border-slate-200 bg-slate-50"
            }`}>
              <input
                type="checkbox"
                checked={targetDisplay}
                onChange={() => setTargetDisplay(p => !p)}
                className="h-5 w-5 accent-blue-600"
              />
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
              <span className="font-bold">לוח מחלקתי</span>
            </label>
          </div>
        </div>

        {/* הודעת חירום */}
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
              disabled={!message || selectedIds.size === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white py-4 text-xl font-bold transition-colors"
            >
              <AlertTriangle className="h-5 w-5" />
              הפעל ({selectedIds.size} מחלקות)
            </button>
            <button
              onClick={() => handleEmergency(false)}
              disabled={selectedIds.size === 0}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-600 hover:bg-slate-700 disabled:bg-slate-300 text-white py-4 text-xl font-bold transition-colors"
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
        </div>

        {/* רענון מרחוק */}
        <div className="rounded-2xl bg-white shadow-md p-6 space-y-4">
          <h2 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <RefreshCw className="h-6 w-6" />
            רענון מסכים מרחוק
          </h2>
          <p className="text-slate-500">
            רענן את המסכים של {selectedIds.size} מחלקות נבחרות
          </p>
          <button
            onClick={handleRefresh}
            disabled={selectedIds.size === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white py-4 text-xl font-bold transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
            רענן מסכים ({selectedIds.size})
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
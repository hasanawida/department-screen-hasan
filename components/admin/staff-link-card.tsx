"use client";

// הקישור האישי שנשלח לאיש הצוות (בלי סיסמה). אפשר להחליף אותו אם דלף.

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CopyLink, btnGhost } from "@/components/admin/brand-ui";
import type { StaffRole } from "@/lib/staff-links";

export default function StaffLinkCard({ role, to, extra }: { role: StaffRole; /** "לדיאטנית" */ to: string; extra?: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "none" | "failed">("loading");
  const [msg, setMsg] = useState("");
  const [ask, setAsk] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    supabase.from("staff_links").select("token").eq("role", role).maybeSingle().then(({ data, error }) => {
      if (error) { setState("failed"); return; }
      if (!data) { setState("none"); return; }
      setToken(data.token); setState("ok");
    });
  }, [supabase, role]);

  /** קישור חדש (הישן מפסיק לעבוד). אם עוד אין קישור לתפקיד — נוצר */
  async function renew() {
    setAsk(false);
    setMsg("");
    const fresh = crypto.randomUUID();
    const { data, error } = await supabase.from("staff_links").upsert({ role, token: fresh }, { onConflict: "role" }).select("token");
    if (error || !data?.length) { setMsg("הקישור לא הוחלף" + (error ? ": " + error.message : ". רעננו את העמוד ונסו שוב.")); return; }
    setToken(fresh);
    setState("ok");
  }

  return (
    <Card title={"הקישור " + to}>
      {state === "loading" && <p className="text-[#3F2F2D]/60">טוען…</p>}
      {state === "failed" && <p className="text-[15px] text-[#7a2e22]" role="alert">הקישור לא נטען. בדקו את החיבור ורעננו את העמוד.</p>}
      {state === "none" && (
        <div className="space-y-2">
          <p className="text-[15px]">עוד אין קישור {to}.</p>
          <button type="button" onClick={renew} className="rounded-xl bg-[#5A826F] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4d7260]">יצירת קישור</button>
        </div>
      )}
      {msg && <p className="text-sm font-semibold text-[#7a2e22]" role="alert">{msg}</p>}
      {state === "ok" && token && (
        <div className="space-y-3">
          <p className="text-[15px] text-[#3F2F2D]/70">שולחים את הקישור {to}. הוא נפתח בטלפון או במחשב בלי סיסמה, ורק לעמוד הזה.</p>
          <CopyLink url={origin + "/staff/" + token} label={"הקישור " + to} />
          <div className="flex flex-wrap items-center gap-2">
            {extra}
            {ask ? (
              <span className="flex flex-wrap items-center gap-2 text-sm">
                הקישור הישן יפסיק לעבוד.
                <button type="button" className="rounded-xl bg-[#B56262] px-3 py-2 font-semibold text-white" onClick={renew}>להחליף קישור</button>
                <button type="button" className={btnGhost + " !py-2"} onClick={() => setAsk(false)}>לא</button>
              </span>
            ) : (
              <button type="button" className={btnGhost} onClick={() => setAsk(true)}>החלפת הקישור</button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

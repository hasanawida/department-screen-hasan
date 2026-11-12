"use client";

// תקלה בעמוד (בניהול או בעמודי הצוות): הודעה בעברית וכפתור לניסיון נוסף.
// למסכי הטלוויזיה יש עמודי תקלה משלהם, שחוזרים לבד.
export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#F6F2EE] p-6 text-center text-[#3F2F2D]">
      <h1 className="text-2xl font-bold">משהו השתבש בטעינת העמוד</h1>
      <p className="text-[#3F2F2D]/70">בדרך כלל זו תקלת חיבור זמנית. הנתונים לא נפגעו.</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => reset()} className="rounded-xl bg-[#5A826F] px-5 py-2.5 font-semibold text-white hover:bg-[#4d7260]">ניסיון נוסף</button>
        <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-white px-5 py-2.5 font-semibold text-[#3F2F2D] ring-1 ring-[#3F2F2D]/15 hover:bg-[#E3ECE7]">טעינה מחדש</button>
      </div>
    </div>
  );
}

// תחומי הנוכחות — כל אחד ברובריקה (עמוד) נפרד. בקובץ רגיל (לא "use client") כדי שגם השרת יוכל לקרוא אותו
export type ReportKind = "occupation" | "instructors" | "physio";

export const REPORT_KINDS: { kind: ReportKind; label: string; title: string; about: string }[] = [
  { kind: "occupation", label: "תעסוקה", title: "נוכחות — תעסוקה", about: "מי השתתף בפעילויות של מדריכות התעסוקה." },
  { kind: "instructors", label: "מפעילים", title: "נוכחות — מפעילים", about: "מי השתתף בפעילויות של המפעילים." },
  { kind: "physio", label: "פיזיותרפיה", title: "נוכחות — פיזיותרפיה", about: "מי הוזמן לפיזיותרפיה ומי הגיע." },
];

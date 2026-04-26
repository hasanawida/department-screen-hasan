"use client";

import dynamic from "next/dynamic";

const Editor = dynamic(() => import("./editor"), {
  ssr: false,
  loading: () => (
    <div className="h-screen flex items-center justify-center text-slate-400" dir="rtl">
      טוען עורך...
    </div>
  ),
});

export default function LayoutDemoPage() {
  return <Editor />;
}

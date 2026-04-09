"use client";

export default function Error({ error }: { error: Error }) {
  return (
    <div dir="rtl" className="flex min-h-screen items-center justify-center">
      <p className="text-2xl text-red-600">{error.message}</p>
    </div>
  );
}
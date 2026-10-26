import { Suspense } from "react";
import WeeklyEditor from "@/components/admin/weekly-editor";

export default function WeeklyBoardPage() {
  return (
    <Suspense>
      <WeeklyEditor />
    </Suspense>
  );
}

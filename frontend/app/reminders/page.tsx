"use client";

import { Suspense } from "react";
import { ReminderContent } from "./components/ReminderContent";

export default function RemindersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center">
          <p className="text-gray-500">Loading reminders...</p>
        </div>
      }
    >
      <ReminderContent />
    </Suspense>
  );
}

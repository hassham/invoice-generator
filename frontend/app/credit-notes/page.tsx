"use client";

import { Suspense } from "react";
import { CreditNoteContent } from "./components/CreditNoteContent";

export default function CreditNotesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12 px-4 flex items-center justify-center"><p className="text-gray-500">Loading...</p></div>}>
      <CreditNoteContent />
    </Suspense>
  );
}

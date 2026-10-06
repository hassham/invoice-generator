"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateCreditNoteForm } from "./CreateCreditNoteForm";
import { CreditNoteList } from "./CreditNoteList";
import { listByBusiness, CreditNote } from "../../lib/creditNotes";

interface Invoice {
  id: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
}

export function CreditNoteContent() {
  const searchParams = useSearchParams();
  const businessId = searchParams.get("businessId") || "";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  useEffect(() => {
    if (!businessId) return;

    const loadCreditNotes = async () => {
      try {
        setLoading(true);
        const data = await listByBusiness(businessId);
        setCreditNotes(data);
      } catch (error) {
        console.error("Failed to load credit notes:", error);
      } finally {
        setLoading(false);
      }
    };

    loadCreditNotes();
  }, [businessId]);

  const handleSuccess = () => {
    setActiveTab("list");
    listByBusiness(businessId).then(setCreditNotes).catch(console.error);
  };

  if (!businessId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-red-600">Business context required. Please access through the main app.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-8">
            <h1 className="text-3xl font-bold text-gray-900">Credit Notes</h1>
            <p className="mt-2 text-gray-600">
              Create and manage credit notes for your invoices.
            </p>

            <div className="mt-8">
              <div className="flex gap-4 border-b">
                <button
                  onClick={() => setActiveTab("list")}
                  className={`px-4 py-2 font-medium border-b-2 transition ${
                    activeTab === "list"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Credit Notes ({creditNotes.length})
                </button>
                <button
                  onClick={() => setActiveTab("create")}
                  className={`px-4 py-2 font-medium border-b-2 transition ${
                    activeTab === "create"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Create New
                </button>
              </div>

              {activeTab === "list" && (
                <div className="mt-6">
                  {loading ? (
                    <p className="text-gray-500">Loading credit notes...</p>
                  ) : creditNotes.length === 0 ? (
                    <p className="text-gray-500">No credit notes yet.</p>
                  ) : (
                    <CreditNoteList
                      businessId={businessId}
                      creditNotes={creditNotes}
                      onCreditNoteDeleted={() =>
                        listByBusiness(businessId).then(setCreditNotes).catch(console.error)
                      }
                    />
                  )}
                </div>
              )}

              {activeTab === "create" && (
                <div className="mt-6">
                  <CreateCreditNoteForm
                    businessId={businessId}
                    invoices={invoices}
                    onSuccess={handleSuccess}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

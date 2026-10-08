"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateCreditNoteForm } from "./CreateCreditNoteForm";
import { CreditNoteList } from "./CreditNoteList";
import { listByBusiness, CreditNote } from "../../lib/creditNotes";
import { listInvoices, InvoiceListItem } from "../../lib/invoiceList";
import { getBusinessProfile } from "../../lib/business";

export function CreditNoteContent() {
  const searchParams = useSearchParams();
  const businessIdParam = searchParams.get("businessId") || "";
  const [businessId, setBusinessId] = useState(businessIdParam);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [creditNotes, setCreditNotes] = useState<CreditNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // IG-308: this page used to render "Business context required" unless the caller happened to
  // put ?businessId= in the URL, which made it unreachable from anywhere that does not already
  // know the id - including the unified document list's credit note rows (IG-237). Every account
  // has exactly one business today, so the id is resolved from the profile when it is absent;
  // an explicit parameter still wins, which is what multi-business (IG-211) will need.
  useEffect(() => {
    if (businessIdParam) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBusinessId(businessIdParam);
      return;
    }
    let cancelled = false;
    getBusinessProfile()
      .then((profile) => {
        if (!cancelled) {
          setBusinessId(profile.id);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBusinessError("Failed to load your business profile.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [businessIdParam]);

  useEffect(() => {
    if (!businessId) return;

    const load = async () => {
      try {
        setLoading(true);
        const [creditNoteData, invoiceData] = await Promise.all([
          listByBusiness(businessId),
          listInvoices({ page: 1, pageSize: 100 }),
        ]);
        setCreditNotes(creditNoteData);
        setInvoices(invoiceData.items);
      } catch (error) {
        console.error("Failed to load credit notes:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
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
            {businessError ? (
              <p role="alert" className="text-red-600">
                {businessError}
              </p>
            ) : (
              <p className="text-gray-500">Loading credit notes...</p>
            )}
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

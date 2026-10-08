"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CreateReceiptForm } from "./CreateReceiptForm";
import { ReceiptList } from "./ReceiptList";
import { listByBusiness, Receipt } from "../../lib/receipts";
import { listInvoices, InvoiceListItem } from "../../lib/invoiceList";
import { getBusinessProfile } from "../../lib/business";

export function ReceiptContent() {
  const searchParams = useSearchParams();
  const businessIdParam = searchParams.get("businessId") || "";
  const [businessId, setBusinessId] = useState(businessIdParam);
  const [businessError, setBusinessError] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"list" | "create">("list");

  // IG-308: same fix as CreditNoteContent - this page was unreachable without ?businessId= in the
  // URL, including from the unified document list's receipt rows (IG-237). An explicit parameter
  // still wins; otherwise the account's single business is resolved from the profile.
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
        const [receiptData, invoiceData] = await Promise.all([
          listByBusiness(businessId),
          listInvoices({ page: 1, pageSize: 100 }),
        ]);
        setReceipts(receiptData);
        setInvoices(invoiceData.items);
      } catch (error) {
        console.error("Failed to load receipts:", error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [businessId]);

  const handleSuccess = () => {
    setActiveTab("list");
    listByBusiness(businessId).then(setReceipts).catch(console.error);
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
              <p className="text-gray-500">Loading receipts...</p>
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
            <h1 className="text-3xl font-bold text-gray-900">Receipts</h1>
            <p className="mt-2 text-gray-600">
              Issue formal proof of payment for payments you have recorded.
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
                  Receipts ({receipts.length})
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
                    <p className="text-gray-500">Loading receipts...</p>
                  ) : receipts.length === 0 ? (
                    <p className="text-gray-500">No receipts yet.</p>
                  ) : (
                    <ReceiptList
                      businessId={businessId}
                      receipts={receipts}
                      onReceiptDeleted={() =>
                        listByBusiness(businessId).then(setReceipts).catch(console.error)
                      }
                    />
                  )}
                </div>
              )}

              {activeTab === "create" && (
                <div className="mt-6">
                  <CreateReceiptForm
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

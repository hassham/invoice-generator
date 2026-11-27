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
      <div>
        <div className="min-w-0">
          <div className="workspace-panel p-6">
            {businessError ? (
              <p role="alert" className="text-status-overdue-fg">
                {businessError}
              </p>
            ) : (
              <p role="status" className="workspace-state">Loading receipts...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="min-w-0">
        <div className="workspace-panel">
          <header data-panel-heading>
            <h1 className="workspace-heading">Receipts</h1>
            <p className="mt-2 text-muted">
              Issue formal proof of payment for payments you have recorded.
            </p>
          </header>
          <div className="p-4 sm:p-7">

            <div className="mt-8">
              <div className="flex flex-wrap gap-2 border-b border-border pb-3">
                <button
                  type="button"
                  aria-pressed={activeTab === "list"}
                  onClick={() => setActiveTab("list")}
                  className={`workspace-tab ${
                    activeTab === "list"
                      ? "workspace-tab-active"
                      : "workspace-tab-idle"
                  }`}
                >
                  Receipts ({receipts.length})
                </button>
                <button
                  type="button"
                  aria-pressed={activeTab === "create"}
                  onClick={() => setActiveTab("create")}
                  className={`workspace-tab ${
                    activeTab === "create"
                      ? "workspace-tab-active"
                      : "workspace-tab-idle"
                  }`}
                >
                  Create New
                </button>
              </div>

              {activeTab === "list" && (
                <div className="mt-6">
                  {loading ? (
                    <p role="status" className="workspace-state">Loading receipts...</p>
                  ) : receipts.length === 0 ? (
                    <p className="workspace-state">No receipts yet.</p>
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

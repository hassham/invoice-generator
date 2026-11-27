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
      <div>
        <div className="min-w-0">
          <div className="workspace-panel p-6">
            {businessError ? (
              <p role="alert" className="text-status-overdue-fg">
                {businessError}
              </p>
            ) : (
              <p role="status" className="workspace-state">Loading credit notes...</p>
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
          <div className="p-4 sm:p-7">
            <h1 className="workspace-heading">Credit Notes</h1>
            <p className="mt-2 text-muted">
              Create and manage credit notes for your invoices.
            </p>

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
                  Credit Notes ({creditNotes.length})
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
                    <p role="status" className="workspace-state">Loading credit notes...</p>
                  ) : creditNotes.length === 0 ? (
                    <p className="workspace-state">No credit notes yet.</p>
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

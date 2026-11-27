"use client";

import { WorkspaceHeading, WorkspaceRowButton, WorkspaceState } from "../../../components/ui/WorkspaceCollection";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useEffect, useState } from "react";
import { archiveCustomer, getCustomer, updateCustomer, type Customer, type CustomerRequest } from "../../../lib/customers";
import { CustomerForm, type CustomerFormValues } from "../../components/CustomerForm";

type LoadState = "loading" | "loaded" | "error";

function toFormValues(customer: Customer): CustomerFormValues {
  const orEmpty = (value: string | null) => value ?? "";

  return {
    businessName: orEmpty(customer.businessName),
    contactName: orEmpty(customer.contactName),
    email: orEmpty(customer.email),
    phone: orEmpty(customer.phone),
    addressLine1: orEmpty(customer.addressLine1),
    addressLine2: orEmpty(customer.addressLine2),
    city: orEmpty(customer.city),
    state: orEmpty(customer.state),
    postalCode: orEmpty(customer.postalCode),
    country: orEmpty(customer.country),
    taxNumber: orEmpty(customer.taxNumber),
    notes: orEmpty(customer.notes),
  };
}

interface CustomerDetailProps {
  customerId: string;
}

/**
 * FSD section 57 (Customer Details): "Total invoiced/paid/outstanding" and "Invoice history" both
 * depend on invoice persistence (Epic IG-7) and payment recording (Epic IG-11), neither of which
 * exists yet - this page shows the record itself (editable, per this Story's own AC) and
 * documents that financial summary as a follow-up rather than faking figures. Likewise, FSD
 * section 58's "restorable" archive has no unarchive endpoint in FSD section 93's own API list or
 * this Story's AC, so an archived customer stays viewable/editable here but cannot be restored
 * from the UI yet.
 */
export function CustomerDetail({ customerId }: CustomerDetailProps) {
  const [state, setState] = useState<LoadState>("loading");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomer(customerId)
      .then((loaded) => {
        if (!cancelled) {
          setCustomer(loaded);
          setState("loaded");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load this customer.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  const handleSubmit = async (request: CustomerRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    setSavedAt(null);

    try {
      const updated = await updateCustomer(customerId, request);
      setCustomer(updated);
      setSavedAt(Date.now());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save changes to this customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    setSubmitError(null);

    try {
      await archiveCustomer(customerId);
      setCustomer((current) => (current ? { ...current, isArchived: true } : current));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to archive this customer.");
    } finally {
      setArchiving(false);
    }
  };

  if (state === "loading") {
    return <WorkspaceState area="customer" kind="loading">Loading customer&hellip;</WorkspaceState>;
  }
  if (state === "error" || !customer) {
    return <WorkspaceState area="customer" kind="error">{loadError}</WorkspaceState>;
  }

  return (
    <div>
      <WorkspaceHeading area="customer" eyebrow="Workspace / Customer record" title={customer.businessName ?? customer.contactName ?? "(unnamed)"}
        back={{ href: "/customers", label: "Back to customers" }}
        description={customer.isArchived ? <StatusBadge tone="draft" label="Archived" /> : undefined}
        actions={!customer.isArchived ? <WorkspaceRowButton danger onClick={handleArchive} disabled={archiving}>
          {archiving ? "Archiving..." : "Archive"}
        </WorkspaceRowButton> : undefined} />

      {savedAt ? (
        <p role="status" className="mt-6 rounded-md border border-status-paid-fg/25 bg-status-paid-bg/65 px-4 py-3 text-sm text-status-paid-fg">
          Changes saved.
        </p>
      ) : null}

      <div className="record-edit-sheet">
        <CustomerForm
          initialValues={toFormValues(customer)}
          submitting={submitting}
          submitLabel="Save changes"
          error={submitError}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

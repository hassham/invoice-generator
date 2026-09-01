"use client";

import Link from "next/link";
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
    return <p className="text-sm text-slate-600">Loading customer…</p>;
  }

  if (state === "error" || !customer) {
    return (
      <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {loadError}
      </p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <Link href="/customers" className="text-sm font-medium text-slate-600 hover:underline">
            ← Back to customers
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">{customer.businessName ?? customer.contactName ?? "(unnamed)"}</h1>
          {customer.isArchived ? (
            <span className="mt-1 inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">Archived</span>
          ) : null}
        </div>
        {!customer.isArchived ? (
          <button
            type="button"
            onClick={handleArchive}
            disabled={archiving}
            className="rounded-full border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {archiving ? "Archiving…" : "Archive"}
          </button>
        ) : null}
      </div>

      {savedAt ? (
        <p role="status" className="mt-6 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Changes saved.
        </p>
      ) : null}

      <div className="mt-6">
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

"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { createBusiness, listBusinesses, type BusinessProfile } from "../../lib/business";
import { useSelectedBusiness } from "../../lib/BusinessContext";

type LoadState = "loading" | "loaded" | "error";

interface NewBusinessValues {
  businessName: string;
  country: string;
  defaultCurrency: string;
}

const EMPTY_VALUES: NewBusinessValues = { businessName: "", country: "AU", defaultCurrency: "AUD" };

/**
 * IG-295: lists the account's businesses, lets the user pick which one the app works on (persisted
 * via BusinessContext), and creates new ones. Each business has its own profile and numbering; the
 * create form asks only for what a new business can't do without, and the rest is editable later
 * from the business profile settings.
 */
export function BusinessesPage() {
  const { selectedBusinessId, selectBusiness } = useSelectedBusiness();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [values, setValues] = useState<NewBusinessValues>(EMPTY_VALUES);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    listBusinesses()
      .then((loaded) => {
        setBusinesses(loaded);
        setLoadState("loaded");
      })
      .catch(() => setLoadState("error"));
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);
    setSubmitting(true);

    try {
      const created = await createBusiness({
        businessName: values.businessName.trim(),
        country: values.country.trim().toUpperCase(),
        defaultCurrency: values.defaultCurrency.trim().toUpperCase(),
      });
      setBusinesses((current) => [...current, created]);
      selectBusiness(created.id);
      setValues(EMPTY_VALUES);
      setShowCreate(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to create your business.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadState === "loading") {
    return <p className="text-sm text-muted">Loading your businesses…</p>;
  }

  if (loadState === "error") {
    return (
      <p role="alert" className="text-sm text-status-overdue-fg">
        We couldn&apos;t load your businesses. Please refresh the page to try again.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section aria-labelledby="business-list-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 id="business-list-heading" className="workspace-heading">
            Your businesses
          </h1>
          {/* IG-239: team invitations are managed per selected business. */}
          <Link href="/settings/team" className="text-sm font-semibold text-ink underline">
            Manage team
          </Link>
        </div>

        <ul className="divide-y divide-border rounded-lg border border-border bg-paper">
          {businesses.map((business) => {
            const isSelected = business.id === selectedBusinessId;
            return (
              <li key={business.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-medium text-ink">
                    {business.businessName}
                    {isSelected ? (
                      <span className="ml-2 rounded-full bg-status-paid-bg px-2 py-0.5 text-xs font-medium text-status-paid-fg">
                        Selected
                      </span>
                    ) : null}
                  </p>
                  <p className="text-sm text-muted">
                    {business.country} · {business.defaultCurrency} · Next invoice {business.invoicePrefix}
                    {String(business.nextInvoiceNumber).padStart(business.invoiceNumberPadding, "0")}
                  </p>
                </div>
                <div className="flex gap-3">
                  {isSelected ? null : (
                    <button
                      type="button"
                      onClick={() => selectBusiness(business.id)}
                      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-ink hover:bg-canvas"
                    >
                      Use {business.businessName}
                    </button>
                  )}
                  <Link
                    href="/settings/business"
                    onClick={() => selectBusiness(business.id)}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-status-sent-fg hover:bg-status-sent-bg/55"
                  >
                    Edit profile
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {showCreate ? (
        <form onSubmit={handleCreate} aria-labelledby="create-business-heading" className="space-y-4 rounded-lg border border-border bg-paper p-6">
          <h2 id="create-business-heading" className="text-lg font-semibold text-ink">
            New business
          </h2>

          <div>
            <label htmlFor="new-business-name" className="block text-sm font-medium text-ink">
              Business name
            </label>
            <input
              id="new-business-name"
              type="text"
              required
              maxLength={200}
              value={values.businessName}
              onChange={(event) => setValues({ ...values, businessName: event.target.value })}
              className="workspace-field mt-1 w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="new-business-country" className="block text-sm font-medium text-ink">
                Country code
              </label>
              <input
                id="new-business-country"
                type="text"
                required
                minLength={2}
                maxLength={2}
                value={values.country}
                onChange={(event) => setValues({ ...values, country: event.target.value })}
                className="workspace-field mt-1 w-full rounded-md border border-border px-3 py-2 text-sm uppercase"
              />
            </div>
            <div>
              <label htmlFor="new-business-currency" className="block text-sm font-medium text-ink">
                Currency code
              </label>
              <input
                id="new-business-currency"
                type="text"
                required
                minLength={3}
                maxLength={3}
                value={values.defaultCurrency}
                onChange={(event) => setValues({ ...values, defaultCurrency: event.target.value })}
                className="workspace-field mt-1 w-full rounded-md border border-border px-3 py-2 text-sm uppercase"
              />
            </div>
          </div>

          {submitError ? (
            <p role="alert" className="text-sm text-status-overdue-fg">
              {submitError}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="workspace-button-primary disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create business"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowCreate(false);
                setSubmitError(null);
              }}
              className="rounded-md px-4 py-2 text-sm font-medium text-ink hover:bg-status-draft-bg"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="workspace-button-primary"
        >
          New business
        </button>
      )}
    </div>
  );
}

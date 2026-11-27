"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { archiveCustomer, listCustomers, type Customer } from "../../lib/customers";

type LoadState = "loading" | "loaded" | "error";

function displayName(customer: Customer): string {
  return customer.businessName ?? customer.contactName ?? "(unnamed)";
}

function displayContact(customer: Customer): string {
  // Avoid repeating the same value in both columns when Contact Name is the only name on file -
  // displayName() already shows it as the customer's name in that case.
  return customer.businessName ? (customer.contactName ?? "—") : "—";
}

/**
 * FSD section 55 (/customers). List columns "Outstanding Amount" and "Last Invoice Date", and the
 * "Create Invoice" row action, all depend on invoice persistence (Epic IG-7) and payment history
 * (Epic IG-11) - neither exists yet, so this list only shows fields the backend can actually
 * answer today. Revisit once those Epics land.
 */
export function CustomerListView() {
  const [state, setState] = useState<LoadState>("loading");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);

  useEffect(() => {
    listCustomers()
      .then((loaded) => {
        setCustomers(loaded);
        setState("loaded");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load customers.");
        setState("error");
      });
  }, []);

  const handleArchive = async (id: string) => {
    setArchivingId(id);
    try {
      await archiveCustomer(id);
      setCustomers((current) => current.filter((customer) => customer.id !== id));
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Failed to archive this customer.");
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="workspace-heading">Customers</h1>
        <Link
          href="/customers/new"
          className="workspace-button-primary"
        >
          Add customer
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p role="status" className="workspace-state mt-6">Loading customers…</p> : null}

      {state === "loaded" && customers.length === 0 ? (
        <p className="workspace-state mt-6">
          No customers yet. <Link href="/customers/new" className="font-medium text-ink hover:underline">Add your first customer</Link>.
        </p>
      ) : null}

      {state === "loaded" && customers.length > 0 ? (
        <div role="region" aria-label="Customers" tabIndex={0} className="mt-6 workspace-table-scroll">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Customers</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-4 font-medium">Customer Name</th>
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-border">
                  <td className="py-2 pr-4 text-ink">{displayName(customer)}</td>
                  <td className="py-2 pr-4 text-ink">{displayContact(customer)}</td>
                  <td className="py-2 pr-4 text-ink">{customer.email ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink">{customer.phone ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/customers/${customer.id}`} className="font-medium text-ink hover:underline">
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleArchive(customer.id)}
                        disabled={archivingId === customer.id}
                        className="font-medium text-status-overdue-fg hover:underline disabled:opacity-50"
                      >
                        {archivingId === customer.id ? "Archiving…" : "Archive"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

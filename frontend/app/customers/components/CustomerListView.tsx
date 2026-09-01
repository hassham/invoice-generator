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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Add customer
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p className="mt-6 text-sm text-slate-600">Loading customers…</p> : null}

      {state === "loaded" && customers.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          No customers yet. <Link href="/customers/new" className="font-medium text-slate-950 hover:underline">Add your first customer</Link>.
        </p>
      ) : null}

      {state === "loaded" && customers.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
                <th className="py-2 pr-4 font-medium">Customer Name</th>
                <th className="py-2 pr-4 font-medium">Contact</th>
                <th className="py-2 pr-4 font-medium">Email</th>
                <th className="py-2 pr-4 font-medium">Phone</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-950">{displayName(customer)}</td>
                  <td className="py-2 pr-4 text-slate-700">{displayContact(customer)}</td>
                  <td className="py-2 pr-4 text-slate-700">{customer.email ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-700">{customer.phone ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/customers/${customer.id}`} className="font-medium text-slate-950 hover:underline">
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleArchive(customer.id)}
                        disabled={archivingId === customer.id}
                        className="font-medium text-red-700 hover:underline disabled:opacity-50"
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

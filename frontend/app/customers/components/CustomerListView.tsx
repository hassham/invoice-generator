"use client";

import { WorkspaceCollection, WorkspaceCreateLink, WorkspaceHeading, WorkspaceRecordName, WorkspaceRowButton, WorkspaceRowLink, WorkspaceState } from "../../components/ui/WorkspaceCollection";
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
      <WorkspaceHeading area="customer" eyebrow="Workspace / Client directory" title="Customers"
        description="Keep billing contacts and customer details ready for your next invoice."
        actions={<WorkspaceCreateLink href="/customers/new">Add customer</WorkspaceCreateLink>} />

      {error ? <WorkspaceState area="customer" kind="error">{error}</WorkspaceState> : null}
      {state === "loading" ? <WorkspaceState area="customer" kind="loading">Loading customers&hellip;</WorkspaceState> : null}
      {state === "loaded" && customers.length === 0 ? (
        <WorkspaceState area="customer" kind="empty"
          action={<WorkspaceRowLink href="/customers/new">Add your first customer</WorkspaceRowLink>}>
          <strong>No customers yet.</strong><p className="text-muted">Save a billing contact once and reuse their details on new invoices.</p>
        </WorkspaceState>
      ) : null}
      {state === "loaded" && customers.length > 0 ? (
        <WorkspaceCollection area="customer" title="Client directory" caption="Customers"
          note={customers.length + (customers.length === 1 ? " saved customer" : " saved customers")}
          rows={customers} rowKey={(customer) => customer.id}
          columns={[
            { key: "name", label: "Customer Name", render: (customer) => <WorkspaceRecordName area="customer">{displayName(customer)}</WorkspaceRecordName> },
            { key: "contact", label: "Contact", render: displayContact },
            { key: "email", label: "Email", render: (customer) => customer.email ?? "-" },
            { key: "phone", label: "Phone", render: (customer) => customer.phone ?? "-" },
            { key: "actions", label: "Actions", wide: true, render: (customer) => (
              <div className="flex flex-wrap gap-2">
                <WorkspaceRowLink href={"/customers/" + customer.id}>View</WorkspaceRowLink>
                <WorkspaceRowButton danger onClick={() => handleArchive(customer.id)} disabled={archivingId === customer.id}>
                  {archivingId === customer.id ? "Archiving..." : "Archive"}
                </WorkspaceRowButton>
              </div>
            ) },
          ]} />
      ) : null}
    </div>
  );
}

"use client";

import { WorkspaceCollection, WorkspaceCreateLink, WorkspaceHeading, WorkspaceRecordName, WorkspaceRowButton, WorkspaceRowLink, WorkspaceState } from "../../components/ui/WorkspaceCollection";
import { useEffect, useState } from "react";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { archiveItem, duplicateItem, listItems, type CatalogItem } from "../../lib/items";

type LoadState = "loading" | "loaded" | "error";

function formatPrice(item: CatalogItem): string {
  return item.unitPrice.toFixed(2);
}

function formatTaxRate(item: CatalogItem): string {
  return item.taxRate !== null ? `${item.taxRate}%` : "—";
}

/** FSD section 59 (/items). Columns and actions match the FSD exactly - Name, Description, Unit,
 * Price, Tax, Status, with Edit (via View, same as CustomerListView's pattern), Duplicate and
 * Archive. */
export function ItemListView() {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  useEffect(() => {
    listItems()
      .then((loaded) => {
        setItems(loaded);
        setState("loaded");
      })
      .catch((loadError) => {
        setError(loadError instanceof Error ? loadError.message : "Failed to load items.");
        setState("error");
      });
  }, []);

  const handleArchive = async (id: string) => {
    setArchivingId(id);
    try {
      await archiveItem(id);
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "Failed to archive this item.");
    } finally {
      setArchivingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setDuplicatingId(id);
    try {
      const duplicate = await duplicateItem(id);
      setItems((current) => [...current, duplicate].sort((a, b) => a.name.localeCompare(b.name)));
    } catch (duplicateError) {
      setError(duplicateError instanceof Error ? duplicateError.message : "Failed to duplicate this item.");
    } finally {
      setDuplicatingId(null);
    }
  };

  return (
    <div>
      <WorkspaceHeading area="item" eyebrow="Workspace / Catalogue" title="Items"
        description="Save the products and services you bill for so you can add them to invoices in seconds."
        actions={<WorkspaceCreateLink href="/items/new">Add item</WorkspaceCreateLink>} />

      {error ? <WorkspaceState area="item" kind="error">{error}</WorkspaceState> : null}
      {state === "loading" ? <WorkspaceState area="item" kind="loading">Loading items&hellip;</WorkspaceState> : null}
      {state === "loaded" && items.length === 0 ? (
        <WorkspaceState area="item" kind="empty"
          action={<WorkspaceRowLink href="/items/new">Add your first item</WorkspaceRowLink>}>
          <strong>No items yet.</strong><p className="text-muted">Start with a product or service you bill for often.</p>
        </WorkspaceState>
      ) : null}
      {state === "loaded" && items.length > 0 ? (
        <WorkspaceCollection area="item" title="Product and service catalogue" caption="Items"
          note={items.length + (items.length === 1 ? " saved item" : " saved items")}
          rows={items} rowKey={(item) => item.id}
          columns={[
            { key: "name", label: "Name", render: (item) => <WorkspaceRecordName area="item">{item.name}</WorkspaceRecordName> },
            { key: "description", label: "Description", render: (item) => item.description ?? "-" },
            { key: "unit", label: "Unit", render: (item) => item.unit ?? "-" },
            { key: "price", label: "Price", align: "end", render: formatPrice },
            { key: "tax", label: "Tax", align: "end", render: formatTaxRate },
            { key: "status", label: "Status", render: (item) => <StatusBadge tone={item.isArchived ? "draft" : "paid"} label={item.isArchived ? "Archived" : "Active"} /> },
            { key: "actions", label: "Actions", wide: true, render: (item) => (
              <div className="flex flex-wrap gap-2">
                <WorkspaceRowLink href={"/items/" + item.id}>Edit</WorkspaceRowLink>
                <WorkspaceRowButton onClick={() => handleDuplicate(item.id)} disabled={duplicatingId === item.id}>
                  {duplicatingId === item.id ? "Duplicating..." : "Duplicate"}
                </WorkspaceRowButton>
                {!item.isArchived ? (
                  <WorkspaceRowButton danger onClick={() => handleArchive(item.id)} disabled={archivingId === item.id}>
                    {archivingId === item.id ? "Archiving..." : "Archive"}
                  </WorkspaceRowButton>
                ) : null}
              </div>
            ) },
          ]} />
      ) : null}
    </div>
  );
}

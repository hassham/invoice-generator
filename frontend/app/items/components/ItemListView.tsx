"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="workspace-heading">Items</h1>
        <Link
          href="/items/new"
          className="workspace-button-primary"
        >
          Add item
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-status-overdue-fg/25 bg-status-overdue-bg/55 px-4 py-3 text-sm text-status-overdue-fg">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p role="status" className="workspace-state mt-6">Loading items…</p> : null}

      {state === "loaded" && items.length === 0 ? (
        <p className="workspace-state mt-6">
          No items yet. <Link href="/items/new" className="font-medium text-ink hover:underline">Add your first item</Link>.
        </p>
      ) : null}

      {state === "loaded" && items.length > 0 ? (
        <div role="region" aria-label="Items" tabIndex={0} className="mt-6 workspace-table-scroll">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Items</caption>
            <thead>
              <tr className="border-b border-border text-muted">
                <th className="py-2 pr-4 font-medium">Name</th>
                <th className="py-2 pr-4 font-medium">Description</th>
                <th className="py-2 pr-4 font-medium">Unit</th>
                <th className="py-2 pr-4 font-medium">Price</th>
                <th className="py-2 pr-4 font-medium">Tax</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border">
                  <td className="py-2 pr-4 text-ink">{item.name}</td>
                  <td className="py-2 pr-4 text-ink">{item.description ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink">{item.unit ?? "—"}</td>
                  <td className="py-2 pr-4 text-ink">{formatPrice(item)}</td>
                  <td className="py-2 pr-4 text-ink">{formatTaxRate(item)}</td>
                  <td className="py-2 pr-4 text-ink">{item.isArchived ? "Archived" : "Active"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/items/${item.id}`} className="font-medium text-ink hover:underline">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item.id)}
                        disabled={duplicatingId === item.id}
                        className="font-medium text-ink hover:underline disabled:opacity-50"
                      >
                        {duplicatingId === item.id ? "Duplicating…" : "Duplicate"}
                      </button>
                      {!item.isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleArchive(item.id)}
                          disabled={archivingId === item.id}
                          className="font-medium text-status-overdue-fg hover:underline disabled:opacity-50"
                        >
                          {archivingId === item.id ? "Archiving…" : "Archive"}
                        </button>
                      ) : null}
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

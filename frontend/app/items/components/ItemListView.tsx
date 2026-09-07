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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-950">Items</h1>
        <Link
          href="/items/new"
          className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
        >
          Add item
        </Link>
      </div>

      {error ? (
        <p role="alert" className="mt-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {state === "loading" ? <p className="mt-6 text-sm text-slate-600">Loading items…</p> : null}

      {state === "loaded" && items.length === 0 ? (
        <p className="mt-6 text-sm text-slate-600">
          No items yet. <Link href="/items/new" className="font-medium text-slate-950 hover:underline">Add your first item</Link>.
        </p>
      ) : null}

      {state === "loaded" && items.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600">
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
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-950">{item.name}</td>
                  <td className="py-2 pr-4 text-slate-700">{item.description ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-700">{item.unit ?? "—"}</td>
                  <td className="py-2 pr-4 text-slate-700">{formatPrice(item)}</td>
                  <td className="py-2 pr-4 text-slate-700">{formatTaxRate(item)}</td>
                  <td className="py-2 pr-4 text-slate-700">{item.isArchived ? "Archived" : "Active"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-3">
                      <Link href={`/items/${item.id}`} className="font-medium text-slate-950 hover:underline">
                        Edit
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(item.id)}
                        disabled={duplicatingId === item.id}
                        className="font-medium text-slate-700 hover:underline disabled:opacity-50"
                      >
                        {duplicatingId === item.id ? "Duplicating…" : "Duplicate"}
                      </button>
                      {!item.isArchived ? (
                        <button
                          type="button"
                          onClick={() => handleArchive(item.id)}
                          disabled={archivingId === item.id}
                          className="font-medium text-red-700 hover:underline disabled:opacity-50"
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

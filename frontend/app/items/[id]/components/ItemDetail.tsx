"use client";

import { WorkspaceHeading, WorkspaceRowButton, WorkspaceState } from "../../../components/ui/WorkspaceCollection";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useEffect, useState } from "react";
import { archiveItem, getItem, updateItem, type CatalogItem, type CatalogItemRequest } from "../../../lib/items";
import { ItemForm, type ItemFormValues } from "../../components/ItemForm";

type LoadState = "loading" | "loaded" | "error";

function toFormValues(item: CatalogItem): ItemFormValues {
  const orEmpty = (value: string | null) => value ?? "";

  return {
    name: item.name,
    description: orEmpty(item.description),
    sku: orEmpty(item.sku),
    unit: orEmpty(item.unit),
    unitPrice: String(item.unitPrice),
    taxRate: item.taxRate !== null ? String(item.taxRate) : "",
  };
}

interface ItemDetailProps {
  itemId: string;
}

/**
 * FSD section 59/60/61. Unlike CustomerDetail there's no "restore" affordance here either - same
 * limitation (no unarchive endpoint exists, matching IG-55's own precedent) - an archived item
 * stays viewable/editable but can't be restored from the UI yet.
 */
export function ItemDetail({ itemId }: ItemDetailProps) {
  const [state, setState] = useState<LoadState>("loading");
  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getItem(itemId)
      .then((loaded) => {
        if (!cancelled) {
          setItem(loaded);
          setState("loaded");
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load this item.");
          setState("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  const handleSubmit = async (request: CatalogItemRequest) => {
    setSubmitting(true);
    setSubmitError(null);
    setSavedAt(null);

    try {
      const updated = await updateItem(itemId, request);
      setItem(updated);
      setSavedAt(Date.now());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save changes to this item.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async () => {
    setArchiving(true);
    setSubmitError(null);

    try {
      await archiveItem(itemId);
      setItem((current) => (current ? { ...current, isArchived: true } : current));
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to archive this item.");
    } finally {
      setArchiving(false);
    }
  };

  if (state === "loading") {
    return <WorkspaceState area="item" kind="loading">Loading item&hellip;</WorkspaceState>;
  }
  if (state === "error" || !item) {
    return <WorkspaceState area="item" kind="error">{loadError}</WorkspaceState>;
  }

  return (
    <div>
      <WorkspaceHeading area="item" eyebrow="Workspace / Item record" title={item.name}
        back={{ href: "/items", label: "Back to items" }}
        description={item.isArchived ? <StatusBadge tone="draft" label="Archived" /> : undefined}
        actions={!item.isArchived ? <WorkspaceRowButton danger onClick={handleArchive} disabled={archiving}>
          {archiving ? "Archiving..." : "Archive"}
        </WorkspaceRowButton> : undefined} />

      {savedAt ? (
        <p role="status" className="mt-6 rounded-md border border-status-paid-fg/25 bg-status-paid-bg/65 px-4 py-3 text-sm text-status-paid-fg">
          Changes saved.
        </p>
      ) : null}

      <div className="record-edit-sheet">
        <ItemForm
          initialValues={toFormValues(item)}
          submitting={submitting}
          submitLabel="Save changes"
          error={submitError}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

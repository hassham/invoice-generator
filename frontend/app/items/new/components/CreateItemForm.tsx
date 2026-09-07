"use client";

import { useState } from "react";
import { createItem, type CatalogItemRequest } from "../../../lib/items";
import { ItemForm } from "../../components/ItemForm";

/** FSD section 60 (/items/new). Redirects to the new item's own detail page on success, same
 * convention as CreateCustomerForm. */
export function CreateItemForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (request: CatalogItemRequest) => {
    setSubmitting(true);
    setError(null);

    try {
      const item = await createItem(request);
      window.location.href = `/items/${item.id}`;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create this item.");
      setSubmitting(false);
    }
  };

  return <ItemForm submitting={submitting} submitLabel="Create item" error={error} onSubmit={handleSubmit} />;
}

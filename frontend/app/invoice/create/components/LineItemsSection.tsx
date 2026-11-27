import type { ReactNode } from "react";
import type { CatalogItem } from "../../../lib/items";
import type { LineItem, LineItemErrors } from "../lib/lineItems";
import { LineItemRow } from "./LineItemRow";

interface LineItemsSectionProps {
  items: LineItem[];
  compact?: boolean;
  focusDescriptionId?: string;
  beforeItems?: ReactNode;
  errors: Record<string, LineItemErrors>;
  // IG-58: optional, defaulting to "off" - InvoiceDetail.tsx (IG-47's saved-invoice edit page)
  // renders this same section without the item picker, matching how it never wired up IG-56's
  // CustomerPicker either. Only the invoice-creation flow needs this.
  catalogItems?: CatalogItem[];
  showItemPicker?: boolean;
  onFieldChange: (id: string, field: keyof LineItem, value: string) => void;
  onFieldBlur: (id: string) => void;
  onSelectCatalogItem?: (id: string, catalogItem: CatalogItem) => void;
  onAdd: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

/** FSD sections 17/24: at least one item row always exists; Add/Remove/Duplicate/reorder actions. */
export function LineItemsSection({
  items,
  compact = false,
  focusDescriptionId,
  beforeItems,
  errors,
  catalogItems = [],
  showItemPicker = false,
  onFieldChange,
  onFieldBlur,
  onSelectCatalogItem,
  onAdd,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: LineItemsSectionProps) {
  return (
    <fieldset className="mt-6 border-t border-border pt-6">
      <legend className="font-display text-lg font-bold text-ink">Items</legend>
      {beforeItems}
      <div className={compact ? "mt-2 flex min-w-0 flex-col gap-2" : "mt-4 flex flex-col gap-4"}>
        {items.map((item, index) => (
          <LineItemRow
            key={item.id}
            item={item}
            compact={compact}
            focusDescription={item.id === focusDescriptionId}
            index={index}
            itemCount={items.length}
            errors={errors[item.id] ?? {}}
            catalogItems={catalogItems}
            showItemPicker={showItemPicker}
            onFieldChange={onFieldChange}
            onFieldBlur={onFieldBlur}
            onSelectCatalogItem={onSelectCatalogItem}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onAdd}
        className={compact ? "workspace-button-secondary mt-3" : "mt-4 rounded-full border-[1.5px] border-ink bg-paper px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas"}
      >
        Add Item
      </button>
    </fieldset>
  );
}

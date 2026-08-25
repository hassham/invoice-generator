import type { LineItem, LineItemErrors } from "../lib/lineItems";
import { LineItemRow } from "./LineItemRow";

interface LineItemsSectionProps {
  items: LineItem[];
  errors: Record<string, LineItemErrors>;
  onFieldChange: (id: string, field: keyof LineItem, value: string) => void;
  onFieldBlur: (id: string) => void;
  onAdd: () => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

/** FSD sections 17/24: at least one item row always exists; Add/Remove/Duplicate/reorder actions. */
export function LineItemsSection({
  items,
  errors,
  onFieldChange,
  onFieldBlur,
  onAdd,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: LineItemsSectionProps) {
  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">Items</legend>
      <div className="mt-4 flex flex-col gap-4">
        {items.map((item, index) => (
          <LineItemRow
            key={item.id}
            item={item}
            index={index}
            itemCount={items.length}
            errors={errors[item.id] ?? {}}
            onFieldChange={onFieldChange}
            onFieldBlur={onFieldBlur}
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
        className="mt-4 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
      >
        Add Item
      </button>
    </fieldset>
  );
}

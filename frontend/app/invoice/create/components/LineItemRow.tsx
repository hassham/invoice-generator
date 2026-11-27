import { useEffect, useId, useRef } from "react";
import type { CatalogItem } from "../../../lib/items";
import { computeLineTotals, TAX_RATE_PRESETS, UNIT_OPTIONS, type LineItem, type LineItemErrors } from "../lib/lineItems";
import { ItemPicker } from "./ItemPicker";

interface LineItemRowProps {
  item: LineItem;
  compact?: boolean;
  focusDescription?: boolean;
  index: number;
  itemCount: number;
  errors: LineItemErrors;
  catalogItems?: CatalogItem[];
  showItemPicker?: boolean;
  onFieldChange: (id: string, field: keyof LineItem, value: string) => void;
  onFieldBlur: (id: string) => void;
  onSelectCatalogItem?: (id: string, catalogItem: CatalogItem) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}

function formatCurrency(amount: number): string {
  return amount.toFixed(2);
}

/**
 * One invoice line (FSD sections 17-23). Line Total shown here is a per-line, frontend-only
 * preview figure (FSD section 28 explicitly allows this) - the authoritative invoice-wide
 * Subtotal/Tax/Total roll-up, including any invoice-level discount, is S24/IG-36's job.
 */
export function LineItemRow({
  item,
  compact = false,
  focusDescription = false,
  index,
  itemCount,
  errors,
  catalogItems = [],
  showItemPicker = false,
  onFieldChange,
  onFieldBlur,
  onSelectCatalogItem,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: LineItemRowProps) {
  const itemPickerId = useId();
  const descriptionId = useId();
  const quantityId = useId();
  const unitId = useId();
  const unitPriceId = useId();
  const taxRateId = useId();
  const customTaxRateId = useId();
  const discountId = useId();

  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (focusDescription) descriptionRef.current?.focus();
  }, [focusDescription]);

  const position = index + 1;
  const isOnlyItem = itemCount === 1;
  const totals = computeLineTotals(item);

  const change = (field: keyof LineItem) => (event: { target: { value: string } }) =>
    onFieldChange(item.id, field, event.target.value);

  return (
    <div className={compact ? "min-w-0 rounded-xl border border-border bg-canvas p-2.5 sm:p-3" : "rounded-xl border border-border bg-paper p-4"}>
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <p className="whitespace-nowrap text-sm font-semibold text-ink">Item {position}</p>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onMoveUp(item.id)}
            disabled={index === 0}
            aria-label={`Move item ${position} up`}
            className="rounded-full border-[1.5px] border-ink bg-paper px-3 py-1 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(item.id)}
            disabled={index === itemCount - 1}
            aria-label={`Move item ${position} down`}
            className="rounded-full border-[1.5px] border-ink bg-paper px-3 py-1 text-xs font-semibold text-ink hover:bg-canvas disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(item.id)}
            aria-label={`Duplicate item ${position}`}
            className="rounded-full border-[1.5px] border-ink bg-paper px-3 py-1 text-xs font-semibold text-ink hover:bg-canvas"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={isOnlyItem ? `Clear item ${position}` : `Remove item ${position}`}
            className="rounded-full border-[1.5px] border-[#991b1b] bg-paper px-3 py-1 text-xs font-semibold text-[#991b1b] hover:bg-pink"
          >
            {isOnlyItem ? "Clear" : "Remove"}
          </button>
        </div>
      </div>

      {showItemPicker ? (
        <div className="mt-3">
          <ItemPicker id={itemPickerId} items={catalogItems} onSelect={(catalogItem) => onSelectCatalogItem?.(item.id, catalogItem)} />
        </div>
      ) : null}

      <div className="mt-3 flex flex-col gap-1">
        <label htmlFor={descriptionId} className="text-sm font-semibold text-ink">
          Description<span aria-hidden="true"> *</span>
        </label>
        <textarea
          id={descriptionId}
          ref={descriptionRef}
          value={item.description}
          onChange={change("description")}
          onBlur={() => onFieldBlur(item.id)}
          rows={compact ? 1 : 2}
          maxLength={500}
          required
          aria-required="true"
          aria-invalid={errors.description ? true : undefined}
          className={
            errors.description
              ? "rounded-lg border-[1.5px] border-[#991b1b] bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              : "rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          }
        />
        {errors.description ? (
          <p role="alert" className="text-sm font-semibold text-[#991b1b]">
            {errors.description}
          </p>
        ) : null}
      </div>

      <div className={compact ? "mt-2 grid min-w-0 grid-cols-2 gap-2 [&>*]:min-w-0 sm:grid-cols-3" : "mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3"}>
        <div className="flex flex-col gap-1">
          <label htmlFor={quantityId} className="text-sm font-semibold text-ink">
            Quantity<span aria-hidden="true"> *</span>
          </label>
          <input
            id={quantityId}
            type="number"
            step="any"
            value={item.quantity}
            onChange={change("quantity")}
            onBlur={() => onFieldBlur(item.id)}
            required
            aria-required="true"
            aria-invalid={errors.quantity ? true : undefined}
            className={
              errors.quantity
                ? "rounded-lg border-[1.5px] border-[#991b1b] bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                : "rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            }
          />
          {errors.quantity ? (
            <p role="alert" className="text-sm font-semibold text-[#991b1b]">
              {errors.quantity}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={unitId} className="text-sm font-semibold text-ink">
            Unit
          </label>
          <select
            id={unitId}
            value={item.unit}
            onChange={change("unit")}
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            <option value="">—</option>
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={unitPriceId} className="text-sm font-semibold text-ink">
            Unit Price<span aria-hidden="true"> *</span>
          </label>
          <input
            id={unitPriceId}
            type="number"
            step="any"
            min={0}
            value={item.unitPrice}
            onChange={change("unitPrice")}
            onBlur={() => onFieldBlur(item.id)}
            required
            aria-required="true"
            aria-invalid={errors.unitPrice ? true : undefined}
            className={
              errors.unitPrice
                ? "rounded-lg border-[1.5px] border-[#991b1b] bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                : "rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            }
          />
          {errors.unitPrice ? (
            <p role="alert" className="text-sm font-semibold text-[#991b1b]">
              {errors.unitPrice}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={taxRateId} className="text-sm font-semibold text-ink">
            Tax Rate
          </label>
          <select
            id={taxRateId}
            value={item.taxRatePreset}
            onChange={change("taxRatePreset")}
            className="rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
          >
            {TAX_RATE_PRESETS.map((preset) => (
              <option key={preset} value={preset}>
                {preset === "custom" ? "Custom" : `${preset}%`}
              </option>
            ))}
          </select>
        </div>

        {item.taxRatePreset === "custom" ? (
          <div className="flex flex-col gap-1">
            <label htmlFor={customTaxRateId} className="text-sm font-semibold text-ink">
              Custom Tax Rate (%)<span aria-hidden="true"> *</span>
            </label>
            <input
              id={customTaxRateId}
              type="number"
              step="any"
              min={0}
              max={100}
              value={item.customTaxRate}
              onChange={change("customTaxRate")}
              onBlur={() => onFieldBlur(item.id)}
              required
              aria-required="true"
              aria-invalid={errors.customTaxRate ? true : undefined}
              className={
                errors.customTaxRate
                  ? "rounded-lg border-[1.5px] border-[#991b1b] bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                  : "rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
              }
            />
            {errors.customTaxRate ? (
              <p role="alert" className="text-sm font-semibold text-[#991b1b]">
                {errors.customTaxRate}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor={discountId} className="text-sm font-semibold text-ink">
            Discount
          </label>
          <input
            id={discountId}
            type="number"
            step="any"
            min={0}
            value={item.discount}
            onChange={change("discount")}
            onBlur={() => onFieldBlur(item.id)}
            aria-invalid={errors.discount ? true : undefined}
            className={
              errors.discount
                ? "rounded-lg border-[1.5px] border-[#991b1b] bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
                : "rounded-lg border border-border bg-paper px-3 py-2 font-sans text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink"
            }
          />
          {errors.discount ? (
            <p role="alert" className="text-sm font-semibold text-[#991b1b]">
              {errors.discount}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-right text-sm font-semibold text-ink">
        Line Total: {formatCurrency(totals.lineTotal)}
      </p>
    </div>
  );
}

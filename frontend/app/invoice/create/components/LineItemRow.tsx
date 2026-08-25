import { useId } from "react";
import { computeLineTotals, TAX_RATE_PRESETS, UNIT_OPTIONS, type LineItem, type LineItemErrors } from "../lib/lineItems";

interface LineItemRowProps {
  item: LineItem;
  index: number;
  itemCount: number;
  errors: LineItemErrors;
  onFieldChange: (id: string, field: keyof LineItem, value: string) => void;
  onFieldBlur: (id: string) => void;
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
  index,
  itemCount,
  errors,
  onFieldChange,
  onFieldBlur,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onRemove,
}: LineItemRowProps) {
  const descriptionId = useId();
  const quantityId = useId();
  const unitId = useId();
  const unitPriceId = useId();
  const taxRateId = useId();
  const customTaxRateId = useId();
  const discountId = useId();

  const position = index + 1;
  const isOnlyItem = itemCount === 1;
  const totals = computeLineTotals(item);

  const change = (field: keyof LineItem) => (event: { target: { value: string } }) =>
    onFieldChange(item.id, field, event.target.value);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-700">Item {position}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onMoveUp(item.id)}
            disabled={index === 0}
            aria-label={`Move item ${position} up`}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={() => onMoveDown(item.id)}
            disabled={index === itemCount - 1}
            aria-label={`Move item ${position} down`}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 disabled:opacity-40"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={() => onDuplicate(item.id)}
            aria-label={`Duplicate item ${position}`}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label={isOnlyItem ? `Clear item ${position}` : `Remove item ${position}`}
            className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
          >
            {isOnlyItem ? "Clear" : "Remove"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <label htmlFor={descriptionId} className="text-sm font-medium text-slate-700">
          Description<span aria-hidden="true"> *</span>
        </label>
        <textarea
          id={descriptionId}
          value={item.description}
          onChange={change("description")}
          onBlur={() => onFieldBlur(item.id)}
          rows={2}
          maxLength={500}
          required
          aria-required="true"
          aria-invalid={errors.description ? true : undefined}
          className={
            errors.description
              ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
              : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
          }
        />
        {errors.description ? (
          <p role="alert" className="text-sm text-red-600">
            {errors.description}
          </p>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor={quantityId} className="text-sm font-medium text-slate-700">
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
                ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
                : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            }
          />
          {errors.quantity ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.quantity}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={unitId} className="text-sm font-medium text-slate-700">
            Unit
          </label>
          <select
            id={unitId}
            value={item.unit}
            onChange={change("unit")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
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
          <label htmlFor={unitPriceId} className="text-sm font-medium text-slate-700">
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
                ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
                : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            }
          />
          {errors.unitPrice ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.unitPrice}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor={taxRateId} className="text-sm font-medium text-slate-700">
            Tax Rate
          </label>
          <select
            id={taxRateId}
            value={item.taxRatePreset}
            onChange={change("taxRatePreset")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
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
            <label htmlFor={customTaxRateId} className="text-sm font-medium text-slate-700">
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
                  ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
                  : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
              }
            />
            {errors.customTaxRate ? (
              <p role="alert" className="text-sm text-red-600">
                {errors.customTaxRate}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <label htmlFor={discountId} className="text-sm font-medium text-slate-700">
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
                ? "rounded-md border border-red-500 px-3 py-2 text-sm text-slate-950"
                : "rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
            }
          />
          {errors.discount ? (
            <p role="alert" className="text-sm text-red-600">
              {errors.discount}
            </p>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-right text-sm font-semibold text-slate-950">
        Line Total: {formatCurrency(totals.lineTotal)}
      </p>
    </div>
  );
}

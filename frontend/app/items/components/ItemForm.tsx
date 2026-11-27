"use client";

import { useState, type FormEvent } from "react";
import { RecordFormActions, RecordFormLayout, RecordFormPreview, RecordFormSection } from "../../components/ui/WorkspaceRecordForm";
import type { CatalogItemRequest } from "../../lib/items";

export interface ItemFormValues {
  name: string;
  description: string;
  sku: string;
  unit: string;
  unitPrice: string;
  taxRate: string;
}

export const emptyItemFormValues: ItemFormValues = {
  name: "",
  description: "",
  sku: "",
  unit: "",
  unitPrice: "",
  taxRate: "",
};

function toRequest(values: ItemFormValues): CatalogItemRequest {
  const trimmedOrNull = (value: string) => (value.trim() === "" ? null : value.trim());
  const parsedUnitPrice = Number.parseFloat(values.unitPrice);
  const parsedTaxRate = values.taxRate.trim() === "" ? null : Number.parseFloat(values.taxRate);

  return {
    name: values.name.trim(),
    description: trimmedOrNull(values.description),
    sku: trimmedOrNull(values.sku),
    unit: trimmedOrNull(values.unit),
    unitPrice: Number.isFinite(parsedUnitPrice) ? parsedUnitPrice : 0,
    taxRate: parsedTaxRate !== null && Number.isFinite(parsedTaxRate) ? parsedTaxRate : null,
  };
}

interface ItemFormProps {
  initialValues?: ItemFormValues;
  isNew?: boolean;
  submitting: boolean;
  submitLabel: string;
  error: string | null;
  onSubmit: (request: CatalogItemRequest) => void;
}

/** FSD section 60: Name, Description, SKU, Unit, Unit Price, Tax Rate - only Name and Unit Price
 * are required (CatalogItemRequestValidator enforces the same server-side). */
export function ItemForm({ initialValues = emptyItemFormValues, isNew = false, submitting, submitLabel, error, onSubmit }: ItemFormProps) {
  const [values, setValues] = useState<ItemFormValues>(initialValues);
  const [nameError, setNameError] = useState<string | null>(null);

  const setField = (field: keyof ItemFormValues) => (event: { target: { value: string } }) => {
    setValues((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (values.name.trim() === "") {
      setNameError("Name is required.");
      return;
    }
    setNameError(null);

    onSubmit(toRequest(values));
  };

  const previewPrice = Number.parseFloat(values.unitPrice);
  return (
    <RecordFormLayout kind="item" preview={isNew ? (
      <RecordFormPreview kind="item" title={values.name.trim() || "Your item name"}>
        <p>{values.description.trim() || "A short description helps customers recognise the charge."}</p>
        {Number.isFinite(previewPrice) ? <p className="mt-2 font-mono font-bold">
          {previewPrice.toFixed(2)}{values.unit.trim() ? " / " + values.unit.trim() : ""}
        </p> : null}
      </RecordFormPreview>
    ) : undefined}>
      <form onSubmit={handleSubmit}>
        {error || nameError ? <p role="alert" className="record-form-error">{nameError ?? error}</p> : null}
        <RecordFormSection number="01" title="Item details" description="Give the product or service the name you want to use on invoices.">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField id="item-name" label="Name" value={values.name} onChange={setField("name")} />
            <TextField id="item-sku" label="SKU" value={values.sku} onChange={setField("sku")} />
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label htmlFor="item-description" className="text-sm text-ink">Description</label>
              <textarea id="item-description" value={values.description} onChange={setField("description")} rows={3}
                className="workspace-field min-h-11 rounded-lg border px-3 py-2 text-sm text-ink" />
            </div>
          </div>
        </RecordFormSection>
        <RecordFormSection number="02" title="Pricing and tax" description="Set a default price. You can still change it on an individual invoice.">
          <div className="grid gap-4 sm:grid-cols-3">
            <TextField id="item-unit" label="Unit" value={values.unit} onChange={setField("unit")} />
            <TextField id="item-unit-price" label="Unit Price" type="number" value={values.unitPrice} onChange={setField("unitPrice")} />
            <TextField id="item-tax-rate" label="Tax Rate (%)" type="number" value={values.taxRate} onChange={setField("taxRate")} />
          </div>
        </RecordFormSection>
        <RecordFormActions pending={submitting} label={submitLabel} cancelHref={isNew ? "/items" : undefined} />
      </form>
    </RecordFormLayout>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (event: { target: { value: string } }) => void;
}

function TextField({ id, label, value, type = "text", onChange }: TextFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onChange={onChange}
        className="workspace-field min-h-11 rounded-lg border border-border px-3 py-2 text-sm text-ink"
      />
    </div>
  );
}

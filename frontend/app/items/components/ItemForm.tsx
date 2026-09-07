"use client";

import { useState, type FormEvent } from "react";
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
  submitting: boolean;
  submitLabel: string;
  error: string | null;
  onSubmit: (request: CatalogItemRequest) => void;
}

/** FSD section 60: Name, Description, SKU, Unit, Unit Price, Tax Rate - only Name and Unit Price
 * are required (CatalogItemRequestValidator enforces the same server-side). */
export function ItemForm({ initialValues = emptyItemFormValues, submitting, submitLabel, error, onSubmit }: ItemFormProps) {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {nameError ? (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {nameError}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="item-name" label="Name" value={values.name} onChange={setField("name")} />
        <TextField id="item-sku" label="SKU" value={values.sku} onChange={setField("sku")} />
        <TextField id="item-unit" label="Unit" value={values.unit} onChange={setField("unit")} />
        <TextField id="item-unit-price" label="Unit Price" type="number" value={values.unitPrice} onChange={setField("unitPrice")} />
        <TextField id="item-tax-rate" label="Tax Rate (%)" type="number" value={values.taxRate} onChange={setField("taxRate")} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="item-description" className="text-sm font-medium text-slate-700">
          Description
        </label>
        <textarea
          id="item-description"
          value={values.description}
          onChange={setField("description")}
          rows={4}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {submitting ? "Saving…" : submitLabel}
      </button>
    </form>
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
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
      />
    </div>
  );
}

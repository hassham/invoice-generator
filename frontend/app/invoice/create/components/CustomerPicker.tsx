"use client";

import { useState } from "react";
import type { Customer } from "../../../lib/customers";
import { customerDisplayContact, customerDisplayName, filterCustomers, MIN_SEARCH_LENGTH } from "../lib/customerPicker";

interface CustomerPickerProps {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
}

/**
 * IG-56 / FSD section 16 (Registered Customer Lookup). Sits above the free-text Bill To field
 * rather than replacing it (IG-193's structured-to-free-text simplification stays intact) -
 * selecting a match fills that field with a formatted block instead. `customers` is the
 * account's full active list, fetched once by the caller and filtered here client-side (a
 * reasonable choice at this app's expected small-business scale - see IG-56's Jira claim
 * comment); a real server-side search endpoint is the follow-up if that stops holding.
 */
export function CustomerPicker({ customers, onSelect }: CustomerPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const matches = filterCustomers(customers, query);
  const showDropdown = isOpen && query.trim().length >= MIN_SEARCH_LENGTH;

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor="customer-picker-search" className="text-sm font-medium text-slate-700">
        Search saved customers
      </label>
      <input
        id="customer-picker-search"
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        // A short delay so a click on a dropdown item (onMouseDown below) still registers before
        // blur closes the list - onMouseDown fires first, but onBlur would otherwise unmount the
        // button before its own click event completes.
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder="Start typing a customer name…"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
      />
      {showDropdown ? (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matching customers.</p>
          ) : (
            <ul>
              {matches.map((customer) => (
                <li key={customer.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(customer);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-950">{customerDisplayName(customer)}</span>
                    {customerDisplayContact(customer) ? <span className="ml-2 text-slate-500">{customerDisplayContact(customer)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

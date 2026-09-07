"use client";

import { useState } from "react";
import type { CatalogItem } from "../../../lib/items";
import { filterCatalogItems, MIN_SEARCH_LENGTH } from "../lib/itemPicker";

interface ItemPickerProps {
  id: string;
  items: CatalogItem[];
  onSelect: (item: CatalogItem) => void;
}

/**
 * IG-58 / FSD section 25 (Item Catalogue Lookup). One picker per line item (unlike CustomerPicker,
 * which appears once above Bill To) - each line can be populated from a different catalogue item.
 * `items` is the account's full active list, fetched once by the caller and filtered here
 * client-side, same reasonable-at-this-scale choice CustomerPicker already made for IG-56.
 */
export function ItemPicker({ id, items, onSelect }: ItemPickerProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const matches = filterCatalogItems(items, query);
  const showDropdown = isOpen && query.trim().length >= MIN_SEARCH_LENGTH;

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        Search saved items
      </label>
      <input
        id={id}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        // Same short delay as CustomerPicker: a click on a dropdown item (onMouseDown below) must
        // still register before blur closes the list.
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        placeholder="Start typing an item name…"
        className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-950"
      />
      {showDropdown ? (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-slate-200 bg-white shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-500">No matching items.</p>
          ) : (
            <ul>
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onMouseDown={(event) => {
                      event.preventDefault();
                      handleSelect(item);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-slate-50"
                  >
                    <span className="font-medium text-slate-950">{item.name}</span>
                    <span className="ml-2 text-slate-500">{item.unitPrice.toFixed(2)}</span>
                    {item.unit ? <span className="ml-2 text-slate-500">{item.unit}</span> : null}
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

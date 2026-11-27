"use client";

import { useRef, useState } from "react";
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const matches = filterCatalogItems(items, query);
  const showDropdown = isOpen && query.trim().length >= MIN_SEARCH_LENGTH;

  const handleSelect = (item: CatalogItem) => {
    onSelect(item);
    inputRef.current?.focus();
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div
      className="relative"
      // IG-69: closes the dropdown only when focus actually leaves this whole picker, not on
      // every blur - a plain input-level onBlur+setTimeout closed the list ~150ms after a
      // keyboard Tab into one of its own buttons, unmounting the very button that had just
      // received focus and dropping a keyboard user back to <body> with no way to select an
      // item at all. relatedTarget tells us where focus is actually going.
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <label htmlFor={id} className="text-sm font-medium text-ink">
        Search saved items
      </label>
      <input
        id={id}
        ref={inputRef}
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Start typing an item name…"
        className="workspace-field mt-1 w-full rounded-md border border-border px-3 py-2 text-sm text-ink"
      />
      {showDropdown ? (
        <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-paper shadow-lg">
          {matches.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted">No matching items.</p>
          ) : (
            <ul>
              {matches.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    // preventDefault on mousedown keeps the input from losing focus before the
                    // click completes; the actual selection happens onClick so this also fires
                    // for keyboard activation (Enter/Space), not just a mouse click.
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleSelect(item)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-canvas"
                  >
                    <span className="font-medium text-ink">{item.name}</span>
                    <span className="ml-2 text-muted">{item.unitPrice.toFixed(2)}</span>
                    {item.unit ? <span className="ml-2 text-muted">{item.unit}</span> : null}
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

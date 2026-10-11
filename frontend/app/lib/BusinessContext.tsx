"use client";

import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from "react";
import { readSelectedBusinessId, SELECTED_BUSINESS_STORAGE_KEY } from "./business";

interface BusinessContextType {
  selectedBusinessId: string | null;
  selectBusiness: (businessId: string) => void;
  clearSelection: () => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

// IG-295: the selection lives in localStorage, read through useSyncExternalStore rather than a
// useState initializer. The server has no localStorage, so the first client render must match the
// server's null; the stored id then arrives without a hydration mismatch.
const listeners = new Set<() => void>();

function writeStoredBusinessId(businessId: string | null) {
  try {
    if (businessId === null) {
      window.localStorage.removeItem(SELECTED_BUSINESS_STORAGE_KEY);
    } else {
      window.localStorage.setItem(SELECTED_BUSINESS_STORAGE_KEY, businessId);
    }
  } catch {
    // Storage can be blocked (private mode, disabled site data). The selection still applies for
    // this page view; it just won't survive a reload.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getServerSnapshot(): string | null {
  return null;
}

export function BusinessProvider({ children }: { children: ReactNode }) {
  const selectedBusinessId = useSyncExternalStore(subscribe, readSelectedBusinessId, getServerSnapshot);

  const selectBusiness = useCallback((businessId: string) => writeStoredBusinessId(businessId), []);
  const clearSelection = useCallback(() => writeStoredBusinessId(null), []);

  return (
    <BusinessContext.Provider value={{ selectedBusinessId, selectBusiness, clearSelection }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useSelectedBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error("useSelectedBusiness must be used within BusinessProvider");
  }
  return context;
}

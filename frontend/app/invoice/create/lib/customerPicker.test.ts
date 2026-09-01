import { describe, expect, it } from "vitest";
import type { Customer } from "../../../lib/customers";
import { customerDisplayContact, customerDisplayName, filterCustomers, formatCustomerForBillTo } from "./customerPicker";

function makeCustomer(overrides: Partial<Customer> = {}): Customer {
  return {
    id: "c1",
    businessName: "Acme Pty Ltd",
    contactName: "Jamie Lee",
    email: "billing@acme.example",
    phone: null,
    addressLine1: "1 Main St",
    addressLine2: null,
    city: "Sydney",
    state: "NSW",
    postalCode: "2000",
    country: "AU",
    taxNumber: null,
    notes: null,
    isArchived: false,
    createdAt: "2026-08-01T00:00:00Z",
    updatedAt: "2026-08-01T00:00:00Z",
    ...overrides,
  };
}

describe("customerDisplayName", () => {
  it("prefers the business name", () => {
    expect(customerDisplayName(makeCustomer())).toBe("Acme Pty Ltd");
  });

  it("falls back to the contact name when there is no business name", () => {
    expect(customerDisplayName(makeCustomer({ businessName: null }))).toBe("Jamie Lee");
  });

  it("falls back to a placeholder when neither is set", () => {
    expect(customerDisplayName(makeCustomer({ businessName: null, contactName: null }))).toBe("(unnamed)");
  });
});

describe("customerDisplayContact", () => {
  it("shows the contact name alongside a business name", () => {
    expect(customerDisplayContact(makeCustomer())).toBe("Jamie Lee");
  });

  it("is empty when the contact name is already shown as the primary name", () => {
    expect(customerDisplayContact(makeCustomer({ businessName: null }))).toBe("");
  });
});

describe("filterCustomers", () => {
  const customers = [makeCustomer({ id: "c1", businessName: "Acme Pty Ltd", contactName: "Jamie Lee" }), makeCustomer({ id: "c2", businessName: "Beta Co", contactName: "Sam Rivera" })];

  it("returns nothing for fewer than 2 characters", () => {
    expect(filterCustomers(customers, "a")).toEqual([]);
    expect(filterCustomers(customers, "")).toEqual([]);
  });

  it("matches by business name, case-insensitively", () => {
    expect(filterCustomers(customers, "acme")).toEqual([customers[0]]);
  });

  it("matches by contact name", () => {
    expect(filterCustomers(customers, "sam")).toEqual([customers[1]]);
  });

  it("returns an empty array when nothing matches", () => {
    expect(filterCustomers(customers, "zephyr")).toEqual([]);
  });
});

describe("formatCustomerForBillTo", () => {
  it("formats a fully-populated customer as a multi-line block", () => {
    const result = formatCustomerForBillTo(makeCustomer({ taxNumber: "ABN 123" }));

    expect(result).toBe("Acme Pty Ltd\nJamie Lee\n1 Main St\nSydney, NSW, 2000\nAU\nTax Number: ABN 123");
  });

  it("omits blank fields rather than leaving empty lines", () => {
    const result = formatCustomerForBillTo(
      makeCustomer({ contactName: null, addressLine1: null, city: null, state: null, postalCode: null, country: null }),
    );

    expect(result).toBe("Acme Pty Ltd");
  });
});

import type { Customer } from "../../../lib/customers";

/** FSD section 16: "Search begins after 2 characters." */
export const MIN_SEARCH_LENGTH = 2;

export function customerDisplayName(customer: Customer): string {
  return customer.businessName ?? customer.contactName ?? "(unnamed)";
}

/** Avoids repeating the same value in both the name and contact slots when Contact Name is the
 * only name on file - customerDisplayName already shows it as the customer's name in that case. */
export function customerDisplayContact(customer: Customer): string {
  return customer.businessName ? (customer.contactName ?? "") : "";
}

/** FSD section 16: "Dropdown should display: Customer name, Contact" - matched against both. */
export function filterCustomers(customers: Customer[], query: string): Customer[] {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length < MIN_SEARCH_LENGTH) {
    return [];
  }
  return customers.filter((customer) => {
    const name = customerDisplayName(customer).toLowerCase();
    const contact = (customer.contactName ?? "").toLowerCase();
    return name.includes(trimmed) || contact.includes(trimmed);
  });
}

function joinNonEmpty(parts: (string | null | undefined)[], separator: string): string {
  return parts.filter((part): part is string => Boolean(part && part.trim().length > 0)).join(separator);
}

/**
 * IG-56: formats a saved customer into the same kind of free-text block a user would type by hand
 * into Bill To (IG-193's simplification) - business name, contact, address, tax number, one line
 * each - rather than reintroducing structured fields this app deliberately moved away from.
 */
export function formatCustomerForBillTo(customer: Customer): string {
  const lines: string[] = [];
  if (customer.businessName) {
    lines.push(customer.businessName);
  }
  if (customer.contactName) {
    lines.push(customer.contactName);
  }
  if (customer.addressLine1) {
    lines.push(customer.addressLine1);
  }
  if (customer.addressLine2) {
    lines.push(customer.addressLine2);
  }
  const cityStatePostal = joinNonEmpty([customer.city, customer.state, customer.postalCode], ", ");
  if (cityStatePostal) {
    lines.push(cityStatePostal);
  }
  if (customer.country) {
    lines.push(customer.country);
  }
  if (customer.taxNumber) {
    lines.push(`Tax Number: ${customer.taxNumber}`);
  }
  return lines.join("\n");
}

import type { BusinessProfile } from "../../../lib/business";

function joinNonEmpty(parts: (string | null | undefined)[], separator: string): string {
  return parts.filter((part): part is string => Boolean(part && part.trim().length > 0)).join(separator);
}

/**
 * IG-51: formats the account's business profile (IG-53) into the same kind of free-text block a
 * user would type by hand into From (IG-193's simplification) - mirrors
 * customerPicker.ts's formatCustomerForBillTo, one line each.
 */
export function formatBusinessProfileForSeller(profile: BusinessProfile): string {
  const lines: string[] = [profile.businessName];
  if (profile.legalName && profile.legalName !== profile.businessName) {
    lines.push(profile.legalName);
  }
  if (profile.addressLine1) {
    lines.push(profile.addressLine1);
  }
  if (profile.addressLine2) {
    lines.push(profile.addressLine2);
  }
  const cityStatePostal = joinNonEmpty([profile.city, profile.state, profile.postalCode], ", ");
  if (cityStatePostal) {
    lines.push(cityStatePostal);
  }
  if (profile.country) {
    lines.push(profile.country);
  }
  if (profile.email) {
    lines.push(profile.email);
  }
  if (profile.phone) {
    lines.push(profile.phone);
  }
  if (profile.website) {
    lines.push(profile.website);
  }
  if (profile.taxNumber) {
    lines.push(`Tax Number: ${profile.taxNumber}`);
  }
  if (profile.registrationNumber) {
    lines.push(`Registration Number: ${profile.registrationNumber}`);
  }
  return lines.join("\n");
}

import { describe, expect, it } from "vitest";
import { CUSTOMER_FIELDS, HEADER_FIELDS, SELLER_FIELDS, validateField, type FieldConfig } from "./fields";

const textField: FieldConfig = { name: "sample", label: "Sample", maxLength: 5 };
const requiredField: FieldConfig = { name: "sample", label: "Sample", required: true, maxLength: 5 };
const emailField: FieldConfig = { name: "email", label: "Email", maxLength: 320, type: "email" };
const urlField: FieldConfig = { name: "website", label: "Website", maxLength: 300, type: "url" };

describe("validateField", () => {
  it("accepts an empty value for an optional field", () => {
    expect(validateField("", textField)).toBeUndefined();
  });

  it("rejects an empty value for a required field", () => {
    expect(validateField("", requiredField)).toBe("Sample is required.");
  });

  it("rejects a value made of only whitespace for a required field", () => {
    expect(validateField("   ", requiredField)).toBe("Sample is required.");
  });

  it("accepts a value within maxLength", () => {
    expect(validateField("abcde", textField)).toBeUndefined();
  });

  it("rejects a value longer than maxLength", () => {
    expect(validateField("abcdef", textField)).toBe("Sample must be 5 characters or fewer.");
  });

  it("accepts a valid email address", () => {
    expect(validateField("person@example.com", emailField)).toBeUndefined();
  });

  it("rejects a malformed email address", () => {
    expect(validateField("not-an-email", emailField)).toBe("Enter a valid email address.");
  });

  it("accepts a valid http(s) URL", () => {
    expect(validateField("https://example.com", urlField)).toBeUndefined();
  });

  it("rejects a malformed website value", () => {
    expect(validateField("example dot com", urlField)).toBe(
      "Enter a valid website address (starting with http:// or https://).",
    );
  });
});

describe("field configs", () => {
  it("HEADER_FIELDS matches FSD section 12 (invoice number, issue date, due date, reference)", () => {
    expect(HEADER_FIELDS.map((field) => field.name)).toEqual([
      "invoiceNumber",
      "issueDate",
      "dueDate",
      "reference",
    ]);
  });

  it("only Business Name and Country are required in SELLER_FIELDS", () => {
    const required = SELLER_FIELDS.filter((field) => field.required).map((field) => field.name);
    expect(required).toEqual(["businessName", "country"]);
  });

  it("only Business/Customer Name is required in CUSTOMER_FIELDS - FSD section 15", () => {
    const required = CUSTOMER_FIELDS.filter((field) => field.required).map((field) => field.name);
    expect(required).toEqual(["customerName"]);
  });

  it("CUSTOMER_FIELDS has no website or registration number - FSD section 15 omits them", () => {
    const names = CUSTOMER_FIELDS.map((field) => field.name);
    expect(names).not.toContain("website");
    expect(names).not.toContain("registrationNumber");
  });
});

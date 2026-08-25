import { describe, expect, it } from "vitest";
import {
  ADVANCED_HEADER_FIELD_NAMES,
  BILL_TO_FIELD,
  FROM_FIELD,
  HEADER_FIELDS,
  SHIP_TO_FIELD,
  validateField,
  type FieldConfig,
} from "./fields";

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

  it("ADVANCED_HEADER_FIELD_NAMES only hides Due Date and Reference behind the Advanced toggle", () => {
    expect(ADVANCED_HEADER_FIELD_NAMES).toEqual(["dueDate", "reference"]);
  });

  it("FROM_FIELD and BILL_TO_FIELD are required free-text blocks", () => {
    expect(FROM_FIELD).toMatchObject({ name: "seller", label: "From", required: true, maxLength: 1000 });
    expect(BILL_TO_FIELD).toMatchObject({ name: "customer", label: "Bill To", required: true, maxLength: 1000 });
  });

  it("SHIP_TO_FIELD is an optional free-text block", () => {
    expect(SHIP_TO_FIELD).toMatchObject({ name: "shipTo", label: "Ship To", maxLength: 1000 });
    expect(SHIP_TO_FIELD.required).toBeFalsy();
  });
});

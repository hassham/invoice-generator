import { describe, expect, it } from "vitest";
import { paymentInstructionsFromBusiness } from "./supportingContent";

describe("paymentInstructionsFromBusiness", () => {
  it("maps the business bank details onto the invoice's payment instruction fields", () => {
    expect(
      paymentInstructionsFromBusiness({
        bankName: "Example Bank",
        bankAccountName: "Acme Pty Ltd",
        bankRoutingCode: "062-000",
        bankAccountNumber: "12345678",
      })
    ).toEqual({
      bankName: "Example Bank",
      accountName: "Acme Pty Ltd",
      bsb: "062-000",
      accountNumber: "12345678",
    });
  });

  it("leaves blank fields empty rather than writing null into the invoice", () => {
    expect(paymentInstructionsFromBusiness({ bankName: null, bankAccountName: null, bankRoutingCode: null, bankAccountNumber: null })).toEqual({
      bankName: "",
      accountName: "",
      bsb: "",
      accountNumber: "",
    });
  });
});

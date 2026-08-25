import {
  CUSTOM_INSTRUCTIONS_FIELD,
  NOTES_FIELD,
  PAYMENT_INSTRUCTION_FIELDS,
  type SupportingContentErrors,
  type SupportingContentValues,
} from "../lib/supportingContent";
import { PartyDetailsSection } from "./PartyDetailsSection";
import { TextAreaField } from "./TextAreaField";

interface SupportingContentSectionProps {
  values: SupportingContentValues;
  errors: SupportingContentErrors;
  onFieldChange: (name: string, value: string) => void;
  onFieldBlur: (name: string) => void;
  onPaymentInstructionChange: (name: string, value: string) => void;
  onPaymentInstructionBlur: (name: string) => void;
}

/**
 * FSD sections 30, 32: Notes and Payment Instructions. Terms and Conditions (FSD section 31) is
 * rendered separately, inline in CreateInvoiceEditor's Basic view - IG-193 moved this section
 * (Notes/Payment Instructions/Custom Instructions) behind the Advanced toggle as supplementary
 * content, but Terms stays visible by default since it's commonly filled.
 */
export function SupportingContentSection({
  values,
  errors,
  onFieldChange,
  onFieldBlur,
  onPaymentInstructionChange,
  onPaymentInstructionBlur,
}: SupportingContentSectionProps) {
  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">Notes, payment instructions &amp; custom instructions</legend>

      <div className="mt-4 flex flex-col gap-4">
        <TextAreaField field={NOTES_FIELD} value={values.notes} error={errors.notes} onChange={onFieldChange} onBlur={onFieldBlur} />
      </div>

      <PartyDetailsSection
        title="Payment instructions"
        fields={PAYMENT_INSTRUCTION_FIELDS}
        values={values.paymentInstructions}
        errors={errors.paymentInstructions}
        onFieldChange={onPaymentInstructionChange}
        onFieldBlur={onPaymentInstructionBlur}
      />
      <div className="mt-4">
        <TextAreaField
          field={CUSTOM_INSTRUCTIONS_FIELD}
          value={values.customInstructions}
          error={errors.customInstructions}
          onChange={onFieldChange}
          onBlur={onFieldBlur}
        />
      </div>
    </fieldset>
  );
}

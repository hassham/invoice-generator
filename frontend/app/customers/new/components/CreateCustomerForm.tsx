"use client";

import { useState } from "react";
import { createCustomer, type CustomerRequest } from "../../../lib/customers";
import { CustomerForm } from "../../components/CustomerForm";

/** FSD section 56 (/customers/new). Redirects to the new customer's own detail page on success,
 * matching Customer Details being the natural next screen after creation. */
export function CreateCustomerForm() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (request: CustomerRequest) => {
    setSubmitting(true);
    setError(null);

    try {
      const customer = await createCustomer(request);
      window.location.href = `/customers/${customer.id}`;
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create this customer.");
      setSubmitting(false);
    }
  };

  return <CustomerForm submitting={submitting} submitLabel="Create customer" error={error} onSubmit={handleSubmit} />;
}

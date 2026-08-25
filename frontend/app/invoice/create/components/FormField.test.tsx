import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { validateField, type FieldConfig } from "../lib/fields";
import { FormField } from "./FormField";

const requiredField: FieldConfig = { name: "businessName", label: "Business Name", required: true, maxLength: 200 };

function ControlledFormField({ field = requiredField }: { field?: FieldConfig }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  return (
    <FormField
      field={field}
      value={value}
      error={error}
      onChange={(_name, next) => setValue(next)}
      onBlur={() => setError(validateField(value, field))}
    />
  );
}

describe("FormField", () => {
  it("renders a label marked required", () => {
    render(<ControlledFormField />);

    expect(screen.getByLabelText(/Business Name/)).toBeInTheDocument();
  });

  it("shows no error before the field has been touched", () => {
    render(<ControlledFormField />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a field-level error after blurring an empty required field", async () => {
    const user = userEvent.setup();
    render(<ControlledFormField />);

    await user.click(screen.getByLabelText(/Business Name/));
    await user.tab();

    expect(screen.getByRole("alert")).toHaveTextContent("Business Name is required.");
  });

  it("keeps the typed value visible even while it's invalid", async () => {
    // A too-long value can't be used here - the input's own maxLength attribute would stop
    // user.type() from ever entering more characters than allowed, so format is the only way to
    // reach an invalid-but-non-empty state through real typing.
    const user = userEvent.setup();
    const emailField: FieldConfig = { name: "email", label: "Email", maxLength: 320, type: "email" };
    render(<ControlledFormField field={emailField} />);

    await user.type(screen.getByLabelText("Email"), "not-an-email");
    await user.tab();

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("not-an-email");
  });

  it("marks the input aria-invalid only once an error is shown", async () => {
    const user = userEvent.setup();
    render(<ControlledFormField />);

    const input = screen.getByLabelText(/Business Name/);
    expect(input).not.toHaveAttribute("aria-invalid");

    await user.click(input);
    await user.tab();

    expect(input).toHaveAttribute("aria-invalid", "true");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { validateField, type FieldConfig } from "../lib/fields";
import { TextAreaField } from "./TextAreaField";

const notesField: FieldConfig = { name: "notes", label: "Notes", maxLength: 20 };

function ControlledTextAreaField({ field = notesField }: { field?: FieldConfig }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | undefined>();

  return (
    <TextAreaField
      field={field}
      value={value}
      error={error}
      onChange={(_name, next) => setValue(next)}
      onBlur={() => setError(validateField(value, field))}
    />
  );
}

describe("TextAreaField", () => {
  it("renders a labelled textarea", () => {
    render(<ControlledTextAreaField />);

    expect(screen.getByLabelText("Notes")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes").tagName).toBe("TEXTAREA");
  });

  it("shows no error for an empty optional field", async () => {
    const user = userEvent.setup();
    render(<ControlledTextAreaField />);

    await user.click(screen.getByLabelText("Notes"));
    await user.tab();

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("preserves typed content across multiple lines", async () => {
    const user = userEvent.setup();
    render(<ControlledTextAreaField field={{ name: "notes", label: "Notes", maxLength: 200 }} />);

    await user.type(screen.getByLabelText("Notes"), "Thank you{enter}Please pay promptly.");

    expect(screen.getByLabelText("Notes")).toHaveValue("Thank you\nPlease pay promptly.");
  });
});

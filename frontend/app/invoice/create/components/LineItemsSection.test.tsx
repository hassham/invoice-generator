import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import {
  cloneLineItem,
  createEmptyLineItem,
  validateLineItems,
  type LineItem,
  type LineItemErrors,
} from "../lib/lineItems";
import { LineItemsSection } from "./LineItemsSection";

function StatefulLineItemsSection() {
  const [items, setItems] = useState<LineItem[]>(() => [createEmptyLineItem()]);
  const [errors, setErrors] = useState<Record<string, LineItemErrors>>({});

  return (
    <LineItemsSection
      items={items}
      currency="AUD"
      errors={errors}
      onFieldChange={(id, field, value) => {
        setItems((current) => current.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
      }}
      onFieldBlur={() => setErrors(validateLineItems(items))}
      onAdd={() => setItems((current) => [...current, createEmptyLineItem()])}
      onMoveUp={(id) => {
        setItems((current) => {
          const index = current.findIndex((item) => item.id === id);
          if (index <= 0) return current;
          const next = [...current];
          [next[index - 1], next[index]] = [next[index], next[index - 1]];
          return next;
        });
      }}
      onMoveDown={(id) => {
        setItems((current) => {
          const index = current.findIndex((item) => item.id === id);
          if (index === -1 || index >= current.length - 1) return current;
          const next = [...current];
          [next[index], next[index + 1]] = [next[index + 1], next[index]];
          return next;
        });
      }}
      onDuplicate={(id) => {
        setItems((current) => {
          const index = current.findIndex((item) => item.id === id);
          if (index === -1) return current;
          const duplicate = cloneLineItem(current[index]);
          return [...current.slice(0, index + 1), duplicate, ...current.slice(index + 1)];
        });
      }}
      onRemove={(id) => {
        setItems((current) => {
          if (current.length === 1) return [createEmptyLineItem()];
          return current.filter((item) => item.id !== id);
        });
      }}
    />
  );
}

describe("LineItemsSection", () => {
  it("starts with exactly one item row", () => {
    render(<StatefulLineItemsSection />);

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(1);
  });

  it("Add Item appends a new row", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(2);
  });

  it("clears the last remaining row instead of removing it - FSD section 24", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.click(screen.getByRole("button", { name: "Clear item 1" }));

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(1);
    expect(screen.getByLabelText("Description", { exact: false })).toHaveValue("");
  });

  it("removes a row when more than one exists", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.click(screen.getByRole("button", { name: "Add Item" }));
    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(2);

    await user.click(screen.getByRole("button", { name: "Remove item 2" }));

    expect(screen.getAllByText(/^Item \d+$/)).toHaveLength(1);
  });

  it("duplicates a row's values into a new row directly after it", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    const descriptions = () => screen.getAllByLabelText("Description", { exact: false });
    await user.type(descriptions()[0], "Consulting");
    await user.click(screen.getByRole("button", { name: "Duplicate item 1" }));

    const afterDuplicate = descriptions();
    expect(afterDuplicate).toHaveLength(2);
    expect(afterDuplicate[0]).toHaveValue("Consulting");
    expect(afterDuplicate[1]).toHaveValue("Consulting");
  });

  it("moves a row up and down, preserving its values", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.type(screen.getAllByLabelText("Description", { exact: false })[0], "First");
    await user.click(screen.getByRole("button", { name: "Add Item" }));
    await user.type(screen.getAllByLabelText("Description", { exact: false })[1], "Second");

    await user.click(screen.getByRole("button", { name: "Move item 2 up" }));

    const afterMove = screen.getAllByLabelText("Description", { exact: false });
    expect(afterMove[0]).toHaveValue("Second");
    expect(afterMove[1]).toHaveValue("First");
  });

  it("disables Move Up on the first row and Move Down on the last row", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.click(screen.getByRole("button", { name: "Add Item" }));

    expect(screen.getByRole("button", { name: "Move item 1 up" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move item 2 down" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Move item 1 down" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Move item 2 up" })).not.toBeDisabled();
  });

  it("shows a field-level error for a missing description after blur", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.click(screen.getByLabelText("Description", { exact: false }));
    await user.tab();

    expect(screen.getByText("Description is required.")).toBeInTheDocument();
  });

  it("computes and displays the line total for a filled-in row", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.type(screen.getByLabelText("Description", { exact: false }), "Consulting");
    await user.clear(screen.getByLabelText(/Quantity/));
    await user.type(screen.getByLabelText(/Quantity/), "2");
    await user.type(screen.getByLabelText(/Unit Price/), "50");

    // Default tax rate is 10% (AU GST): 2 x 50 = 100, + 10% tax = 110.
    expect(screen.getByText("Line Total: 110.00")).toBeInTheDocument();
  });

  it("shows the items subtotal with the invoice's currency code", async () => {
    const user = userEvent.setup();
    render(<StatefulLineItemsSection />);

    await user.type(screen.getByLabelText(/Unit Price/), "100");

    expect(screen.getByText(/AUD 110\.00/)).toBeInTheDocument();
  });
});

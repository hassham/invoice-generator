import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { processLogoUpload } from "../lib/logoUpload";
import { LogoUpload } from "./LogoUpload";

vi.mock("../lib/logoUpload", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/logoUpload")>()),
  processLogoUpload: vi.fn(),
}));

const mockedProcessLogoUpload = vi.mocked(processLogoUpload);

function makeFile(name = "logo.png") {
  return new File([new Uint8Array([1, 2, 3])], name, { type: "image/png" });
}

describe("LogoUpload", () => {
  it("calls onLogoChange with the resulting data URL when upload succeeds", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ dataUrl: "data:image/png;base64,abc" });
    const onLogoChange = vi.fn();
    render(<LogoUpload logo={null} onLogoChange={onLogoChange} />);

    await user.upload(screen.getByLabelText("Upload logo"), makeFile());

    expect(onLogoChange).toHaveBeenCalledWith("data:image/png;base64,abc");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the error message and does not call onLogoChange when upload fails validation", async () => {
    const user = userEvent.setup();
    mockedProcessLogoUpload.mockResolvedValue({ error: "Logo must be 5 MB or smaller." });
    const onLogoChange = vi.fn();
    render(<LogoUpload logo={null} onLogoChange={onLogoChange} />);

    await user.upload(screen.getByLabelText("Upload logo"), makeFile());

    expect(screen.getByRole("alert")).toHaveTextContent("Logo must be 5 MB or smaller.");
    expect(onLogoChange).not.toHaveBeenCalled();
  });

  it("shows a thumbnail and 'Remove logo' button only when a logo is set", () => {
    const { rerender } = render(<LogoUpload logo={null} onLogoChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Remove logo" })).not.toBeInTheDocument();
    expect(screen.queryByAltText("Business logo preview")).not.toBeInTheDocument();

    rerender(<LogoUpload logo="data:image/png;base64,abc" onLogoChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Remove logo" })).toBeInTheDocument();
    expect(screen.getByAltText("Business logo preview")).toHaveAttribute("src", "data:image/png;base64,abc");
  });

  it("clicking 'Remove logo' calls onLogoChange(null)", async () => {
    const user = userEvent.setup();
    const onLogoChange = vi.fn();
    render(<LogoUpload logo="data:image/png;base64,abc" onLogoChange={onLogoChange} />);

    await user.click(screen.getByRole("button", { name: "Remove logo" }));

    expect(onLogoChange).toHaveBeenCalledWith(null);
  });
});

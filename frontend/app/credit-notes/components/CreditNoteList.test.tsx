import { render, screen, waitFor } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCreditNotePdf, type CreditNote } from "../../lib/creditNotes";
import { CreditNoteList } from "./CreditNoteList";

vi.mock("../../lib/creditNotes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../lib/creditNotes")>()),
  downloadCreditNotePdf: vi.fn(),
  deleteCreditNote: vi.fn(),
}));

const mockedDownload = vi.mocked(downloadCreditNotePdf);

const creditNote: CreditNote = {
  id: "cn-1",
  invoiceId: "inv-1",
  customerId: "cus-1",
  creditNoteNumber: "CN-abc203008010001",
  issueDate: "2030-08-01",
  reason: "Returned goods",
  currency: "AUD",
  amount: 40,
  notes: "Two units",
  createdAt: "2030-08-01T00:00:00Z",
};

describe("CreditNoteList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an empty state when there are no credit notes", () => {
    render(<CreditNoteList businessId="biz-1" creditNotes={[]} onCreditNoteDeleted={vi.fn()} />);

    expect(screen.getByText("No credit notes yet")).toBeInTheDocument();
  });

  it("shows the number, reason and amount", () => {
    render(<CreditNoteList businessId="biz-1" creditNotes={[creditNote]} onCreditNoteDeleted={vi.fn()} />);

    expect(screen.getByText("CN-abc203008010001")).toBeInTheDocument();
    expect(screen.getByText("Returned goods")).toBeInTheDocument();
    expect(screen.getByText("40.00 AUD")).toBeInTheDocument();
  });

  // IG-308 / IG-234 AC 1: the credit note has to be downloadable as a document at all.
  it("downloads the credit note as a PDF", async () => {
    mockedDownload.mockResolvedValue();
    const user = userEvent.setup();

    render(<CreditNoteList businessId="biz-1" creditNotes={[creditNote]} onCreditNoteDeleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => {
      expect(mockedDownload).toHaveBeenCalledWith("biz-1", "cn-1", "CN-abc203008010001");
    });
  });

  it("surfaces a failed download instead of failing silently", async () => {
    mockedDownload.mockRejectedValue(new Error("Failed to download this credit note."));
    const user = userEvent.setup();

    render(<CreditNoteList businessId="biz-1" creditNotes={[creditNote]} onCreditNoteDeleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));

    expect(await screen.findByText("Failed to download this credit note.")).toBeInTheDocument();
  });

  it("re-enables the download button once a failed attempt finishes", async () => {
    mockedDownload.mockRejectedValue(new Error("Failed to download this credit note."));
    const user = userEvent.setup();

    render(<CreditNoteList businessId="biz-1" creditNotes={[creditNote]} onCreditNoteDeleted={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Download PDF" }));
    await screen.findByText("Failed to download this credit note.");

    expect(screen.getByRole("button", { name: "Download PDF" })).toBeEnabled();
  });

  it("downloads only the credit note whose button was pressed", async () => {
    mockedDownload.mockResolvedValue();
    const second: CreditNote = { ...creditNote, id: "cn-2", creditNoteNumber: "CN-abc203008010002" };
    const user = userEvent.setup();

    render(
      <CreditNoteList businessId="biz-1" creditNotes={[creditNote, second]} onCreditNoteDeleted={vi.fn()} />
    );
    await user.click(screen.getAllByRole("button", { name: "Download PDF" })[1]);

    await waitFor(() => {
      expect(mockedDownload).toHaveBeenCalledWith("biz-1", "cn-2", "CN-abc203008010002");
    });
    expect(mockedDownload).toHaveBeenCalledTimes(1);
  });
});

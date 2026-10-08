"use client";

import { useState } from "react";
import { CreditNote, deleteCreditNote, downloadCreditNotePdf } from "../../lib/creditNotes";

interface CreditNoteListProps {
  businessId: string;
  creditNotes: CreditNote[];
  onCreditNoteDeleted: () => void;
}

export function CreditNoteList({
  businessId,
  creditNotes,
  onCreditNoteDeleted,
}: CreditNoteListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);

  // IG-308: the credit note renders through the shared document engine, labelled "Credit Note".
  const handleDownload = async (note: CreditNote) => {
    try {
      setDownloading(note.id);
      setError(null);
      await downloadCreditNotePdf(businessId, note.id, note.creditNoteNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download this credit note.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (creditNoteId: string) => {
    try {
      setActionLoading(creditNoteId);
      setError(null);
      await deleteCreditNote(businessId, creditNoteId);
      setConfirmDelete(null);
      onCreditNoteDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete credit note");
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (creditNotes.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No credit notes yet</p>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 mb-4">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {creditNotes.map((note) => (
          <div
            key={note.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{note.creditNoteNumber}</h3>
                <p className="text-sm text-gray-500 mt-1">{note.reason}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {note.amount.toFixed(2)} {note.currency}
                </p>
                <p className="text-sm text-gray-500">{formatDate(note.issueDate)}</p>
              </div>
            </div>

            {note.notes && (
              <div className="mb-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
                <p className="font-medium text-gray-700 mb-1">Notes</p>
                <p>{note.notes}</p>
              </div>
            )}

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => handleDownload(note)}
                disabled={downloading === note.id}
                className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded-md hover:bg-gray-100 disabled:opacity-50"
              >
                {downloading === note.id ? "Preparing…" : "Download PDF"}
              </button>

              <div className="relative flex-1">
                <button
                  onClick={() =>
                    setConfirmDelete(confirmDelete === note.id ? null : note.id)
                  }
                  className="w-full px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  Delete
                </button>

                {confirmDelete === note.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-48">
                    <p className="text-sm text-gray-900 font-medium mb-2">
                      Delete this credit note permanently?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(note.id)}
                        disabled={actionLoading === note.id}
                        className="flex-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === note.id ? "Deleting..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="flex-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                      >
                        Keep
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

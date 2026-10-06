"use client";

import { useState } from "react";
import { Receipt, deleteReceipt, downloadReceiptPdf } from "../../lib/receipts";

interface ReceiptListProps {
  businessId: string;
  receipts: Receipt[];
  onReceiptDeleted: () => void;
}

export function ReceiptList({ businessId, receipts, onReceiptDeleted }: ReceiptListProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [downloadLoading, setDownloadLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleDownload = async (receipt: Receipt) => {
    try {
      setDownloadLoading(receipt.id);
      setError(null);
      await downloadReceiptPdf(businessId, receipt.id, receipt.receiptNumber);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download receipt");
    } finally {
      setDownloadLoading(null);
    }
  };

  const handleDelete = async (receiptId: string) => {
    try {
      setActionLoading(receiptId);
      setError(null);
      await deleteReceipt(businessId, receiptId);
      setConfirmDelete(null);
      onReceiptDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete receipt");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      {error && <div className="rounded-md bg-red-50 p-4 text-sm text-red-800 mb-4">{error}</div>}

      <div className="space-y-4">
        {receipts.map((receipt) => (
          <div
            key={receipt.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-gray-300"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{receipt.receiptNumber}</h3>
                <p className="text-sm text-gray-500 mt-1">Invoice {receipt.invoiceNumber}</p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  {receipt.amount.toFixed(2)} {receipt.currency}
                </p>
                <p className="text-sm text-gray-500">{receipt.paymentMethod}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <p className="text-gray-500">Payment Date</p>
                <p className="text-gray-900">{receipt.paymentDate}</p>
              </div>
              <div>
                <p className="text-gray-500">Receipt Date</p>
                <p className="text-gray-900">{receipt.issueDate}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <button
                onClick={() => handleDownload(receipt)}
                disabled={downloadLoading === receipt.id}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 disabled:opacity-50"
              >
                {downloadLoading === receipt.id ? "Downloading..." : "Download PDF"}
              </button>

              <div className="relative">
                <button
                  onClick={() => setConfirmDelete(confirmDelete === receipt.id ? null : receipt.id)}
                  className="px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  Delete
                </button>

                {confirmDelete === receipt.id && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-48">
                    <p className="text-sm text-gray-900 font-medium mb-2">
                      Delete this receipt permanently?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(receipt.id)}
                        disabled={actionLoading === receipt.id}
                        className="flex-1 px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                      >
                        {actionLoading === receipt.id ? "Deleting..." : "Delete"}
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

import type { ReactNode } from "react";
import { cn } from "./cn";

/**
 * IG-327: financial data table (docs/BRANDINGGUIDELINES.md section 14). Text is left-aligned, amounts
 * are right-aligned with tabular numerals, and the caption names the table for screen readers.
 */
export interface DataTableColumn<Row> {
  key: string;
  header: string;
  /** Right-align monetary and numeric columns so comparable amounts line up. */
  align?: "left" | "right";
  render: (row: Row) => ReactNode;
}

export interface DataTableProps<Row> {
  caption: string;
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<Row>({ caption, columns, rows, getRowKey, emptyMessage = "Nothing to show yet.", className }: DataTableProps<Row>) {
  return (
    <div className={cn("overflow-x-auto rounded-xl border border-border bg-paper", className)}>
      <table className="w-full border-collapse font-sans text-sm text-ink">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn("px-4 py-3", column.align === "right" && "text-right")}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-6 text-center text-muted">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowKey(row)} className="border-b border-border last:border-b-0 hover:bg-canvas">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn("px-4 py-3", column.align === "right" && "text-right tabular-nums font-mono")}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

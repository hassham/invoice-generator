/**
 * IG-275: triggers a browser download for an exported report.
 *
 * Every report view had its own copy of this object-URL dance, and adding a PDF button to each of
 * them would have doubled that to eight. The CSV handlers now call this too, so there is one place
 * where the temporary URL is revoked - the earlier copies each revoked their own, but a future one
 * that forgot would leak the blob for the lifetime of the document.
 */
export function downloadExport(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

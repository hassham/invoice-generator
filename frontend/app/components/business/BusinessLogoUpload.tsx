"use client";

import { useId, useState, type ChangeEvent } from "react";
import { ACCEPTED_LOGO_TYPES, processLogoUpload } from "../../invoice/create/lib/logoUpload";
import { removeBusinessLogo, resolveLogoUrl, uploadBusinessLogo, type BusinessProfile } from "../../lib/business";

/** The resize step (processLogoUpload) produces a data URL; the upload endpoint needs a Blob.
 * Decoded by hand (not via fetch(dataUrl)) since jsdom's fetch doesn't reliably support the
 * data: scheme, unlike a real browser. */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/data:(.*);base64/)?.[1] ?? "application/octet-stream";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

interface BusinessLogoUploadProps {
  logoUrl: string | null;
  onChange: (profile: BusinessProfile) => void;
}

/**
 * FSD section 14 (Business Logo). Reuses the exact validation/resize rules already built for the
 * per-invoice logo (IG-42, invoice/create/lib/logoUpload.ts) - same accepted types, same 5MB cap,
 * same magic-byte signature check, same 600px max-width resize - but uploads the result to the
 * real, persisted business profile (IG-52) instead of holding it in local draft state, since
 * server-side storage now exists (IBusinessLogoStorage).
 */
export function BusinessLogoUpload({ logoUrl, onChange }: BusinessLogoUploadProps) {
  const inputId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input value so choosing the exact same file again still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }

    setBusy(true);
    setError(undefined);

    const result = await processLogoUpload(file);
    if ("error" in result) {
      setError(result.error);
      setBusy(false);
      return;
    }

    try {
      const profile = await uploadBusinessLogo(dataUrlToBlob(result.dataUrl), file.name);
      onChange(profile);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload your logo.");
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async () => {
    setBusy(true);
    setError(undefined);
    try {
      const profile = await removeBusinessLogo();
      onChange(profile);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "Failed to remove your logo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="text-base font-semibold text-slate-950">Logo</legend>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          // next/image needs a static import or a configured loader - this is a server-served but
          // per-account URL, which next/image can't optimize meaningfully anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={resolveLogoUrl(logoUrl)} alt="Business logo" className="h-12 w-auto rounded border border-slate-200 object-contain" />
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {logoUrl ? "Replace logo" : "Upload logo"}
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_LOGO_TYPES.join(",")}
            onChange={handleFileChange}
            disabled={busy}
            className="text-sm text-slate-700"
          />
        </div>
        {logoUrl ? (
          <button
            type="button"
            onClick={handleRemove}
            disabled={busy}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700 disabled:opacity-50"
          >
            Remove logo
          </button>
        ) : null}
      </div>
      {busy ? <p className="text-sm text-slate-500">Uploading…</p> : null}
      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

import { useId, useState, type ChangeEvent } from "react";
import { ACCEPTED_LOGO_TYPES, processLogoUpload } from "../lib/logoUpload";

interface LogoUploadProps {
  logo: string | null;
  onLogoChange: (dataUrl: string | null) => void;
}

/**
 * FSD section 14 (Business Logo). Owns only local "uploading"/error UI state - the resulting data
 * URL itself lives in CreateInvoiceEditor's draft state, same as every other field.
 */
export function LogoUpload({ logo, onLogoChange }: LogoUploadProps) {
  const inputId = useId();
  const [error, setError] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input value so choosing the exact same file again still fires onChange.
    event.target.value = "";
    if (!file) {
      return;
    }
    setUploading(true);
    setError(undefined);
    const result = await processLogoUpload(file);
    setUploading(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onLogoChange(result.dataUrl);
  };

  const handleRemove = () => {
    setError(undefined);
    onLogoChange(null);
  };

  return (
    <fieldset className="mt-6 border-t border-slate-200 pt-6">
      <legend className="text-base font-semibold text-slate-950">Logo</legend>
      <div className="mt-4 flex items-center gap-4">
        {logo ? (
          // next/image needs a static import or a configured loader - this is an arbitrary,
          // client-generated data URL (lib/logoUpload.ts), which next/image can't optimize anyway.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt="Business logo preview" className="h-12 w-auto rounded border border-slate-200 object-contain" />
        ) : null}
        <div className="flex flex-col gap-1">
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {logo ? "Replace logo" : "Upload logo"}
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_LOGO_TYPES.join(",")}
            onChange={handleFileChange}
            className="text-sm text-slate-700"
          />
        </div>
        {logo ? (
          <button
            type="button"
            onClick={handleRemove}
            className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
          >
            Remove logo
          </button>
        ) : null}
      </div>
      {uploading ? <p className="mt-2 text-sm text-slate-500">Processing…</p> : null}
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

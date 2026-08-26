/** FSD section 14: Business Logo. */
export const ACCEPTED_LOGO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_LOGO_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const MAX_LOGO_DISPLAY_WIDTH = 600;

/**
 * IG-42 scope decision: uploads are validated/resized entirely client-side and held as a data URL
 * in draft state - nothing in this app persists anything server-side yet (no save-invoice
 * endpoint, no authenticated business context wired into the anonymous-capable /invoice/create
 * flow), so real server-side storage is deferred until that exists, same as every other field in
 * this editor.
 */

export function computeResizedDimensions(
  naturalWidth: number,
  naturalHeight: number,
  maxWidth: number,
): { width: number; height: number } {
  if (naturalWidth <= maxWidth) {
    return { width: naturalWidth, height: naturalHeight };
  }
  const scale = maxWidth / naturalWidth;
  return { width: maxWidth, height: Math.round(naturalHeight * scale) };
}

const JPEG_SIGNATURE = [0xff, 0xd8, 0xff];
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47];
const RIFF_SIGNATURE = [0x52, 0x49, 0x46, 0x46];
const WEBP_SIGNATURE_OFFSET = [0x57, 0x45, 0x42, 0x50];

function matchesSignature(bytes: Uint8Array, signature: number[], offset = 0): boolean {
  return signature.every((byte, index) => bytes[offset + index] === byte);
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (matchesSignature(bytes, JPEG_SIGNATURE)) {
    return true;
  }
  if (matchesSignature(bytes, PNG_SIGNATURE)) {
    return true;
  }
  // WEBP files are a RIFF container: "RIFF" at byte 0, size at bytes 4-7, "WEBP" at byte 8.
  if (matchesSignature(bytes, RIFF_SIGNATURE) && matchesSignature(bytes, WEBP_SIGNATURE_OFFSET, 8)) {
    return true;
  }
  return false;
}

/**
 * FSD section 14: "Must be valid image," "Reject executable or renamed files." Checking the
 * file's own byte signature (not just its MIME type, which a renamed executable can freely claim)
 * is what actually satisfies the "renamed files" half of that requirement.
 */
export async function validateLogoFile(file: File): Promise<string | undefined> {
  if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
    return "Logo must be a JPG, PNG, or WEBP image.";
  }
  if (file.size > MAX_LOGO_FILE_SIZE_BYTES) {
    return "Logo must be 5 MB or smaller.";
  }
  if (!(await hasValidImageSignature(file))) {
    return "This file doesn't look like a valid image.";
  }
  return undefined;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not read image."));
    image.src = src;
  });
}

/** FSD section 14: "Resize for display if required... Recommended output: Maximum width 600px." */
export async function resizeImageToDataUrl(file: File, maxWidth: number): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const { width, height } = computeResizedDimensions(image.naturalWidth, image.naturalHeight, maxWidth);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas is not supported in this browser.");
    }
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL(file.type);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export type LogoUploadResult = { dataUrl: string } | { error: string };

export async function processLogoUpload(file: File): Promise<LogoUploadResult> {
  const validationError = await validateLogoFile(file);
  if (validationError) {
    return { error: validationError };
  }
  try {
    const dataUrl = await resizeImageToDataUrl(file, MAX_LOGO_DISPLAY_WIDTH);
    return { dataUrl };
  } catch {
    return { error: "Something went wrong reading this image. Please try another file." };
  }
}

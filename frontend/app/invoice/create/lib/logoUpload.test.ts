import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ACCEPTED_LOGO_TYPES,
  computeResizedDimensions,
  MAX_LOGO_FILE_SIZE_BYTES,
  resizeImageToDataUrl,
  validateLogoFile,
} from "./logoUpload";

function bytesFile(bytes: number[], type: string, name = "file"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const JPEG_BYTES = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0];
const PNG_BYTES = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0];
const WEBP_BYTES = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50];
const EXE_BYTES = [0x4d, 0x5a, 0x90, 0, 0, 0, 0, 0, 0, 0, 0, 0]; // "MZ" DOS header

describe("computeResizedDimensions", () => {
  it("passes through an image already at or under the max width", () => {
    expect(computeResizedDimensions(400, 200, 600)).toEqual({ width: 400, height: 200 });
    expect(computeResizedDimensions(600, 300, 600)).toEqual({ width: 600, height: 300 });
  });

  it("scales down proportionally when wider than the max width", () => {
    expect(computeResizedDimensions(1200, 600, 600)).toEqual({ width: 600, height: 300 });
    expect(computeResizedDimensions(900, 300, 600)).toEqual({ width: 600, height: 200 });
  });
});

describe("validateLogoFile", () => {
  it("accepts a real JPEG", async () => {
    expect(ACCEPTED_LOGO_TYPES).toContain("image/jpeg");
    await expect(validateLogoFile(bytesFile(JPEG_BYTES, "image/jpeg"))).resolves.toBeUndefined();
  });

  it("accepts a real PNG", async () => {
    await expect(validateLogoFile(bytesFile(PNG_BYTES, "image/png"))).resolves.toBeUndefined();
  });

  it("accepts a real WEBP", async () => {
    await expect(validateLogoFile(bytesFile(WEBP_BYTES, "image/webp"))).resolves.toBeUndefined();
  });

  it("rejects an unsupported MIME type", async () => {
    await expect(validateLogoFile(bytesFile(PNG_BYTES, "image/gif"))).resolves.toBe("Logo must be a JPG, PNG, or WEBP image.");
  });

  it("rejects a file larger than the maximum size", async () => {
    const bigFile = new File([new Uint8Array(MAX_LOGO_FILE_SIZE_BYTES + 1)], "big.png", { type: "image/png" });
    await expect(validateLogoFile(bigFile)).resolves.toBe("Logo must be 5 MB or smaller.");
  });

  it("rejects a renamed executable claiming to be a PNG - MIME type alone is not trusted", async () => {
    await expect(validateLogoFile(bytesFile(EXE_BYTES, "image/png", "totally-a-logo.png"))).resolves.toBe(
      "This file doesn't look like a valid image.",
    );
  });
});

describe("resizeImageToDataUrl", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("draws the resized image onto a canvas and returns a data URL", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:mock"), revokeObjectURL: vi.fn() });

    class MockImage {
      naturalWidth = 1200;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        // Simulate the image finishing "load" asynchronously, like a real Image element.
        queueMicrotask(() => this.onload?.());
      }
    }
    vi.stubGlobal("Image", MockImage);

    const drawImage = vi.fn();
    const toDataURL = vi.fn(() => "data:image/png;base64,mock");
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockImplementation(toDataURL);

    const file = bytesFile(PNG_BYTES, "image/png");
    const dataUrl = await resizeImageToDataUrl(file, 600);

    expect(dataUrl).toBe("data:image/png;base64,mock");
    expect(drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 600, 300);
  });
});

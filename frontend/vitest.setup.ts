import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  // jsdom's localStorage persists across tests within the same file (it's the same global Storage
  // instance) - without this, one test's IG-29 draft auto-save would leak into and get restored by
  // the next test that mounts CreateInvoiceEditor.
  localStorage.clear();
});

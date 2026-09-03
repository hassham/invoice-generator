import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.tsx", "**/*.test.ts"],
    // Empirically re-verified 2026-09-03 (audit follow-up, not a fresh guess): fixed a real
    // fake-timer leak in CreateInvoiceEditor.test.tsx first (one test's vi.useFakeTimers() had no
    // guaranteed vi.useRealTimers() cleanup), then measured directly. At the 5000ms default, a
    // full `npm test -- --run` reliably failed 7-9 tests every time (3/3 runs) - all timeouts
    // under real CPU contention across CreateInvoiceEditor.test.tsx and other userEvent-heavy
    // files, not fake-timer corruption (confirming IG-37's original "suite-wide timing
    // characteristic, not a bug in any one test" diagnosis still holds even with that bug fixed).
    // 10000ms passed 484/484 cleanly across 5 consecutive full-suite runs. Kept at 10000ms rather
    // than the previous 15000ms - if this needs raising again, re-run this same measurement
    // rather than assuming.
    testTimeout: 10000,
  },
});

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.tsx", "**/*.test.ts"],
    // Default 5000ms is occasionally too tight for userEvent-heavy tests once the suite runs all
    // test files in parallel (observed during IG-37: a test typing into several fields flaked
    // under CPU contention, and re-runs showed the same 5s ceiling being hit in unrelated,
    // untouched tests too - a suite-wide timing characteristic, not a bug in any one test).
    testTimeout: 15000,
  },
});

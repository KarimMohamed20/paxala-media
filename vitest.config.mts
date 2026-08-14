import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the Playground security boundary and op pipeline.
 *
 * Scope is deliberately narrow: pure functions and query-shape assertions, with
 * no database and no React. Everything here is an invariant that `tsc --noEmit`,
 * `next build` and `eslint` cannot see — a dropped WHERE term type-checks
 * perfectly and fails in front of a client.
 *
 * `.mts` rather than `.ts` so Vite's native config loader reads it as ESM; a
 * plain `.ts` config is loaded as CommonJS here (package.json has no
 * `"type": "module"`) and warns on every run.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

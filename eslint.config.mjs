import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),

  // ---------------------------------------------------------------------
  // PMP Playground: keep the Client Mode boundary enforceable.
  //
  // Client Mode is guaranteed by clientNodeWhere() and the allowlist
  // clientNodeSelect in src/lib/playground/client-scope.ts, applied by
  // src/lib/playground/repo.ts. That guarantee only holds while repo.ts is the
  // single door into Playground data — one `db.playgroundNode.findMany()` in a
  // route handler is enough to put a client's eyes on internal work.
  //
  // This is a lint rule rather than a code review convention because the repo
  // has already shipped a leak of exactly this class once: see migration
  // 20260811000000_add_folder_client_owner, where a missing WHERE term surfaced
  // one client's folder names inside another client's Asset Library.
  // ---------------------------------------------------------------------
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/playground/repo.ts",
      "src/lib/playground/seq.ts",
      // Publishing and op application legitimately write Playground rows inside
      // transactions; both are reviewed as part of the security boundary.
      "src/lib/playground/ops.ts",
      "src/lib/playground/publish.ts",
    ],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          // Matches db.playgroundNode, tx.playgroundEvent, and every sibling.
          selector:
            "MemberExpression[object.name=/^(db|tx)$/][property.name=/^playground/]",
          message:
            "Playground tables must be accessed through src/lib/playground/repo.ts, which applies the Client Mode filter (clientNodeWhere / clientNodeSelect). Add a function there instead of querying db.playground* directly.",
        },
      ],
    },
  },

  // The AI provider holds the server-side API key. Keep it out of anything that
  // could be bundled for the browser: only route handlers and server-side lib
  // code may import it. `server-only` is not installed in this project, so this
  // rule is the guard.
  {
    files: ["src/components/**/*.{ts,tsx}", "src/app/**/page.tsx", "src/app/**/layout.tsx"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/playground/ai/*", "@/lib/playground/ai"],
              message:
                "The PAX AI provider runs server-side only and holds the API key. Call the /api/playground/rooms/[roomId]/ai route instead of importing it.",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;

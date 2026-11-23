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
    // Generated test output
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    // Vendored Stageshow kit (MIT, see kit/LICENSE). Kept as upstream ships it.
    "src/components/explainer/kit/**",
  ]),
]);

export default eslintConfig;

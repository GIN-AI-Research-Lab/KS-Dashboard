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
    // Standalone CommonJS Node scripts invoked directly by Claude Code hooks
    // (`node script.js`), not part of the Next.js/TypeScript app.
    "claude-code-plugin/**",
    // The desktop widget is a self-contained Tauri app with its own toolchain,
    // tsconfig and node_modules -- not part of the Next.js build.
    "widget/**",
  ]),
]);

export default eslintConfig;

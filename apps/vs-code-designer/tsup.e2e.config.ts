import { defineConfig } from "tsup";
import type { Options } from "tsup";

const e2eConfig: Options = {
  entry: ["src/test/**/*.ts"],
  format: ["cjs"], // Changed to CommonJS for Mocha compatibility
  splitting: false,
  sourcemap: true,
  clean: false,
  external: [
    // VS Code related
    "vscode",
    // Core Node modules
    "path",
    "fs",
    "url",
    "util",
    "os",
    "assert",
    "process",
    "module",
    // Test related
    "glob",
    "mocha",
  ],
  keepNames: true,
  outDir: "dist/e2e",
};

export default defineConfig(e2eConfig);

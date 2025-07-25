import { defineProject } from "vitest/config";
import packageJson from "./package.json";
import path from "path";

// This config is for unit tests only
// E2E tests are now run using Mocha
export default defineProject({
  plugins: [],
  resolve: {
    alias: {
      vscode: path.resolve(
        path.join(__dirname, "node_modules", "@types", "vscode", "index.d.ts")
      ),
    },
  },
  test: {
    name: packageJson.name,
    environment: "node",
    globals: true,
    restoreMocks: true,
  },
});

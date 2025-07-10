import * as assert from "assert";
import * as vscode from "vscode";
import { logicAppsStandardExtensionId } from "../../constants";

// Using Mocha TDD style - these functions are globally available in Mocha test context

suite("Extension Test Suite", () => {
  setup(() => {
    console.log("Running E2E tests with VS Code API version:", vscode.version);
    console.log(
      "VS Code extensions API available:",
      typeof vscode.extensions !== "undefined"
    );
  });

  teardown(() => {
    console.log("All tests done!");
  });

  test("Sample test", () => {
    assert.strictEqual([1, 2, 3].indexOf(5), -1);
    assert.strictEqual([1, 2, 3].indexOf(1), 0);
  });

  test("VS Code API should be available", () => {
    // This test verifies that the VS Code API is available
    assert.ok(vscode, "vscode should be defined");
    assert.strictEqual(
      typeof vscode.window,
      "object",
      "vscode.window should be an object"
    );
    assert.strictEqual(
      typeof vscode.workspace,
      "object",
      "vscode.workspace should be an object"
    );
  });

  test("Extension is loaded", () => {
    // Check if our extension is loaded
    console.log("Extensions count:", vscode.extensions.all.length);
    console.log("Looking for extension ID:", logicAppsStandardExtensionId);

    const extension = vscode.extensions.getExtension(
      logicAppsStandardExtensionId
    );
    assert.ok(extension, "Extension should be loaded");
  });
});

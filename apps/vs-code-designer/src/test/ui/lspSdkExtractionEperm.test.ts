/// <reference types="mocha" />

import * as assert from 'assert';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { NotificationType, VSBrowser, Workbench } from 'vscode-extension-tester';
import { sleep, waitForQuickInputReady } from './helpers';

const validateDependenciesCommand = 'Azure Logic Apps: Validate and install dependency binaries';

describe('LSP SDK extraction EPERM repro', function () {
  this.timeout(180000);

  let workbench: Workbench;
  let depsRoot: string;
  let principal: string;
  let aclDenied = false;

  before(async function () {
    if (process.platform !== 'win32') {
      this.skip();
    }

    depsRoot = process.env.LA_E2E_LSP_EPERM_DEPS_ROOT ?? '';
    assert.ok(depsRoot, 'LA_E2E_LSP_EPERM_DEPS_ROOT must be set by E2E_MODE=lspeperm');
    assert.ok(fs.existsSync(depsRoot), `Isolated dependency root must exist: ${depsRoot}`);

    const userName = process.env.USERNAME;
    const userDomain = process.env.USERDOMAIN;
    assert.ok(userName, 'USERNAME must be set for icacls ACL mutation');
    principal = userDomain ? `${userDomain}\\${userName}` : userName;

    workbench = new Workbench();
    await VSBrowser.instance.driver.sleep(3000);
  });

  afterEach(() => {
    restoreCreateDirectoryPermission();
  });

  it('reproduces real Windows EPERM when LSPServer cannot be created', async () => {
    const lspServerPath = path.join(depsRoot, 'LSPServer');
    const lspServerDllPath = path.join(lspServerPath, 'SdkLspServer.dll');
    fs.rmSync(lspServerPath, { recursive: true, force: true, maxRetries: 3, retryDelay: 1000 });
    fs.rmSync(path.join(depsRoot, '.lspserver-hash'), { force: true });

    denyCreateDirectoryPermission();

    await waitForQuickInputReady(workbench, VSBrowser.instance.driver);
    await workbench.executeCommand(validateDependenciesCommand);

    await waitForDependencyFailureNotification();

    assert.ok(!fs.existsSync(lspServerDllPath), `LSP server DLL should not exist while directory creation is denied: ${lspServerDllPath}`);
  });

  function denyCreateDirectoryPermission(): void {
    execFileSync('icacls', [depsRoot, '/deny', `${principal}:(AD)`], { stdio: 'pipe' });
    aclDenied = true;
    assertDirectoryCreationDenied();
  }

  function restoreCreateDirectoryPermission(): void {
    if (!aclDenied) {
      return;
    }

    try {
      execFileSync('icacls', [depsRoot, '/remove:d', principal], { stdio: 'pipe' });
    } finally {
      aclDenied = false;
    }
  }

  function assertDirectoryCreationDenied(): void {
    const probePath = path.join(depsRoot, `acl-probe-${Date.now()}`);
    try {
      fs.mkdirSync(probePath);
      fs.rmSync(probePath, { recursive: true, force: true });
      assert.fail(`Expected create-directory permission to be denied under ${depsRoot}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      assert.match(message, /EPERM|EACCES|permission|access/i, `Expected ACL denial, got: ${message}`);
    }
  }

  async function waitForDependencyFailureNotification(): Promise<void> {
    const deadline = Date.now() + 120000;
    let lastNotificationText = '';
    while (Date.now() < deadline) {
      const notifications = await workbench.getNotifications().catch(() => []);
      for (const notification of notifications) {
        const [type, message] = await Promise.all([
          notification.getType().catch(() => undefined),
          notification.getMessage().catch(() => ''),
        ]);
        if (message) {
          lastNotificationText = message;
        }
        if (
          type === NotificationType.Error &&
          /Validation and Installation of Runtime Dependencies|Runtime Dependencies encountered an error|Error extracting LSP server:.*EPERM.*LSPServer/i.test(
            message
          )
        ) {
          console.log(`[lspeperm] Observed dependency failure notification: ${message}`);
          return;
        }
      }
      await sleep(1000);
    }

    assert.fail(`Timed out waiting for dependency failure notification. Last notification: ${lastNotificationText || '<none>'}`);
  }
});

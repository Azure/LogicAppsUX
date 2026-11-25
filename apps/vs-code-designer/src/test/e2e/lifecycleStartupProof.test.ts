import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Additive verification label, not a canonical inventory lane. It starts the
// real extension and, when the prior host used a runtime, observes a real
// management endpoint on the prior owner-retained workspace. No Azure creation.
suite('Actual subsequent Logic Apps startup', () => {
  test('Records healthy startup in a separate native invocation', async function () {
    this.timeout(120_000);
    const extension = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
    assert.ok(extension);
    await extension.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(
      commands.some((command) => command.startsWith('azureLogicAppsStandard.')),
      'Real Logic Apps commands were not registered'
    );
    const directory = process.env.LA_E2E_LIFECYCLE_DIR;
    const domain = process.env.LA_E2E_LIFECYCLE_STARTUP_DOMAIN;
    assert.ok(
      directory && (domain === 'extension-host' || domain === 'design-time'),
      'Verifier requires its owner-provided startup domain'
    );
    const deadline = Date.now() + 90_000;
    let startupError = '';
    while (Date.now() < deadline) {
      for (const file of fs.readdirSync(directory).filter((entry) => entry.endsWith('.observer.jsonl'))) {
        const records = fs
          .readFileSync(path.join(directory, file), 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line) as { kind: string; domain?: string; verified?: boolean; reason?: string });
        startupError = [...records].reverse().find((record) => record.kind === 'startup-error')?.reason ?? startupError;
        if (records.some((record) => record.kind === 'startup' && record.domain === domain && record.verified === true)) {
          return;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Actual subsequent ${domain} startup was not observed: ${startupError || 'current owned startup receipt unavailable'}`);
  });
});

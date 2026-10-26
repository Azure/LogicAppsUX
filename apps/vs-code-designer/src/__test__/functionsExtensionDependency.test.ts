import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.unmock('fs');

const functionsExtensionId = 'ms-azuretools.vscode-azurefunctions';

function readJson(relativePath: string): any {
  const sourcePath = path.resolve(__dirname, '..', relativePath);
  return JSON.parse(fs.readFileSync(sourcePath, 'utf-8'));
}

describe('Azure Functions extension dependency', () => {
  it('is not an extension dependency', () => {
    const packageJson = readJson('package.json');

    expect(packageJson.extensionDependencies).not.toContain(functionsExtensionId);
  });

  it('is not installed by the generic Dev Container template', () => {
    const devContainer = readJson(path.join('assets', 'ContainerTemplates', 'devcontainer.json'));

    expect(devContainer.customizations.vscode.extensions).not.toContain(functionsExtensionId);
  });
});

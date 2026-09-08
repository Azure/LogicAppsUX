import { describe, expect, it, vi } from 'vitest';
import * as path from 'path';

vi.unmock('fs');
import * as fs from 'fs';

describe('Logic App project command visibility', () => {
  const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const explorerContext: Array<{ command: string; when?: string }> = packageJson.contributes.menus['explorer/context'];
  const expectedWhen = 'azureLogicAppsStandard.hasProject && resourcePath in azureLogicAppsStandard.logicAppProjectPaths';

  it.each([
    'azureLogicAppsStandard.deploy',
    'azureLogicAppsStandard.generateDeploymentScripts',
    'azureLogicAppsStandard.createWorkflow',
    'azureLogicAppsStandard.switchToDotnetProject',
    'azureLogicAppsStandard.switchDebugMode',
    'azureLogicAppsStandard.useSQLStorage',
  ])('limits %s to discovered Logic App project roots', (command) => {
    const entry = explorerContext.find((item) => item.command === command);

    expect(entry).toBeDefined();
    expect(entry?.when).toBe(expectedWhen);
  });

  it('limits addCustomCode to eligible discovered Logic App project roots', () => {
    const entry = explorerContext.find((item) => item.command === 'azureLogicAppsStandard.addCustomCode');

    expect(entry?.when).toBe(
      'azureLogicAppsStandard.hasProject && resourcePath in azureLogicAppsStandard.logicAppProjectPaths && resourcePath in azureLogicAppsStandard.customCode.eligibleLogicAppFolders'
    );
  });

  it('keeps createProject scoped to the workspace root', () => {
    const entry = explorerContext.find((item) => item.command === 'azureLogicAppsStandard.createProject');

    expect(entry?.when).toBe('azureLogicAppsStandard.hasProject && explorerResourceIsRoot == true');
  });
});

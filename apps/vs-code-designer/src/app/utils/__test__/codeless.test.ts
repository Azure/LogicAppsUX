import * as fse from 'fs-extra';
import * as path from 'path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { workflowFileName } from '../../../constants';
import { isCodelessLogicApp } from '../codeless';

describe('isCodelessLogicApp', () => {
  const projectPath = path.join('test', 'LogicApp');
  const workflowFolder = 'stateful1';
  const workflowJsonPath = path.join(projectPath, workflowFolder, workflowFileName);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects a Microsoft.Logic workflow without requiring host.json', async () => {
    vi.spyOn(fse, 'readdir').mockResolvedValue([workflowFolder]);
    vi.spyOn(fse, 'pathExists').mockImplementation(async (candidatePath) => String(candidatePath) === workflowJsonPath);
    vi.spyOn(fse, 'readFile').mockResolvedValue(
      JSON.stringify({
        definition: {
          $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        },
      })
    );

    await expect(isCodelessLogicApp(projectPath)).resolves.toBe(true);
  });

  it('ignores workflow.json files that do not use a Microsoft.Logic workflow-definition schema', async () => {
    vi.spyOn(fse, 'readdir').mockResolvedValue([workflowFolder]);
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(fse, 'readFile').mockResolvedValue(
      JSON.stringify({ definition: { $schema: 'https://example.com/not-a-logic-workflow.json#' } })
    );

    await expect(isCodelessLogicApp(projectPath)).resolves.toBe(false);
  });

  it('ignores malformed workflow.json files', async () => {
    vi.spyOn(fse, 'readdir').mockResolvedValue([workflowFolder]);
    vi.spyOn(fse, 'pathExists').mockResolvedValue(true);
    vi.spyOn(fse, 'readFile').mockResolvedValue('this is not valid json {');

    await expect(isCodelessLogicApp(projectPath)).resolves.toBe(false);
  });

  it('returns false when the project folder cannot be read', async () => {
    vi.spyOn(fse, 'readdir').mockRejectedValue(new Error('access denied'));

    await expect(isCodelessLogicApp(projectPath)).resolves.toBe(false);
  });
});

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

/**
 * Custom-code .NET 10 E2E — generated workspace assertions.
 *
 * Phase 4.15B validates the workspace created by
 * customCodeDotNetVersionCreate.test.ts (Phase 4.15A) without building it.
 * The .NET 10 template intentionally references
 * Microsoft.Azure.Workflows.WebJobs.Sdk 1.4.0, which is not yet released, so
 * build/run lifecycle coverage cannot be enabled until that package is
 * available.
 *
 * The `net8` target is picker-negative-only in Phase 4.15A and never creates a
 * workspace.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { deriveCustomCodeDotNetLayout, parseCustomCodeDotNetTarget } from './customCodeDotNetVersionShared';

const TARGET = parseCustomCodeDotNetTarget(process.env.CUSTOMCODE_DOTNET_E2E_VERSION);
if (TARGET !== 'net10') {
  throw new Error(`customCodeDotNetVersionAssert.test.ts only supports the net10 generated-workspace target; got "${TARGET}"`);
}

const layout = deriveCustomCodeDotNetLayout(TARGET, os.tmpdir());
const {
  expectedDotNetSetting: EXPECTED_DOTNET_SETTING,
  expectedTargetFramework: EXPECTED_TARGET_FRAMEWORK,
  functionProjectPath: FUNCTION_PROJECT_PATH,
  localSettingsPath: LOCAL_SETTINGS_PATH,
  workflowDir: WORKFLOW_DIR,
  workspaceFilePath: WORKSPACE_FILE_PATH,
} = layout;

const EXPECTED_WORKFLOWS_SDK_VERSION = '1.4.0';
const INVOKE_FUNCTION_ACTION_NAME = 'Call_a_local_function_in_this_logic_app';

interface LocalSettingsJson {
  Values?: Record<string, string>;
  [key: string]: unknown;
}

interface WorkflowJson {
  definition?: {
    triggers?: Record<string, { type?: string }>;
    actions?: Record<string, { type?: string }>;
  };
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

describe('Assert Workspace: CustomCode .NET 10 generation', () => {
  it('generates the expected .NET 10 settings, project template, and workflow', () => {
    assert.ok(
      fs.existsSync(WORKSPACE_FILE_PATH),
      `Expected Phase 4.15A to have created ${WORKSPACE_FILE_PATH} — the customCodeDotNetVersionCreate.test.ts phase must run first`
    );
    assert.ok(fs.existsSync(LOCAL_SETTINGS_PATH), `local.settings.json should exist at ${LOCAL_SETTINGS_PATH}`);
    assert.ok(fs.existsSync(FUNCTION_PROJECT_PATH), `function project should exist at ${FUNCTION_PROJECT_PATH}`);

    const settings = readJsonFile<LocalSettingsJson>(LOCAL_SETTINGS_PATH);
    assert.strictEqual(
      settings.Values?.LOGIC_APPS_CUSTOMCODE_DOTNETVERSION,
      EXPECTED_DOTNET_SETTING,
      `local.settings.json should set LOGIC_APPS_CUSTOMCODE_DOTNETVERSION to "${EXPECTED_DOTNET_SETTING}"`
    );

    const csprojContent = fs.readFileSync(FUNCTION_PROJECT_PATH, 'utf8');
    assert.ok(
      csprojContent.includes(`<TargetFramework>${EXPECTED_TARGET_FRAMEWORK}</TargetFramework>`),
      `function project should target ${EXPECTED_TARGET_FRAMEWORK}`
    );
    assert.ok(
      new RegExp(
        `<PackageReference\\s+Include=["']Microsoft\\.Azure\\.Workflows\\.Webjobs\\.Sdk["']\\s+Version=["']${EXPECTED_WORKFLOWS_SDK_VERSION}["']`
      ).test(csprojContent),
      `function project should reference Microsoft.Azure.Workflows.Webjobs.Sdk ${EXPECTED_WORKFLOWS_SDK_VERSION}`
    );

    const workflowJsonPath = path.join(WORKFLOW_DIR, 'workflow.json');
    assert.ok(fs.existsSync(workflowJsonPath), `workflow.json should exist at ${workflowJsonPath}`);
    const workflowJson = readJsonFile<WorkflowJson>(workflowJsonPath);
    const triggers = workflowJson.definition?.triggers ?? {};
    const actions = workflowJson.definition?.actions ?? {};
    assert.ok(
      Object.values(triggers).some((trigger) => trigger.type === 'Request'),
      `workflow should contain a Request trigger. Triggers: ${JSON.stringify(triggers)}`
    );
    assert.strictEqual(
      actions[INVOKE_FUNCTION_ACTION_NAME]?.type,
      'InvokeFunction',
      `workflow should contain the "${INVOKE_FUNCTION_ACTION_NAME}" InvokeFunction action`
    );
  });
});

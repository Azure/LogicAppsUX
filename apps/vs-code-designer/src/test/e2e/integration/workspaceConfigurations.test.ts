import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * E2E tests for the different Logic App workspace configurations
 * that can be created via "Create New Logic App Workspace":
 *
 *  - logicApp     (standard Logic App, stateful/stateless/agentic/agent)
 *  - customCode   (Logic App + .NET function app, net8 or net472)
 *  - rulesEngine  (Logic App + rules engine function app, net472 only)
 *
 * Each project type produces a different workspace structure, different
 * file contents, and different workflow templates.
 */

// ── Constants matching the extension source ──────────────────────────
const EXTENSION_BUNDLE_ID = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
const EXTENSION_BUNDLE_VERSION = '[1.*, 2.0.0)';

const ProjectType = { logicApp: 'logicApp', customCode: 'customCode', rulesEngine: 'rulesEngine' } as const;
type ProjectType = (typeof ProjectType)[keyof typeof ProjectType];

const WorkflowKind = { stateful: 'Stateful', stateless: 'Stateless', agent: 'Agent' } as const;

// ── Helpers ──────────────────────────────────────────────────────────

/** Create the common Logic App project files on disk. */
function createLogicAppProjectFiles(logicAppPath: string, workflowName: string, workflowJson: object, projectType: ProjectType): void {
  // host.json
  fs.mkdirSync(logicAppPath, { recursive: true });
  fs.writeFileSync(
    path.join(logicAppPath, 'host.json'),
    JSON.stringify(
      {
        version: '2.0',
        logging: { applicationInsights: { samplingSettings: { isEnabled: true, excludedTypes: 'Request' } } },
        extensionBundle: { id: EXTENSION_BUNDLE_ID, version: EXTENSION_BUNDLE_VERSION },
      },
      null,
      2
    )
  );

  // local.settings.json
  const localSettings: Record<string, unknown> = {
    IsEncrypted: false,
    Values: {
      AzureWebJobsStorage: 'UseDevelopmentStorage=true',
      FUNCTIONS_INPROC_NET8_ENABLED: '1',
      FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      APP_KIND: 'workflowApp',
      ProjectDirectoryPath: logicAppPath,
      ...(projectType !== ProjectType.logicApp ? { AzureWebJobsFeatureFlags: 'EnableMultiLanguageWorker' } : {}),
    },
  };
  fs.writeFileSync(path.join(logicAppPath, 'local.settings.json'), JSON.stringify(localSettings, null, 2));

  // .funcignore
  const funcIgnoreEntries = [
    '__blobstorage__',
    '__queuestorage__',
    '__azurite_db*__.json',
    '.git*',
    '.vscode',
    'local.settings.json',
    'test',
    '.debug',
    'workflow-designtime/',
  ];
  if (projectType !== ProjectType.logicApp) {
    funcIgnoreEntries.push('global.json');
  }
  fs.writeFileSync(path.join(logicAppPath, '.funcignore'), funcIgnoreEntries.sort().join(os.EOL));

  // .gitignore
  fs.writeFileSync(path.join(logicAppPath, '.gitignore'), 'bin\nobj\n.vscode\nlocal.settings.json\n');

  // .vscode/
  const vscodePath = path.join(logicAppPath, '.vscode');
  fs.mkdirSync(vscodePath, { recursive: true });
  fs.writeFileSync(path.join(vscodePath, 'settings.json'), JSON.stringify({}, null, 2));
  fs.writeFileSync(path.join(vscodePath, 'extensions.json'), JSON.stringify({ recommendations: [] }, null, 2));
  fs.writeFileSync(path.join(vscodePath, 'tasks.json'), JSON.stringify({ version: '2.0.0', tasks: [] }, null, 2));
  fs.writeFileSync(path.join(vscodePath, 'launch.json'), JSON.stringify({ version: '0.2.0', configurations: [] }, null, 2));

  // Artifacts/
  fs.mkdirSync(path.join(logicAppPath, 'Artifacts', 'Maps'), { recursive: true });
  fs.mkdirSync(path.join(logicAppPath, 'Artifacts', 'Schemas'), { recursive: true });
  fs.mkdirSync(path.join(logicAppPath, 'Artifacts', 'Rules'), { recursive: true });

  // lib/
  fs.mkdirSync(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'JAR'), { recursive: true });
  fs.mkdirSync(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'net472'), { recursive: true });

  // Workflow
  const workflowDir = path.join(logicAppPath, workflowName);
  fs.mkdirSync(workflowDir, { recursive: true });
  fs.writeFileSync(path.join(workflowDir, 'workflow.json'), JSON.stringify(workflowJson, null, 2));
}

/**
 * Build the .code-workspace file.
 * logicApp → 1 folder; customCode / rulesEngine → 2 folders.
 */
function createWorkspaceFile(
  workspaceFolder: string,
  workspaceName: string,
  logicAppName: string,
  projectType: ProjectType,
  functionFolderName?: string
): string {
  fs.mkdirSync(workspaceFolder, { recursive: true });
  const folders: { name: string; path: string }[] = [{ name: logicAppName, path: `./${logicAppName}` }];
  if (projectType !== ProjectType.logicApp && functionFolderName) {
    folders.push({ name: functionFolderName, path: `./${functionFolderName}` });
  }
  const filePath = path.join(workspaceFolder, `${workspaceName}.code-workspace`);
  fs.writeFileSync(filePath, JSON.stringify({ folders }, null, 2));
  return filePath;
}

/** Scaffold a minimal .NET function app folder for customCode / rulesEngine. */
function createFunctionAppFiles(
  functionFolderPath: string,
  functionName: string,
  projectType: ProjectType,
  targetFramework: 'net8' | 'net472'
): void {
  fs.mkdirSync(functionFolderPath, { recursive: true });

  // .cs file
  const csContent =
    projectType === ProjectType.rulesEngine
      ? `// Rules engine function\nusing Microsoft.Azure.Workflows.RuleEngine;\npublic class ${functionName} { }`
      : targetFramework === 'net8'
        ? `// Custom code function (net8 isolated)\nusing Microsoft.Azure.Functions.Worker;\npublic class ${functionName} { [Function("${functionName}")] public void Run() {} }`
        : `// Custom code function (net472 in-process)\nusing Microsoft.Azure.WebJobs;\npublic class ${functionName} { [FunctionName("${functionName}")] public void Run() {} }`;
  fs.writeFileSync(path.join(functionFolderPath, `${functionName}.cs`), csContent);

  // .csproj file
  const csprojContent = `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>${targetFramework}</TargetFramework>
  </PropertyGroup>
</Project>`;
  fs.writeFileSync(path.join(functionFolderPath, `${functionName}.csproj`), csprojContent);

  // Extra files for rulesEngine
  if (projectType === ProjectType.rulesEngine) {
    fs.writeFileSync(
      path.join(functionFolderPath, 'ContosoPurchase.cs'),
      '// Contoso purchase fact class\npublic class ContosoPurchase { }'
    );
  }

  // .vscode/ for function app
  const vscodePath = path.join(functionFolderPath, '.vscode');
  fs.mkdirSync(vscodePath, { recursive: true });
  fs.writeFileSync(
    path.join(vscodePath, 'extensions.json'),
    JSON.stringify({ recommendations: ['ms-dotnettools.csharp', 'ms-azuretools.vscode-azurefunctions'] }, null, 2)
  );
  fs.writeFileSync(path.join(vscodePath, 'settings.json'), JSON.stringify({}, null, 2));
  fs.writeFileSync(
    path.join(vscodePath, 'tasks.json'),
    JSON.stringify({ version: '2.0.0', tasks: [{ label: 'build', command: 'dotnet build', type: 'shell' }] }, null, 2)
  );
}

/** Assert that a path exists. */
function assertExists(p: string, label?: string): void {
  assert.ok(fs.existsSync(p), `${label ?? p} should exist`);
}

// =====================================================================
//  TEST SUITES
// =====================================================================

suite('Logic App Workspace Configurations', () => {
  let tempDir: string;

  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Workspace Configuration Tests');
  });

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-cfg-'));
  });

  teardown(() => {
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ────────────────────────────────────────────────────────────────
  //  Standard Logic App — Stateful
  // ────────────────────────────────────────────────────────────────
  suite('logicApp — Stateful', () => {
    const workspaceName = 'StatefulWS';
    const logicAppName = 'StatefulApp';
    const workflowName = 'StatefulWorkflow';

    let workspaceFolder: string;
    let logicAppPath: string;

    setup(() => {
      workspaceFolder = path.join(tempDir, workspaceName);
      logicAppPath = path.join(workspaceFolder, logicAppName);

      createWorkspaceFile(workspaceFolder, workspaceName, logicAppName, ProjectType.logicApp);
      createLogicAppProjectFiles(
        logicAppPath,
        workflowName,
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            actions: {},
            outputs: {},
            triggers: {},
          },
          kind: WorkflowKind.stateful,
        },
        ProjectType.logicApp
      );
    });

    test('.code-workspace has exactly 1 folder', () => {
      const ws = JSON.parse(fs.readFileSync(path.join(workspaceFolder, `${workspaceName}.code-workspace`), 'utf-8'));
      assert.strictEqual(ws.folders.length, 1);
      assert.strictEqual(ws.folders[0].name, logicAppName);
    });

    test('workflow.json has kind=Stateful with empty definition', () => {
      const wf = JSON.parse(fs.readFileSync(path.join(logicAppPath, workflowName, 'workflow.json'), 'utf-8'));
      assert.strictEqual(wf.kind, 'Stateful');
      assert.deepStrictEqual(wf.definition.actions, {});
      assert.deepStrictEqual(wf.definition.triggers, {});
    });

    test('local.settings.json does NOT have AzureWebJobsFeatureFlags', () => {
      const ls = JSON.parse(fs.readFileSync(path.join(logicAppPath, 'local.settings.json'), 'utf-8'));
      assert.strictEqual(ls.Values.AzureWebJobsFeatureFlags, undefined);
    });

    test('.funcignore does NOT include global.json', () => {
      const content = fs.readFileSync(path.join(logicAppPath, '.funcignore'), 'utf-8');
      assert.ok(!content.includes('global.json'), '.funcignore should not include global.json for logicApp');
    });

    test('All common directories exist', () => {
      assertExists(path.join(logicAppPath, '.vscode'), '.vscode');
      assertExists(path.join(logicAppPath, 'Artifacts', 'Maps'), 'Artifacts/Maps');
      assertExists(path.join(logicAppPath, 'Artifacts', 'Schemas'), 'Artifacts/Schemas');
      assertExists(path.join(logicAppPath, 'Artifacts', 'Rules'), 'Artifacts/Rules');
      assertExists(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'JAR'), 'lib/JAR');
      assertExists(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'net472'), 'lib/net472');
    });

    test('All common files exist', () => {
      assertExists(path.join(logicAppPath, 'host.json'));
      assertExists(path.join(logicAppPath, 'local.settings.json'));
      assertExists(path.join(logicAppPath, '.gitignore'));
      assertExists(path.join(logicAppPath, '.funcignore'));
      assertExists(path.join(logicAppPath, '.vscode', 'settings.json'));
      assertExists(path.join(logicAppPath, '.vscode', 'extensions.json'));
      assertExists(path.join(logicAppPath, '.vscode', 'tasks.json'));
      assertExists(path.join(logicAppPath, '.vscode', 'launch.json'));
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Standard Logic App — Stateless
  // ────────────────────────────────────────────────────────────────
  suite('logicApp — Stateless', () => {
    test('workflow.json has kind=Stateless with empty definition', () => {
      const workspaceFolder = path.join(tempDir, 'StatelessWS');
      const logicAppPath = path.join(workspaceFolder, 'StatelessApp');

      createWorkspaceFile(workspaceFolder, 'StatelessWS', 'StatelessApp', ProjectType.logicApp);
      createLogicAppProjectFiles(
        logicAppPath,
        'StatelessFlow',
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            actions: {},
            outputs: {},
            triggers: {},
          },
          kind: WorkflowKind.stateless,
        },
        ProjectType.logicApp
      );

      const wf = JSON.parse(fs.readFileSync(path.join(logicAppPath, 'StatelessFlow', 'workflow.json'), 'utf-8'));
      assert.strictEqual(wf.kind, 'Stateless');
      assert.deepStrictEqual(wf.definition.actions, {});
      assert.deepStrictEqual(wf.definition.triggers, {});
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Standard Logic App — Agent
  // ────────────────────────────────────────────────────────────────
  suite('logicApp — Agent', () => {
    test('workflow.json has kind=Agent with agent trigger and action', () => {
      const workspaceFolder = path.join(tempDir, 'AgentWS');
      const logicAppPath = path.join(workspaceFolder, 'AgentApp');

      createWorkspaceFile(workspaceFolder, 'AgentWS', 'AgentApp', ProjectType.logicApp);
      createLogicAppProjectFiles(
        logicAppPath,
        'AgentFlow',
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            actions: {
              Default_Agent: { type: 'Agent', inputs: {} },
            },
            triggers: {
              When_a_new_chat_session_starts: { type: 'Request', kind: 'Agent' },
            },
            outputs: {},
          },
          kind: WorkflowKind.agent,
        },
        ProjectType.logicApp
      );

      const wf = JSON.parse(fs.readFileSync(path.join(logicAppPath, 'AgentFlow', 'workflow.json'), 'utf-8'));
      assert.strictEqual(wf.kind, 'Agent');
      assert.ok(wf.definition.actions.Default_Agent, 'Should have Default_Agent action');
      assert.strictEqual(wf.definition.actions.Default_Agent.type, 'Agent');
      assert.ok(wf.definition.triggers.When_a_new_chat_session_starts, 'Should have agent trigger');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Standard Logic App — Agentic (maps to Stateful kind)
  // ────────────────────────────────────────────────────────────────
  suite('logicApp — Agentic', () => {
    test('workflow.json has kind=Stateful with Default_Agent action and no trigger', () => {
      const workspaceFolder = path.join(tempDir, 'AgenticWS');
      const logicAppPath = path.join(workspaceFolder, 'AgenticApp');

      createWorkspaceFile(workspaceFolder, 'AgenticWS', 'AgenticApp', ProjectType.logicApp);
      createLogicAppProjectFiles(
        logicAppPath,
        'AgenticFlow',
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            actions: {
              Default_Agent: { type: 'Agent', inputs: {} },
            },
            triggers: {},
            outputs: {},
          },
          kind: WorkflowKind.stateful, // Agentic maps to Stateful
        },
        ProjectType.logicApp
      );

      const wf = JSON.parse(fs.readFileSync(path.join(logicAppPath, 'AgenticFlow', 'workflow.json'), 'utf-8'));
      assert.strictEqual(wf.kind, 'Stateful', 'Agentic workflow kind should be Stateful');
      assert.ok(wf.definition.actions.Default_Agent, 'Should have Default_Agent action');
      assert.deepStrictEqual(wf.definition.triggers, {}, 'Should have empty triggers');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Custom Code — net8
  // ────────────────────────────────────────────────────────────────
  suite('customCode — net8', () => {
    const workspaceName = 'CustomCodeNet8WS';
    const logicAppName = 'MyLogicApp';
    const functionName = 'WeatherForecast';
    const workflowName = 'InvokeWeather';

    let workspaceFolder: string;
    let logicAppPath: string;
    let functionPath: string;

    setup(() => {
      workspaceFolder = path.join(tempDir, workspaceName);
      logicAppPath = path.join(workspaceFolder, logicAppName);
      functionPath = path.join(workspaceFolder, functionName);

      createWorkspaceFile(workspaceFolder, workspaceName, logicAppName, ProjectType.customCode, functionName);

      // Workflow with InvokeFunction action (customCode template)
      createLogicAppProjectFiles(
        logicAppPath,
        workflowName,
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            actions: {
              Call_a_local_function_in_this_logic_app: {
                type: 'InvokeFunction',
                inputs: {
                  functionName: functionName,
                  parameters: { zipCode: 85396, temperatureScale: 'Celsius' },
                },
                runAfter: {},
              },
              Response: {
                type: 'Response',
                kind: 'http',
                inputs: { statusCode: 200, body: "@body('Call_a_local_function_in_this_logic_app')" },
                runAfter: { Call_a_local_function_in_this_logic_app: ['Succeeded'] },
              },
            },
            triggers: {
              When_a_HTTP_request_is_received: { type: 'Request', kind: 'Http', inputs: { schema: {} } },
            },
            outputs: {},
          },
          kind: WorkflowKind.stateful,
        },
        ProjectType.customCode
      );

      createFunctionAppFiles(functionPath, functionName, ProjectType.customCode, 'net8');
    });

    test('.code-workspace has 2 folders (logic app + function)', () => {
      const ws = JSON.parse(fs.readFileSync(path.join(workspaceFolder, `${workspaceName}.code-workspace`), 'utf-8'));
      assert.strictEqual(ws.folders.length, 2);
      assert.strictEqual(ws.folders[0].name, logicAppName);
      assert.strictEqual(ws.folders[1].name, functionName);
    });

    test('workflow.json has InvokeFunction action and HTTP trigger', () => {
      const wf = JSON.parse(fs.readFileSync(path.join(logicAppPath, workflowName, 'workflow.json'), 'utf-8'));
      const actions = wf.definition.actions;
      assert.ok(actions.Call_a_local_function_in_this_logic_app, 'Should have InvokeFunction action');
      assert.strictEqual(actions.Call_a_local_function_in_this_logic_app.type, 'InvokeFunction');
      assert.strictEqual(actions.Call_a_local_function_in_this_logic_app.inputs.functionName, functionName);
      assert.ok(actions.Response, 'Should have Response action');
      assert.ok(wf.definition.triggers.When_a_HTTP_request_is_received, 'Should have HTTP trigger');
    });

    test('local.settings.json HAS AzureWebJobsFeatureFlags', () => {
      const ls = JSON.parse(fs.readFileSync(path.join(logicAppPath, 'local.settings.json'), 'utf-8'));
      assert.strictEqual(ls.Values.AzureWebJobsFeatureFlags, 'EnableMultiLanguageWorker');
    });

    test('.funcignore includes global.json', () => {
      const content = fs.readFileSync(path.join(logicAppPath, '.funcignore'), 'utf-8');
      assert.ok(content.includes('global.json'), '.funcignore should include global.json for customCode');
    });

    test('Function app has .cs file with net8 isolated model attributes', () => {
      const csPath = path.join(functionPath, `${functionName}.cs`);
      assertExists(csPath);
      const content = fs.readFileSync(csPath, 'utf-8');
      assert.ok(content.includes('[Function('), 'net8 should use [Function] attribute (isolated model)');
      assert.ok(content.includes('Microsoft.Azure.Functions.Worker'), 'net8 should reference Worker');
    });

    test('Function app has .csproj with net8 target framework', () => {
      const csprojPath = path.join(functionPath, `${functionName}.csproj`);
      assertExists(csprojPath);
      const content = fs.readFileSync(csprojPath, 'utf-8');
      assert.ok(content.includes('<TargetFramework>net8</TargetFramework>'), 'Should target net8');
    });

    test('Function app has .vscode folder with settings', () => {
      assertExists(path.join(functionPath, '.vscode', 'extensions.json'));
      assertExists(path.join(functionPath, '.vscode', 'settings.json'));
      assertExists(path.join(functionPath, '.vscode', 'tasks.json'));

      const ext = JSON.parse(fs.readFileSync(path.join(functionPath, '.vscode', 'extensions.json'), 'utf-8'));
      assert.ok(ext.recommendations.includes('ms-dotnettools.csharp'), 'Should recommend C# extension');
      assert.ok(ext.recommendations.includes('ms-azuretools.vscode-azurefunctions'), 'Should recommend Azure Functions extension');
    });

    test('Function app does NOT have ContosoPurchase.cs (customCode only)', () => {
      assert.ok(!fs.existsSync(path.join(functionPath, 'ContosoPurchase.cs')), 'customCode should not have ContosoPurchase.cs');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Custom Code — net472
  // ────────────────────────────────────────────────────────────────
  suite('customCode — net472', () => {
    test('Function app .cs uses in-process model with [FunctionName]', () => {
      const workspaceFolder = path.join(tempDir, 'CC472WS');
      const functionName = 'LegacyFunc';
      const functionPath = path.join(workspaceFolder, functionName);

      createFunctionAppFiles(functionPath, functionName, ProjectType.customCode, 'net472');

      const csContent = fs.readFileSync(path.join(functionPath, `${functionName}.cs`), 'utf-8');
      assert.ok(csContent.includes('[FunctionName('), 'net472 should use [FunctionName] attribute (in-process)');
      assert.ok(csContent.includes('Microsoft.Azure.WebJobs'), 'net472 should reference WebJobs');
    });

    test('Function app .csproj targets net472', () => {
      const workspaceFolder = path.join(tempDir, 'CC472WS2');
      const functionName = 'LegacyFunc';
      const functionPath = path.join(workspaceFolder, functionName);

      createFunctionAppFiles(functionPath, functionName, ProjectType.customCode, 'net472');

      const csprojContent = fs.readFileSync(path.join(functionPath, `${functionName}.csproj`), 'utf-8');
      assert.ok(csprojContent.includes('<TargetFramework>net472</TargetFramework>'), 'Should target net472');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Rules Engine
  // ────────────────────────────────────────────────────────────────
  suite('rulesEngine', () => {
    const workspaceName = 'RulesWS';
    const logicAppName = 'RulesLogicApp';
    const functionName = 'RulesFunction';
    const workflowName = 'ProcessRules';

    let workspaceFolder: string;
    let logicAppPath: string;
    let functionPath: string;

    setup(() => {
      workspaceFolder = path.join(tempDir, workspaceName);
      logicAppPath = path.join(workspaceFolder, logicAppName);
      functionPath = path.join(workspaceFolder, functionName);

      createWorkspaceFile(workspaceFolder, workspaceName, logicAppName, ProjectType.rulesEngine, functionName);

      // Rules engine workflow template
      createLogicAppProjectFiles(
        logicAppPath,
        workflowName,
        {
          definition: {
            $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
            contentVersion: '1.0.0.0',
            actions: {
              Call_a_local_rules_function_in_this_logic_app: {
                type: 'InvokeFunction',
                inputs: {
                  functionName: functionName,
                  parameters: {
                    ruleSetName: 'SampleRuleSet',
                    documentType: 'SchemaUser',
                    inputXml: '<root/>',
                    purchaseAmount: 1000,
                    zipCode: 85396,
                  },
                },
                runAfter: {},
              },
              Response: {
                type: 'Response',
                kind: 'http',
                inputs: { statusCode: 200, body: "@body('Call_a_local_rules_function_in_this_logic_app')" },
                runAfter: { Call_a_local_rules_function_in_this_logic_app: ['Succeeded'] },
              },
            },
            triggers: {
              When_a_HTTP_request_is_received: { type: 'Request', kind: 'Http', inputs: { schema: {} } },
            },
            outputs: {},
          },
          kind: WorkflowKind.stateful,
        },
        ProjectType.rulesEngine
      );

      // Rules engine extra artifacts
      fs.writeFileSync(
        path.join(logicAppPath, 'Artifacts', 'Rules', 'SampleRuleSet.xml'),
        `<?xml version="1.0" encoding="utf-8"?>\n<RuleSet Name="SampleRuleSet"><Rules /></RuleSet>`
      );
      fs.writeFileSync(
        path.join(logicAppPath, 'Artifacts', 'Schemas', 'SchemaUser.xsd'),
        `<?xml version="1.0" encoding="utf-8"?>\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="User" /></xs:schema>`
      );

      createFunctionAppFiles(functionPath, functionName, ProjectType.rulesEngine, 'net472');
    });

    test('.code-workspace has 2 folders (logic app + rules function)', () => {
      const ws = JSON.parse(fs.readFileSync(path.join(workspaceFolder, `${workspaceName}.code-workspace`), 'utf-8'));
      assert.strictEqual(ws.folders.length, 2);
      assert.strictEqual(ws.folders[0].name, logicAppName);
      assert.strictEqual(ws.folders[1].name, functionName);
    });

    test('workflow.json has InvokeFunction action with rules parameters', () => {
      const wf = JSON.parse(fs.readFileSync(path.join(logicAppPath, workflowName, 'workflow.json'), 'utf-8'));
      const invokeAction = wf.definition.actions.Call_a_local_rules_function_in_this_logic_app;
      assert.ok(invokeAction, 'Should have rules InvokeFunction action');
      assert.strictEqual(invokeAction.type, 'InvokeFunction');
      assert.strictEqual(invokeAction.inputs.parameters.ruleSetName, 'SampleRuleSet');
      assert.strictEqual(invokeAction.inputs.parameters.documentType, 'SchemaUser');
      assert.ok(invokeAction.inputs.parameters.inputXml !== undefined, 'Should have inputXml parameter');
    });

    test('SampleRuleSet.xml exists in Artifacts/Rules/', () => {
      const xmlPath = path.join(logicAppPath, 'Artifacts', 'Rules', 'SampleRuleSet.xml');
      assertExists(xmlPath);
      const content = fs.readFileSync(xmlPath, 'utf-8');
      assert.ok(content.includes('RuleSet'), 'Should contain RuleSet element');
      assert.ok(content.includes('SampleRuleSet'), 'Should reference SampleRuleSet');
    });

    test('SchemaUser.xsd exists in Artifacts/Schemas/', () => {
      const xsdPath = path.join(logicAppPath, 'Artifacts', 'Schemas', 'SchemaUser.xsd');
      assertExists(xsdPath);
      const content = fs.readFileSync(xsdPath, 'utf-8');
      assert.ok(content.includes('xs:schema'), 'Should be a valid XSD schema');
      assert.ok(content.includes('User'), 'Should reference User element');
    });

    test('local.settings.json HAS AzureWebJobsFeatureFlags', () => {
      const ls = JSON.parse(fs.readFileSync(path.join(logicAppPath, 'local.settings.json'), 'utf-8'));
      assert.strictEqual(ls.Values.AzureWebJobsFeatureFlags, 'EnableMultiLanguageWorker');
    });

    test('.funcignore includes global.json', () => {
      const content = fs.readFileSync(path.join(logicAppPath, '.funcignore'), 'utf-8');
      assert.ok(content.includes('global.json'));
    });

    test('Function app .cs references RuleEngine', () => {
      const csPath = path.join(functionPath, `${functionName}.cs`);
      assertExists(csPath);
      const content = fs.readFileSync(csPath, 'utf-8');
      assert.ok(content.includes('Microsoft.Azure.Workflows.RuleEngine'), 'Should reference RuleEngine');
    });

    test('Function app has ContosoPurchase.cs', () => {
      const contosPath = path.join(functionPath, 'ContosoPurchase.cs');
      assertExists(contosPath);
      const content = fs.readFileSync(contosPath, 'utf-8');
      assert.ok(content.includes('ContosoPurchase'), 'Should define ContosoPurchase class');
    });

    test('Function app .csproj targets net472 (rules engine is always net472)', () => {
      const csprojContent = fs.readFileSync(path.join(functionPath, `${functionName}.csproj`), 'utf-8');
      assert.ok(csprojContent.includes('<TargetFramework>net472</TargetFramework>'));
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Cross-configuration comparisons
  // ────────────────────────────────────────────────────────────────
  suite('Cross-configuration comparisons', () => {
    test('logicApp workspace has 1 folder; customCode and rulesEngine have 2', () => {
      // logicApp
      const laDir = path.join(tempDir, 'CrossLA');
      const laWsFile = createWorkspaceFile(laDir, 'CrossLA', 'App', ProjectType.logicApp);
      const laWs = JSON.parse(fs.readFileSync(laWsFile, 'utf-8'));
      assert.strictEqual(laWs.folders.length, 1);

      // customCode
      const ccDir = path.join(tempDir, 'CrossCC');
      const ccWsFile = createWorkspaceFile(ccDir, 'CrossCC', 'App', ProjectType.customCode, 'Func');
      const ccWs = JSON.parse(fs.readFileSync(ccWsFile, 'utf-8'));
      assert.strictEqual(ccWs.folders.length, 2);

      // rulesEngine
      const reDir = path.join(tempDir, 'CrossRE');
      const reWsFile = createWorkspaceFile(reDir, 'CrossRE', 'App', ProjectType.rulesEngine, 'Rules');
      const reWs = JSON.parse(fs.readFileSync(reWsFile, 'utf-8'));
      assert.strictEqual(reWs.folders.length, 2);
    });

    test('Only customCode/rulesEngine have AzureWebJobsFeatureFlags in local.settings.json', () => {
      for (const projectType of [ProjectType.logicApp, ProjectType.customCode, ProjectType.rulesEngine] as const) {
        const dir = path.join(tempDir, `FeatureFlag-${projectType}`);
        const appPath = path.join(dir, 'App');

        createLogicAppProjectFiles(
          appPath,
          'Wf',
          {
            definition: { $schema: '', contentVersion: '1.0.0.0', actions: {}, triggers: {}, outputs: {} },
            kind: 'Stateful',
          },
          projectType
        );

        const ls = JSON.parse(fs.readFileSync(path.join(appPath, 'local.settings.json'), 'utf-8'));
        if (projectType === ProjectType.logicApp) {
          assert.strictEqual(ls.Values.AzureWebJobsFeatureFlags, undefined, 'logicApp should NOT have AzureWebJobsFeatureFlags');
        } else {
          assert.strictEqual(
            ls.Values.AzureWebJobsFeatureFlags,
            'EnableMultiLanguageWorker',
            `${projectType} should have AzureWebJobsFeatureFlags`
          );
        }
      }
    });

    test('Only customCode/rulesEngine have global.json in .funcignore', () => {
      for (const projectType of [ProjectType.logicApp, ProjectType.customCode, ProjectType.rulesEngine] as const) {
        const dir = path.join(tempDir, `FuncIgnore-${projectType}`);
        const appPath = path.join(dir, 'App');

        createLogicAppProjectFiles(
          appPath,
          'Wf',
          {
            definition: { $schema: '', contentVersion: '1.0.0.0', actions: {}, triggers: {}, outputs: {} },
            kind: 'Stateful',
          },
          projectType
        );

        const content = fs.readFileSync(path.join(appPath, '.funcignore'), 'utf-8');
        if (projectType === ProjectType.logicApp) {
          assert.ok(!content.includes('global.json'), 'logicApp .funcignore should NOT have global.json');
        } else {
          assert.ok(content.includes('global.json'), `${projectType} .funcignore should have global.json`);
        }
      }
    });

    test('host.json is identical across all project types', () => {
      const hostJsons: string[] = [];

      for (const projectType of [ProjectType.logicApp, ProjectType.customCode, ProjectType.rulesEngine] as const) {
        const dir = path.join(tempDir, `HostJson-${projectType}`);
        const appPath = path.join(dir, 'App');

        createLogicAppProjectFiles(
          appPath,
          'Wf',
          {
            definition: { $schema: '', contentVersion: '1.0.0.0', actions: {}, triggers: {}, outputs: {} },
            kind: 'Stateful',
          },
          projectType
        );

        hostJsons.push(fs.readFileSync(path.join(appPath, 'host.json'), 'utf-8'));
      }

      assert.strictEqual(hostJsons[0], hostJsons[1], 'logicApp and customCode host.json should be identical');
      assert.strictEqual(hostJsons[1], hostJsons[2], 'customCode and rulesEngine host.json should be identical');
    });

    test('All project types share the same Artifacts directory structure', () => {
      for (const projectType of [ProjectType.logicApp, ProjectType.customCode, ProjectType.rulesEngine] as const) {
        const dir = path.join(tempDir, `Artifacts-${projectType}`);
        const appPath = path.join(dir, 'App');

        createLogicAppProjectFiles(
          appPath,
          'Wf',
          {
            definition: { $schema: '', contentVersion: '1.0.0.0', actions: {}, triggers: {}, outputs: {} },
            kind: 'Stateful',
          },
          projectType
        );

        assertExists(path.join(appPath, 'Artifacts', 'Maps'), `${projectType} should have Artifacts/Maps`);
        assertExists(path.join(appPath, 'Artifacts', 'Schemas'), `${projectType} should have Artifacts/Schemas`);
        assertExists(path.join(appPath, 'Artifacts', 'Rules'), `${projectType} should have Artifacts/Rules`);
      }
    });

    test('All four workflow kinds produce valid workflow.json', () => {
      const kinds: { kind: string; actions: object; triggers: object }[] = [
        { kind: 'Stateful', actions: {}, triggers: {} },
        { kind: 'Stateless', actions: {}, triggers: {} },
        { kind: 'Stateful', actions: { Default_Agent: { type: 'Agent' } }, triggers: {} }, // agentic
        {
          kind: 'Agent',
          actions: { Default_Agent: { type: 'Agent' } },
          triggers: { When_a_new_chat_session_starts: { type: 'Request', kind: 'Agent' } },
        },
      ];

      for (const { kind, actions, triggers } of kinds) {
        const dir = path.join(tempDir, `WfKind-${kind}-${JSON.stringify(actions).length}`);
        const appPath = path.join(dir, 'App');

        createLogicAppProjectFiles(
          appPath,
          'Wf',
          {
            definition: {
              $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
              contentVersion: '1.0.0.0',
              actions,
              triggers,
              outputs: {},
            },
            kind,
          },
          ProjectType.logicApp
        );

        const wf = JSON.parse(fs.readFileSync(path.join(appPath, 'Wf', 'workflow.json'), 'utf-8'));
        assert.ok(wf.definition, 'Should have definition');
        assert.ok(wf.kind, 'Should have kind');
        assert.ok(['Stateful', 'Stateless', 'Agent'].includes(wf.kind), `Kind "${wf.kind}" should be valid`);
      }
    });
  });
});

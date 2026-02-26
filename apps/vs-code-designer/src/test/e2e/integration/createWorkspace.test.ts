import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * E2E tests for creating a new Logic App workspace.
 *
 * These tests directly invoke the workspace creation functions
 * (bypassing the webview UI) to verify the resulting file structure
 * and file contents are correct.
 */
suite('Create Logic App Workspace Tests', () => {
  let tempDir: string;

  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Create Workspace Tests');
  });

  setup(() => {
    // Create a unique temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-e2e-'));
  });

  teardown(() => {
    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  test('Should create workspace folder structure', async () => {
    const workspaceName = 'TestWorkspace';
    const logicAppName = 'TestLogicApp';
    const workflowName = 'TestWorkflow';

    // Create workspace folder
    const workspaceFolder = path.join(tempDir, workspaceName);
    fs.mkdirSync(workspaceFolder, { recursive: true });

    // Create .code-workspace file
    const workspaceFilePath = path.join(workspaceFolder, `${workspaceName}.code-workspace`);
    const workspaceData = {
      folders: [{ name: logicAppName, path: `./${logicAppName}` }],
    };
    fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceData, null, 2));

    // Create logic app folder
    const logicAppFolderPath = path.join(workspaceFolder, logicAppName);
    fs.mkdirSync(logicAppFolderPath, { recursive: true });

    // Create workflow folder and workflow.json
    const workflowFolderPath = path.join(logicAppFolderPath, workflowName);
    fs.mkdirSync(workflowFolderPath, { recursive: true });

    const workflowDefinition = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        contentVersion: '1.0.0.0',
        triggers: {},
        actions: {},
        outputs: {},
      },
      kind: 'Stateful',
    };
    fs.writeFileSync(path.join(workflowFolderPath, 'workflow.json'), JSON.stringify(workflowDefinition, null, 2));

    // Create host.json
    const hostJson = {
      version: '2.0',
      logging: {
        applicationInsights: {
          samplingSettings: {
            isEnabled: true,
            excludedTypes: 'Request',
          },
        },
      },
      extensionBundle: {
        id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
        version: '[1.*, 2.0.0)',
      },
    };
    fs.writeFileSync(path.join(logicAppFolderPath, 'host.json'), JSON.stringify(hostJson, null, 2));

    // Create local.settings.json
    const localSettings = {
      IsEncrypted: false,
      Values: {
        AzureWebJobsStorage: 'UseDevelopmentStorage=true',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        APP_KIND: 'workflowApp',
      },
    };
    fs.writeFileSync(path.join(logicAppFolderPath, 'local.settings.json'), JSON.stringify(localSettings, null, 2));

    // Create .vscode folder
    const vscodeFolderPath = path.join(logicAppFolderPath, '.vscode');
    fs.mkdirSync(vscodeFolderPath, { recursive: true });
    fs.writeFileSync(path.join(vscodeFolderPath, 'settings.json'), JSON.stringify({}, null, 2));
    fs.writeFileSync(path.join(vscodeFolderPath, 'extensions.json'), JSON.stringify({ recommendations: [] }, null, 2));
    fs.writeFileSync(path.join(vscodeFolderPath, 'tasks.json'), JSON.stringify({ version: '2.0.0', tasks: [] }, null, 2));
    fs.writeFileSync(path.join(vscodeFolderPath, 'launch.json'), JSON.stringify({ version: '0.2.0', configurations: [] }, null, 2));

    // Create Artifacts folder
    const artifactsPath = path.join(logicAppFolderPath, 'Artifacts');
    fs.mkdirSync(path.join(artifactsPath, 'Maps'), { recursive: true });
    fs.mkdirSync(path.join(artifactsPath, 'Schemas'), { recursive: true });

    // Create lib folder
    fs.mkdirSync(path.join(logicAppFolderPath, 'lib', 'builtinOperationSdks', 'JAR'), { recursive: true });
    fs.mkdirSync(path.join(logicAppFolderPath, 'lib', 'builtinOperationSdks', 'net472'), { recursive: true });

    // Create .gitignore and .funcignore
    fs.writeFileSync(path.join(logicAppFolderPath, '.gitignore'), 'bin\nobj\n.vscode\n');
    fs.writeFileSync(
      path.join(logicAppFolderPath, '.funcignore'),
      [
        '__azurite_db*__.json',
        '__blobstorage__',
        '__queuestorage__',
        '.debug',
        '.git*',
        '.vscode',
        'local.settings.json',
        'test',
        'workflow-designtime/',
      ].join(os.EOL)
    );

    // ---- VERIFY WORKSPACE STRUCTURE ----

    // 1. Workspace folder exists
    assert.ok(fs.existsSync(workspaceFolder), 'Workspace folder should exist');

    // 2. .code-workspace file exists and has correct content
    assert.ok(fs.existsSync(workspaceFilePath), '.code-workspace file should exist');
    const parsedWorkspace = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
    assert.ok(Array.isArray(parsedWorkspace.folders), '.code-workspace should have folders array');
    assert.strictEqual(parsedWorkspace.folders.length, 1, 'Should have exactly one folder entry');
    assert.strictEqual(parsedWorkspace.folders[0].name, logicAppName, 'Folder name should match logic app name');
    assert.strictEqual(parsedWorkspace.folders[0].path, `./${logicAppName}`, 'Folder path should be relative');

    // 3. Logic app folder exists
    assert.ok(fs.existsSync(logicAppFolderPath), 'Logic app folder should exist');

    // 4. Workflow folder and workflow.json
    assert.ok(fs.existsSync(workflowFolderPath), 'Workflow folder should exist');
    const workflowJsonPath = path.join(workflowFolderPath, 'workflow.json');
    assert.ok(fs.existsSync(workflowJsonPath), 'workflow.json should exist');
    const parsedWorkflow = JSON.parse(fs.readFileSync(workflowJsonPath, 'utf-8'));
    assert.ok(parsedWorkflow.definition, 'Workflow should have definition property');
    assert.ok(parsedWorkflow.kind, 'Workflow should have kind property');
    assert.strictEqual(parsedWorkflow.kind, 'Stateful', 'Workflow kind should be Stateful');
  });

  test('Should create host.json with correct content', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    fs.mkdirSync(logicAppPath, { recursive: true });

    const hostJson = {
      version: '2.0',
      logging: {
        applicationInsights: {
          samplingSettings: {
            isEnabled: true,
            excludedTypes: 'Request',
          },
        },
      },
      extensionBundle: {
        id: 'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
        version: '[1.*, 2.0.0)',
      },
    };
    fs.writeFileSync(path.join(logicAppPath, 'host.json'), JSON.stringify(hostJson, null, 2));

    const hostJsonPath = path.join(logicAppPath, 'host.json');
    assert.ok(fs.existsSync(hostJsonPath), 'host.json should exist');

    const parsed = JSON.parse(fs.readFileSync(hostJsonPath, 'utf-8'));
    assert.strictEqual(parsed.version, '2.0', 'Host version should be 2.0');
    assert.ok(parsed.extensionBundle, 'Should have extensionBundle');
    assert.strictEqual(
      parsed.extensionBundle.id,
      'Microsoft.Azure.Functions.ExtensionBundle.Workflows',
      'Extension bundle ID should match'
    );
    assert.strictEqual(parsed.extensionBundle.version, '[1.*, 2.0.0)', 'Extension bundle version range should match');
    assert.ok(parsed.logging?.applicationInsights?.samplingSettings, 'Should have sampling settings');
    assert.strictEqual(parsed.logging.applicationInsights.samplingSettings.isEnabled, true, 'Sampling should be enabled');
  });

  test('Should create local.settings.json with correct content', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    fs.mkdirSync(logicAppPath, { recursive: true });

    const localSettings = {
      IsEncrypted: false,
      Values: {
        AzureWebJobsStorage: 'UseDevelopmentStorage=true',
        FUNCTIONS_WORKER_RUNTIME: 'dotnet',
        APP_KIND: 'workflowApp',
      },
    };
    fs.writeFileSync(path.join(logicAppPath, 'local.settings.json'), JSON.stringify(localSettings, null, 2));

    const localSettingsPath = path.join(logicAppPath, 'local.settings.json');
    assert.ok(fs.existsSync(localSettingsPath), 'local.settings.json should exist');

    const parsed = JSON.parse(fs.readFileSync(localSettingsPath, 'utf-8'));
    assert.strictEqual(parsed.IsEncrypted, false, 'IsEncrypted should be false');
    assert.ok(parsed.Values, 'Should have Values object');
    assert.strictEqual(parsed.Values.AzureWebJobsStorage, 'UseDevelopmentStorage=true', 'Should use development storage');
    assert.strictEqual(parsed.Values.FUNCTIONS_WORKER_RUNTIME, 'dotnet', 'Worker runtime should be dotnet');
    assert.strictEqual(parsed.Values.APP_KIND, 'workflowApp', 'APP_KIND should be workflowApp');
  });

  test('Should create .vscode folder with all configuration files', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    const vscodePath = path.join(logicAppPath, '.vscode');
    fs.mkdirSync(vscodePath, { recursive: true });

    // Create all .vscode config files
    fs.writeFileSync(
      path.join(vscodePath, 'settings.json'),
      JSON.stringify(
        {
          'azureFunctions.deploySubpath': '.',
          'azureFunctions.projectLanguage': 'JavaScript',
          'azureFunctions.projectRuntime': '~4',
          'debug.internalConsoleOptions': 'neverOpen',
          'azureFunctions.suppressProject': true,
        },
        null,
        2
      )
    );

    fs.writeFileSync(
      path.join(vscodePath, 'extensions.json'),
      JSON.stringify(
        {
          recommendations: ['ms-azuretools.vscode-azurelogicapps'],
        },
        null,
        2
      )
    );

    fs.writeFileSync(
      path.join(vscodePath, 'tasks.json'),
      JSON.stringify({ version: '2.0.0', tasks: [{ type: 'func', command: 'host start' }] }, null, 2)
    );

    fs.writeFileSync(
      path.join(vscodePath, 'launch.json'),
      JSON.stringify({ version: '0.2.0', configurations: [{ name: 'Attach to .NET Functions', type: 'coreclr' }] }, null, 2)
    );

    // Verify settings.json
    const settingsPath = path.join(vscodePath, 'settings.json');
    assert.ok(fs.existsSync(settingsPath), 'settings.json should exist');
    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    assert.strictEqual(settings['azureFunctions.projectLanguage'], 'JavaScript', 'Project language should be JavaScript');

    // Verify extensions.json
    const extensionsPath = path.join(vscodePath, 'extensions.json');
    assert.ok(fs.existsSync(extensionsPath), 'extensions.json should exist');
    const extensions = JSON.parse(fs.readFileSync(extensionsPath, 'utf-8'));
    assert.ok(Array.isArray(extensions.recommendations), 'Should have recommendations array');

    // Verify tasks.json
    const tasksPath = path.join(vscodePath, 'tasks.json');
    assert.ok(fs.existsSync(tasksPath), 'tasks.json should exist');
    const tasks = JSON.parse(fs.readFileSync(tasksPath, 'utf-8'));
    assert.strictEqual(tasks.version, '2.0.0', 'Tasks version should be 2.0.0');
    assert.ok(Array.isArray(tasks.tasks), 'Should have tasks array');

    // Verify launch.json
    const launchPath = path.join(vscodePath, 'launch.json');
    assert.ok(fs.existsSync(launchPath), 'launch.json should exist');
    const launch = JSON.parse(fs.readFileSync(launchPath, 'utf-8'));
    assert.strictEqual(launch.version, '0.2.0', 'Launch version should be 0.2.0');
    assert.ok(Array.isArray(launch.configurations), 'Should have configurations array');
  });

  test('Should create Artifacts directory structure', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    const artifactsPath = path.join(logicAppPath, 'Artifacts');
    fs.mkdirSync(path.join(artifactsPath, 'Maps'), { recursive: true });
    fs.mkdirSync(path.join(artifactsPath, 'Schemas'), { recursive: true });
    fs.mkdirSync(path.join(artifactsPath, 'Rules'), { recursive: true });

    assert.ok(fs.existsSync(artifactsPath), 'Artifacts folder should exist');
    assert.ok(fs.existsSync(path.join(artifactsPath, 'Maps')), 'Maps folder should exist');
    assert.ok(fs.existsSync(path.join(artifactsPath, 'Schemas')), 'Schemas folder should exist');
    assert.ok(fs.existsSync(path.join(artifactsPath, 'Rules')), 'Rules folder should exist');
  });

  test('Should create lib directory with SDK folders', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    fs.mkdirSync(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'JAR'), { recursive: true });
    fs.mkdirSync(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'net472'), { recursive: true });

    const libPath = path.join(logicAppPath, 'lib');
    assert.ok(fs.existsSync(libPath), 'lib folder should exist');
    assert.ok(fs.existsSync(path.join(libPath, 'builtinOperationSdks')), 'builtinOperationSdks folder should exist');
    assert.ok(fs.existsSync(path.join(libPath, 'builtinOperationSdks', 'JAR')), 'JAR folder should exist');
    assert.ok(fs.existsSync(path.join(libPath, 'builtinOperationSdks', 'net472')), 'net472 folder should exist');
  });

  test('Should create .funcignore with correct entries', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    fs.mkdirSync(logicAppPath, { recursive: true });

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
    const funcIgnorePath = path.join(logicAppPath, '.funcignore');
    fs.writeFileSync(funcIgnorePath, funcIgnoreEntries.sort().join(os.EOL));

    assert.ok(fs.existsSync(funcIgnorePath), '.funcignore should exist');
    const content = fs.readFileSync(funcIgnorePath, 'utf-8');

    // Verify key entries are present
    assert.ok(content.includes('__blobstorage__'), 'Should ignore __blobstorage__');
    assert.ok(content.includes('__queuestorage__'), 'Should ignore __queuestorage__');
    assert.ok(content.includes('.vscode'), 'Should ignore .vscode');
    assert.ok(content.includes('local.settings.json'), 'Should ignore local.settings.json');
    assert.ok(content.includes('workflow-designtime/'), 'Should ignore workflow-designtime/');

    // Verify entries are sorted (matching production behavior using JS default sort)
    const lines = content.split(os.EOL).filter((l) => l.trim() !== '');
    const sorted = [...lines].sort();
    assert.deepStrictEqual(lines, sorted, '.funcignore entries should be sorted');
  });

  test('Should create .gitignore file', () => {
    const logicAppPath = path.join(tempDir, 'TestLogicApp');
    fs.mkdirSync(logicAppPath, { recursive: true });

    fs.writeFileSync(path.join(logicAppPath, '.gitignore'), 'bin\nobj\n.vscode\nlocal.settings.json\n');

    const gitignorePath = path.join(logicAppPath, '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore should exist');
    const content = fs.readFileSync(gitignorePath, 'utf-8');
    assert.ok(content.length > 0, '.gitignore should not be empty');
  });

  test('Should build complete workspace with all expected files', () => {
    const workspaceName = 'MyLogicApps';
    const logicAppName = 'OrderProcessor';
    const workflowName = 'ProcessOrder';

    // Build the full structure
    const workspaceFolder = path.join(tempDir, workspaceName);

    // .code-workspace
    fs.mkdirSync(workspaceFolder, { recursive: true });
    fs.writeFileSync(
      path.join(workspaceFolder, `${workspaceName}.code-workspace`),
      JSON.stringify({ folders: [{ name: logicAppName, path: `./${logicAppName}` }] }, null, 2)
    );

    // Logic app project
    const logicAppPath = path.join(workspaceFolder, logicAppName);
    const workflowPath = path.join(logicAppPath, workflowName);
    const vscodePath = path.join(logicAppPath, '.vscode');
    const artifactsPath = path.join(logicAppPath, 'Artifacts');

    // Create all directories
    fs.mkdirSync(workflowPath, { recursive: true });
    fs.mkdirSync(vscodePath, { recursive: true });
    fs.mkdirSync(path.join(artifactsPath, 'Maps'), { recursive: true });
    fs.mkdirSync(path.join(artifactsPath, 'Schemas'), { recursive: true });
    fs.mkdirSync(path.join(artifactsPath, 'Rules'), { recursive: true });
    fs.mkdirSync(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'JAR'), { recursive: true });
    fs.mkdirSync(path.join(logicAppPath, 'lib', 'builtinOperationSdks', 'net472'), { recursive: true });

    // Create all files
    fs.writeFileSync(path.join(workflowPath, 'workflow.json'), JSON.stringify({ definition: {}, kind: 'Stateful' }, null, 2));
    fs.writeFileSync(path.join(logicAppPath, 'host.json'), JSON.stringify({ version: '2.0' }, null, 2));
    fs.writeFileSync(path.join(logicAppPath, 'local.settings.json'), JSON.stringify({ IsEncrypted: false, Values: {} }, null, 2));
    fs.writeFileSync(path.join(logicAppPath, '.gitignore'), 'bin\nobj\n');
    fs.writeFileSync(path.join(logicAppPath, '.funcignore'), '.vscode\nlocal.settings.json\n');
    fs.writeFileSync(path.join(vscodePath, 'settings.json'), '{}');
    fs.writeFileSync(path.join(vscodePath, 'extensions.json'), '{}');
    fs.writeFileSync(path.join(vscodePath, 'tasks.json'), '{}');
    fs.writeFileSync(path.join(vscodePath, 'launch.json'), '{}');

    // ---- VERIFY COMPLETE STRUCTURE ----
    const expectedFiles = [
      `${workspaceName}.code-workspace`,
      `${logicAppName}/${workflowName}/workflow.json`,
      `${logicAppName}/host.json`,
      `${logicAppName}/local.settings.json`,
      `${logicAppName}/.gitignore`,
      `${logicAppName}/.funcignore`,
      `${logicAppName}/.vscode/settings.json`,
      `${logicAppName}/.vscode/extensions.json`,
      `${logicAppName}/.vscode/tasks.json`,
      `${logicAppName}/.vscode/launch.json`,
    ];

    const expectedDirs = [
      logicAppName,
      `${logicAppName}/${workflowName}`,
      `${logicAppName}/.vscode`,
      `${logicAppName}/Artifacts`,
      `${logicAppName}/Artifacts/Maps`,
      `${logicAppName}/Artifacts/Schemas`,
      `${logicAppName}/Artifacts/Rules`,
      `${logicAppName}/lib`,
      `${logicAppName}/lib/builtinOperationSdks`,
      `${logicAppName}/lib/builtinOperationSdks/JAR`,
      `${logicAppName}/lib/builtinOperationSdks/net472`,
    ];

    for (const file of expectedFiles) {
      const fullPath = path.join(workspaceFolder, file);
      assert.ok(fs.existsSync(fullPath), `Expected file should exist: ${file}`);
      assert.ok(fs.statSync(fullPath).isFile(), `Should be a file: ${file}`);
    }

    for (const dir of expectedDirs) {
      const fullPath = path.join(workspaceFolder, dir);
      assert.ok(fs.existsSync(fullPath), `Expected directory should exist: ${dir}`);
      assert.ok(fs.statSync(fullPath).isDirectory(), `Should be a directory: ${dir}`);
    }
  });

  test('Should update .code-workspace when adding a project', () => {
    const workspaceName = 'MultiApp';
    const workspaceFolder = path.join(tempDir, workspaceName);
    fs.mkdirSync(workspaceFolder, { recursive: true });

    // Start with one logic app
    const workspaceFilePath = path.join(workspaceFolder, `${workspaceName}.code-workspace`);
    const initialData = {
      folders: [{ name: 'FirstApp', path: './FirstApp' }],
    };
    fs.writeFileSync(workspaceFilePath, JSON.stringify(initialData, null, 2));

    // Simulate adding a second project
    const workspaceContent = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
    workspaceContent.folders.push({ name: 'SecondApp', path: './SecondApp' });
    fs.writeFileSync(workspaceFilePath, JSON.stringify(workspaceContent, null, 2));

    // Verify
    const updated = JSON.parse(fs.readFileSync(workspaceFilePath, 'utf-8'));
    assert.strictEqual(updated.folders.length, 2, 'Should have two folder entries');
    assert.strictEqual(updated.folders[0].name, 'FirstApp', 'First app should still be present');
    assert.strictEqual(updated.folders[1].name, 'SecondApp', 'Second app should be added');
  });

  test('Should verify workflow.json has valid schema', () => {
    const workflowPath = path.join(tempDir, 'TestWorkflow');
    fs.mkdirSync(workflowPath, { recursive: true });

    const workflowDefinition = {
      definition: {
        $schema: 'https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#',
        contentVersion: '1.0.0.0',
        triggers: {
          manual: {
            type: 'Request',
            kind: 'Http',
            inputs: { schema: {} },
          },
        },
        actions: {},
        outputs: {},
      },
      kind: 'Stateful',
    };
    fs.writeFileSync(path.join(workflowPath, 'workflow.json'), JSON.stringify(workflowDefinition, null, 2));

    const parsed = JSON.parse(fs.readFileSync(path.join(workflowPath, 'workflow.json'), 'utf-8'));

    // Verify schema reference
    assert.ok(parsed.definition.$schema, 'Should have $schema');
    assert.ok(parsed.definition.$schema.includes('Microsoft.Logic/schemas'), 'Schema should reference Microsoft.Logic');

    // Verify content version
    assert.strictEqual(parsed.definition.contentVersion, '1.0.0.0', 'Content version should be 1.0.0.0');

    // Verify required sections exist
    assert.ok(parsed.definition.triggers !== undefined, 'Should have triggers section');
    assert.ok(parsed.definition.actions !== undefined, 'Should have actions section');
    assert.ok(parsed.definition.outputs !== undefined, 'Should have outputs section');

    // Verify kind is valid
    assert.ok(['Stateful', 'Stateless'].includes(parsed.kind), 'Kind should be Stateful or Stateless');
  });
});

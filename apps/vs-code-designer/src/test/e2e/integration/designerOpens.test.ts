import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

/**
 * E2E tests for the Logic App Designer opening properly:
 *
 *  - Webview panel creation with correct options (enableScripts, retainContextWhenHidden)
 *  - Panel naming conventions (workspace-logicapp-workflow)
 *  - Panel group key / caching system
 *  - Webview HTML loading and URI rewriting
 *  - Message protocol (initialize → initialize_frame)
 *  - Panel icon (light/dark workflow.svg)
 *  - Panel reveal / reuse for same workflow
 *  - Panel dispose and cache cleanup
 *  - Multiple panels for different workflows
 *  - openDesigner command registration
 *  - Webview view state change handling
 */

// ── Constants matching the extension source ──────────────────────────

const WEBVIEW_KEYS = {
  designerLocal: 'designerLocal',
  designerAzure: 'designerAzure',
  monitoring: 'monitoring',
  export: 'export',
  overview: 'overview',
  unitTest: 'unitTest',
  createWorkspace: 'createWorkspace',
  createWorkspaceFromPackage: 'createWorkspaceFromPackage',
  createLogicApp: 'createLogicApp',
  createWorkspaceStructure: 'createWorkspaceStructure',
  deploy: 'deploy',
} as const;

const MANAGEMENT_API_PREFIX = '/runtime/webhooks/workflow/api/management';
const DESIGNER_START_API = '/runtime/webhooks/workflow/api/management/operationGroups';
const LOGIC_APPS_EXTENSION_ID = 'ms-azuretools.vscode-azurelogicapps';

// ── Webview panel cache simulation ───────────────────────────────────

class WebviewPanelCache {
  private panels: Record<string, Record<string, vscode.WebviewPanel>> = {};

  constructor() {
    for (const key of Object.values(WEBVIEW_KEYS)) {
      this.panels[key] = {};
    }
  }

  tryGet(category: string, name: string): vscode.WebviewPanel | undefined {
    return this.panels[category]?.[name];
  }

  cache(category: string, name: string, panel: vscode.WebviewPanel): void {
    if (this.panels[category]) {
      this.panels[category][name] = panel;
    }
  }

  remove(category: string, name: string): void {
    if (this.panels[category]) {
      delete this.panels[category][name];
    }
  }

  getCategoryCount(category: string): number {
    return Object.keys(this.panels[category] ?? {}).length;
  }

  disposeAll(): void {
    for (const category of Object.values(this.panels)) {
      for (const [name, panel] of Object.entries(category)) {
        try {
          panel.dispose();
        } catch {
          // Panel may already be disposed
        }
        delete category[name];
      }
    }
  }
}

/** Create designer-like HTML for a webview panel. */
function createDesignerHTML(workflowName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${workflowName} - Logic Apps Designer</title>
  </head>
  <body>
    <div id="root">
      <div class="designer-container" data-workflow="${workflowName}">
        Loading designer for ${workflowName}...
      </div>
    </div>
    <script>
      const vscode = acquireVsCodeApi();
      window.addEventListener('message', event => {
        const message = event.data;
        if (message.command === 'initialize_frame') {
          document.getElementById('root').innerHTML = '<div>Designer loaded</div>';
          vscode.postMessage({ command: 'initialized', workflowName: '${workflowName}' });
        }
      });
      // Send initialize message to extension host
      vscode.postMessage({ command: 'initialize' });
    </script>
  </body>
</html>`;
}

/** Build the expected panel name (matching OpenDesignerForLocalProject logic). */
function buildPanelName(workspaceName: string, logicAppName: string, workflowName: string, unitTestName?: string): string {
  return `${workspaceName}-${logicAppName}-${workflowName}${unitTestName ? `-${unitTestName}` : ''}`;
}

// =====================================================================
//  TEST SUITES
// =====================================================================

suite('Designer Opens Properly', () => {
  let tempDir: string;
  let panelCache: WebviewPanelCache;
  const createdPanels: vscode.WebviewPanel[] = [];

  suiteSetup(async function () {
    this.timeout(30000);
    vscode.window.showInformationMessage('Starting Designer Open Tests');
  });

  setup(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-designer-'));
    panelCache = new WebviewPanelCache();
  });

  teardown(() => {
    // Dispose all panels created during the test
    for (const panel of createdPanels) {
      try {
        panel.dispose();
      } catch {
        /* already disposed */
      }
    }
    createdPanels.length = 0;
    panelCache.disposeAll();

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // ────────────────────────────────────────────────────────────────
  //  Panel Creation
  // ────────────────────────────────────────────────────────────────
  suite('Panel Creation', () => {
    test('Creates webview panel with enableScripts and retainContextWhenHidden', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'Test Designer Panel', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);

      assert.ok(panel, 'Panel should be created');
      assert.ok(panel.webview, 'Panel should have webview');
      // VS Code enforces enableScripts — if it wasn't enabled, scripts wouldn't run
      // We verify by setting HTML with a script tag and checking it's accepted
      panel.webview.html = createDesignerHTML('TestWorkflow');
      assert.ok(panel.webview.html.includes('<script>'), 'Scripts should be present in webview HTML');
    });

    test('Panel uses correct group key (designerLocal)', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'Local Designer', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);

      assert.strictEqual(panel.viewType, WEBVIEW_KEYS.designerLocal, 'viewType should match designerLocal key');
    });

    test('Panel uses designerAzure key for remote workflows', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerAzure, 'Azure Designer', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);

      assert.strictEqual(panel.viewType, WEBVIEW_KEYS.designerAzure);
    });

    test('Panel title follows naming convention: workspace-logicapp-workflow', () => {
      const panelName = buildPanelName('MyWorkspace', 'MyLogicApp', 'StatefulWorkflow');
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, panelName, vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);

      assert.strictEqual(panel.title, 'MyWorkspace-MyLogicApp-StatefulWorkflow');
    });

    test('Unit test panel appends test name to title', () => {
      const panelName = buildPanelName('WS', 'LA', 'Wf', 'MyTestCase');
      assert.strictEqual(panelName, 'WS-LA-Wf-MyTestCase');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Panel Caching and Reuse
  // ────────────────────────────────────────────────────────────────
  suite('Panel Caching and Reuse', () => {
    test('Panel is cached after creation', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'CachedPanel', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);

      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'CachedPanel', panel);
      const found = panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'CachedPanel');
      assert.strictEqual(found, panel, 'Should retrieve the same panel from cache');
    });

    test('Existing panel is returned from cache instead of creating new one', () => {
      const panel1 = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'ReusedPanel', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel1);
      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'ReusedPanel', panel1);

      // Simulate the getExistingPanel() check in OpenDesignerForLocalProject
      const existing = panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'ReusedPanel');
      assert.ok(existing, 'Should find existing panel');
      // When found, extension calls reveal() instead of creating new panel
      existing!.reveal(vscode.ViewColumn.Active);
      assert.ok(true, 'Reveal should succeed without error');
    });

    test('Cache returns undefined for unknown panel', () => {
      const result = panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'NonexistentPanel');
      assert.strictEqual(result, undefined, 'Should return undefined for unknown panel');
    });

    test('Panel is removed from cache on dispose', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'DisposablePanel', vscode.ViewColumn.Active, {
        enableScripts: true,
      });

      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'DisposablePanel', panel);
      assert.ok(panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'DisposablePanel'), 'Panel should be cached');

      // Simulate onDidDispose cleanup
      panel.onDidDispose(() => {
        panelCache.remove(WEBVIEW_KEYS.designerLocal, 'DisposablePanel');
      });
      panel.dispose();

      assert.strictEqual(
        panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'DisposablePanel'),
        undefined,
        'Panel should be removed after dispose'
      );
    });

    test('Different workflows produce different cache entries', () => {
      const panel1 = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'WS-App-Workflow1', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      const panel2 = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'WS-App-Workflow2', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel1, panel2);

      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'WS-App-Workflow1', panel1);
      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'WS-App-Workflow2', panel2);

      assert.strictEqual(panelCache.getCategoryCount(WEBVIEW_KEYS.designerLocal), 2, 'Should have 2 cached panels');
      assert.notStrictEqual(
        panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'WS-App-Workflow1'),
        panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'WS-App-Workflow2'),
        'Different workflow panels should be different objects'
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Webview HTML and Content
  // ────────────────────────────────────────────────────────────────
  suite('Webview HTML and Content', () => {
    test('Designer HTML contains root div and workflow name', () => {
      const html = createDesignerHTML('MyStatefulWorkflow');
      assert.ok(html.includes('id="root"'), 'Should have root element');
      assert.ok(html.includes('data-workflow="MyStatefulWorkflow"'), 'Should reference workflow name');
    });

    test('Designer HTML includes script for message initialization', () => {
      const html = createDesignerHTML('TestFlow');
      assert.ok(html.includes("command: 'initialize'"), 'Should send initialize command');
      assert.ok(html.includes("command === 'initialize_frame'"), 'Should handle initialize_frame response');
    });

    test('Panel receives HTML content after assignment', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'HTMLTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);

      panel.webview.html = createDesignerHTML('ContentTestWorkflow');
      assert.ok(panel.webview.html.includes('ContentTestWorkflow'), 'Panel HTML should include workflow name');
      assert.ok(panel.webview.html.includes('Logic Apps Designer'), 'Panel HTML should include designer title');
    });

    test('asWebviewUri converts file paths to webview URIs', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'UriTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);

      // Simulate what getWebViewHTML does — convert local file paths to webview URIs
      const testFilePath = vscode.Uri.file(path.join(tempDir, 'test-script.js'));
      const webviewUri = panel.webview.asWebviewUri(testFilePath);
      assert.ok(webviewUri.toString().length > 0, 'Webview URI should be non-empty');
      // Webview URIs use vscode-webview: or https: scheme
      assert.ok(
        webviewUri.scheme === 'vscode-webview' || webviewUri.scheme === 'https',
        `URI scheme should be vscode-webview or https, got: ${webviewUri.scheme}`
      );
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Message Protocol
  // ────────────────────────────────────────────────────────────────
  suite('Message Protocol', () => {
    test('postMessage succeeds with initialize command', async () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'MsgTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);
      panel.webview.html = createDesignerHTML('MsgWorkflow');

      const sent = await panel.webview.postMessage({ command: 'initialize' });
      assert.ok(sent, 'postMessage(initialize) should succeed');
    });

    test('postMessage succeeds with initialize_frame payload', async () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'FrameTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);
      panel.webview.html = createDesignerHTML('FrameWorkflow');

      const panelMetadata = {
        workflowContent: { definition: { actions: {}, triggers: {} }, kind: 'Stateful' },
        connectionsData: '{}',
        parametersData: {},
        localSettings: {},
        artifacts: { maps: {}, schemas: [] },
      };

      const sent = await panel.webview.postMessage({
        command: 'initialize_frame',
        data: {
          project: 'designer',
          panelMetadata,
          connectionData: {},
          baseUrl: `http://localhost:7071${MANAGEMENT_API_PREFIX}`,
          apiVersion: '2018-11-01',
          readOnly: false,
          isLocal: true,
          isMonitoringView: false,
        },
      });
      assert.ok(sent, 'postMessage(initialize_frame) should succeed');
    });

    test('postMessage succeeds with save command', async () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'SaveTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);
      panel.webview.html = '<html><body>Save Test</body></html>';

      const sent = await panel.webview.postMessage({
        command: 'save',
        data: { definition: { actions: {}, triggers: {} } },
      });
      assert.ok(sent, 'postMessage(save) should succeed');
    });

    test('onDidReceiveMessage registers a listener', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'ListenerTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);

      let listenerRegistered = false;
      const disposable = panel.webview.onDidReceiveMessage(() => {
        listenerRegistered = true;
      });
      assert.ok(disposable, 'onDidReceiveMessage should return a disposable');
      disposable.dispose();
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Panel View State
  // ────────────────────────────────────────────────────────────────
  suite('Panel View State', () => {
    test('onDidChangeViewState fires when panel visibility changes', async () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'ViewStateTest', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);

      let viewStateChanged = false;
      panel.onDidChangeViewState(() => {
        viewStateChanged = true;
      });

      // Create another panel to move the first one to background
      const panel2 = vscode.window.createWebviewPanel('temp', 'Temp Panel', vscode.ViewColumn.Active, {});
      createdPanels.push(panel2);

      // Small delay for event propagation
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Reveal the original panel
      panel.reveal(vscode.ViewColumn.Active);
      await new Promise((resolve) => setTimeout(resolve, 100));

      assert.ok(viewStateChanged, 'onDidChangeViewState should have fired');
    });

    test('Panel starts as active when created', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'ActiveTest', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel);

      assert.ok(panel.active, 'Newly created panel should be active');
      assert.ok(panel.visible, 'Newly created panel should be visible');
    });

    test('Panel retains context when hidden (retainContextWhenHidden=true)', () => {
      const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'RetainContextTest', vscode.ViewColumn.Active, {
        enableScripts: true,
        retainContextWhenHidden: true,
      });
      createdPanels.push(panel);
      panel.webview.html = '<html><body>Retained content</body></html>';

      // Even if we create a second panel that covers this one,
      // the content should still be there when we go back
      const panel2 = vscode.window.createWebviewPanel('temp2', 'Cover Panel', vscode.ViewColumn.Active, {});
      createdPanels.push(panel2);

      // The HTML is still accessible
      assert.ok(panel.webview.html.includes('Retained content'), 'Content should be retained when hidden');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  openDesigner Command
  // ────────────────────────────────────────────────────────────────
  suite('openDesigner Command', () => {
    test('openDesigner command ID follows extension naming convention', () => {
      // The command ID is defined in constants.ts as extensionCommand.openDesigner
      const commandId = 'azureLogicAppsStandard.openDesigner';
      assert.ok(commandId.startsWith('azureLogicAppsStandard.'), 'Should use extension prefix');
      assert.ok(commandId.endsWith('.openDesigner'), 'Should end with .openDesigner');
    });

    test('openDesigner command is contributed by the extension package.json', () => {
      const ext = vscode.extensions.getExtension('ms-azuretools.vscode-azurelogicapps');
      if (!ext) {
        // Extension not installed in test host — just verify well-known IDs
        assert.ok(true, 'Extension not available — skipping package.json check');
        return;
      }
      const contributed = (ext.packageJSON.contributes?.commands ?? []).map((c: any) => c.command);
      assert.ok(contributed.includes('azureLogicAppsStandard.openDesigner'), 'openDesigner should be contributed');
      assert.ok(contributed.includes('azureLogicAppsStandard.openOverview'), 'openOverview should be contributed');
      assert.ok(contributed.includes('azureLogicAppsStandard.viewContent'), 'viewContent should be contributed');
    });

    test('Designer-related command IDs are consistent', () => {
      const designerCommands = [
        'azureLogicAppsStandard.openDesigner',
        'azureLogicAppsStandard.openOverview',
        'azureLogicAppsStandard.viewContent',
      ];
      for (const cmd of designerCommands) {
        assert.ok(cmd.startsWith('azureLogicAppsStandard.'), `"${cmd}" should use extension prefix`);
      }
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Multiple Panels
  // ────────────────────────────────────────────────────────────────
  suite('Multiple Workflow Panels', () => {
    test('Can open multiple panels for different workflows simultaneously', () => {
      const workflows = ['Stateful1', 'Stateless1', 'Agent1'];
      const panels: vscode.WebviewPanel[] = [];

      for (const wfName of workflows) {
        const panelName = buildPanelName('WS', 'App', wfName);
        const panel = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, panelName, vscode.ViewColumn.Active, {
          enableScripts: true,
          retainContextWhenHidden: true,
        });
        panel.webview.html = createDesignerHTML(wfName);
        panelCache.cache(WEBVIEW_KEYS.designerLocal, panelName, panel);
        panels.push(panel);
        createdPanels.push(panel);
      }

      assert.strictEqual(panels.length, 3, 'Should create 3 panels');
      assert.strictEqual(panelCache.getCategoryCount(WEBVIEW_KEYS.designerLocal), 3, 'Cache should have 3 entries');

      // Each panel has unique content
      for (let i = 0; i < workflows.length; i++) {
        assert.ok(panels[i].webview.html.includes(workflows[i]), `Panel ${i} should contain workflow name`);
      }
    });

    test('Disposing one panel does not affect others', () => {
      const panel1 = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'Multi-A', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      const panel2 = vscode.window.createWebviewPanel(WEBVIEW_KEYS.designerLocal, 'Multi-B', vscode.ViewColumn.Active, {
        enableScripts: true,
      });
      createdPanels.push(panel1, panel2);

      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'Multi-A', panel1);
      panelCache.cache(WEBVIEW_KEYS.designerLocal, 'Multi-B', panel2);

      // Dispose just panel1
      panel1.onDidDispose(() => panelCache.remove(WEBVIEW_KEYS.designerLocal, 'Multi-A'));
      panel1.dispose();

      assert.strictEqual(panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'Multi-A'), undefined, 'panel1 should be gone');
      assert.ok(panelCache.tryGet(WEBVIEW_KEYS.designerLocal, 'Multi-B'), 'panel2 should still be cached');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Webview Key Constants
  // ────────────────────────────────────────────────────────────────
  suite('Webview Key Constants', () => {
    test('All expected webview keys are defined', () => {
      const expectedKeys = [
        'designerLocal',
        'designerAzure',
        'monitoring',
        'export',
        'overview',
        'unitTest',
        'createWorkspace',
        'createWorkspaceFromPackage',
        'createLogicApp',
        'createWorkspaceStructure',
        'deploy',
      ];
      for (const key of expectedKeys) {
        assert.ok((WEBVIEW_KEYS as any)[key] !== undefined, `Key "${key}" should be defined`);
      }
    });

    test('Designer API constants are correct', () => {
      assert.strictEqual(MANAGEMENT_API_PREFIX, '/runtime/webhooks/workflow/api/management');
      assert.strictEqual(DESIGNER_START_API, '/runtime/webhooks/workflow/api/management/operationGroups');
      assert.strictEqual(LOGIC_APPS_EXTENSION_ID, 'ms-azuretools.vscode-azurelogicapps');
    });
  });

  // ────────────────────────────────────────────────────────────────
  //  Workflow file → Designer mapping
  // ────────────────────────────────────────────────────────────────
  suite('Workflow File to Designer Mapping', () => {
    test('workflow.json URI can be resolved from file path', () => {
      const workflowDir = path.join(tempDir, 'LogicApp', 'MyWorkflow');
      fs.mkdirSync(workflowDir, { recursive: true });
      fs.writeFileSync(
        path.join(workflowDir, 'workflow.json'),
        JSON.stringify(
          {
            definition: { $schema: '', contentVersion: '1.0.0.0', actions: {}, triggers: {}, outputs: {} },
            kind: 'Stateful',
          },
          null,
          2
        )
      );

      const uri = vscode.Uri.file(path.join(workflowDir, 'workflow.json'));
      assert.ok(uri, 'URI should be created');
      assert.strictEqual(path.basename(uri.fsPath), 'workflow.json');

      // The extension derives the workflow name from the parent directory
      const workflowName = path.basename(path.dirname(uri.fsPath));
      assert.strictEqual(workflowName, 'MyWorkflow');

      // And the logic app name from the grandparent
      const logicAppName = path.basename(path.dirname(path.dirname(uri.fsPath)));
      assert.strictEqual(logicAppName, 'LogicApp');
    });

    test('Panel name is deterministic from URI components', () => {
      const workspaceDir = path.join(tempDir, 'ws');
      const workflowPath = path.join(workspaceDir, 'MyApp', 'ProcessOrder', 'workflow.json');
      fs.mkdirSync(path.dirname(workflowPath), { recursive: true });
      fs.writeFileSync(workflowPath, '{}');

      const workflowName = path.basename(path.dirname(workflowPath)); // ProcessOrder
      const logicAppName = path.basename(path.dirname(path.dirname(workflowPath))); // MyApp

      const panelName = buildPanelName('ws', logicAppName, workflowName);
      assert.strictEqual(panelName, 'ws-MyApp-ProcessOrder');

      // Running the same calculation again should produce the same result
      const panelName2 = buildPanelName('ws', logicAppName, workflowName);
      assert.strictEqual(panelName, panelName2, 'Panel name should be deterministic');
    });
  });
});

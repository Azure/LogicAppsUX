/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExtensionCommand } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import { mkdirSync, promises as fs, readFileSync, unlinkSync } from 'fs';
import { RelativePattern, workspace } from 'vscode';
import { ext } from '../../../../extensionVariables';
import {
  customFunctionsPath,
  customXsltPath,
  dataMapDefinitionsPath,
  dataMapsPath,
  draftMapDefinitionSuffix,
  mapDefinitionExtension,
  mapXsltExtension,
  schemasPath,
} from '../extensionConfig';
import DataMapperPanel from '../DataMapperPanel';

const fsMocks = vi.hoisted(() => ({
  copyFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  readFileSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ isDirectory: () => false })),
  unlinkSync: vi.fn(),
  promises: {
    mkdir: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue('generated xslt'),
    readdir: vi.fn().mockResolvedValue([]),
    writeFile: vi.fn().mockResolvedValue(undefined),
  },
}));

const vscodeMocks = vi.hoisted(() => {
  class MockRelativePattern {
    constructor(
      public base: string,
      public pattern: string
    ) {}
  }

  return {
    RelativePattern: MockRelativePattern,
    commands: {
      executeCommand: vi.fn(),
    },
    window: {
      showErrorMessage: vi.fn(),
      showInformationMessage: vi.fn().mockResolvedValue(undefined),
      showOpenDialog: vi.fn().mockResolvedValue([]),
      showTextDocument: vi.fn(),
      showWarningMessage: vi.fn(),
    },
    workspace: {
      createFileSystemWatcher: vi.fn(),
      fs: {
        readFile: vi.fn(),
      },
      getConfiguration: vi.fn(() => ({
        get: vi.fn(() => undefined),
      })),
      openTextDocument: vi.fn(),
    },
  };
});

const extensionState = vi.hoisted(() => ({
  context: {
    extensionPath: '/extension',
    subscriptions: [] as any[],
  },
  dataMapPanelManagers: {} as Record<string, any>,
  designTimeInstances: new Map<string, { port?: number }>(),
  outputChannel: {
    appendLine: vi.fn(),
  },
  prefix: 'azureLogicAppsStandard',
  showError: vi.fn(),
  telemetryReporter: {
    sendTelemetryEvent: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  ...fsMocks,
  promises: fsMocks.promises,
}));

vi.mock('vscode', () => ({
  RelativePattern: vscodeMocks.RelativePattern,
  commands: vscodeMocks.commands,
  window: vscodeMocks.window,
  workspace: vscodeMocks.workspace,
}));

vi.mock('../../../../extensionVariables', () => ({
  ext: extensionState,
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMessage: string, ...values: string[]) =>
    values.reduce((message, value, index) => message.replace(`{${index}}`, value), defaultMessage),
}));

vi.mock('../../../utils/codeless/getWebViewHTML', () => ({
  getWebViewHTML: vi.fn().mockResolvedValue('<html></html>'),
}));

vi.mock('../DataMapperPanelUtils', () => ({
  copyOverImportedSchemas: vi.fn(),
}));

vi.mock('../../setDataMapperVersion', () => ({
  switchToDataMapperV2: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  callWithTelemetryAndErrorHandlingSync: (_command: string, callback: (context: any) => unknown) =>
    callback({
      telemetry: {
        properties: {},
      },
    }),
}));

interface MockWatcher {
  dispose: ReturnType<typeof vi.fn>;
  onDidCreate: ReturnType<typeof vi.fn>;
  onDidDelete: ReturnType<typeof vi.fn>;
}

interface MockPanel {
  title: string;
  webview: {
    html: string;
    onDidReceiveMessage: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };
  onDidDispose: ReturnType<typeof vi.fn>;
}

function createPanel(): MockPanel {
  return {
    title: '',
    webview: {
      html: '',
      onDidReceiveMessage: vi.fn(),
      postMessage: vi.fn(),
    },
    onDidDispose: vi.fn(),
  };
}

function createWatcher(): MockWatcher {
  return {
    dispose: vi.fn(),
    onDidCreate: vi.fn(),
    onDidDelete: vi.fn(),
  };
}

function createManager(projectPath = '/projects/alpha', dataMapName = 'orders') {
  const panel = createPanel();
  const panelKey = `${projectPath}::${dataMapName}`;
  const manager = new DataMapperPanel(panel as any, dataMapName, panelKey, projectPath);
  return { manager, panel, panelKey };
}

describe('DataMapperPanel project binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    extensionState.context.subscriptions.length = 0;
    extensionState.designTimeInstances.clear();
    for (const panelKey of Object.keys(extensionState.dataMapPanelManagers)) {
      delete extensionState.dataMapPanelManagers[panelKey];
    }

    fsMocks.existsSync.mockReturnValue(false);
    fsMocks.promises.mkdir.mockResolvedValue(undefined);
    fsMocks.promises.readFile.mockResolvedValue('generated xslt');
    fsMocks.promises.readdir.mockResolvedValue([]);
    fsMocks.promises.writeFile.mockResolvedValue(undefined);
    vscodeMocks.window.showInformationMessage.mockResolvedValue(undefined);
    vscodeMocks.workspace.createFileSystemWatcher.mockImplementation(() => createWatcher());
  });

  it('posts the runtime port belonging to the panel project when the webview loads', () => {
    const projectPath = '/projects/alpha';
    const otherProjectPath = '/projects/beta';
    extensionState.designTimeInstances.set(projectPath, { port: 4101 });
    extensionState.designTimeInstances.set(otherProjectPath, { port: 5299 });
    const { panel } = createManager(projectPath);
    const messageHandler = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    panel.webview.postMessage.mockClear();

    messageHandler({ command: ExtensionCommand.webviewLoaded });

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: ExtensionCommand.setRuntimePort,
      data: '4101',
    });
    expect(panel.webview.postMessage).not.toHaveBeenCalledWith(
      expect.objectContaining({
        command: ExtensionCommand.setRuntimePort,
        data: '5299',
      })
    );
  });

  it('roots constructor-created folders and file watchers under the panel project', () => {
    const projectPath = '/projects/alpha';
    const schemaPath = path.join(projectPath, schemasPath);
    const xsltExtensionsPath = path.join(projectPath, customXsltPath);
    fsMocks.existsSync.mockImplementation((candidate) => candidate === schemaPath || candidate === xsltExtensionsPath);

    createManager(projectPath);

    expect(mkdirSync).toHaveBeenCalledWith(path.join(projectPath, customXsltPath), { recursive: true });
    expect(mkdirSync).toHaveBeenCalledWith(path.join(projectPath, customFunctionsPath), { recursive: true });
    expect(workspace.createFileSystemWatcher).toHaveBeenCalledTimes(2);
    expect(workspace.createFileSystemWatcher).toHaveBeenCalledWith(
      expect.objectContaining<RelativePattern>({
        base: schemaPath,
      })
    );
    expect(workspace.createFileSystemWatcher).toHaveBeenCalledWith(
      expect.objectContaining<RelativePattern>({
        base: xsltExtensionsPath,
      })
    );
  });

  it('removes only its composite-key entry and disposes only its own watchers', () => {
    fsMocks.existsSync.mockReturnValue(true);
    const firstProjectPath = '/projects/alpha';
    const secondProjectPath = '/projects/beta';
    const firstWatchers = [createWatcher(), createWatcher()];
    const secondWatchers = [createWatcher(), createWatcher()];
    vscodeMocks.workspace.createFileSystemWatcher
      .mockReturnValueOnce(firstWatchers[0])
      .mockReturnValueOnce(firstWatchers[1])
      .mockReturnValueOnce(secondWatchers[0])
      .mockReturnValueOnce(secondWatchers[1]);

    const first = createManager(firstProjectPath);
    const second = createManager(secondProjectPath);
    extensionState.dataMapPanelManagers[first.panelKey] = first.manager;
    extensionState.dataMapPanelManagers[second.panelKey] = second.manager;

    const firstDisposeHandler = first.panel.onDidDispose.mock.calls[0][0];
    firstDisposeHandler();

    expect(extensionState.dataMapPanelManagers[first.panelKey]).toBeUndefined();
    expect(extensionState.dataMapPanelManagers[second.panelKey]).toBe(second.manager);
    for (const watcher of firstWatchers) {
      expect(watcher.dispose).toHaveBeenCalledTimes(1);
    }
    for (const watcher of secondWatchers) {
      expect(watcher.dispose).not.toHaveBeenCalled();
    }
  });

  it.each([
    {
      category: 'map definition',
      expectedRelativePath: path.join(dataMapDefinitionsPath, `orders${mapDefinitionExtension}`),
      run: (manager: DataMapperPanel, contents: string) => manager.saveMapDefinition(contents),
    },
    {
      category: 'draft map definition',
      expectedRelativePath: path.join(dataMapDefinitionsPath, `orders${draftMapDefinitionSuffix}${mapDefinitionExtension}`),
      run: (manager: DataMapperPanel, contents: string) => manager.saveDraftDataMapDefinition(contents),
    },
    {
      category: 'generated XSLT',
      expectedRelativePath: path.join(dataMapsPath, `orders${mapXsltExtension}`),
      run: (manager: DataMapperPanel, contents: string) => manager.saveMapXslt(contents),
    },
    {
      category: 'map metadata',
      expectedRelativePath: path.join('.vscode', 'ordersDataMapMetadata-v2.json'),
      run: (manager: DataMapperPanel, contents: string) => manager.saveMapMetadata(contents),
    },
  ])('writes $category under the panel project', async ({ expectedRelativePath, run }) => {
    const projectPath = '/projects/alpha';
    const contents = 'project-specific contents';
    const { manager } = createManager(projectPath);

    run(manager, contents);

    await vi.waitFor(() => {
      expect(fs.writeFile).toHaveBeenCalledWith(path.join(projectPath, expectedRelativePath), contents, 'utf8');
    });
  });

  it('deletes the draft map definition only from the panel project', () => {
    const projectPath = '/projects/alpha';
    const expectedDraftPath = path.join(projectPath, dataMapDefinitionsPath, `orders${draftMapDefinitionSuffix}${mapDefinitionExtension}`);
    fsMocks.existsSync.mockImplementation((candidate) => candidate === expectedDraftPath);
    const { manager } = createManager(projectPath);

    manager.deleteDraftDataMapDefinition();

    expect(unlinkSync).toHaveBeenCalledWith(expectedDraftPath);
  });

  it('reads XSLT and metadata from the panel project', async () => {
    const projectPath = '/projects/alpha';
    const expectedXsltPath = path.join(projectPath, dataMapsPath, `orders${mapXsltExtension}`);
    const expectedMetadataPath = path.join(projectPath, '.vscode', 'ordersDataMapMetadata-v2.json');
    fsMocks.existsSync.mockImplementation((candidate) => candidate === expectedXsltPath || candidate === expectedMetadataPath);
    fsMocks.readFileSync.mockReturnValue(Buffer.from('{"position":{"x":1}}'));
    fsMocks.promises.readFile.mockResolvedValue('<xsl:stylesheet />');
    const { manager, panel } = createManager(projectPath);
    manager.mapDefinitionData = { mapDefinition: { source: 'alpha' } } as any;
    panel.webview.postMessage.mockClear();

    manager.handleLoadMapDefinitionIfAny();

    expect(readFileSync).toHaveBeenCalledWith(expectedMetadataPath);
    await vi.waitFor(() => {
      expect(fs.readFile).toHaveBeenCalledWith(expectedXsltPath, 'utf-8');
    });
    expect(panel.webview.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        command: ExtensionCommand.loadDataMap,
        data: expect.objectContaining({
          metadata: { position: { x: 1 } },
        }),
      })
    );
  });
});

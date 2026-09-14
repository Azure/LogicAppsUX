/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ViewColumn, window } from 'vscode';
import { ext } from '../../../../extensionVariables';
import DataMapperExt, { getDataMapPanelKey } from '../DataMapperExt';

const mocks = vi.hoisted(() => {
  const dataMapperPanelConstructor = vi.fn(function (panel: any, dataMapName: string, panelKey: string, projectPath: string) {
    return {
      panel,
      dataMapName,
      panelKey,
      projectPath,
      updateWebviewPanelTitle: vi.fn(),
      mapDefinitionData: undefined,
    };
  });

  return {
    dataMapperPanelConstructor,
    startBackendRuntime: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('../DataMapperPanel', () => ({
  default: mocks.dataMapperPanelConstructor,
}));

vi.mock('../FxWorkflowRuntime', () => ({
  startBackendRuntime: mocks.startBackendRuntime,
}));

vi.mock('../../../../localize', () => ({
  localize: (_key: string, defaultMessage: string) => defaultMessage,
}));

interface MockWebviewPanel {
  iconPath?: unknown;
  reveal: ReturnType<typeof vi.fn>;
  webview: {
    html: string;
    onDidReceiveMessage: ReturnType<typeof vi.fn>;
    postMessage: ReturnType<typeof vi.fn>;
  };
}

describe('DataMapperExt panel identity', () => {
  const context = {
    ui: {
      showInputBox: vi.fn(),
    },
  } as unknown as IActionContext;

  beforeEach(() => {
    vi.clearAllMocks();
    (ext as any).dataMapPanelManagers ??= {};
    for (const panelKey of Object.keys(ext.dataMapPanelManagers)) {
      delete ext.dataMapPanelManagers[panelKey];
    }

    (ext as any).context = {
      extensionPath: '/extension',
      subscriptions: [],
    };

    vi.mocked(window.createWebviewPanel).mockImplementation(
      () =>
        ({
          iconPath: undefined,
          reveal: vi.fn(),
          webview: {
            html: '',
            onDidReceiveMessage: vi.fn(),
            postMessage: vi.fn(),
          },
        }) as any
    );
  });

  it('reveals the existing panel for the same project path and map name', async () => {
    const projectPath = '/projects/alpha';
    const dataMapName = 'orders';

    await DataMapperExt.openDataMapperPanel(context, projectPath, dataMapName);
    const existingManager = ext.dataMapPanelManagers[getDataMapPanelKey(projectPath, dataMapName)];
    const existingPanel = existingManager.panel as unknown as MockWebviewPanel;

    await DataMapperExt.openDataMapperPanel(context, projectPath, dataMapName);

    expect(window.createWebviewPanel).toHaveBeenCalledTimes(1);
    expect(mocks.dataMapperPanelConstructor).toHaveBeenCalledTimes(1);
    expect(existingPanel.reveal).toHaveBeenCalledWith(ViewColumn.Active);
    expect(ext.dataMapPanelManagers[getDataMapPanelKey(projectPath, dataMapName)]).toBe(existingManager);
  });

  it('registers identically named maps from different projects under separate composite keys', async () => {
    const dataMapName = 'orders';
    const firstProjectPath = '/projects/alpha';
    const secondProjectPath = '/projects/beta';

    await DataMapperExt.openDataMapperPanel(context, firstProjectPath, dataMapName);
    await DataMapperExt.openDataMapperPanel(context, secondProjectPath, dataMapName);

    const firstKey = getDataMapPanelKey(firstProjectPath, dataMapName);
    const secondKey = getDataMapPanelKey(secondProjectPath, dataMapName);
    const firstManager = ext.dataMapPanelManagers[firstKey];
    const secondManager = ext.dataMapPanelManagers[secondKey];

    expect(firstKey).not.toBe(secondKey);
    expect(firstManager).toBeDefined();
    expect(secondManager).toBeDefined();
    expect(firstManager).not.toBe(secondManager);
    expect(mocks.dataMapperPanelConstructor).toHaveBeenNthCalledWith(1, expect.anything(), dataMapName, firstKey, firstProjectPath);
    expect(mocks.dataMapperPanelConstructor).toHaveBeenNthCalledWith(2, expect.anything(), dataMapName, secondKey, secondProjectPath);
  });

  it('attaches map definition data only to the manager for its project', async () => {
    const dataMapName = 'orders';
    const firstProjectPath = '/projects/alpha';
    const secondProjectPath = '/projects/beta';
    const firstMapDefinitionData = { mapDefinition: { source: 'alpha' } } as any;
    const secondMapDefinitionData = { mapDefinition: { source: 'beta' } } as any;

    await DataMapperExt.openDataMapperPanel(context, firstProjectPath, dataMapName, firstMapDefinitionData);
    await DataMapperExt.openDataMapperPanel(context, secondProjectPath, dataMapName, secondMapDefinitionData);

    expect(ext.dataMapPanelManagers[getDataMapPanelKey(firstProjectPath, dataMapName)].mapDefinitionData).toBe(firstMapDefinitionData);
    expect(ext.dataMapPanelManagers[getDataMapPanelKey(secondProjectPath, dataMapName)].mapDefinitionData).toBe(secondMapDefinitionData);
  });
});

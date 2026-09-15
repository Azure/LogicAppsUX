import { routeProjectOverviewMessage } from '../app/projectOverview/messageRouter';
import projectOverviewReducer from '../state/ProjectOverviewSlice';
import { projectSlice } from '../state/projectSlice';
import { configureStore } from '@reduxjs/toolkit';
import {
  ExtensionCommand,
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  type ProjectOverviewProjectId,
  type ProjectOverviewSnapshot,
} from '@microsoft/vscode-extension-logic-apps';
import { describe, expect, it } from 'vitest';

const projectId = 'project-id' as ProjectOverviewProjectId;
const snapshot = (generation: number): ProjectOverviewSnapshot => ({
  projectId,
  projectName: 'LogicApp',
  lifecycle: ProjectOverviewLifecycle.Ready,
  runtime: { state: ProjectOverviewRuntimeState.Running, generation: 1 },
  generation,
  generatedAt: '2026-09-14T00:00:00.000Z',
  isRefreshing: false,
  workflows: [],
  errors: [],
});

describe('project overview message routing', () => {
  it('routes initialize, generation-safe updates, and visibility messages', () => {
    const store = configureStore({
      reducer: {
        project: projectSlice.reducer,
        projectOverview: projectOverviewReducer,
      },
    });

    expect(
      routeProjectOverviewMessage(store.dispatch, {
        command: ExtensionCommand.initializeProjectOverview,
        data: { snapshot: snapshot(2), visible: true },
      })
    ).toBe(true);
    routeProjectOverviewMessage(store.dispatch, {
      command: ExtensionCommand.updateProjectOverview,
      data: { snapshot: snapshot(3) },
    });
    routeProjectOverviewMessage(store.dispatch, {
      command: ExtensionCommand.updateProjectOverview,
      data: { snapshot: snapshot(1) },
    });
    routeProjectOverviewMessage(store.dispatch, {
      command: ExtensionCommand.projectOverviewVisibilityChanged,
      data: { projectId, visible: false },
    });

    expect(store.getState().project).toMatchObject({ initialized: true, project: 'overview' });
    expect(store.getState().projectOverview).toMatchObject({
      initialized: true,
      snapshot: { generation: 3 },
      visible: false,
    });
  });

  it('leaves unrelated messages for the existing project routers', () => {
    const dispatch = (() => undefined) as any;

    expect(
      routeProjectOverviewMessage(dispatch, {
        command: ExtensionCommand.updateProjectOverview,
        data: { snapshot: snapshot(1) },
      })
    ).toBe(true);
    expect(routeProjectOverviewMessage(dispatch, { command: ExtensionCommand.initialize } as any)).toBe(false);
  });
});

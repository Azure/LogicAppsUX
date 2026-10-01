import reducer, {
  initializeProjectOverview,
  initialProjectOverviewState,
  updateProjectOverview,
  updateProjectOverviewVisibility,
} from '../ProjectOverviewSlice';
import {
  ProjectOverviewLifecycle,
  ProjectOverviewRuntimeState,
  type ProjectOverviewProjectId,
  type ProjectOverviewSnapshot,
} from '@microsoft/vscode-extension-logic-apps';
import { describe, expect, it } from 'vitest';

const projectId = 'project-1' as ProjectOverviewProjectId;

const createSnapshot = (generation: number): ProjectOverviewSnapshot => ({
  errors: [],
  generatedAt: '2026-09-14T00:00:00.000Z',
  generation,
  isRefreshing: false,
  lifecycle: ProjectOverviewLifecycle.Ready,
  projectId,
  projectName: 'My project',
  runtime: {
    generation: 1,
    state: ProjectOverviewRuntimeState.Running,
  },
  workflows: [],
});

describe('ProjectOverviewSlice', () => {
  it('initializes the snapshot and visibility', () => {
    const state = reducer(
      initialProjectOverviewState,
      initializeProjectOverview({
        snapshot: createSnapshot(2),
        visible: false,
      })
    );

    expect(state).toMatchObject({
      initialized: true,
      snapshot: { generation: 2 },
      visible: false,
    });
  });

  it('ignores stale generations and snapshots for another project', () => {
    const initialized = reducer(initialProjectOverviewState, initializeProjectOverview({ snapshot: createSnapshot(4), visible: true }));

    expect(reducer(initialized, updateProjectOverview({ snapshot: createSnapshot(3) })).snapshot?.generation).toBe(4);
    expect(
      reducer(
        initialized,
        updateProjectOverview({
          snapshot: {
            ...createSnapshot(5),
            projectId: 'other-project' as ProjectOverviewProjectId,
          },
        })
      ).snapshot?.projectId
    ).toBe(projectId);
  });

  it('accepts current and newer updates and matching visibility messages', () => {
    let state = reducer(initialProjectOverviewState, initializeProjectOverview({ snapshot: createSnapshot(1), visible: true }));
    state = reducer(state, updateProjectOverview({ snapshot: createSnapshot(2) }));
    state = reducer(state, updateProjectOverviewVisibility({ projectId, visible: false }));

    expect(state.snapshot?.generation).toBe(2);
    expect(state.visible).toBe(false);
  });
});

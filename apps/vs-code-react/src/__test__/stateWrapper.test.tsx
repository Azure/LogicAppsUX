import { ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { Provider } from 'react-redux';
import React from 'react';
import { StateWrapper } from '../stateWrapper';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { projectSlice } from '../state/projectSlice';
import { render } from '@testing-library/react';

const { navigate } = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

function renderStateWrapper(projectState: { initialized: boolean; project?: string; route?: string }) {
  const store = configureStore({
    reducer: {
      project: projectSlice.reducer,
    },
    preloadedState: {
      project: projectState,
    },
  });

  render(
    <Provider store={store}>
      <StateWrapper />
    </Provider>
  );
}

describe('StateWrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    [ProjectName.export, undefined, `/${ProjectName.export}/${RouteName.instance_selection}`],
    [ProjectName.review, undefined, `/${ProjectName.review}`],
    [ProjectName.overview, undefined, `/${ProjectName.overview}`],
    [ProjectName.designer, undefined, `/${ProjectName.designer}`],
    [ProjectName.dataMapper, undefined, `/${ProjectName.dataMapper}`],
    [ProjectName.unitTest, undefined, `/${ProjectName.unitTest}`],
    [ProjectName.createWorkspace, undefined, `/${ProjectName.createWorkspace}`],
    [ProjectName.createWorkspaceFromPackage, undefined, `/${ProjectName.createWorkspaceFromPackage}`],
    [ProjectName.createLogicApp, undefined, `/${ProjectName.createLogicApp}`],
    [ProjectName.createWorkflow, undefined, `/${ProjectName.createWorkflow}`],
    [ProjectName.createWorkspaceStructure, undefined, `/${ProjectName.createWorkspaceStructure}`],
    [ProjectName.languageServer, RouteName.connectionView, `/${RouteName.languageServer}/${RouteName.connectionView}`],
  ])('navigates initialized %s projects to %s', (project, route, expectedPath) => {
    renderStateWrapper({
      initialized: true,
      project,
      route,
    });

    expect(navigate).toHaveBeenCalledWith(expectedPath, { replace: true });
  });

  it('does not navigate before initialization', () => {
    renderStateWrapper({
      initialized: false,
    });

    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not navigate language server projects without a supported route', () => {
    renderStateWrapper({
      initialized: true,
      project: ProjectName.languageServer,
    });

    expect(navigate).not.toHaveBeenCalled();
  });
});

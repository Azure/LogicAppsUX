import { ProjectName, RouteName } from '@microsoft/vscode-extension-logic-apps';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { projectSlice } from '../state/projectSlice';
import { StateWrapper } from '../stateWrapper';

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current route">{location.pathname}</output>
      <button type="button" onClick={() => navigate(-1)}>
        Back
      </button>
    </>
  );
}

describe('StateWrapper with the real router', () => {
  it.each([
    [ProjectName.export, undefined, `/${ProjectName.export}/${RouteName.instance_selection}`],
    [ProjectName.review, undefined, `/${ProjectName.review}`],
    [ProjectName.overview, undefined, `/${ProjectName.overview}`],
    [ProjectName.designer, undefined, `/${ProjectName.designer}`],
    [ProjectName.dataMapper, undefined, `/${ProjectName.dataMapper}`],
    [ProjectName.createWorkspace, undefined, `/${ProjectName.createWorkspace}`],
    [ProjectName.createWorkspaceFromPackage, undefined, `/${ProjectName.createWorkspaceFromPackage}`],
    [ProjectName.createLogicApp, undefined, `/${ProjectName.createLogicApp}`],
    [ProjectName.createWorkflow, undefined, `/${ProjectName.createWorkflow}`],
    [ProjectName.createWorkspaceStructure, undefined, `/${ProjectName.createWorkspaceStructure}`],
    [ProjectName.languageServer, RouteName.connectionView, `/${RouteName.languageServer}/${RouteName.connectionView}`],
  ])('initializes %s and replaces the loading route without breaking Back', async (project, route, expectedPath) => {
    const store = configureStore({
      reducer: { project: projectSlice.reducer },
      preloadedState: { project: { initialized: true, project, route } },
    });
    render(
      <Provider store={store}>
        <MemoryRouter initialEntries={['/previous', '/']}>
          <Routes>
            <Route path="/" element={<StateWrapper />} />
            <Route path="*" element={<LocationProbe />} />
          </Routes>
        </MemoryRouter>
      </Provider>
    );

    expect(await screen.findByLabelText('Current route')).toHaveTextContent(expectedPath);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/previous');
  });
});

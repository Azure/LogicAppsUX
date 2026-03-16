/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { KnowledgeHubPanel } from '../panelroot';
import { KnowledgePanelView } from '../../../../core/state/knowledge/panelSlice';

// Mock child components
vi.mock('../addfile', () => ({
  AddFilePanel: ({ resourceId }: { resourceId: string }) => <div data-testid="add-file-panel">AddFilePanel: {resourceId}</div>,
}));

vi.mock('../connection/create', () => ({
  CreateConnectionPanel: () => <div data-testid="connection-panel">ConnectionPanel: create</div>,
}));

vi.mock('../connection/edit', () => ({
  EditConnectionPanel: () => <div data-testid="connection-panel">ConnectionPanel: edit</div>,
}));

describe('KnowledgeHubPanel Component', () => {
  const resourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';

  const createMockStore = (panelState = { isOpen: false, currentPanelView: undefined }) => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => panelState,
      },
    });
  };

  const renderComponent = (store = createMockStore()) => {
    const ref = React.createRef<HTMLDivElement>();
    return render(
      <Provider store={store}>
        <div ref={ref}>
          <KnowledgeHubPanel resourceId={resourceId} mountNode={ref.current} />
        </div>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when panel is closed', () => {
    const store = createMockStore({ isOpen: false, currentPanelView: undefined });
    const { container } = renderComponent(store);

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('renders nothing when panel is open but no valid view', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: undefined });
    const { container } = renderComponent(store);

    expect(container.firstChild).toBeEmptyDOMElement();
  });

  it('renders AddFilePanel when view is AddFiles', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
    renderComponent(store);

    expect(screen.getByTestId('add-file-panel')).toBeInTheDocument();
    expect(screen.getByText(`AddFilePanel: ${resourceId}`)).toBeInTheDocument();
  });

  it('renders CreateConnectionPanel in create mode when view is CreateConnection', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
    renderComponent(store);

    expect(screen.getByTestId('connection-panel')).toBeInTheDocument();
    expect(screen.getByText('ConnectionPanel: create')).toBeInTheDocument();
  });

  it('renders EditConnectionPanel in edit mode when view is EditConnection', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
    renderComponent(store);

    expect(screen.getByTestId('connection-panel')).toBeInTheDocument();
    expect(screen.getByText('ConnectionPanel: edit')).toBeInTheDocument();
  });

  it('does not render AddFilePanel for connection views', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
    renderComponent(store);

    expect(screen.queryByTestId('add-file-panel')).not.toBeInTheDocument();
  });

  it('does not render ConnectionPanel for AddFiles view', () => {
    const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
    renderComponent(store);

    expect(screen.queryByTestId('connection-panel')).not.toBeInTheDocument();
  });

  it('handles null knowledgeHubPanel state gracefully', () => {
    const store = configureStore({
      reducer: {
        knowledgeHubPanel: () => null as any,
      },
    });
    const { container } = renderComponent(store);

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});

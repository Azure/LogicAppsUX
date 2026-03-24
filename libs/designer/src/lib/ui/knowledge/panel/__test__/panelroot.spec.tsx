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

// Mock child components with prop capture
const mockAddFilePanel = vi.fn();
const mockCreateConnectionPanel = vi.fn();
const mockEditConnectionPanel = vi.fn();

vi.mock('../addfile', () => ({
  AddFilePanel: (props: any) => {
    mockAddFilePanel(props);
    return (
      <div data-testid="add-file-panel">
        AddFilePanel: {props.resourceId}
        {props.selectedHub && <span data-testid="selected-hub">{props.selectedHub}</span>}
        {props.onUploadArtifact && <span data-testid="has-upload-handler">hasUploadHandler</span>}
      </div>
    );
  },
}));

vi.mock('../connection/create', () => ({
  CreateConnectionPanel: (props: any) => {
    mockCreateConnectionPanel(props);
    return (
      <div data-testid="create-connection-panel">
        CreateConnectionPanel
        {props.mountNode !== undefined && <span data-testid="has-mount-node">hasMountNode</span>}
      </div>
    );
  },
}));

vi.mock('../connection/edit', () => ({
  EditConnectionPanel: (props: any) => {
    mockEditConnectionPanel(props);
    return (
      <div data-testid="edit-connection-panel">
        EditConnectionPanel
        {props.mountNode !== undefined && <span data-testid="has-mount-node">hasMountNode</span>}
      </div>
    );
  },
}));

describe('KnowledgeHubPanel Component', () => {
  const resourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';
  const mockOnUploadArtifact = vi.fn();

  const createMockStore = (
    panelState: { isOpen: boolean; currentPanelView: KnowledgePanelView | undefined } = { isOpen: false, currentPanelView: undefined }
  ) => {
    return configureStore({
      reducer: {
        knowledgeHubPanel: () => panelState,
      },
    });
  };

  const renderComponent = (
    props: Partial<{
      resourceId: string;
      mountNode: HTMLDivElement | null;
      selectedHub: string;
      onUploadArtifact: typeof mockOnUploadArtifact;
    }> = {},
    store = createMockStore()
  ) => {
    const mountDiv = document.createElement('div');
    document.body.appendChild(mountDiv);

    const defaultProps = {
      resourceId,
      mountNode: mountDiv,
    };

    return render(
      <Provider store={store}>
        <KnowledgeHubPanel {...defaultProps} {...props} />
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  describe('Panel Visibility', () => {
    it('renders nothing when panel is closed', () => {
      const store = createMockStore({ isOpen: false, currentPanelView: undefined });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when panel is open but no valid view', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: undefined });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when panel is closed with AddFiles view', () => {
      const store = createMockStore({ isOpen: false, currentPanelView: KnowledgePanelView.AddFiles });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when panel is closed with CreateConnection view', () => {
      const store = createMockStore({ isOpen: false, currentPanelView: KnowledgePanelView.CreateConnection });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when panel is closed with EditConnection view', () => {
      const store = createMockStore({ isOpen: false, currentPanelView: KnowledgePanelView.EditConnection });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing for invalid panel view', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: 'InvalidView' as KnowledgePanelView });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('AddFilePanel Rendering', () => {
    it('renders AddFilePanel when view is AddFiles and onUploadArtifact is provided', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.getByTestId('add-file-panel')).toBeInTheDocument();
      expect(screen.getByText(`AddFilePanel: ${resourceId}`)).toBeInTheDocument();
    });

    it('renders nothing when view is AddFiles but onUploadArtifact is not provided', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('passes resourceId to AddFilePanel', () => {
      const customResourceId = '/subscriptions/custom-sub/resourceGroups/custom-rg/providers/Microsoft.Web/sites/customApp';
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ resourceId: customResourceId, onUploadArtifact: mockOnUploadArtifact }, store);

      expect(mockAddFilePanel).toHaveBeenCalledWith(expect.objectContaining({ resourceId: customResourceId }));
    });

    it('passes selectedHub to AddFilePanel when provided', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ selectedHub: 'myKnowledgeHub', onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.getByTestId('selected-hub')).toHaveTextContent('myKnowledgeHub');
      expect(mockAddFilePanel).toHaveBeenCalledWith(expect.objectContaining({ selectedHub: 'myKnowledgeHub' }));
    });

    it('passes onUploadArtifact to AddFilePanel when provided', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.getByTestId('has-upload-handler')).toBeInTheDocument();
      expect(mockAddFilePanel).toHaveBeenCalledWith(expect.objectContaining({ onUploadArtifact: mockOnUploadArtifact }));
    });

    it('passes mountNode to AddFilePanel', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      const customMountNode = document.createElement('div');
      renderComponent({ mountNode: customMountNode, onUploadArtifact: mockOnUploadArtifact }, store);

      expect(mockAddFilePanel).toHaveBeenCalledWith(expect.objectContaining({ mountNode: customMountNode }));
    });

    it('handles null mountNode for AddFilePanel', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ mountNode: null, onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.getByTestId('add-file-panel')).toBeInTheDocument();
      expect(mockAddFilePanel).toHaveBeenCalledWith(expect.objectContaining({ mountNode: null }));
    });

    it('does not render CreateConnectionPanel when view is AddFiles', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.queryByTestId('create-connection-panel')).not.toBeInTheDocument();
    });

    it('does not render EditConnectionPanel when view is AddFiles', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.queryByTestId('edit-connection-panel')).not.toBeInTheDocument();
    });
  });

  describe('CreateConnectionPanel Rendering', () => {
    it('renders CreateConnectionPanel when view is CreateConnection', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
      renderComponent({}, store);

      expect(screen.getByTestId('create-connection-panel')).toBeInTheDocument();
      expect(screen.getByText('CreateConnectionPanel')).toBeInTheDocument();
    });

    it('passes mountNode to CreateConnectionPanel', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
      const customMountNode = document.createElement('div');
      renderComponent({ mountNode: customMountNode }, store);

      expect(mockCreateConnectionPanel).toHaveBeenCalledWith(expect.objectContaining({ mountNode: customMountNode }));
    });

    it('handles null mountNode for CreateConnectionPanel', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
      renderComponent({ mountNode: null }, store);

      expect(screen.getByTestId('create-connection-panel')).toBeInTheDocument();
      expect(mockCreateConnectionPanel).toHaveBeenCalledWith(expect.objectContaining({ mountNode: null }));
    });

    it('does not render AddFilePanel when view is CreateConnection', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
      renderComponent({}, store);

      expect(screen.queryByTestId('add-file-panel')).not.toBeInTheDocument();
    });

    it('does not render EditConnectionPanel when view is CreateConnection', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
      renderComponent({}, store);

      expect(screen.queryByTestId('edit-connection-panel')).not.toBeInTheDocument();
    });
  });

  describe('EditConnectionPanel Rendering', () => {
    it('renders EditConnectionPanel when view is EditConnection', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
      renderComponent({}, store);

      expect(screen.getByTestId('edit-connection-panel')).toBeInTheDocument();
      expect(screen.getByText('EditConnectionPanel')).toBeInTheDocument();
    });

    it('passes mountNode to EditConnectionPanel', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
      const customMountNode = document.createElement('div');
      renderComponent({ mountNode: customMountNode }, store);

      expect(mockEditConnectionPanel).toHaveBeenCalledWith(expect.objectContaining({ mountNode: customMountNode }));
    });

    it('handles null mountNode for EditConnectionPanel', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
      renderComponent({ mountNode: null }, store);

      expect(screen.getByTestId('edit-connection-panel')).toBeInTheDocument();
      expect(mockEditConnectionPanel).toHaveBeenCalledWith(expect.objectContaining({ mountNode: null }));
    });

    it('does not render AddFilePanel when view is EditConnection', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
      renderComponent({}, store);

      expect(screen.queryByTestId('add-file-panel')).not.toBeInTheDocument();
    });

    it('does not render CreateConnectionPanel when view is EditConnection', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
      renderComponent({}, store);

      expect(screen.queryByTestId('create-connection-panel')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles null knowledgeHubPanel state gracefully', () => {
      const store = configureStore({
        reducer: {
          knowledgeHubPanel: () => null as any,
        },
      });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('handles empty object knowledgeHubPanel state gracefully', () => {
      const store = configureStore({
        reducer: {
          knowledgeHubPanel: () => ({}) as any,
        },
      });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('handles missing isOpen property in state', () => {
      const store = configureStore({
        reducer: {
          knowledgeHubPanel: () => ({ currentPanelView: KnowledgePanelView.AddFiles }) as any,
        },
      });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('handles missing currentPanelView property in state', () => {
      const store = configureStore({
        reducer: {
          knowledgeHubPanel: () => ({ isOpen: true }) as any,
        },
      });
      const { container } = renderComponent({}, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when AddFiles view and onUploadArtifact is undefined', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      const { container } = renderComponent({ selectedHub: undefined, onUploadArtifact: undefined }, store);

      expect(container.firstChild).toBeNull();
    });

    it('renders with empty string resourceId', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ resourceId: '', onUploadArtifact: mockOnUploadArtifact }, store);

      expect(screen.getByTestId('add-file-panel')).toBeInTheDocument();
      expect(mockAddFilePanel).toHaveBeenCalledWith(expect.objectContaining({ resourceId: '' }));
    });
  });

  describe('Component Mock Calls', () => {
    it('calls AddFilePanel mock exactly once for AddFiles view with onUploadArtifact', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({ onUploadArtifact: mockOnUploadArtifact }, store);

      expect(mockAddFilePanel).toHaveBeenCalledTimes(1);
      expect(mockCreateConnectionPanel).not.toHaveBeenCalled();
      expect(mockEditConnectionPanel).not.toHaveBeenCalled();
    });

    it('does not call AddFilePanel mock when onUploadArtifact is not provided', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({}, store);

      expect(mockAddFilePanel).not.toHaveBeenCalled();
    });

    it('calls CreateConnectionPanel mock exactly once for CreateConnection view', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.CreateConnection });
      renderComponent({}, store);

      expect(mockCreateConnectionPanel).toHaveBeenCalledTimes(1);
      expect(mockAddFilePanel).not.toHaveBeenCalled();
      expect(mockEditConnectionPanel).not.toHaveBeenCalled();
    });

    it('calls EditConnectionPanel mock exactly once for EditConnection view', () => {
      const store = createMockStore({ isOpen: true, currentPanelView: KnowledgePanelView.EditConnection });
      renderComponent({}, store);

      expect(mockEditConnectionPanel).toHaveBeenCalledTimes(1);
      expect(mockAddFilePanel).not.toHaveBeenCalled();
      expect(mockCreateConnectionPanel).not.toHaveBeenCalled();
    });

    it('does not call any panel mocks when panel is closed', () => {
      const store = createMockStore({ isOpen: false, currentPanelView: KnowledgePanelView.AddFiles });
      renderComponent({}, store);

      expect(mockAddFilePanel).not.toHaveBeenCalled();
      expect(mockCreateConnectionPanel).not.toHaveBeenCalled();
      expect(mockEditConnectionPanel).not.toHaveBeenCalled();
    });
  });
});

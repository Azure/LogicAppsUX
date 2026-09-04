/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { KnowledgeHubEditor } from '../index';
import { ArtifactCreationStatus } from '@microsoft/logic-apps-shared';

// Mock styles
vi.mock('../styles', () => ({
  useKnowledgeStyles: () => ({
    container: 'mock-container',
    header: 'mock-header',
    link: 'mock-link',
    sectionContent: 'mock-section-content',
    sourcesRow: 'mock-sources-row',
    uploadButton: 'mock-upload-button',
    createButton: 'mock-create-button',
    optionRoot: 'mock-option-root',
    optionContainer: 'mock-option-container',
    artifactsList: 'mock-artifacts-list',
    artifactItem: 'mock-artifact-item',
    artifactName: 'mock-artifact-name',
    statusBadge: 'mock-status-badge',
  }),
}));

// Mock queries
const mockUseAllKnowledgeHubs = vi.fn();
const mockUseConnection = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../../../../core/knowledge/utils/queries', () => ({
  useAllKnowledgeHubs: (...args: any[]) => mockUseAllKnowledgeHubs(...args),
  useConnection: () => mockUseConnection(),
}));

// Mock designer-ui
vi.mock('@microsoft/designer-ui', () => ({
  createLiteralValueSegment: (value: string) => ({ type: 'literal', value }),
  NavigateIcon: () => <span data-testid="navigate-icon">→</span>,
}));

// Mock AddFilesModal
vi.mock('../files', () => ({
  AddFilesModal: ({ onDismiss }: { onDismiss: () => void }) => (
    <div data-testid="add-files-modal">
      <button data-testid="close-files-modal" onClick={onDismiss}>
        Close
      </button>
    </div>
  ),
}));

// Mock openKnowledgeConnectionModal
const mockOpenKnowledgeConnectionModal = vi.fn(() => ({ type: 'modal/openKnowledgeConnectionModal' }));
vi.mock('../../../../core/state/modal/modalSlice', () => ({
  openKnowledgeConnectionModal: () => mockOpenKnowledgeConnectionModal(),
}));

// Mock isLiteralValueSegment
vi.mock('../../../../core/utils/parameters/segment', () => ({
  isLiteralValueSegment: (segment: any) => segment?.type === 'literal',
}));

// Mock WorkflowService
vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    WorkflowService: () => ({
      uploadFileArtifact: vi.fn(),
    }),
  };
});

describe('KnowledgeHubEditor', () => {
  const createMockStore = () => {
    return configureStore({
      reducer: {
        modal: () => ({}),
      },
    });
  };

  const defaultProps = {
    editorOptions: { logicAppId: 'test-logic-app-id' },
    onValueChange: vi.fn(),
    value: [],
    renderDefaultEditor: () => <div data-testid="default-editor">Default Editor</div>,
  };

  const renderComponent = (props = defaultProps, store = createMockStore()) => {
    return render(
      <Provider store={store}>
        <IntlProvider locale="en">
          <KnowledgeHubEditor {...props} />
        </IntlProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders the title and description', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Knowledge base')).toBeInTheDocument();
      expect(
        screen.getByText('Create a connection and add knowledge hub sources your agent will use to generate responses.')
      ).toBeInTheDocument();
    });

    it('renders Learn more link', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Learn more')).toBeInTheDocument();
      expect(screen.getByTestId('navigate-icon')).toBeInTheDocument();
    });

    it('renders connection section label', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Connection')).toBeInTheDocument();
    });

    it('renders sources section label', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Sources')).toBeInTheDocument();
    });
  });

  describe('Connection Section', () => {
    it('shows Create button when no connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Create')).toBeInTheDocument();
    });

    it('shows connection name input when connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'my-connection' },
        isLoading: false,
      });

      renderComponent();

      const input = screen.getByRole('textbox', { name: 'Connection' });
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue('my-connection');
      expect(input).toBeDisabled();
    });

    it('dispatches openKnowledgeConnectionModal when Create button is clicked', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      const createButton = screen.getByText('Create');
      fireEvent.click(createButton);

      expect(mockOpenKnowledgeConnectionModal).toHaveBeenCalled();
    });
  });

  describe('Sources Section', () => {
    it('renders dropdown for selecting knowledge hub', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByRole('combobox', { name: 'Sources' })).toBeInTheDocument();
    });

    it('disables dropdown when no connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      const dropdown = screen.getByRole('combobox', { name: 'Sources' });
      expect(dropdown).toBeDisabled();
    });

    it('disables dropdown when loading', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: true,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      const dropdown = screen.getByRole('combobox', { name: 'Sources' });
      expect(dropdown).toBeDisabled();
    });

    it('shows placeholder text when no connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Create a connection to add knowledge hubs.')).toBeInTheDocument();
    });

    it('shows placeholder text when connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByText('Select a knowledge hub')).toBeInTheDocument();
    });

    it('renders Upload button', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      expect(screen.getByLabelText('Upload')).toBeInTheDocument();
    });

    it('disables Upload button when no connection exists', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: null,
        isLoading: false,
      });

      renderComponent();

      const uploadButton = screen.getByLabelText('Upload');
      expect(uploadButton).toBeDisabled();
    });
  });

  describe('File Upload Modal', () => {
    it('opens file upload modal when Upload button is clicked', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      const uploadButton = screen.getByLabelText('Upload');
      fireEvent.click(uploadButton);

      expect(screen.getByTestId('add-files-modal')).toBeInTheDocument();
    });

    it('closes file upload modal when dismiss is called', () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      // Open modal
      const uploadButton = screen.getByLabelText('Upload');
      fireEvent.click(uploadButton);

      // Close modal
      const closeButton = screen.getByTestId('close-files-modal');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('add-files-modal')).not.toBeInTheDocument();
    });
  });

  describe('Hub Selection', () => {
    it('calls onValueChange when hub is selected', async () => {
      const mockOnValueChange = vi.fn();
      const hubs = [
        {
          id: 'hub-1',
          name: 'Test Hub 1',
          artifacts: [],
        },
      ];

      mockUseAllKnowledgeHubs.mockReturnValue({
        data: hubs,
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent({
        ...defaultProps,
        onValueChange: mockOnValueChange,
      });

      // Click dropdown to open
      const dropdown = screen.getByRole('combobox', { name: 'Sources' });
      fireEvent.click(dropdown);

      // Select an option
      await waitFor(() => {
        const option = screen.getByText('Test Hub 1');
        fireEvent.click(option);
      });

      expect(mockOnValueChange).toHaveBeenCalled();
    });
  });

  describe('Empty Hubs Message', () => {
    it('shows empty message when no hubs exist', async () => {
      mockUseAllKnowledgeHubs.mockReturnValue({
        data: [],
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent();

      // Click dropdown to open
      const dropdown = screen.getByRole('combobox', { name: 'Sources' });
      fireEvent.click(dropdown);

      await waitFor(() => {
        expect(
          screen.getByText(`Can't find knowledge base artifacts. Create a knowledge base and upload files to get started.`)
        ).toBeInTheDocument();
      });
    });
  });

  describe('With Initial Hub Value', () => {
    it('displays selected hub when value is provided', () => {
      const hubs = [
        {
          id: 'hub-1',
          name: 'Test Hub 1',
          artifacts: [],
        },
      ];

      mockUseAllKnowledgeHubs.mockReturnValue({
        data: hubs,
        isLoading: false,
        refetch: mockRefetch,
      });
      mockUseConnection.mockReturnValue({
        data: { name: 'test-connection' },
        isLoading: false,
      });

      renderComponent({
        ...defaultProps,
        value: [{ type: 'literal', value: 'Test Hub 1' }] as any,
      });

      const dropdown = screen.getByRole('combobox', { name: 'Sources' });
      expect(dropdown).toHaveTextContent('Test Hub 1');
    });
  });
});

describe('HubOption Component', () => {
  const createMockStore = () => {
    return configureStore({
      reducer: {
        modal: () => ({}),
      },
    });
  };

  const renderKnowledgeHubEditor = (hubs: any[]) => {
    mockUseAllKnowledgeHubs.mockReturnValue({
      data: hubs,
      isLoading: false,
      refetch: mockRefetch,
    });
    mockUseConnection.mockReturnValue({
      data: { name: 'test-connection' },
      isLoading: false,
    });

    return render(
      <Provider store={createMockStore()}>
        <IntlProvider locale="en">
          <KnowledgeHubEditor
            editorOptions={{ logicAppId: 'test-id' }}
            onValueChange={vi.fn()}
            value={[]}
            renderDefaultEditor={() => <div data-testid="default-editor">Default Editor</div>}
          />
        </IntlProvider>
      </Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefetch.mockResolvedValue({});
  });

  afterEach(() => {
    cleanup();
  });

  it('renders hub name in dropdown options', async () => {
    const hubs = [
      {
        id: 'hub-1',
        name: 'My Knowledge Hub',
        artifacts: [{ id: 'artifact-1', name: 'Document 1', uploadStatus: ArtifactCreationStatus.Completed }],
      },
    ];

    renderKnowledgeHubEditor(hubs);

    // Click dropdown to open
    const dropdown = screen.getByRole('combobox', { name: 'Sources' });
    fireEvent.click(dropdown);

    await waitFor(() => {
      expect(screen.getByText('My Knowledge Hub')).toBeInTheDocument();
    });
  });

  it('shows expand/collapse button for hub with artifacts', async () => {
    const hubs = [
      {
        id: 'hub-1',
        name: 'My Knowledge Hub',
        artifacts: [{ id: 'artifact-1', name: 'Document 1', uploadStatus: ArtifactCreationStatus.Completed }],
      },
    ];

    renderKnowledgeHubEditor(hubs);

    // Click dropdown to open
    const dropdown = screen.getByRole('combobox', { name: 'Sources' });
    fireEvent.click(dropdown);

    await waitFor(() => {
      const expandButton = screen.getByLabelText('Expand');
      expect(expandButton).toBeInTheDocument();
    });
  });

  it('expands to show artifacts when expand button is clicked', async () => {
    const hubs = [
      {
        id: 'hub-1',
        name: 'My Knowledge Hub',
        artifacts: [{ id: 'artifact-1', name: 'Document 1', uploadStatus: ArtifactCreationStatus.Completed }],
      },
    ];

    renderKnowledgeHubEditor(hubs);

    // Click dropdown to open
    const dropdown = screen.getByRole('combobox', { name: 'Sources' });
    fireEvent.click(dropdown);

    await waitFor(() => {
      const expandButton = screen.getByLabelText('Expand');
      fireEvent.click(expandButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });
  });

  it('collapses artifacts when collapse button is clicked', async () => {
    const hubs = [
      {
        id: 'hub-1',
        name: 'My Knowledge Hub',
        artifacts: [{ id: 'artifact-1', name: 'Document 1', uploadStatus: ArtifactCreationStatus.Completed }],
      },
    ];

    renderKnowledgeHubEditor(hubs);

    // Click dropdown to open
    const dropdown = screen.getByRole('combobox', { name: 'Sources' });
    fireEvent.click(dropdown);

    // Expand
    await waitFor(() => {
      const expandButton = screen.getByLabelText('Expand');
      fireEvent.click(expandButton);
    });

    // Verify expanded
    await waitFor(() => {
      expect(screen.getByText('Document 1')).toBeInTheDocument();
    });

    // Collapse
    const collapseButton = screen.getByLabelText('Collapse');
    fireEvent.click(collapseButton);

    // Verify collapsed (Document 1 should not be visible)
    await waitFor(() => {
      expect(screen.queryByText('Document 1')).not.toBeInTheDocument();
    });
  });
});

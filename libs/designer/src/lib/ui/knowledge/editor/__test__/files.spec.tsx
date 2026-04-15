/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach, afterEach } from 'vitest';
// biome-ignore lint/correctness/noUnusedImports: using react for render
import React from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { IntlProvider } from 'react-intl';
import { AddFilesModal } from '../files';

// Mock LoggerService
vi.mock('@microsoft/logic-apps-shared', async () => {
  const actual = await vi.importActual('@microsoft/logic-apps-shared');
  return {
    ...actual,
    LoggerService: () => ({
      log: vi.fn(),
    }),
    LogEntryLevel: {
      Error: 'Error',
    },
  };
});

// Mock FileUpload component
vi.mock('../../panel/files/uploadfile', () => ({
  FileUpload: ({
    resourceId,
    selectedHub,
    setDetails,
  }: {
    resourceId: string;
    selectedHub: string;
    setDetails: (details: any) => void;
  }) => (
    <div data-testid="file-upload">
      <span data-testid="file-upload-resource">{resourceId}</span>
      <span data-testid="file-upload-hub">{selectedHub}</span>
      <button
        data-testid="set-file-details"
        onClick={() =>
          setDetails({
            groupName: 'test-hub',
            selectedFiles: [{ uuid: 1, file: new File(['test'], 'test.txt', { type: 'text/plain' }) }],
            fileNames: { 1: 'test.txt' },
            fileDescriptions: { 1: 'Test file description' },
          })
        }
      >
        Set File Details
      </button>
      <button
        data-testid="set-large-file"
        onClick={() =>
          setDetails({
            groupName: 'test-hub',
            selectedFiles: [
              {
                uuid: 2,
                file: {
                  name: 'large.txt',
                  size: 20 * 1024 * 1024, // 20 MB - exceeds 16 MB limit
                  type: 'text/plain',
                },
              },
            ],
            fileNames: { 2: 'large.txt' },
            fileDescriptions: {},
          })
        }
      >
        Set Large File
      </button>
      <button
        data-testid="set-empty-filename"
        onClick={() =>
          setDetails({
            groupName: 'test-hub',
            selectedFiles: [{ uuid: 3, file: new File(['test'], 'test.txt', { type: 'text/plain' }) }],
            fileNames: { 3: '' },
            fileDescriptions: {},
          })
        }
      >
        Set Empty Filename
      </button>
    </div>
  ),
}));

describe('AddFilesModal', () => {
  const mockOnUploadArtifact = vi.fn();
  const mockOnDismiss = vi.fn();

  const defaultProps = {
    resourceId: 'test-resource-id',
    selectedHub: 'test-hub',
    onUploadArtifact: mockOnUploadArtifact,
    onDismiss: mockOnDismiss,
  };

  const renderComponent = (props = defaultProps) => {
    return render(
      <IntlProvider locale="en">
        <AddFilesModal {...props} />
      </IntlProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders the modal with title', () => {
      renderComponent();

      expect(screen.getByText('Upload Files')).toBeInTheDocument();
    });

    it('renders FileUpload component', () => {
      renderComponent();

      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });

    it('renders Add and Cancel buttons', () => {
      renderComponent();

      expect(screen.getByText('Add')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('passes resourceId to FileUpload', () => {
      renderComponent();

      expect(screen.getByTestId('file-upload-resource')).toHaveTextContent('test-resource-id');
    });

    it('passes selectedHub to FileUpload', () => {
      renderComponent();

      expect(screen.getByTestId('file-upload-hub')).toHaveTextContent('test-hub');
    });
  });

  describe('Button States', () => {
    it('disables Add button when no files are selected', () => {
      renderComponent();

      const addButton = screen.getByText('Add');
      expect(addButton).toBeDisabled();
    });

    it('enables Add button when valid file is selected', () => {
      renderComponent();

      const setFileButton = screen.getByTestId('set-file-details');
      fireEvent.click(setFileButton);

      const addButton = screen.getByText('Add');
      expect(addButton).not.toBeDisabled();
    });

    it('disables Add button when file size exceeds limit', () => {
      renderComponent();

      const setLargeFileButton = screen.getByTestId('set-large-file');
      fireEvent.click(setLargeFileButton);

      const addButton = screen.getByText('Add');
      expect(addButton).toBeDisabled();
    });

    it('disables Add button when filename is empty', () => {
      renderComponent();

      const setEmptyFilenameButton = screen.getByTestId('set-empty-filename');
      fireEvent.click(setEmptyFilenameButton);

      const addButton = screen.getByText('Add');
      expect(addButton).toBeDisabled();
    });
  });

  describe('Upload Functionality', () => {
    it('calls onUploadArtifact when Add button is clicked', async () => {
      mockOnUploadArtifact.mockResolvedValue(undefined);
      renderComponent();

      // Set valid file details
      const setFileButton = screen.getByTestId('set-file-details');
      fireEvent.click(setFileButton);

      // Click Add button
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnUploadArtifact).toHaveBeenCalled();
      });
    });

    it('calls onDismiss after successful upload', async () => {
      mockOnUploadArtifact.mockResolvedValue(undefined);
      renderComponent();

      // Set valid file details
      const setFileButton = screen.getByTestId('set-file-details');
      fireEvent.click(setFileButton);

      // Click Add button
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(mockOnDismiss).toHaveBeenCalled();
      });
    });

    it('shows Adding... text while uploading', async () => {
      let resolvePromise: () => void;
      const uploadPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnUploadArtifact.mockImplementation(async (_1, _2, _3, setIsLoading) => {
        setIsLoading(true);
        await uploadPromise;
      });

      renderComponent();

      // Set valid file details
      const setFileButton = screen.getByTestId('set-file-details');
      fireEvent.click(setFileButton);

      // Click Add button
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      // The button should show "Adding..." while uploading
      await waitFor(() => {
        expect(screen.getByText('Adding...')).toBeInTheDocument();
      });

      // Resolve the upload
      resolvePromise!();
    });
  });

  describe('Cancel Functionality', () => {
    it('calls onDismiss when Cancel button is clicked', () => {
      renderComponent();

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockOnDismiss).toHaveBeenCalled();
    });

    it('keeps Cancel button enabled while uploading so user can abort', async () => {
      let resolvePromise: () => void;
      const uploadPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });
      mockOnUploadArtifact.mockImplementation(async (_1, _2, _3, setIsLoading) => {
        setIsLoading(true);
        await uploadPromise;
      });

      renderComponent();

      // Set valid file details
      const setFileButton = screen.getByTestId('set-file-details');
      fireEvent.click(setFileButton);

      // Click Add button to start upload
      const addButton = screen.getByText('Add');
      fireEvent.click(addButton);

      // Cancel should remain enabled so user can abort the upload
      await waitFor(() => {
        const cancelButton = screen.getByText('Cancel');
        expect(cancelButton).not.toBeDisabled();
      });

      // Resolve the upload
      resolvePromise!();
    });
  });

  describe('Without Selected Hub', () => {
    it('renders with empty hub when selectedHub is not provided', () => {
      renderComponent({
        ...defaultProps,
        selectedHub: '',
      });

      expect(screen.getByTestId('file-upload-hub')).toHaveTextContent('');
    });
  });
});

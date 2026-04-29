/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FileDropZone, type FileDropZoneProps } from '../index';
import { IntlProvider } from 'react-intl';
import '@testing-library/jest-dom/vitest';

const renderWithIntl = (ui: React.ReactElement) => {
  return render(<IntlProvider locale="en">{ui}</IntlProvider>);
};

describe('FileDropZone', () => {
  let defaultProps: FileDropZoneProps;
  let mockOnAdd: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAdd = vi.fn();
    defaultProps = {
      accept: '.pdf, .doc, .docx',
      disabled: false,
      isMultiUpload: false,
      onAdd: mockOnAdd,
    };
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('rendering', () => {
    it('should render the drop zone with default text', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      expect(screen.getByText('Drag and drop files here.')).toBeInTheDocument();
      expect(screen.getByText('browse to upload.')).toBeInTheDocument();
    });

    it('should render with role="button"', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have correct aria-label', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('aria-label', 'Drop files here or select to browse.');
    });

    it('should display accepted formats', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      expect(screen.getByText('Accepted formats: .pdf, .doc, .docx')).toBeInTheDocument();
    });

    it('should be focusable when not disabled', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('tabindex', '0');
    });
  });

  describe('disabled state', () => {
    it('should have aria-disabled when disabled', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have tabIndex -1 when disabled', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');
      expect(dropZone).toHaveAttribute('tabindex', '-1');
    });

    it('should not trigger file input when disabled and clicked', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(dropZone);

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('click interaction', () => {
    it('should trigger file input click when drop zone is clicked', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.click(dropZone);

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should call onAdd when a file is selected via input', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          file: testFile,
          uuid: expect.any(Number),
        })
      );
    });
  });

  describe('keyboard interaction', () => {
    it('should trigger file input when Enter key is pressed', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.keyDown(dropZone, { key: 'Enter' });

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should trigger file input when Space key is pressed', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.keyDown(dropZone, { key: ' ' });

      expect(clickSpy).toHaveBeenCalled();
    });

    it('should not trigger file input for other keys', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.keyDown(dropZone, { key: 'Tab' });

      expect(clickSpy).not.toHaveBeenCalled();
    });

    it('should not trigger file input when disabled and Enter is pressed', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, 'click');

      fireEvent.keyDown(dropZone, { key: 'Enter' });

      expect(clickSpy).not.toHaveBeenCalled();
    });
  });

  describe('drag and drop interaction', () => {
    const createDragEvent = (type: string, files: File[] = []) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', {
        value: {
          files,
          items: files.map((file) => ({ kind: 'file', type: file.type, getAsFile: () => file })),
          types: ['Files'],
        },
      });
      return event;
    };

    it('should show dragging state text on drag enter', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');

      fireEvent.dragEnter(dropZone);

      expect(screen.getByText('Drop files here.')).toBeInTheDocument();
    });

    it('should revert to default text on drag leave', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');

      fireEvent.dragEnter(dropZone);
      expect(screen.getByText('Drop files here.')).toBeInTheDocument();

      fireEvent.dragLeave(dropZone);
      expect(screen.getByText('Drag and drop files here.')).toBeInTheDocument();
    });

    it('should call onAdd when a valid file is dropped', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          file: testFile,
          uuid: expect.any(Number),
        })
      );
    });

    it('should not call onAdd when file type is not accepted', () => {
      renderWithIntl(<FileDropZone {...defaultProps} accept=".pdf" />);

      const dropZone = screen.getByRole('button');
      const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('should accept file by extension', () => {
      renderWithIntl(<FileDropZone {...defaultProps} accept=".pdf" />);

      const dropZone = screen.getByRole('button');
      const testFile = new File(['test content'], 'document.pdf', { type: '' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          file: testFile,
        })
      );
    });

    it('should not call onAdd when disabled and file is dropped', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(mockOnAdd).not.toHaveBeenCalled();
    });

    it('should not show dragging state when disabled', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');

      fireEvent.dragEnter(dropZone);

      // Should still show default text when disabled
      expect(screen.getByText('Drag and drop files here.')).toBeInTheDocument();
    });

    it('should handle multiple drag enter/leave events correctly', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');

      // Simulate entering the container
      fireEvent.dragEnter(dropZone);
      // Simulate entering a child element (counter should be 2)
      fireEvent.dragEnter(dropZone);

      expect(screen.getByText('Drop files here.')).toBeInTheDocument();

      // Simulate leaving a child element (counter should be 1)
      fireEvent.dragLeave(dropZone);

      // Should still show dragging state
      expect(screen.getByText('Drop files here.')).toBeInTheDocument();

      // Simulate leaving the container (counter should be 0)
      fireEvent.dragLeave(dropZone);

      expect(screen.getByText('Drag and drop files here.')).toBeInTheDocument();
    });

    it('should reset drag state after drop', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      fireEvent.dragEnter(dropZone);
      expect(screen.getByText('Drop files here.')).toBeInTheDocument();

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(screen.getByText('Drag and drop files here.')).toBeInTheDocument();
    });
  });

  describe('file input attributes', () => {
    it('should pass accept prop to file input', () => {
      renderWithIntl(<FileDropZone {...defaultProps} accept=".pdf,.doc" />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toHaveAttribute('accept', '.pdf,.doc');
    });

    it('should disable file input when disabled prop is true', () => {
      renderWithIntl(<FileDropZone {...defaultProps} disabled={true} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;

      expect(fileInput).toBeDisabled();
    });

    it('should reset file input value after selection', () => {
      renderWithIntl(<FileDropZone {...defaultProps} />);

      const dropZone = screen.getByRole('button');
      const fileInput = dropZone.querySelector('input[type="file"]') as HTMLInputElement;
      const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

      // Mock the value property
      Object.defineProperty(fileInput, 'value', {
        writable: true,
        value: 'C:\\fakepath\\test.pdf',
      });

      fireEvent.change(fileInput, { target: { files: [testFile] } });

      expect(fileInput.value).toBe('');
    });
  });

  describe('accept all files', () => {
    it('should accept any file when accept includes */*', () => {
      renderWithIntl(<FileDropZone {...defaultProps} accept="*/*" />);

      const dropZone = screen.getByRole('button');
      const testFile = new File(['test content'], 'test.xyz', { type: 'application/octet-stream' });

      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [testFile],
        },
      });

      expect(mockOnAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          file: testFile,
        })
      );
    });
  });
});

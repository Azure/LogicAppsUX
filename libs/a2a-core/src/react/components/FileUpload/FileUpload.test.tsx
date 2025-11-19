import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUpload } from './FileUpload';

// Mock alert
global.alert = vi.fn();

describe('FileUpload', () => {
  const mockOnFileSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.alert = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders upload button', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const button = screen.getByRole('button', { name: /attach files/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('renders hidden file input', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const input = screen.getByRole('button').parentElement?.querySelector('input[type="file"]');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('multiple');
    expect(input).toHaveClass('hiddenInput');
  });

  it('triggers file input click when button is clicked', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const button = screen.getByRole('button');
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    const clickSpy = vi.spyOn(input, 'click');

    await userEvent.click(button);

    expect(clickSpy).toHaveBeenCalledTimes(1);
  });

  it('does not trigger file input click when disabled', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} disabled />);

    const button = screen.getByRole('button');
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    const clickSpy = vi.spyOn(input, 'click');

    await userEvent.click(button);

    expect(clickSpy).not.toHaveBeenCalled();
    expect(button).toBeDisabled();
    expect(input).toBeDisabled();
  });

  it('handles file selection', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    const callArg = mockOnFileSelect.mock.calls[0][0];
    expect(callArg).toHaveLength(1);
    expect(callArg[0].name).toBe('test.txt');
    expect(callArg[0].type).toBe('text/plain');
  });

  it('handles multiple file selection', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const file1 = new File(['content1'], 'file1.txt', { type: 'text/plain' });
    const file2 = new File(['content2'], 'file2.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file1, file2] } });
    });

    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect.mock.calls[0][0]).toHaveLength(2);
    expect(mockOnFileSelect.mock.calls[0][0][0]).toBe(file1);
    expect(mockOnFileSelect.mock.calls[0][0][1]).toBe(file2);
  });

  it('rejects files exceeding max size', async () => {
    const maxFileSize = 1024; // 1KB
    render(<FileUpload onFileSelect={mockOnFileSelect} maxFileSize={maxFileSize} />);

    const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });

    expect(global.alert).toHaveBeenCalledWith(
      'File "large.txt" is too large. Maximum size is 1 KB'
    );
    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('accepts files within size limit', async () => {
    const maxFileSize = 1024 * 1024; // 1MB
    render(<FileUpload onFileSelect={mockOnFileSelect} maxFileSize={maxFileSize} />);

    const smallFile = new File(['small content'], 'small.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [smallFile] } });
    });

    expect(global.alert).not.toHaveBeenCalled();
    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
  });

  it('filters files by allowed types with extensions', async () => {
    const allowedFileTypes = ['.txt', '.pdf'];
    render(<FileUpload onFileSelect={mockOnFileSelect} allowedFileTypes={allowedFileTypes} />);

    const txtFile = new File(['txt content'], 'doc.txt', { type: 'text/plain' });
    const jpgFile = new File(['jpg content'], 'image.jpg', { type: 'image/jpeg' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [txtFile, jpgFile] } });
    });

    expect(global.alert).toHaveBeenCalledWith('File type "jpg" is not allowed');
    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect.mock.calls[0][0]).toHaveLength(1);
    expect(mockOnFileSelect.mock.calls[0][0][0]).toBe(txtFile);
  });

  it('filters files by MIME types', async () => {
    const allowedFileTypes = ['text/plain', 'application/pdf'];
    render(<FileUpload onFileSelect={mockOnFileSelect} allowedFileTypes={allowedFileTypes} />);

    const txtFile = new File(['txt content'], 'doc.txt', { type: 'text/plain' });
    const jpgFile = new File(['jpg content'], 'image.jpg', { type: 'image/jpeg' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [txtFile, jpgFile] } });
    });

    expect(global.alert).toHaveBeenCalledWith('File type "jpg" is not allowed');
    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect.mock.calls[0][0]).toHaveLength(1);
  });

  it('handles wildcard MIME types', async () => {
    const allowedFileTypes = ['image/*', 'text/*'];
    render(<FileUpload onFileSelect={mockOnFileSelect} allowedFileTypes={allowedFileTypes} />);

    const jpgFile = new File(['jpg content'], 'photo.jpg', { type: 'image/jpeg' });
    const pngFile = new File(['png content'], 'icon.png', { type: 'image/png' });
    const txtFile = new File(['txt content'], 'doc.txt', { type: 'text/plain' });
    const pdfFile = new File(['pdf content'], 'file.pdf', { type: 'application/pdf' });

    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [jpgFile, pngFile, txtFile, pdfFile] } });
    });

    expect(global.alert).toHaveBeenCalledWith('File type "pdf" is not allowed');
    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect.mock.calls[0][0]).toHaveLength(3);
  });

  it('sets accept attribute on input', () => {
    const allowedFileTypes = ['.txt', '.pdf', 'image/*'];
    render(<FileUpload onFileSelect={mockOnFileSelect} allowedFileTypes={allowedFileTypes} />);

    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.txt,.pdf,image/*');
  });

  it('resets input value after file selection', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const file = new File(['test content'], 'test.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    expect(input.value).toBe('');
  });

  it('does not call onFileSelect when no valid files', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} maxFileSize={10} />);

    const largeFile = new File(['x'.repeat(100)], 'large.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('handles mixed valid and invalid files', async () => {
    render(
      <FileUpload onFileSelect={mockOnFileSelect} maxFileSize={1024} allowedFileTypes={['.txt']} />
    );

    const validFile = new File(['small'], 'valid.txt', { type: 'text/plain' });
    const largeFile = new File(['x'.repeat(2048)], 'large.txt', { type: 'text/plain' });
    const wrongTypeFile = new File(['image'], 'image.jpg', { type: 'image/jpeg' });

    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [validFile, largeFile, wrongTypeFile] } });
    });

    expect(global.alert).toHaveBeenCalledTimes(2);
    expect(mockOnFileSelect).toHaveBeenCalledTimes(1);
    expect(mockOnFileSelect.mock.calls[0][0]).toHaveLength(1);
    expect(mockOnFileSelect.mock.calls[0][0][0]).toBe(validFile);
  });

  it('uses default max file size of 10MB when not specified', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.txt', { type: 'text/plain' });
    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [largeFile] } });
    });

    expect(global.alert).toHaveBeenCalledWith(
      'File "large.txt" is too large. Maximum size is 10 MB'
    );
  });

  it('renders SVG icon in button', () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const svg = screen.getByRole('button').querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
  });

  it('handles empty files array in change event', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: [] } });
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });

  it('handles null files in change event', async () => {
    render(<FileUpload onFileSelect={mockOnFileSelect} />);

    const input = screen
      .getByRole('button')
      .parentElement?.querySelector('input[type="file"]') as HTMLInputElement;

    await waitFor(() => {
      fireEvent.change(input, { target: { files: null } });
    });

    expect(mockOnFileSelect).not.toHaveBeenCalled();
  });
});

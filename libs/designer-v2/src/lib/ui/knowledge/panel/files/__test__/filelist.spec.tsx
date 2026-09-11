/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FileList } from '../filelist';

vi.mock('../../styles', () => ({ useAddFilePanelStyles: () => ({}) }));

describe('FileList', () => {
  afterEach(cleanup);

  const file = { uuid: 1, file: new File([new Uint8Array(1536)], 'guide.txt', { type: 'text/plain' }) } as any;
  const renderList = (onDelete = vi.fn(), onUpdate = vi.fn(), existingNames: string[] = []) => {
    render(
      <IntlProvider locale="en">
        <FileList files={[file]} onDelete={onDelete} onUpdate={onUpdate} existingNames={existingNames} />
      </IntlProvider>
    );
    return { onDelete, onUpdate };
  };

  it('renders file metadata and updates its name and description', () => {
    const { onUpdate } = renderList();

    expect(screen.getByText('guide.txt')).toBeInTheDocument();
    expect(screen.getByText('2 KB')).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Artifact name'), { target: { value: 'Guide' } });
    fireEvent.change(screen.getByPlaceholderText('Optional file description'), { target: { value: 'Reference' } });

    expect(onUpdate).toHaveBeenCalledWith(file, { name: 'Guide' });
    expect(onUpdate).toHaveBeenCalledWith(file, { description: 'Reference' });
  });

  it('clears invalid duplicate names and displays the validation error', () => {
    const { onUpdate } = renderList(vi.fn(), vi.fn(), ['Guide']);

    fireEvent.change(screen.getByPlaceholderText('Artifact name'), { target: { value: 'Guide' } });

    expect(onUpdate).toHaveBeenCalledWith(file, { name: '' });
    expect(screen.getByText(/already exists/i)).toBeInTheDocument();
  });

  it('deletes a file', () => {
    const { onDelete } = renderList();
    fireEvent.click(screen.getByRole('button', { name: 'Delete file' }));
    expect(onDelete).toHaveBeenCalledWith(file);
  });
});

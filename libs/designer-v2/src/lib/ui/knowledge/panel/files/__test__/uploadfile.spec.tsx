/**
 * @vitest-environment jsdom
 */
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FileUpload } from '../uploadfile';

const dispatch = vi.fn();
const refetch = vi.fn();
let groupComboboxProps: any;

vi.mock('react-redux', () => ({ useDispatch: () => dispatch }));
vi.mock('../../../../../core/knowledge/utils/queries', () => ({
  useAllKnowledgeHubs: () => ({
    isLoading: false,
    refetch,
    data: [{ name: 'Existing', description: 'Existing description', artifacts: [{ name: 'used-name' }] }],
  }),
}));
vi.mock('@microsoft/designer-ui', () => ({
  TemplatesSection: ({ title, items }: any) => (
    <section>
      <h2>{title}</h2>
      {items.map((item: any, index: number) => (
        <div key={index}>{item.onRenderItem ? item.onRenderItem() : item.value}</div>
      ))}
    </section>
  ),
  FileDropZone: ({ onAdd, disabled }: any) => (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onAdd({ uuid: 1, file: new File(['content'], 'guide.txt', { type: 'text/plain' }) })}
    >
      Add test file
    </button>
  ),
}));
vi.mock('@fluentui/react-components', () => ({
  Field: ({ children }: any) => <div>{children}</div>,
  Combobox: (props: any) => {
    groupComboboxProps = props;
    return <div data-testid="group-combobox">{props.children}</div>;
  },
  Option: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@fluentui/react-icons', () => ({ AddRegular: () => null }));
vi.mock('../../styles', () => ({ usePanelStyles: () => ({}), useAddFilePanelStyles: () => ({}) }));
vi.mock('../filelist', () => ({
  FileList: ({ files, onDelete, onUpdate, existingNames }: any) => (
    <div data-testid="file-list" data-existing={existingNames.join(',')}>
      {files.map((file: any) => (
        <div key={file.uuid}>
          {file.file.name}
          <button type="button" onClick={() => onUpdate(file, { name: 'Guide' })}>
            Update name
          </button>
          <button type="button" onClick={() => onDelete(file)}>
            Delete file
          </button>
        </div>
      ))}
    </div>
  ),
}));
vi.mock('../../../modals/creategroup', () => ({
  CreateGroup: ({ onCreate, onDismiss }: any) => (
    <div data-testid="create-group">
      <button type="button" onClick={() => onCreate('New group', 'New description')}>
        Create group
      </button>
      <button type="button" onClick={onDismiss}>
        Dismiss group
      </button>
    </div>
  ),
}));

describe('FileUpload', () => {
  const setDetails = vi.fn();
  const renderUpload = () =>
    render(
      <IntlProvider locale="en">
        <FileUpload resourceId="resource" selectedHub="Existing" setDetails={setDetails} />
      </IntlProvider>
    );

  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it('loads selected group details and existing artifact names', async () => {
    renderUpload();
    expect(await screen.findByText('Existing description')).toBeInTheDocument();
    expect(screen.getByTestId('file-list')).toHaveAttribute('data-existing', 'used-name');
  });

  it('selects an existing group', () => {
    renderUpload();
    act(() => groupComboboxProps.onOptionSelect(undefined, { optionValue: 'Existing' }));
    expect(setDetails).toHaveBeenCalledWith({ groupName: 'Existing' });
  });

  it('creates a group, dispatches a notification, and refreshes groups', async () => {
    renderUpload();
    act(() => groupComboboxProps.onOptionSelect(undefined, { optionValue: 'CREATE_NEW' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }));

    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(setDetails).toHaveBeenCalledWith({ groupName: 'New group' });
    expect(dispatch).toHaveBeenCalledWith(expect.objectContaining({ type: 'knowledgeHubOptions/setNotification' }));
  });

  it('adds, updates, and deletes a file while propagating details', () => {
    renderUpload();
    fireEvent.click(screen.getByRole('button', { name: 'Add test file' }));
    expect(screen.getByText('guide.txt')).toBeInTheDocument();
    expect(setDetails).toHaveBeenCalledWith(expect.objectContaining({ selectedFiles: expect.any(Array) }));

    fireEvent.click(screen.getByRole('button', { name: 'Update name' }));
    expect(setDetails).toHaveBeenCalledWith({ fileNames: { 1: 'Guide' } });

    fireEvent.click(screen.getByRole('button', { name: 'Delete file' }));
    expect(setDetails).toHaveBeenCalledWith({ selectedFiles: [], fileNames: {}, fileDescriptions: {} });
  });
});

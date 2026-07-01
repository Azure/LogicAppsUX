import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { CodeViewTab } from '../codeViewTab';
import * as serializer from '../../../../../core/actions/bjsworkflow/serializer';
import * as updateNodeModule from '../../../../../core/actions/bjsworkflow/updateNodeFromCodeView';
import * as designerOptionsSelectors from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import * as workflowSelectors from '../../../../../core/state/workflow/workflowSelectors';

// Lightweight stand-ins for the designer-ui peek components so we can drive the container's
// callbacks directly and assert on the props it passes down.
vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    Peek: ({ input }: { input: string }) => <div data-testid="peek">{input}</div>,
    EditableCodeView: ({ value, onChange, onSave, onDiscard, isDirty, isSaving, errorMessage, labels }: any) => (
      <div data-testid="editable-code-view">
        <textarea data-testid="editor" value={value} onChange={(e) => onChange(e.target.value)} />
        <span data-testid="dirty">{String(!!isDirty)}</span>
        <span data-testid="saving">{String(!!isSaving)}</span>
        <span data-testid="error">{errorMessage ?? ''}</span>
        <button type="button" data-testid="save" onClick={onSave}>
          {labels.save}
        </button>
        <button type="button" data-testid="discard" onClick={onDiscard}>
          {labels.discard}
        </button>
      </div>
    ),
  };
});

vi.mock('../../../../../core/actions/bjsworkflow/serializer', () => ({
  serializeOperation: vi.fn(),
}));

vi.mock('../../../../../core/actions/bjsworkflow/updateNodeFromCodeView', () => ({
  updateNodeFromCodeView: vi.fn(() => ({ type: 'mock/updateNodeFromCodeView' })),
}));

const mockSerialize = vi.mocked(serializer.serializeOperation);
const mockUpdateNode = vi.mocked(updateNodeModule.updateNodeFromCodeView);

const originalDefinition = { type: 'Compose', inputs: { value: 'original' } };

const renderTab = (dispatchImpl?: (...args: any[]) => any) => {
  const dispatch = vi.fn(dispatchImpl ?? (() => ({ unwrap: () => Promise.resolve() })));
  const store = {
    getState: () => ({}),
    dispatch,
    subscribe: () => () => undefined,
    replaceReducer: () => undefined,
  } as any;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const utils = render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <CodeViewTab nodeId="Compose" {...({} as any)} />
      </QueryClientProvider>
    </Provider>
  );
  return { dispatch, ...utils };
};

describe('CodeViewTab', () => {
  beforeEach(() => {
    cleanup();
    vi.clearAllMocks();
    mockSerialize.mockResolvedValue(originalDefinition as any);
    vi.spyOn(designerOptionsSelectors, 'useReadOnly').mockReturnValue(false);
    vi.spyOn(designerOptionsSelectors, 'useEditableCodeViewEnabled').mockReturnValue(true);
    vi.spyOn(workflowSelectors, 'useActionMetadata').mockReturnValue({ inputs: {} } as any);
    mockUpdateNode.mockReturnValue({ type: 'mock/updateNodeFromCodeView' } as any);
  });

  test('renders the editable editor seeded with the serialized operation', async () => {
    renderTab();
    const editor = (await screen.findByTestId('editor')) as HTMLTextAreaElement;
    expect(editor.value).toBe(JSON.stringify(originalDefinition, null, 2));
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  test('renders a read-only peek when the designer is read-only', async () => {
    vi.spyOn(designerOptionsSelectors, 'useReadOnly').mockReturnValue(true);
    renderTab();
    const peek = await screen.findByTestId('peek');
    expect(peek.textContent).toBe(JSON.stringify(originalDefinition, null, 2));
    expect(screen.queryByTestId('editable-code-view')).not.toBeInTheDocument();
  });

  test('renders a read-only peek when the editable code view host option is disabled', async () => {
    vi.spyOn(designerOptionsSelectors, 'useEditableCodeViewEnabled').mockReturnValue(false);
    renderTab();
    const peek = await screen.findByTestId('peek');
    expect(peek.textContent).toBe(JSON.stringify(originalDefinition, null, 2));
    expect(screen.queryByTestId('editable-code-view')).not.toBeInTheDocument();
  });

  test('marks the editor dirty and surfaces a validation error for invalid JSON', async () => {
    renderTab();
    const editor = await screen.findByTestId('editor');
    fireEvent.change(editor, { target: { value: '{ not valid json' } });
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
    expect(screen.getByTestId('error')).toHaveTextContent('Invalid JSON');
  });

  test('discard reverts edits back to the serialized content', async () => {
    renderTab();
    const editor = (await screen.findByTestId('editor')) as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: '{"type":"Compose","inputs":{"value":"changed"}}' } });
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
    fireEvent.click(screen.getByTestId('discard'));
    expect((screen.getByTestId('editor') as HTMLTextAreaElement).value).toBe(JSON.stringify(originalDefinition, null, 2));
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  test('saving a valid edit dispatches updateNodeFromCodeView with the parsed operation', async () => {
    const { dispatch } = renderTab();
    const editor = await screen.findByTestId('editor');
    const edited = { type: 'Compose', inputs: { value: 'changed' } };
    fireEvent.change(editor, { target: { value: JSON.stringify(edited) } });

    fireEvent.click(screen.getByTestId('save'));

    await waitFor(() => expect(mockUpdateNode).toHaveBeenCalledTimes(1));
    expect(mockUpdateNode).toHaveBeenCalledWith({ nodeId: 'Compose', serializedOperation: edited });
    expect(dispatch).toHaveBeenCalledWith({ type: 'mock/updateNodeFromCodeView' });
  });

  test('does not dispatch when attempting to save invalid JSON', async () => {
    renderTab();
    const editor = await screen.findByTestId('editor');
    fireEvent.change(editor, { target: { value: '{ broken' } });
    fireEvent.click(screen.getByTestId('save'));
    expect(mockUpdateNode).not.toHaveBeenCalled();
  });
});

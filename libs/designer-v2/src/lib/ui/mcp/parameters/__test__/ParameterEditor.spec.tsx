import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DynamicLoadStatus } from '@microsoft/designer-ui';
import { ParameterEditor } from '../ParameterEditor';
import * as parameterHelpers from '../../../../core/utils/parameters/helper';
import { createLiteralValueSegment } from '../../../../core/utils/parameters/segment';
import {
  createMcpHarness,
  createMcpState,
  createParameter,
  expressionMapping,
  reference,
} from '../../../../core/state/mcp/__test__/fixtures';

vi.mock('../../../../core/state/selectors/actionMetadataSelector', () => ({
  useConnectorName: () => ({ result: 'SQL Server' }),
}));

// These interactive leaf adapters exercise the real MCP editor's wiring, without
// coupling this unit to each shared editor's own Lexical/table/authentication UI.
vi.mock('@microsoft/designer-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@microsoft/designer-ui')>();
  const { useState } = await import('react');
  const makeEditor = (name: string) =>
    function EditorAdapter(props: any) {
      const [result, setResult] = useState('');
      return (
        <section aria-label={`${name} editor`} data-tokens={String(props.basePlugins?.tokens)}>
          <input
            aria-label={`${name} value`}
            defaultValue={props.initialValue?.[0]?.value ?? ''}
            readOnly={props.readonly}
            onChange={(event) => {
              const change = { value: [{ id: 'edited', type: 'literal', value: event.target.value }] };
              if (name === 'string') {
                props.onChange?.();
              } else {
                (props.onChange ?? props.editorBlur)?.(change);
              }
            }}
            onBlur={(event) => props.editorBlur?.({ value: [{ id: 'edited', type: 'literal', value: event.target.value }] })}
          />
          {Array.isArray(props.options) && (
            <ul>
              {props.options.map((option: any) => (
                <li key={option.key}>{option.displayName}</li>
              ))}
            </ul>
          )}
          {props.isLoading && <span role="status">Loading choices</span>}
          {props.errorDetails && <span role="alert">{props.errorDetails.message}</span>}
          {props.onMenuOpen && (
            <button type="button" onClick={props.onMenuOpen}>
              Open choices
            </button>
          )}
          {props.castParameter && (
            <button type="button" onClick={() => setResult(props.castParameter([{ id: 'cast', type: 'literal', value: '["edited"]' }]))}>
              Serialize array
            </button>
          )}
          {props.pickerCallbacks && (
            <>
              <button type="button" onClick={() => props.pickerCallbacks.onFolderNavigation(undefined)}>
                Browse root
              </button>
              <button type="button" onClick={() => props.pickerCallbacks.onFolderNavigation({ id: 'folder' })}>
                Open folder
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = { id: '/reports/monthly.csv', title: 'Monthly report' };
                  setResult(
                    [
                      props.pickerCallbacks.getFileSourceName(),
                      props.pickerCallbacks.getDisplayValueFromSelectedItem(item),
                      props.pickerCallbacks.getValueFromSelectedItem(item),
                    ].join(' | ')
                  );
                }}
              >
                Select file
              </button>
            </>
          )}
          <output>{result}</output>
        </section>
      );
    };
  return {
    ...actual,
    ArrayEditor: makeEditor('array'),
    AuthenticationEditor: makeEditor('authentication'),
    DictionaryEditor: makeEditor('dictionary'),
    DropdownEditor: makeEditor('dropdown'),
    Combobox: makeEditor('combobox'),
    FilePickerEditor: makeEditor('filepicker'),
    HTMLEditor: makeEditor('html'),
    SchemaEditor: makeEditor('schema'),
    TableEditor: makeEditor('table'),
    StringEditor: makeEditor('string'),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(parameterHelpers, 'loadDynamicValuesForParameter').mockResolvedValue(undefined);
  vi.spyOn(parameterHelpers, 'loadDynamicTreeItemsForParameter').mockResolvedValue(undefined);
});
afterEach(cleanup);

const renderEditor = (parameter = createParameter(), state = createMcpState()) => {
  const onParameterValueChange = vi.fn();
  const onParameterVisibilityUpdate = vi.fn();
  const harness = createMcpHarness(state);
  return {
    ...render(
      <ParameterEditor
        operationId="Query"
        groupId="default"
        parameter={parameter}
        onParameterValueChange={onParameterValueChange}
        onParameterVisibilityUpdate={onParameterVisibilityUpdate}
      />,
      harness
    ),
    ...harness,
    onParameterValueChange,
    onParameterVisibilityUpdate,
  };
};

describe('MCP parameter editor', () => {
  it.each(['array', 'authentication', 'dictionary', 'dropdown', 'combobox', 'filepicker', 'html', 'schema', 'table'])(
    'renders the %s editor and forwards user edits',
    (editor) => {
      const { onParameterValueChange } = renderEditor(createParameter({ editor: editor.toUpperCase() }));
      expect(screen.getByRole('region', { name: `${editor} editor` })).toBeInTheDocument();
      const input = screen.getByRole('textbox', { name: `${editor} value` });
      expect(input).toHaveValue('original');
      fireEvent.change(input, { target: { value: 'changed' } });
      expect(onParameterValueChange).toHaveBeenCalledWith({ value: [{ id: 'edited', type: 'literal', value: 'changed' }] });
    }
  );

  it.each([undefined, 'unrecognized'])('falls back to the string editor for %s and commits on blur rather than typing', (editor) => {
    const { onParameterValueChange, onParameterVisibilityUpdate } = renderEditor(createParameter({ editor }));
    const input = screen.getByRole('textbox', { name: 'string value' });
    expect(screen.getByRole('region', { name: 'string editor' })).toHaveAttribute('data-tokens', 'false');
    fireEvent.change(input, { target: { value: 'manual value' } });
    expect(onParameterVisibilityUpdate).toHaveBeenCalledOnce();
    expect(onParameterValueChange).not.toHaveBeenCalled();
    fireEvent.blur(input);
    expect(onParameterValueChange).toHaveBeenCalledWith({ value: [{ id: 'edited', type: 'literal', value: 'manual value' }] });
  });

  it.each(['concrete', 'expression', 'null', 'missing', 'dangling reference'] as const)(
    'passes only concrete references to dynamic value and tree loaders (%s)',
    (kind) => {
      const state = createMcpState();
      if (kind === 'missing') {
        delete state.connection.connectionsMapping.Query;
      } else {
        state.connection.connectionsMapping.Query =
          kind === 'expression' ? expressionMapping : kind === 'null' ? null : kind === 'concrete' ? 'Sql' : 'Unknown';
      }
      const parameter = createParameter({ editor: 'combobox', dynamicData: { status: DynamicLoadStatus.NOTSTARTED } });
      const { rerender, store } = renderEditor(parameter, state);
      fireEvent.click(screen.getByRole('button', { name: 'Open choices' }));
      const expectedReference = kind === 'concrete' ? reference : undefined;
      expect(parameterHelpers.loadDynamicValuesForParameter).toHaveBeenCalledExactlyOnceWith(
        'Query',
        'default',
        'body',
        state.operations.operationInfo.Query,
        expectedReference,
        state.operations.inputParameters.Query,
        state.operations.dependencies.Query,
        true,
        store.dispatch,
        {},
        {}
      );
      rerender(
        <ParameterEditor
          operationId="Query"
          groupId="default"
          parameter={{ ...parameter, editor: 'filepicker' }}
          onParameterVisibilityUpdate={vi.fn()}
          onParameterValueChange={vi.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Browse root' }));
      fireEvent.click(screen.getByRole('button', { name: 'Open folder' }));
      for (const selectedItem of [undefined, { id: 'folder' }]) {
        expect(parameterHelpers.loadDynamicTreeItemsForParameter).toHaveBeenCalledWith(
          'Query',
          'default',
          'body',
          selectedItem,
          state.operations.operationInfo.Query,
          expectedReference,
          state.operations.inputParameters.Query,
          state.operations.dependencies.Query,
          true,
          store.dispatch,
          {},
          {}
        );
      }
      expect(parameterHelpers.loadDynamicTreeItemsForParameter).toHaveBeenCalledTimes(2);
    }
  );

  it.each([DynamicLoadStatus.LOADING, DynamicLoadStatus.SUCCEEDED, undefined])(
    'does not reload dynamic values when status is %s',
    (status) => {
      renderEditor(createParameter({ editor: 'combobox', dynamicData: status ? { status } : undefined }));
      fireEvent.click(screen.getByRole('button', { name: 'Open choices' }));
      expect(parameterHelpers.loadDynamicValuesForParameter).not.toHaveBeenCalled();
      if (status === DynamicLoadStatus.LOADING) {
        expect(screen.getByText('Loading choices')).toBeInTheDocument();
      }
    }
  );

  it('shows failed dynamic choices and retries them on menu open', () => {
    renderEditor(
      createParameter({
        editor: 'combobox',
        editorOptions: { options: [{ displayName: 'Saved choice', value: 'saved' }], multiSelect: true, serialization: { delimiter: ',' } },
        dynamicData: { status: DynamicLoadStatus.FAILED, error: { message: 'Choices unavailable' } },
      })
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Choices unavailable');
    expect(screen.getByText('Saved choice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open choices' }));
    expect(parameterHelpers.loadDynamicValuesForParameter).toHaveBeenCalledOnce();
  });

  it('uses real picker metadata to display and select a file, including loading/error presentation', () => {
    const state = createMcpState();
    state.operations.dependencies.Query.inputs['inputs.$.body'] = {
      filePickerInfo: { fullTitlePath: 'title', valuePath: 'id' },
    } as any;
    renderEditor(
      createParameter({
        editor: 'filepicker',
        dynamicData: { status: DynamicLoadStatus.LOADING, error: { message: 'Last browse failed' } },
        editorViewModel: { displayValue: 'Existing file' },
      }),
      state
    );
    expect(screen.getByText('Loading choices')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('Last browse failed');
    fireEvent.click(screen.getByRole('button', { name: 'Select file' }));
    expect(screen.getByText('SQL Server | Monthly report | /reports/monthly.csv')).toBeInTheDocument();
  });

  it('casts edited array segments with the normal serializer instead of retaining the old value', () => {
    const spy = vi.spyOn(parameterHelpers, 'parameterValueToString');
    renderEditor(createParameter({ editor: 'array', type: 'array', value: [createLiteralValueSegment('["old"]')] }));
    fireEvent.click(screen.getByRole('button', { name: 'Serialize array' }));
    expect(screen.getByText('["edited"]')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ value: [{ id: 'cast', type: 'literal', value: '["edited"]' }] }),
      false,
      {},
      true
    );
  });

  it('returns an empty cast value when the serializer produces no value', () => {
    vi.spyOn(parameterHelpers, 'parameterValueToString').mockReturnValue(undefined);
    renderEditor(createParameter({ editor: 'array' }));
    fireEvent.click(screen.getByRole('button', { name: 'Serialize array' }));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('preserves dropdown option labels and dictionary readonly configuration', () => {
    const { rerender } = renderEditor(
      createParameter({ editor: 'dropdown', editorOptions: { options: [{ displayName: 'First choice', value: 1 }] } })
    );
    expect(screen.getByText('First choice')).toBeInTheDocument();
    rerender(
      <ParameterEditor
        operationId="Query"
        groupId="default"
        parameter={createParameter({ editor: 'dictionary', editorOptions: { readOnly: true } })}
        onParameterValueChange={vi.fn()}
        onParameterVisibilityUpdate={vi.fn()}
      />
    );
    expect(screen.getByRole('textbox', { name: 'dictionary value' })).toHaveAttribute('readonly');
  });
});

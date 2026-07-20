// @vitest-environment jsdom
import { getEditorAndOptions } from '..';
import type { VariableDeclaration } from '../../../../../../core/state/tokens/tokensSlice';
import { InitEditorService } from '@microsoft/logic-apps-shared';
import type { ParameterInfo } from '@microsoft/designer-ui';
import type { OperationInfo } from '@microsoft/logic-apps-shared';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('getEditorAndOptions', () => {
  const operationInfo: OperationInfo = {
    connectorId: 'connectorId',
    operationId: 'operationId',
  };

  const getParameterInfo = (): ParameterInfo => ({
    id: 'parameter-id',
    label: 'parameter-label',
    parameterKey: 'parameter-key',
    parameterName: 'parameter-name',
    required: false,
    type: 'parameter-type',
    value: [],
    info: {},
  });

  it.each`
    editor                  | editorOptions
    ${undefined}            | ${undefined}
    ${'copyable'}           | ${undefined}
    ${'dropdown'}           | ${undefined}
    ${'code'}               | ${undefined}
    ${'combobox'}           | ${undefined}
    ${'schema'}             | ${undefined}
    ${'dictionary'}         | ${undefined}
    ${'table'}              | ${undefined}
    ${'array'}              | ${undefined}
    ${'authentication'}     | ${undefined}
    ${'condition'}          | ${undefined}
    ${'recurrence'}         | ${undefined}
    ${'filepicker'}         | ${undefined}
    ${'html'}               | ${undefined}
    ${'floatingactionmenu'} | ${undefined}
  `('"$editor" editor is returned by default', ({ editor, editorOptions }) => {
    const parameter = getParameterInfo();
    parameter.editor = editor;
    parameter.editorOptions = editorOptions;
    expect(getEditorAndOptions(operationInfo, parameter, /*upstreamNodeIds: */ [], /*variables: */ {})).toEqual({
      editor,
      editorOptions,
    });
  });

  it('"variablename" editor maps to "dropdown"', () => {
    const parameter = getParameterInfo();
    parameter.editor = 'variablename';
    parameter.editorOptions = {
      supportedTypes: ['string'],
    };

    const variables: Record<string, VariableDeclaration[]> = {
      a: [
        {
          name: 'variable-1',
          type: 'string',
        },
        {
          name: 'variable-2',
          type: 'number',
        },
      ],
      b: [
        {
          name: 'variable-3',
          type: 'string',
        },
        {
          name: 'variable-4',
          type: 'number',
        },
      ],
      c: [
        {
          name: 'variable-5',
          type: 'string',
        },
        {
          name: 'variable-6',
          type: 'number',
        },
      ],
    };

    const upstreamNodeIds = ['a', 'b'];

    const expectedEditorAndOptions = {
      editor: 'dropdown',
      editorOptions: {
        options: [
          {
            value: 'variable-1',
            displayName: 'variable-1',
          },
          {
            value: 'variable-3',
            displayName: 'variable-3',
          },
        ],
      },
    };
    expect(getEditorAndOptions(operationInfo, parameter, upstreamNodeIds, variables)).toEqual(expectedEditorAndOptions);
  });

  describe('"variablename" editor strictly scopes to upstream variables', () => {
    const variables: Record<string, VariableDeclaration[]> = {
      initInt: [{ name: 'intVar', type: 'integer' }],
      initFloat: [{ name: 'floatVar', type: 'float' }],
      initStr: [{ name: 'strVar', type: 'string' }],
      initArr: [{ name: 'arrVar', type: 'array' }],
      initBool: [{ name: 'boolVar', type: 'boolean' }],
    };

    it('returns an empty options list when no variables are upstream (no all-variables leak)', () => {
      const parameter = getParameterInfo();
      parameter.editor = 'variablename';
      parameter.editorOptions = { supportedTypes: [] };

      // upstreamNodeIds is empty even though variables are declared elsewhere in the workflow.
      // Showing all of them would let a Set Variable reference an out-of-scope variable, so the
      // dropdown must be empty.
      const result = getEditorAndOptions(operationInfo, parameter, /* upstreamNodeIds */ [], variables);

      expect(result).toEqual({ editor: 'dropdown', editorOptions: { options: [] } });
    });

    it('returns an empty options list when no variables are declared at all', () => {
      const parameter = getParameterInfo();
      parameter.editor = 'variablename';
      parameter.editorOptions = { supportedTypes: ['string'] };

      const result = getEditorAndOptions(operationInfo, parameter, /* upstreamNodeIds */ [], /* variables */ {});

      expect(result).toEqual({ editor: 'dropdown', editorOptions: { options: [] } });
    });

    it('only includes variables whose declaring node is upstream, excluding parallel-branch variables', () => {
      const parameter = getParameterInfo();
      parameter.editor = 'variablename';
      parameter.editorOptions = { supportedTypes: ['string'] };

      // upstream includes initStr (in scope) but excludes initArr/others (parallel branch).
      const result = getEditorAndOptions(operationInfo, parameter, ['initStr'], variables);

      expect(result).toEqual({
        editor: 'dropdown',
        editorOptions: { options: [{ value: 'strVar', displayName: 'strVar' }] },
      });
    });
  });

  it('should support EditorService override', () => {
    const customEditorOptions = { EditorComponent: vi.fn() };
    const editorService = {
      getEditor: vi.fn(() => customEditorOptions),
    };
    InitEditorService(editorService);

    const parameter = getParameterInfo();
    const result = getEditorAndOptions(operationInfo, parameter, /*upstreamNodeIds: */ [], /*variables: */ {});

    expect(editorService.getEditor).toHaveBeenCalledWith({
      operationInfo,
      parameter,
    });
    expect(result).toEqual({
      editor: 'internal-custom-editor',
      editorOptions: customEditorOptions,
    });
  });

  it('should apply EditorService override before remapping "variablename" editor', () => {
    const customEditorOptions = { EditorComponent: vi.fn() };
    const editorService = {
      getEditor: vi.fn(() => customEditorOptions),
    };
    InitEditorService(editorService);

    const parameter = getParameterInfo();
    parameter.editor = 'variablename';
    const result = getEditorAndOptions(operationInfo, parameter, /*upstreamNodeIds: */ [], /*variables: */ {});

    expect(editorService.getEditor).toHaveBeenCalledWith({
      operationInfo,
      parameter,
    });
    expect(result).toEqual({
      editor: 'internal-custom-editor',
      editorOptions: customEditorOptions,
    });
  });
});
